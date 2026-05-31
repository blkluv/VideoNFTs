// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VideoLicenseNFT is ERC721, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _masterIds;

    struct MasterVideo {
        address creator;
        string metadataURI;
        uint256 price;
        uint256 royaltyPct; // in basis points (e.g., 1000 = 10%)
        bool isActive;
    }

    struct License {
        uint256 masterId;
        address creator;
        uint256 purchasePrice;
    }

    mapping(uint256 => MasterVideo) public masterVideos;
    mapping(uint256 => License) public licenses;
    mapping(uint256 => uint256) public secondaryListings; // tokenId => price

    // masterId => userAddress => hasAccess
    mapping(uint256 => mapping(address => bool)) public permanentAccess;

    event MasterVideoMinted(uint256 indexed masterId, address indexed creator, string metadataURI, uint256 price, uint256 royaltyPct);
    event LicensePurchased(uint256 indexed tokenId, uint256 indexed masterId, address indexed buyer, address creator, uint256 price, uint256 timestamp);
    event LicenseListed(uint256 indexed tokenId, uint256 price, address indexed seller);
    event SecondarySale(uint256 indexed tokenId, uint256 price, address indexed buyer, address indexed seller, uint256 royaltyPaid);
    event AccessGranted(uint256 indexed masterId, address indexed user);

    constructor() ERC721("VideoLicenseNFT", "VLNFT") {}

    function mintVideoAsset(string memory metadataURI, uint256 price, uint256 royaltyPct) external returns (uint256) {
        require(royaltyPct <= 5000, "Royalty too high");
        _masterIds.increment();
        uint256 newMasterId = _masterIds.current();

        masterVideos[newMasterId] = MasterVideo({
            creator: msg.sender,
            metadataURI: metadataURI,
            price: price,
            royaltyPct: royaltyPct,
            isActive: true
        });

        permanentAccess[newMasterId][msg.sender] = true;

        emit MasterVideoMinted(newMasterId, msg.sender, metadataURI, price, royaltyPct);
        return newMasterId;
    }

    function purchaseLicense(uint256 masterId) external payable nonReentrant {
        MasterVideo storage video = masterVideos[masterId];
        require(video.isActive, "Asset already sold or inactive");
        require(msg.value >= video.price, "Insufficient funds");

        permanentAccess[masterId][msg.sender] = true;
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);

        licenses[newTokenId] = License({
            masterId: masterId,
            creator: video.creator,
            purchasePrice: msg.value
        });

        video.isActive = false;

        payable(video.creator).transfer(msg.value);

        emit LicensePurchased(newTokenId, masterId, msg.sender, video.creator, msg.value, block.timestamp);
        emit AccessGranted(masterId, msg.sender);
    }

    function listLicenseForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be > 0");
        secondaryListings[tokenId] = price;
        emit LicenseListed(tokenId, price, msg.sender);
    }

    function purchaseSecondaryLicense(uint256 tokenId) external payable nonReentrant {
        uint256 price = secondaryListings[tokenId];
        require(price > 0, "Not for sale");
        require(msg.value >= price, "Insufficient funds");

        address seller = ownerOf(tokenId);
        License storage lic = licenses[tokenId];
        MasterVideo storage master = masterVideos[lic.masterId];

        uint256 royaltyAmount = (msg.value * master.royaltyPct) / 10000;
        uint256 sellerProceeds = msg.value - royaltyAmount;

        permanentAccess[lic.masterId][msg.sender] = true;

        delete secondaryListings[tokenId];
        _burn(tokenId); 

        payable(master.creator).transfer(royaltyAmount);
        payable(seller).transfer(sellerProceeds);

        emit SecondarySale(tokenId, price, msg.sender, seller, royaltyAmount);
        emit AccessGranted(lic.masterId, msg.sender);
    }

    function getMasterDetails(uint256 masterId) external view returns (MasterVideo memory) {
        return masterVideos[masterId];
    }
    
    function hasAccess(uint256 masterId, address user) external view returns (bool) {
        return permanentAccess[masterId][user];
    }
}

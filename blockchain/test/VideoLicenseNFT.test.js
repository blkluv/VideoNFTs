import { expect } from "chai";
import hre from "hardhat";

describe("VideoLicenseNFT", function () {
  let user1, user2, user3;
  let videoLicenseNFT;

  beforeEach(async function () {
    [user1, user2, user3] = await hre.ethers.getSigners();
    const VideoLicenseNFT = await hre.ethers.getContractFactory("VideoLicenseNFT");
    videoLicenseNFT = await VideoLicenseNFT.deploy();
  });

  it("Should allow minting NFT", async function () {
    const price = hre.ethers.parseEther("1");
    await videoLicenseNFT.connect(user1).mintAsset("ipfs://test", price, 1000); // 10% royalty
    
    expect(await videoLicenseNFT.ownerOf(0)).to.equal(user1.address);
    const details = await videoLicenseNFT.getAssetDetails(0);
    expect(details.creator).to.equal(user1.address);
  });

  it("Should allow listing NFT for sale", async function () {
    const price = hre.ethers.parseEther("1");
    await videoLicenseNFT.connect(user1).mintAsset("ipfs://test", price, 1000);
    // User1 unlists for a moment (just to test re-listing) - actually we can't unlist directly via a separate function yet unless we buy it or change the contract. Wait, our contract defaults to isListed = true on mint.
    // Let's test the explicit listForSale function
    const newPrice = hre.ethers.parseEther("2");
    await videoLicenseNFT.connect(user1).listForSale(0, newPrice);
    
    const details = await videoLicenseNFT.getAssetDetails(0);
    expect(details.price).to.equal(newPrice);
    expect(details.isListed).to.equal(true);
  });

  it("Should allow buying NFT", async function () {
    const price = hre.ethers.parseEther("1");
    await videoLicenseNFT.connect(user1).mintAsset("ipfs://buytest", price, 1000);
    
    await videoLicenseNFT.connect(user2).buyListedNFT(0, { value: price });
    expect(await videoLicenseNFT.ownerOf(0)).to.equal(user2.address);
    
    const details = await videoLicenseNFT.getAssetDetails(0);
    expect(details.isListed).to.equal(false);
  });

  it("Should verify royalty distribution", async function () {
    const price = hre.ethers.parseEther("10"); // 10 MATIC
    const royaltyPct = 1000; // 10%
    
    // user1 mints
    await videoLicenseNFT.connect(user1).mintAsset("ipfs://royaltytest", price, royaltyPct);

    // Get initial balances
    const initialUser1Balance = await hre.ethers.provider.getBalance(user1.address);

    // user2 buys from user1
    await videoLicenseNFT.connect(user2).buyListedNFT(0, { value: price });
    
    // Check user1 balance increased by the full price (since they are both seller and creator at this stage)
    const finalUser1Balance = await hre.ethers.provider.getBalance(user1.address);
    expect(finalUser1Balance - initialUser1Balance).to.equal(price);

    // Now user2 lists it for sale
    const resalePrice = hre.ethers.parseEther("20"); // 20 MATIC resale
    await videoLicenseNFT.connect(user2).listForSale(0, resalePrice);
    
    // Get balances before resale
    const preResaleUser1Balance = await hre.ethers.provider.getBalance(user1.address);
    const preResaleUser2Balance = await hre.ethers.provider.getBalance(user2.address);
    
    // user3 buys from user2
    await videoLicenseNFT.connect(user3).buyListedNFT(0, { value: resalePrice });
    
    // Verify distribution
    // 10% of 20 = 2 MATIC to user1 (creator)
    // 90% of 20 = 18 MATIC to user2 (seller)
    const expectedRoyalty = (resalePrice * BigInt(royaltyPct)) / 10000n;
    const expectedSellerAmount = resalePrice - expectedRoyalty;

    const postResaleUser1Balance = await hre.ethers.provider.getBalance(user1.address);
    const postResaleUser2Balance = await hre.ethers.provider.getBalance(user2.address);
    
    expect(postResaleUser1Balance - preResaleUser1Balance).to.equal(expectedRoyalty);
    expect(postResaleUser2Balance - preResaleUser2Balance).to.equal(expectedSellerAmount);
  });
});

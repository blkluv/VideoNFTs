import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { PlusCircle, Search, ShieldCheck, TrendingUp, History, Trophy, User, Zap, DollarSign, X, AlertTriangle, Loader2, Globe, Tag, PlayCircle, ShoppingCart } from 'lucide-react';
import contractData from './contractData.json';
import './index.css';

// Media Constants
const HERO_IMAGE = "/assets/hero.png";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/"
];

const VALID_CHAIN_IDS = ['0x7a69', '0x539', '0x1691', '0x13882']; // 31337, 1337, 5777, 80002

type MasterVideo = {
  masterId: number;
  creator: string;
  title: string;
  description: string;
  videoUrl: string;
  price: string;
  priceWei: bigint;
  royaltyPct: string;
  isActive: boolean;
};

type LicenseTx = {
  tokenId: number;
  masterId: number;
  buyer: string;
  creator: string;
  pricePaid: string;
  timestamp: number;
};

type SecondaryListing = {
  tokenId: number;
  masterId: number;
  price: string;
  priceWei: bigint;
  seller: string;
  video?: MasterVideo;
};

// --- Sub-components ---

const LandingPage = ({ account, setView, connectWallet }: any) => (
  <div className="fade-in">
    <section className="hero-section">
      <div className="hero-content">
        <h4 style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '1rem' }}>Premium Video Marketplace</h4>
        <h1 style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '2rem' }}>Buy Once. <br/><span style={{ color: 'rgba(255,255,255,0.4)' }}>Earn Forever.</span></h1>
        <p style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '3rem', maxWidth: '500px' }}>
          Decentralized licensing with built-in secondary market support. Set your royalty and watch your assets work for you.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <button onClick={() => setView('market')} style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem' }}>
            Enter Market <ChevronRight size={20} />
          </button>
          {!account && (
            <button className="button-outline" onClick={connectWallet} style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem' }}>
              <Wallet size={20} /> Connect Wallet
            </button>
          )}
        </div>
      </div>
      <div className="hero-visual">
        <img src={HERO_IMAGE} alt="Marketplace Hero" />
      </div>
    </section>
  </div>
);

const LeaderboardView = ({ licenses, filterCreator }: any) => {
  const leaderData = useMemo(() => {
    const stats: Record<string, { earnings: number, sales: number }> = {};
    licenses.forEach((l: any) => {
      if (!stats[l.creator]) stats[l.creator] = { earnings: 0, sales: 0 };
      stats[l.creator].earnings += parseFloat(l.pricePaid || "0");
      stats[l.creator].sales += 1;
    });
    return Object.entries(stats)
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.earnings - a.earnings);
  }, [licenses]);

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem' }}>Top Earners</h1>
      </div>
      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '1.5rem' }}>Rank</th>
              <th>Artist</th>
              <th>Sales</th>
              <th>Total Earnings</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {leaderData.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No sales data yet.</td></tr>
            ) : leaderData.map((item, idx) => (
              <tr key={item.address} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '1.5rem', fontWeight: 800 }}>#{idx + 1}</td>
                <td style={{ fontFamily: 'monospace' }}>{item.address.slice(0, 10)}...</td>
                <td>{item.sales}</td>
                <td style={{ fontWeight: 800 }}>{item.earnings.toFixed(3)} ETH</td>
                <td><button className="button-outline" onClick={() => filterCreator(item.address)}>Gallery</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DashboardView = ({ account, videos, licenses, royaltyRevenue, resaleEarnings, openResaleModal, accessIds, ownedNFTs }: any) => {
  if (!account) return <div className="glass-card">Connect wallet.</div>;
  const activeLower = account.toLowerCase();
  
  const myLibrary = videos.filter((v: any) => accessIds.includes(v.masterId) || v.creator === activeLower);
  const mySales = licenses.filter((lx: any) => lx.creator === activeLower && lx.buyer !== activeLower);
  const creatorEarnings = mySales.reduce((acc: number, curr: any) => acc + Number(curr.pricePaid || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="grid-container">
        <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <h4 style={{ color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Creator Sales</h4>
          <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>{creatorEarnings.toFixed(4)} ETH</h2>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resale Profit</h4>
          <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>{Number(resaleEarnings || 0).toFixed(4)} ETH</h2>
        </div>
        <div className="glass-card">
          <h4 style={{ color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Royalty Income</h4>
          <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>{Number(royaltyRevenue || 0).toFixed(4)} ETH</h2>
        </div>
      </div>

      <div className="grid-container" style={{ gridTemplateColumns: 'minmax(300px, 2.5fr) minmax(200px, 1fr)' }}>
        <div className="glass-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}><Library size={22} color="var(--primary-color)" /> My Cinema Library</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2rem' }}>Permanent watching rights for your collection.</p>
          {myLibrary.length === 0 ? <div style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No videos in library.</div> : (
            <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {myLibrary.map((v: any) => (
                <div key={v.masterId} className="glass-card" style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#000', marginBottom: '0.8rem' }}>
                    <video src={v.videoUrl} style={{ width: '100%', aspectRatio: '16/9' }} />
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{v.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}><Handshake size={22} color="#10b981" /> Resale Hub</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>Active licenses you can list for sale.</p>
          {ownedNFTs.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#444' }}>No resellable NFTs.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {ownedNFTs.map((nft: any) => (
                <div key={nft.tokenId} className="glass-card" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{nft.title}</div><div style={{ fontSize: '0.7rem', color: '#666' }}>LICENSE #{nft.tokenId}</div></div>
                  <button className="button-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => openResaleModal(nft.tokenId, nft.title)}>Sell Right</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [view, setView] = useState<'landing' | 'market' | 'upload' | 'dashboard' | 'leaderboard'>('landing');
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [marketTab, setMarketTab] = useState<'primary' | 'secondary'>('primary');
  
  const [videos, setVideos] = useState<MasterVideo[]>([]);
  const [licenses, setLicenses] = useState<LicenseTx[]>([]);
  const [secondaryMarket, setSecondaryMarket] = useState<SecondaryListing[]>([]);
  const [accessIds, setAccessIds] = useState<number[]>([]);
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
  const [royaltyRevenue, setRoyaltyRevenue] = useState("0");
  const [resaleEarnings, setResaleEarnings] = useState("0");

  const [mintTitle, setMintTitle] = useState("");
  const [mintDesc, setMintDesc] = useState("");
  const [mintFile, setMintFile] = useState<File | null>(null);
  const [priceInput, setPriceInput] = useState("0.1");
  const [royaltyInput, setRoyaltyInput] = useState("10");
  const [mintStatus, setMintStatus] = useState("");

  const [resaleModal, setResaleModal] = useState<{ isOpen: boolean, tokenId: number | null, title: string }>({ isOpen: false, tokenId: null, title: "" });
  const [resalePrice, setResalePrice] = useState("0.5");
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);

  const pinataJWT = import.meta.env.VITE_PINATA_JWT || "";

  useEffect(() => {
    const handleInit = async () => {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setIsWrongNetwork(!VALID_CHAIN_IDS.includes(chainId));
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) { setAccount(accounts[0]); window.location.reload(); } 
          else { setAccount(null); setView('landing'); }
        });
        window.ethereum.on('chainChanged', () => window.location.reload());
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const currentProvider = new BrowserProvider(window.ethereum);
          const currentContract = new Contract(contractData.address, contractData.abi, currentProvider);
          setContract(currentContract);
        }
      }
    };
    handleInit();
  }, []);

  useEffect(() => {
    if (contract && !isWrongNetwork) loadBlockchainData(contract);
  }, [contract, account, isWrongNetwork]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) return showToast("MetaMask required", 'error');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      const currentProvider = new BrowserProvider(window.ethereum);
      const currentContract = new Contract(contractData.address, contractData.abi, currentProvider);
      setContract(currentContract);
      showToast("Connected!");
    } catch (err) { showToast("Connection failed", 'error'); }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setView('landing');
    showToast("Signed Out");
  };

  const loadBlockchainData = async (_contract: Contract) => {
    try {
      setIsLoading(true);
      const accountLower = account?.toLowerCase();
      
      const secondaryFilter = _contract.filters.SecondarySale();
      const secondaryEvents = await _contract.queryFilter(secondaryFilter, 0, 'latest');
      const licenseFilter = _contract.filters.LicensePurchased();
      const licenseEvents = await _contract.queryFilter(licenseFilter, 0, 'latest');
      
      const fetchedLicenses: LicenseTx[] = [];
      licenseEvents.forEach(e => {
        const args = (e as any).args;
        fetchedLicenses.push({ 
          tokenId: Number(args[0]), masterId: Number(args[1]), buyer: args[2].toLowerCase(), 
          creator: args[3].toLowerCase(), pricePaid: formatEther(args[4]), timestamp: Number(args[5]) * 1000 
        });
      });
      setLicenses([...fetchedLicenses].reverse());

      let totalRoyalty = 0n;
      let totalResaleProfit = 0n;
      if (accountLower) {
        secondaryEvents.forEach(e => {
          const args = (e as any).args;
          const tokenId = Number(args[0]);
          const seller = args[3].toLowerCase();
          const priceWei = args[1];
          const royaltyWei = args[4];
          const lic = fetchedLicenses.find(l => l.tokenId === tokenId);
          if (lic && lic.creator === accountLower) totalRoyalty += BigInt(royaltyWei);
          if (seller === accountLower) totalResaleProfit += (BigInt(priceWei) - BigInt(royaltyWei));
        });
      }
      setRoyaltyRevenue(formatEther(totalRoyalty));
      setResaleEarnings(formatEther(totalResaleProfit));

      const accessFilter = _contract.filters.AccessGranted();
      const accessEvents = await _contract.queryFilter(accessFilter, 0, 'latest');
      const userAccess: number[] = [];
      accessEvents.forEach(e => {
        const args = (e as any).args;
        if (accountLower && args[1].toLowerCase() === accountLower) userAccess.push(Number(args[0]));
      });
      setAccessIds([...new Set(userAccess)]);

      const masterFilter = _contract.filters.MasterVideoMinted();
      const masterEvents = await _contract.queryFilter(masterFilter, 0, 'latest');
      const activeVideos: MasterVideo[] = [];
      for (const event of masterEvents.slice().reverse()) {
        const args = (event as any).args;
        const cid = args[2]?.replace("ipfs://", "");
        if (!cid) continue;
        try {
          const metaRes = await Promise.any(GATEWAYS.map(gw => fetch(`${gw}${cid}`).then(r => r.json())));
          const details = await _contract.masterVideos(args[0]);
          activeVideos.push({
            masterId: Number(args[0]), creator: args[1].toLowerCase(), title: metaRes.title || "Untitled", description: metaRes.description || "",
            videoUrl: metaRes.video?.replace("ipfs://", "https://dweb.link/ipfs/") || "", price: formatEther(args[3] || 0), priceWei: args[3],
            royaltyPct: (Number(args[4] || 0) / 100).toString(), isActive: details.isActive
          });
        } catch (e) { }
      }
      setVideos(activeVideos);

      const myNFTs: any[] = [];
      if (accountLower) {
        for (const lx of fetchedLicenses) {
          try {
            const currentOwner = (await _contract.ownerOf(lx.tokenId)).toLowerCase();
            if (currentOwner === accountLower) {
               const v = activeVideos.find(vid => vid.masterId === lx.masterId);
               myNFTs.push({ tokenId: lx.tokenId, masterId: lx.masterId, title: v?.title || "License" });
            }
          } catch (e) { }
        }
      }
      setOwnedNFTs(myNFTs);

      const listingFilter = _contract.filters.LicenseListed();
      const listingEvents = await _contract.queryFilter(listingFilter, 0, 'latest');
      const latestListings: any = {};
      listingEvents.forEach(e => {
        const args = (e as any).args;
        latestListings[Number(args[0])] = { price: formatEther(args[1]), priceWei: args[1], seller: args[2].toLowerCase() };
      });
      secondaryEvents.forEach(e => { latestListings[Number((e as any).args[0])] = null; });

      const compiledSecondary: SecondaryListing[] = [];
      for (const tId of Object.keys(latestListings)) {
        const tokenId = Number(tId);
        const data = latestListings[tokenId];
        if (data) {
          const livePrice = await _contract.secondaryListings(tokenId);
          if (livePrice > 0n) {
            const lic = fetchedLicenses.find(l => l.tokenId === tokenId);
            if (lic) {
              compiledSecondary.push({ tokenId, masterId: lic.masterId, price: data.price, priceWei: livePrice, seller: data.seller, video: activeVideos.find(v => v.masterId === lic.masterId) });
            }
          }
        }
      }
      setSecondaryMarket(compiledSecondary);

    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const buyLicense = async (masterId: number, priceWei: bigint) => {
    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const activeContract = new Contract(contractData.address, contractData.abi, signer);
      const tx = await (activeContract as any).purchaseLicense(masterId, { value: priceWei });
      await tx.wait();
      showToast("Access Unlocked!");
      loadBlockchainData(activeContract);
    } catch (err) { showToast("Purchase Failed", 'error'); }
    finally { setIsLoading(false); }
  };

  const listForResale = async (tokenId: number, price: string) => {
    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const activeContract = new Contract(contractData.address, contractData.abi, signer);
      const tx = await (activeContract as any).listLicenseForSale(tokenId, parseEther(price));
      await tx.wait();
      showToast("Listed!");
      setResaleModal({ isOpen: false, tokenId: null, title: "" });
      loadBlockchainData(activeContract);
    } catch (err) { showToast("Listing Failed", 'error'); }
    finally { setIsLoading(false); }
  };

  const buySecondary = async (tokenId: number, priceWei: bigint) => {
    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const activeContract = new Contract(contractData.address, contractData.abi, signer);
      const tx = await (activeContract as any).purchaseSecondaryLicense(tokenId, { value: priceWei });
      await tx.wait();
      showToast("Success!");
      loadBlockchainData(activeContract);
    } catch (err) { showToast("Failed", 'error'); }
    finally { setIsLoading(false); }
  };

  const handleMint = async () => {
    if (!mintFile || !pinataJWT) return showToast("Missing fields", 'error');
    try {
      setIsLoading(true);
      setMintStatus("IPFS Upload...");
      const formData = new FormData();
      formData.append('file', mintFile);
      const fileRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { "Authorization": `Bearer ${pinataJWT}` }, body: formData }).then(r => r.json());
      const metaBlob = new Blob([JSON.stringify({ title: mintTitle, description: mintDesc, video: `ipfs://${fileRes.IpfsHash}` })], { type: "application/json" });
      const metaForm = new FormData();
      metaForm.append('file', metaBlob, 'metadata.json');
      const metaRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { "Authorization": `Bearer ${pinataJWT}` }, body: metaForm }).then(r => r.json());
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const activeContract = new Contract(contractData.address, contractData.abi, signer);
      const tx = await (activeContract as any).mintVideoAsset(`ipfs://${metaRes.IpfsHash}`, parseEther(priceInput), Math.floor(Number(royaltyInput) * 100));
      await tx.wait();
      showToast("Published!");
      setView('market');
      loadBlockchainData(activeContract);
      setMintTitle(""); setMintDesc(""); setMintFile(null);
    } catch (err) { showToast("Minting Failed", 'error'); }
    finally { setIsLoading(false); setMintStatus(""); }
  };

  const filteredItems = marketTab === 'primary' 
    ? videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()) && (!creatorFilter || v.creator === creatorFilter))
    : secondaryMarket.filter(s => s.video?.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h2 onClick={() => setView('landing')} style={{ cursor: 'pointer', background: 'linear-gradient(45deg, #45f3ff, #ff2a7a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>VideoNFT</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button className={view === 'market' ? '' : 'button-outline'} onClick={() => setView('market')}>Market</button>
             <button className={view === 'leaderboard' ? '' : 'button-outline'} onClick={() => setView('leaderboard')}>Rankings</button>
             <button className={view === 'upload' ? '' : 'button-outline'} onClick={() => setView('upload')} disabled={!account}>Mint</button>
             <button className={view === 'dashboard' ? '' : 'button-outline'} onClick={() => setView('dashboard')} disabled={!account}>Dashboard</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {account && <button className="button-outline" onClick={() => window.location.reload()} style={{ padding: '0.4rem', border: 'none', color: 'var(--primary-color)' }}><RefreshCw size={18} /></button>}
          {account ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="glass-card" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>{account.slice(0,6)}...</div>
              <button className="button-outline" onClick={disconnectWallet} style={{ padding: '0.4rem 0.8rem', color: '#ff2a7a', borderColor: 'rgba(255, 42, 122, 0.3)' }}><LogOut size={18} /></button>
            </div>
          ) : <button onClick={connectWallet}><Wallet size={18} /> Connect</button>}
        </div>
      </nav>

      {resaleModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div className="glass-card fade-in" style={{ maxWidth: '400px', width: '90%' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Resell Listing</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>You will keep viewing access forever.</p>
            <input type="number" value={resalePrice} onChange={e => setResalePrice(e.target.value)} style={{ width: '100%', marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="button-outline" onClick={() => setResaleModal({ ...resaleModal, isOpen: false })} style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => resaleModal.tokenId && listForResale(resaleModal.tokenId, resalePrice)} style={{ flex: 2 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {view === 'landing' && <LandingPage account={account} setView={setView} connectWallet={connectWallet} />}
      {view === 'leaderboard' && <LeaderboardView licenses={licenses} filterCreator={(a: string) => { setCreatorFilter(a); setView('market'); }} />}

      {view === 'upload' && (
        <div className="glass-card fade-in" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          <h2>Mint New Asset</h2>
          <input type="text" placeholder="Title" value={mintTitle} onChange={e => setMintTitle(e.target.value)} />
          <textarea placeholder="Description" value={mintDesc} onChange={e => setMintDesc(e.target.value)} rows={3} />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: '0.75rem', color: '#aaa' }}>Price (ETH)</label><input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)} /></div>
            <div style={{ flex: 1 }}><label style={{ fontSize: '0.75rem', color: '#aaa' }}>Royalty (%)</label><input type="number" value={royaltyInput} onChange={e => setRoyaltyInput(e.target.value)} /></div>
          </div>
          <input type="file" accept="video/mp4" onChange={e => e.target.files && setMintFile(e.target.files[0])} style={{ marginTop: '1rem' }} />
          <button onClick={handleMint} disabled={isLoading} style={{ width: '100%', marginTop: '2rem' }}>{isLoading ? mintStatus : "Publish"}</button>
        </div>
      )}

      {view === 'market' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
             <button onClick={() => setMarketTab('primary')} className={marketTab === 'primary' ? '' : 'button-outline'}>Official Drops</button>
             <button onClick={() => setMarketTab('secondary')} className={marketTab === 'secondary' ? '' : 'button-outline'}>Community Hub</button>
          </div>
          <div className="grid-container">
            {filteredItems.map((item: any) => {
              const v = marketTab === 'primary' ? item : item.video;
              if (!v) return null;
              const hasAccess = accessIds.includes(v.masterId) || (account && account.toLowerCase() === v.creator);
              return (
                <div key={marketTab === 'primary' ? v.masterId : item.tokenId} className="glass-card market-item">
                  <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '1rem' }}>
                    <video src={v.videoUrl} controls={hasAccess} style={{ width: '100%', aspectRatio: '16/9', filter: hasAccess ? 'none' : 'blur(25px)' }} />
                    {!hasAccess && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={32} /></div>}
                  </div>
                  <h3>{v.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', margin: '1rem 0' }}>
                    <span>By: {v.creator.slice(0,6)}</span>
                    <span>Royalty: {v.royaltyPct}%</span>
                  </div>
                  {hasAccess ? <button disabled style={{ width: '100%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}><Key size={16} /> ACCESS GRANTED</button> : marketTab === 'secondary' ? <button onClick={() => buySecondary(item.tokenId, item.priceWei)} style={{ width: '100%' }}>Buy {item.price} ETH</button> : v.isActive ? <button onClick={() => buyLicense(v.masterId, v.priceWei)} style={{ width: '100%' }}>Buy {v.price} ETH</button> : <button disabled style={{ width: '100%', color: '#444' }}>SOLD OUT</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'dashboard' && <DashboardView account={account} videos={videos} licenses={licenses} royaltyRevenue={royaltyRevenue} resaleEarnings={resaleEarnings} accessIds={accessIds} ownedNFTs={ownedNFTs} openResaleModal={(id: number, title: string) => setResaleModal({ isOpen: true, tokenId: id, title })} />}

      {notification && <div className={`toast-container ${notification.type}`} style={{ position: 'fixed', bottom: '30px', right: '30px', padding: '1.2rem 2.5rem', borderRadius: '16px', background: 'rgba(10,10,10,0.95)', border: `1px solid ${notification.type === 'success' ? '#10b981' : '#ff2a7a'}`, zIndex: 5000 }}>{notification.message}</div>}
    </>
  );
}

export default App;

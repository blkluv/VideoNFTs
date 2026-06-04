import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { ChevronRight, Wallet, Library, Handshake, Lock, Key, RefreshCw, LogOut } from 'lucide-react';
import contractData from './contractData.json';
import './index.css';

// Media Constants
const HERO_IMAGE = "/assets/hero.png";

declare global {
  interface Window {
    ethereum?: any;
    phantom?: {
      ethereum?: any;
      solana?: any;
    };
  }
}

const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/"
];

const VALID_CHAIN_IDS = ['0x7a69', '0x539', '0x1691', '0x13882'];

// ... (all type definitions stay the same)

// --- Sub-components --- (LandingPage, LeaderboardView, DashboardView stay the same)

// --- Main App Component ---

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [view, setView] = useState<'landing' | 'market' | 'upload' | 'dashboard' | 'leaderboard'>('landing');
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [marketTab, setMarketTab] = useState<'primary' | 'secondary'>('primary');
  const [walletType, setWalletType] = useState<'metamask' | 'phantom' | null>(null);
  
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
  const [searchQuery] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const pinataJWT = import.meta.env.VITE_PINATA_JWT || "";

  // --- Wallet Detection ---
  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum && !window.phantom?.ethereum;
  const hasPhantom = typeof window !== 'undefined' && !!window.phantom?.ethereum;

  const getProvider = () => {
    if (walletType === 'phantom' && window.phantom?.ethereum) {
      return window.phantom.ethereum;
    }
    if (walletType === 'metamask' && window.ethereum) {
      return window.ethereum;
    }
    // Fallback detection
    if (window.phantom?.ethereum) return window.phantom.ethereum;
    if (window.ethereum) return window.ethereum;
    return null;
  };

  useEffect(() => {
    const handleInit = async () => {
      const provider = getProvider();
      if (!provider) return;

      // Detect which wallet is active
      if (provider.isPhantom) {
        setWalletType('phantom');
      } else if (provider.isMetaMask) {
        setWalletType('metamask');
      }

      const chainId = await provider.request({ method: 'eth_chainId' });
      setIsWrongNetwork(!VALID_CHAIN_IDS.includes(chainId));

      provider.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) { 
          setAccount(accounts[0]); 
          window.location.reload(); 
        } else { 
          setAccount(null); 
          setWalletType(null);
          setView('landing'); 
        }
      });

      provider.on('chainChanged', () => window.location.reload());

      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const currentProvider = new BrowserProvider(provider);
        const currentContract = new Contract(contractData.address, contractData.abi, currentProvider);
        setContract(currentContract);
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

  const connectMetaMask = async () => {
    if (!window.ethereum || (window.ethereum.isPhantom)) {
      return showToast("MetaMask not detected. Please install MetaMask.", 'error');
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setWalletType('metamask');
      setShowWalletModal(false);
      const currentProvider = new BrowserProvider(window.ethereum);
      const currentContract = new Contract(contractData.address, contractData.abi, currentProvider);
      setContract(currentContract);
      showToast("MetaMask Connected!");
    } catch (err) { 
      showToast("Connection failed", 'error'); 
    }
  };

  const connectPhantom = async () => {
    if (!window.phantom?.ethereum) {
      return showToast("Phantom wallet not detected. Get it at phantom.app", 'error');
    }
    try {
      const accounts = await window.phantom.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setWalletType('phantom');
      setShowWalletModal(false);
      const currentProvider = new BrowserProvider(window.phantom.ethereum);
      const currentContract = new Contract(contractData.address, contractData.abi, currentProvider);
      setContract(currentContract);
      showToast("Phantom Connected!");
    } catch (err) { 
      showToast("Connection failed", 'error'); 
    }
  };

  const connectWallet = () => {
    // If only one wallet is available, connect directly
    if (hasPhantom && !hasMetaMask) {
      connectPhantom();
      return;
    }
    if (hasMetaMask && !hasPhantom) {
      connectMetaMask();
      return;
    }
    // Both or neither available — show modal
    setShowWalletModal(true);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setWalletType(null);
    setView('landing');
    showToast("Signed Out");
  };

  // ... (loadBlockchainData, buyLicense, listForResale, buySecondary, handleMint stay exactly the same)

  const loadBlockchainData = async (_contract: Contract) => {
    // ... (keep existing implementation)
  };

  const buyLicense = async (masterId: number, priceWei: bigint) => {
    // ... (keep existing implementation)
  };

  const listForResale = async (tokenId: number, price: string) => {
    // ... (keep existing implementation)
  };

  const buySecondary = async (tokenId: number, priceWei: bigint) => {
    // ... (keep existing implementation)
  };

  const handleMint = async () => {
    // ... (keep existing implementation)
  };

  const filteredItems = marketTab === 'primary' 
    ? videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()) && (!creatorFilter || v.creator === creatorFilter))
    : secondaryMarket.filter(s => s.video?.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h2 onClick={() => setView('landing')} style={{ cursor: 'pointer', background: 'linear-gradient(45deg, #45f3ff, #ff2a7a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>Baddie.stream</h2>
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
              <div className="glass-card" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {walletType === 'phantom' ? '👻' : '🦊'} {account.slice(0,6)}...
              </div>
              <button className="button-outline" onClick={disconnectWallet} style={{ padding: '0.4rem 0.8rem', color: '#ff2a7a', borderColor: 'rgba(255, 42, 122, 0.3)' }}><LogOut size={18} /></button>
            </div>
          ) : <button onClick={connectWallet}><Wallet size={18} /> Connect</button>}
        </div>
      </nav>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div className="glass-card fade-in" style={{ maxWidth: '420px', width: '90%', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Connect Wallet</h2>
            <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.9rem' }}>Choose your preferred wallet to continue.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {hasMetaMask && (
                <button 
                  onClick={connectMetaMask}
                  style={{ 
                    padding: '1.2rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '0.8rem',
                    fontSize: '1.1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '16px'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>🦊</span> MetaMask
                </button>
              )}
              
              {hasPhantom && (
                <button 
                  onClick={connectPhantom}
                  style={{ 
                    padding: '1.2rem', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center', 
                    gap: '0.8rem',
                    fontSize: '1.1rem',
                    background: 'rgba(171, 155, 255, 0.1)',
                    border: '1px solid rgba(171, 155, 255, 0.3)',
                    borderRadius: '16px'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>👻</span> Phantom
                </button>
              )}

              {!hasMetaMask && !hasPhantom && (
                <div style={{ padding: '2rem', color: '#666' }}>
                  <p>No wallet detected.</p>
                  <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                    Install <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>MetaMask</a> or{" "}
                    <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" style={{ color: '#AB9BFF' }}>Phantom</a>
                  </p>
                </div>
              )}
            </div>

            <button 
              className="button-outline" 
              onClick={() => setShowWalletModal(false)} 
              style={{ marginTop: '1.5rem', width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ... (rest of JSX — resaleModal, views — stays exactly the same) */}
    </>
  );
}

export default App;
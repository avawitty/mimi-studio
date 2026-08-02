import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { CheckCircle2, Copy, Hexagon, Image as ImageIcon, Camera } from 'lucide-react';

export const Web3TasteManifest: React.FC = () => {
    const { profile } = useUser();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isEnteringWallet, setIsEnteringWallet] = useState(false);
    const [walletInput, setWalletInput] = useState('');
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'assets' | 'transactions' | 'permissions'>('assets');
    const [stampImage, setStampImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleConnectWalletClick = () => {
        setIsEnteringWallet(true);
    };

    const confirmWallet = () => {
        setIsConnecting(true);
        setTimeout(() => {
            const addr = walletInput.trim() || '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
            setWalletAddress(addr);
            setIsConnecting(false);
            setIsEnteringWallet(false);
            setWalletInput('');
        }, 1000);
    };

    const handleDisconnect = () => {
        setWalletAddress(null);
    };

    const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setStampImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-[#09090b] text-stone-300 font-serif min-h-full flex overflow-hidden relative selection:bg-[#4ade80] selection:text-black">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-30 pointer-events-none z-0"></div>
            <div className="absolute inset-0 pointer-events-none z-0 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.08\'/%3E%3C/svg%3E")' }}></div>
            
            <div className="relative w-full h-full flex z-10 min-h-[800px]">
                {/* Sidebar */}
                <aside className="w-80 h-full bg-[#18181b] border-r border-stone-800 relative flex flex-col z-20 shrink-0" style={{ boxShadow: '5px 0 15px -5px rgba(0,0,0,0.8)' }}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-40 pointer-events-none"></div>
                    <div className="absolute -right-3 top-0 bottom-0 w-6 z-30 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 40px, #52525b 40px, #d4d4d8 42px, #52525b 44px, transparent 44px)' }}></div>
                    
                    <div className="p-8 border-b border-stone-800/50 relative">
                        <div className="flex items-center gap-3 mb-2">
                            {walletAddress ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse"></div>
                                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#4ade80]">Connected</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-stone-500"></div>
                                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">Standby</span>
                                </>
                            )}
                        </div>
                        <h1 className="font-serif text-2xl text-stone-200 tracking-wide italic">Mimi Vault</h1>
                        <p className="font-mono text-[9px] text-stone-600 mt-1 uppercase tracking-wider">Secure Identity Archive</p>
                    </div>

                    <div className="p-8 flex flex-col items-center gap-4 relative border-b border-stone-800/50">
                        <div className="relative group min-h-[96px] flex items-center justify-center">
                            <div className="w-24 h-24 bg-stone-900 border border-stone-700 relative overflow-hidden rotate-45 transform transition-transform group-hover:rotate-0 duration-700 flex items-center justify-center">
                                {profile?.photoURL ? (
                                    <img alt="NFT Avatar" className="absolute w-[140%] h-[140%] -rotate-45 group-hover:rotate-0 transition-transform duration-700 object-cover grayscale contrast-125 opacity-80 mix-blend-lighten pointer-events-none" src={profile.photoURL} referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="absolute w-full h-full bg-stone-800"></div>
                                )}
                                <div className="absolute inset-0 border-[0.5px] border-stone-600 opacity-50 m-1 pointer-events-none"></div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-stone-900 border border-stone-700 p-1 rotate-45 z-10 flex items-center justify-center">
                                <CheckCircle2 size={14} className="text-[#4ade80]" />
                            </div>
                        </div>
                        
                        <div className="text-center w-full mt-2">
                            {walletAddress ? (
                                <>
                                    <div className="font-mono text-stone-400 text-sm mb-1">{walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</div>
                                    <div className="flex justify-center gap-4 mt-2">
                                        <button onClick={() => navigator.clipboard.writeText(walletAddress)} className="font-mono z-20 relative text-[9px] text-stone-500 hover:text-[#4ade80] uppercase tracking-wider transition-colors flex items-center gap-1"><Copy size={10}/> Copy</button>
                                        <button onClick={handleDisconnect} className="font-mono z-20 relative text-[9px] text-stone-500 hover:text-[#4ade80] uppercase tracking-wider transition-colors">Disconnect</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {isEnteringWallet ? (
                                        <div className="flex flex-col gap-2 relative z-20">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={walletInput} 
                                                onChange={e => setWalletInput(e.target.value)} 
                                                onKeyDown={e => e.key === 'Enter' && confirmWallet()}
                                                placeholder="0x..." 
                                                className="w-full bg-stone-900 border border-stone-700 text-stone-300 font-mono text-[10px] p-2 text-center focus:outline-none focus:border-stone-500"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => setIsEnteringWallet(false)} className="flex-1 font-mono text-[9px] text-stone-500 hover:text-white uppercase tracking-wider transition-colors py-1 border border-transparent hover:border-stone-700">Cancel</button>
                                                <button onClick={confirmWallet} disabled={isConnecting} className="flex-1 font-mono text-[9px] text-[#4ade80] hover:text-black hover:bg-[#4ade80] uppercase tracking-wider transition-colors py-1 border border-[#4ade80]">
                                                    {isConnecting ? '...' : 'Connect'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="font-mono text-stone-600 text-sm mb-1">0x---...---</div>
                                            <div className="flex justify-center gap-4 mt-2">
                                                <button onClick={handleConnectWalletClick} className="font-mono z-20 relative text-[9px] text-[#4ade80] hover:text-white uppercase tracking-wider transition-colors">
                                                    Connect Wallet
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-8 relative no-scrollbar">
                        <ul className="space-y-6">
                            {(['assets', 'transactions', 'permissions'] as const).map((tab) => (
                                <li key={tab} className="group cursor-pointer relative z-20" onClick={() => setActiveTab(tab)}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`font-serif italic text-lg transition-colors ${activeTab === tab ? 'text-white' : 'text-stone-500 group-hover:text-stone-300'}`}>
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </span>
                                        <span className={`font-mono text-[9px] ${activeTab === tab ? 'text-stone-400' : 'text-stone-700'}`}>
                                            {tab === 'assets' ? (walletAddress ? '01' : '00') : tab === 'transactions' ? '88' : 'Active'}
                                        </span>
                                    </div>
                                    <div className={`h-px w-full transition-colors ${activeTab === tab ? 'bg-stone-500' : 'bg-stone-900 group-hover:bg-stone-600'}`}></div>
                                </li>
                            ))}
                        </ul>

                        <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
                            <div className="border border-dashed border-stone-800 p-3 bg-stone-900/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-mono text-[8px] uppercase text-stone-600">Gas Status</span>
                                    <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full opacity-60"></span>
                                </div>
                                <div className="font-mono text-xs text-stone-400">12 Gwei <span className="text-stone-700">/ Normal</span></div>
                            </div>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 relative flex items-center justify-center bg-[#09090b] p-8 md:p-12 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeTab === 'assets' && (
                            <motion.div 
                                key={`assets-${walletAddress ? 'connected' : 'disconnected'}`}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.5 }}
                                className="relative w-full max-w-5xl aspect-[16/9] bg-[#e8e4dc] rounded-sm border border-stone-800 p-4 md:p-6"
                                style={{ boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.9)' }}
                            >
                                <div className="absolute inset-0 border-[24px] border-[#e3dfd6] shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] rounded-sm pointer-events-none z-20"></div>
                                
                                <div className="w-full h-full bg-[#f2efe9] relative overflow-hidden flex z-10" style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.15), inset 0 2px 20px rgba(0,0,0,0.05)' }}>
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none"></div>
                                    
                                    <div className="w-1/3 border-r border-stone-300/50 p-8 flex flex-col justify-between relative">
                                        <div className="font-mono text-[9px] text-stone-400 uppercase tracking-widest leading-loose">
                                            Specimen: 002<br/>
                                            Type: ERC-721<br/>
                                            Chain: Ethereum<br/>
                                            Origin: Block 14293
                                        </div>
                                        <div className="relative py-8">
                                            <div className="w-full h-px bg-stone-300 mb-4"></div>
                                            <h2 className="font-serif italic text-2xl text-stone-800 mb-2">Minted Asset</h2>
                                            <p className="font-serif text-lg text-stone-500 leading-tight mb-6">The primary identity card acts as a key to the decentralized archives. Handle with care.</p>
                                            
                                            {/* Stamp Area */}
                                            <div className="relative w-24 h-24 border-2 border-stone-300 border-dashed bg-white/50 flex items-center justify-center group mb-4">
                                                {stampImage ? (
                                                    <img src={stampImage} alt="Stamp" className="w-full h-full object-cover p-1 opacity-90 mix-blend-multiply" />
                                                ) : (
                                                    <div className="text-center flex flex-col items-center">
                                                        <ImageIcon size={16} className="text-stone-400 mb-1" />
                                                        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400">Embed Image</span>
                                                    </div>
                                                )}
                                                <input type="file" ref={fileInputRef} onChange={handleStampUpload} className="hidden" accept="image/*" />
                                                <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-[#f2efe9]/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                    <Camera size={16} className="text-stone-600" />
                                                </button>
                                            </div>

                                            <div className="mt-6 flex gap-2">
                                                <span className="px-2 py-1 border border-stone-300 text-[9px] font-mono text-stone-500 uppercase">Non-Fungible</span>
                                                <span className="px-2 py-1 border border-stone-300 text-[9px] font-mono text-stone-500 uppercase">Transferable</span>
                                            </div>
                                        </div>
                                        <div className="font-mono text-[10px] text-stone-400 opacity-60">
                                            {!walletAddress ? (
                                                <>
                                                    &gt; Awaiting signature...<br/>
                                                    &gt; Connect wallet to verify ownership...<br/>
                                                    <span className="animate-pulse">&gt; Access pending.</span>
                                                </>
                                            ) : (
                                                <>
                                                    &gt; Signature verified.<br/>
                                                    &gt; Verifying ownership...<br/>
                                                    <span className="text-stone-500">&gt; Access granted.</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 relative flex items-center justify-center bg-[#fcfbf9]">
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.02)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.02)_50%,rgba(0,0,0,0.02)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-50"></div>
                                        
                                        <div className={`relative w-80 aspect-[1.586] bg-stone-50 border border-stone-200 shadow-xl rotate-[-2deg] transform transition-all duration-500 ${walletAddress ? 'hover:rotate-0 hover:scale-105 hover:shadow-2xl opacity-100' : 'opacity-40 grayscale'} z-10 group`}>
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-80 pointer-events-none"></div>
                                            <div className="relative p-6 h-full flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${walletAddress ? 'bg-stone-800 group-hover:bg-[#4ade80]' : 'bg-stone-300'} transition-colors duration-500`}></span>
                                                            <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-stone-500">Identity Card</span>
                                                        </div>
                                                        <h3 className="font-serif text-2xl text-stone-900 mt-2">Mimi</h3>
                                                    </div>
                                                    <CheckCircle2 className="text-stone-300 group-hover:text-stone-800 transition-colors" size={24} />
                                                </div>
                                                <div className="flex items-center gap-4 my-2">
                                                    <div className="h-px bg-stone-300 flex-1"></div>
                                                    <div className="w-8 h-8 border border-stone-300 rounded-full flex items-center justify-center overflow-hidden">
                                                        {stampImage ? (
                                                            <img src={stampImage} className="w-full h-full object-cover mix-blend-multiply opacity-80" />
                                                        ) : (
                                                            <span className="font-serif italic text-stone-400 text-sm">M</span>
                                                        )}
                                                    </div>
                                                    <div className="h-px bg-stone-300 flex-1"></div>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-[7px] text-stone-400 uppercase mb-1">Holder</span>
                                                        <span className="font-mono text-xs text-stone-800 bg-stone-200/50 px-1 py-0.5">{walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : 'UNREGISTERED'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-mono text-[7px] text-stone-400 uppercase mb-1">Edition</span>
                                                        <span className="font-serif italic text-lg text-stone-800">{walletAddress ? 'No. 001' : '---'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute w-80 h-10 bg-black/10 blur-xl transform rotate-[-2deg] translate-y-24 translate-x-4"></div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {activeTab === 'transactions' && (
                             <motion.div 
                             key="transactions"
                             initial={{ opacity: 0, scale: 0.98 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 1.02 }}
                             transition={{ duration: 0.5 }}
                             className="relative w-full max-w-5xl h-full max-h-[600px] border border-stone-800 bg-stone-900/50 p-8 flex flex-col"
                         >
                            <div className="flex items-center justify-between mb-8 border-b border-stone-800 pb-4">
                                <div>
                                    <h2 className="font-serif text-2xl text-stone-200">Transaction Ledger</h2>
                                    <p className="font-mono text-[10px] text-stone-500 uppercase tracking-widest mt-1">Immutable Verification Audit</p>
                                </div>
                                <Hexagon className="text-stone-600" />
                            </div>
                            <div className="overflow-y-auto no-scrollbar flex-1 space-y-4 pr-4">
                                {Array.from({length: 8}).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 border border-stone-800 bg-stone-900/30 hover:bg-stone-800/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 border border-stone-700 bg-stone-800 flex items-center justify-center">
                                                <span className="font-mono text-[10px] text-stone-400">TX</span>
                                            </div>
                                            <div>
                                                <div className="font-mono text-sm text-stone-300">Contract Execution <span className="text-stone-600 ml-2">#{14293 + i}</span></div>
                                                <div className="font-mono text-[10px] text-stone-500 mt-1">From: 0x71... • To: 0x9B...</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-sm text-[#4ade80]">+0.00 ETH</div>
                                            <div className="font-mono text-[10px] text-stone-600 mt-1">Confirmed</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </motion.div>
                        )}
                        {activeTab === 'permissions' && (
                             <motion.div 
                             key="permissions"
                             initial={{ opacity: 0, scale: 0.98 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 1.02 }}
                             transition={{ duration: 0.5 }}
                             className="relative w-full max-w-5xl h-full max-h-[600px] border border-stone-800 bg-[#141416] p-8 flex flex-col"
                         >
                            <div className="flex items-center justify-between mb-8 border-b border-stone-800 pb-4">
                                <div>
                                    <h2 className="font-serif text-2xl text-stone-200">Access Governance</h2>
                                    <p className="font-mono text-[10px] text-stone-500 uppercase tracking-widest mt-1">Smart Contract Approvals</p>
                                </div>
                                <div className="px-3 py-1 bg-[#4ade80]/10 text-[#4ade80] font-mono text-[10px] uppercase tracking-widest border border-[#4ade80]/20">Active</div>
                            </div>
                            <div className="space-y-6 max-w-2xl">
                                <div className="border border-stone-800 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-mono text-sm text-stone-300 uppercase">Vault Controller</h3>
                                        <span className="text-[#4ade80] font-mono text-[10px]">Granted</span>
                                    </div>
                                    <p className="font-sans text-xs text-stone-500 leading-relaxed mb-4">Allows the connected application to read public ledger data and suggest aesthetic payloads.</p>
                                    <button className="font-mono text-[10px] uppercase tracking-widest text-[#ef4444] hover:text-white border border-[#ef4444]/50 hover:bg-[#ef4444]/20 px-4 py-2 transition-colors">Revoke Access</button>
                                </div>

                                <div className="border border-stone-800 p-6 opacity-50">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-mono text-sm text-stone-300 uppercase">Asset Manipulation</h3>
                                        <span className="text-stone-500 font-mono text-[10px]">Disabled</span>
                                    </div>
                                    <p className="font-sans text-xs text-stone-500 leading-relaxed">Permits the burning or transferring of minted assets inside the current registry cluster.</p>
                                </div>
                            </div>
                         </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="absolute bottom-10 right-12 text-right pointer-events-none hidden md:block z-20">
                        <p className="font-mono text-[9px] text-stone-600 uppercase tracking-[0.3em] mb-2 z-20 relative">Variant 2 of 3</p>
                        <p className="font-serif italic text-stone-500 text-xl z-20 relative">The Connected Vault</p>
                    </div>
                </main>
            </div>
        </div>
    );
};



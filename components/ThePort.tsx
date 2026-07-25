import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Network, ArrowRightLeft, Shield, Box, Activity, Fingerprint, Lock, Upload, Download, Copy, ExternalLink, X } from 'lucide-react';

interface ThePortProps {
    onClose?: () => void;
}

export const ThePort: React.FC<ThePortProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'assets' | 'transactions'>('assets');
    const [selectedAsset, setSelectedAsset] = useState<number | null>(null);

    const mockAssets = [
        { id: 1, name: 'Vol 01: The Quiet Earth', type: 'ERC-721', origin: 'Mimi Zine Vault', date: '2023-10-24' },
        { id: 2, name: 'Fragment: Morning Fog', type: 'ERC-1155', origin: 'Sovereign Curation', date: '2024-01-12' },
        { id: 3, name: 'Manifesto: Digital Permanence', type: 'MIMI-X', origin: 'Mother Tree Network', date: '2024-05-03' }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-[#09090b] text-stone-300 font-sans flex flex-col md:flex-row overflow-hidden"
        >
            {/* Background Texture Layers */}
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay" 
                 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'1\'/%3E%3C/svg%3E")' }} 
            />

            {/* Sidebar (The Binder) */}
            <aside className="w-full md:w-80 bg-[#18181b] border-r border-stone-800 flex flex-col relative z-20 shadow-[5px_0_15px_-5px_rgba(0,0,0,0.8)]">
                {/* Header */}
                <div className="p-8 border-b border-stone-800/50 relative">
                    {onClose && (
                        <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse"></div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-green-400">Port Active</span>
                    </div>
                    <h1 className="font-serif text-2xl text-stone-200 tracking-wide italic">The Port</h1>
                    <p className="font-mono text-[9px] text-stone-600 mt-1 uppercase tracking-wider">Secure Identity Archive</p>
                </div>

                {/* Identity Box */}
                <div className="p-8 flex flex-col items-center gap-4 border-b border-stone-800/50">
                    <div className="w-24 h-24 bg-stone-900 border border-stone-700 rotate-45 transform transition-transform hover:rotate-0 duration-700 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-stone-800/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Fingerprint size={32} className="text-stone-500 transform -rotate-45 group-hover:rotate-0 transition-transform duration-700 group-hover:text-green-400" />
                        <div className="absolute inset-0 border border-stone-600 opacity-50 m-1"></div>
                    </div>
                    
                    <div className="text-center w-full mt-4">
                        <div className="font-mono text-stone-400 text-xs mb-1 bg-stone-900/50 py-1 px-2 border border-stone-800 inline-block">0x71C...9A23</div>
                        <div className="flex justify-center gap-4 mt-2">
                            <button className="font-mono text-[9px] text-stone-500 hover:text-green-400 uppercase tracking-wider transition-colors flex items-center gap-1"><Copy size={10}/> Copy</button>
                            <button className="font-mono text-[9px] text-stone-500 hover:text-red-400 uppercase tracking-wider transition-colors">Disconnect</button>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-8 py-6 hidden md:block relative">
                    <ul className="space-y-6">
                        <li>
                            <button onClick={() => setActiveTab('assets')} className="w-full group">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`font-serif italic text-lg transition-colors ${activeTab === 'assets' ? 'text-white' : 'text-stone-500 group-hover:text-stone-300'}`}>Anchored Assets</span>
                                    <span className="font-mono text-[9px] text-stone-600">03</span>
                                </div>
                                <div className={`h-px w-full transition-colors ${activeTab === 'assets' ? 'bg-stone-500' : 'bg-stone-800 group-hover:bg-stone-600'}`}></div>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => setActiveTab('transactions')} className="w-full group">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`font-serif italic text-lg transition-colors ${activeTab === 'transactions' ? 'text-white' : 'text-stone-500 group-hover:text-stone-300'}`}>Telemetry</span>
                                    <span className="font-mono text-[9px] text-stone-600">88</span>
                                </div>
                                <div className={`h-px w-full transition-colors ${activeTab === 'transactions' ? 'bg-stone-500' : 'bg-stone-800 group-hover:bg-stone-600'}`}></div>
                            </button>
                        </li>
                    </ul>

                    {/* Commentary snippet */}
                    <div className="absolute bottom-8 left-8 right-8 border border-stone-800 p-4 bg-stone-900/30">
                        <div className="font-mono text-[8px] uppercase text-stone-500 mb-2 flex items-center gap-2">
                            <Network size={10} className="text-stone-400" />
                            Networking Ethos
                        </div>
                        <p className="font-sans text-[10px] text-stone-400 leading-relaxed">
                            A <strong className="text-stone-300">Port (n.)</strong> is a logical docking bay. In networking, it routes packets to specific processes. Here, it routes cryptographic taste-assets into your sovereign identity. You are the host; these assets are incoming packets forming the structure of your curatorial archive.
                        </p>
                    </div>
                </nav>
            </aside>

            {/* Main Stage */}
            <main className="flex-1 relative flex items-center justify-center bg-[#09090b] p-4 md:p-12 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'assets' ? (
                        <motion.div 
                            key="assets"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full max-w-4xl relative"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="font-serif text-3xl italic text-stone-200">Asset Manifest</h2>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mt-2">Dossier Collection</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 border border-stone-800 text-stone-400 px-4 py-2 font-mono text-[9px] uppercase tracking-widest hover:border-green-900 hover:text-green-400 transition-colors bg-stone-900/50">
                                        <Download size={12} /> Import File
                                    </button>
                                    <button className="flex items-center gap-2 border border-stone-800 text-stone-400 px-4 py-2 font-mono text-[9px] uppercase tracking-widest hover:border-stone-500 hover:text-stone-200 transition-colors bg-stone-900/50">
                                        <Upload size={12} /> Mint / Push Out
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {mockAssets.map((asset, index) => (
                                    <button 
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(asset.id)}
                                        className="text-left group relative bg-[#18181b] border border-stone-800 p-6 aspect-[3/4] flex flex-col hover:border-stone-500 transition-all duration-500 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] focus:outline-none"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                                            <Box size={40} />
                                        </div>
                                        <div className="flex justify-between items-start mb-auto">
                                            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 bg-black/40 px-2 py-1">{asset.type}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-stone-700 group-hover:bg-stone-400 transition-colors"></span>
                                        </div>
                                        
                                        <div className="relative z-10 pt-16 group-hover:-translate-y-2 transition-transform duration-500">
                                            <h3 className="font-serif italic text-xl text-stone-200 mb-2">{asset.name}</h3>
                                            <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest">ORG: {asset.origin}</p>
                                        </div>
                                        
                                        <div className="mt-8 border-t border-stone-800/80 pt-4 flex justify-between items-end">
                                            <span className="font-mono text-[8px] text-stone-600 uppercase">Acquired: {asset.date}</span>
                                            <span className="font-mono text-[8px] text-green-500/50 uppercase group-hover:text-green-400 transition-colors">Verified</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="transactions"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full max-w-4xl"
                        >
                            <div className="mb-8 border-b border-stone-800 pb-4">
                                <h2 className="font-serif text-3xl italic text-stone-200">Network Telemetry</h2>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mt-2">I/O Logs & Handshakes</p>
                            </div>
                            
                            <div className="space-y-1">
                                {[1, 2, 3, 4, 5].map((_, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between border border-stone-800/40 bg-stone-900/10 p-4 hover:bg-stone-900/40 transition-colors">
                                        <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                            <ArrowRightLeft size={14} className={i % 2 === 0 ? "text-green-500/50" : "text-stone-500"} />
                                            <div>
                                                <div className="font-mono text-[10px] text-stone-300">0x{Math.floor(Math.random()*1000000).toString(16)}...{Math.floor(Math.random()*10000).toString(16)}</div>
                                                <div className="font-sans text-[11px] text-stone-500">{i % 2 === 0 ? 'Inbound Packet (Import)' : 'Outbound Signal (Mint)'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 sm:text-right">
                                            <div className="font-mono text-[9px] uppercase tracking-widest text-stone-600">Block {1849204 + i}</div>
                                            <div className="font-mono text-[9px] text-green-500 bg-green-950/20 px-2 py-1 border border-green-900/30">Confirmed</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Selected Asset Modal overlay (Simplified) */}
                <AnimatePresence>
                    {selectedAsset && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setSelectedAsset(null)}
                        >
                            <motion.div 
                                initial={{ y: 20, scale: 0.95 }}
                                animate={{ y: 0, scale: 1 }}
                                exit={{ y: 20, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#e5e0d6] w-full max-w-2xl border border-stone-400 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] flex flex-col text-stone-800 relative"
                            >
                                <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>
                                
                                <div className="p-6 md:p-12 relative z-10 flex flex-col md:flex-row gap-8">
                                    {/* Asset Card Graphic */}
                                    <div className="w-48 xl:w-64 aspect-[3/4] bg-[#f0ebe0] border border-stone-300 shadow-[2px_4px_15px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-6 mx-auto">
                                        <span className="font-display italic text-stone-400 text-3xl mb-4">M</span>
                                        <div className="text-center w-full mt-auto">
                                            <div className="h-px w-full bg-stone-300 mb-2"></div>
                                            <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">Mimi-X Protocol</span>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 flex flex-col">
                                        <div className="mb-6 pb-4 border-b border-stone-300">
                                            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 mb-1 block">Sovereign Artifact</span>
                                            <h2 className="font-serif text-2xl italic tracking-wide text-stone-900">{mockAssets.find(a => a.id === selectedAsset)?.name}</h2>
                                        </div>

                                        <div className="space-y-4 font-mono text-[10px] text-stone-600 mb-8">
                                            <div>
                                                <span className="uppercase tracking-widest text-stone-400 block mb-1">Contract Address</span>
                                                <div className="flex items-center gap-2 bg-stone-200/50 p-2 border border-stone-300">
                                                    0x71C7656EC7ab88b098defB...
                                                    <Copy size={12} className="ml-auto cursor-pointer hover:text-stone-800" />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="uppercase tracking-widest text-stone-400 block mb-1">Token Standard</span>
                                                <div className="bg-stone-200/50 p-2 border border-stone-300">
                                                    {mockAssets.find(a => a.id === selectedAsset)?.type}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex gap-4">
                                            <button className="flex-1 border border-stone-400 text-stone-700 py-3 uppercase tracking-widest font-mono text-[9px] hover:bg-stone-200 hover:text-stone-900 transition-colors flex justify-center items-center gap-2">
                                                <Shield size={12} /> Verify Ledger
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedAsset(null)}
                                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 z-20"
                                >
                                    <X size={16} />
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </motion.div>
    );
};

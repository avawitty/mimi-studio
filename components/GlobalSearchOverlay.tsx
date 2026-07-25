// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Archive, Briefcase, FileText, ChevronRight, Loader2, Radio, Network, Globe, Lock } from 'lucide-react';
import { getLocalZines, getLocalPocket } from '../services/localArchive';
import { fetchUserZines, fetchPocketItems } from '../services/firebase';
import { ZineMetadata, PocketItem } from '../types';
import { useUser } from '../contexts/UserContext';

export const GlobalSearchOverlay: React.FC<{ isOpen: boolean; onClose: () => void; onSelectZine: (z: ZineMetadata) => void }> = ({ isOpen, onClose, onSelectZine }) => {
 const { user } = useUser();
 const [query, setQuery] = useState('');
 const [loading, setLoading] = useState(false);
 const [results, setResults] = useState<{ zines: ZineMetadata[], pocket: PocketItem[] }>({ zines: [], pocket: [] });

 const [allData, setAllData] = useState<{ zines: ZineMetadata[], pocket: PocketItem[] }>({ zines: [], pocket: [] });

 useEffect(() => {
 if (isOpen) {
 setLoading(true);
 const load = async () => {
 const localZines = await getLocalZines() || [];
 const localPocket = await getLocalPocket() || [];
 let cloudZines = [];
 let cloudPocket = [];
 
 if (user && !user.isAnonymous) {
 cloudZines = await fetchUserZines(user.uid) || [];
 cloudPocket = await fetchPocketItems(user.uid) || [];
 }

 const zinesMap = new Map();
 [...localZines, ...cloudZines].forEach(z => z && z.id && zinesMap.set(z.id, z));
 
 const pocketMap = new Map();
 [...localPocket, ...cloudPocket].forEach(p => p && p.id && pocketMap.set(p.id, p));

 setAllData({ 
 zines: Array.from(zinesMap.values()), 
 pocket: Array.from(pocketMap.values()) 
 });
 setLoading(false);
 };
 load().catch(e => {
 console.error("MIMI // GlobalSearch load failed", e);
 setLoading(false);
 });
 }
 }, [isOpen, user]);

 const filtered = useMemo(() => {
 if (!query.trim()) return { zines: [], pocket: [], isWalletSearch: false };
 const q = query.toLowerCase();
 
 const isWalletSearch = q.includes('wallet') || q.includes('ledger') || q.includes('crypto') || q.includes('mother tree');

 return {
 isWalletSearch,
 zines: allData.zines.filter(z => 
 z.title.toLowerCase().includes(q) || 
 (z.content?.headlines?.[0] && z.content.headlines[0].toLowerCase().includes(q)) ||
 z.tone.toLowerCase().includes(q) ||
 JSON.stringify(z.content).toLowerCase().includes(q)
 ).slice(0, 10),
 pocket: allData.pocket.filter(p => 
 (p.content.prompt || p.content.name || '').toLowerCase().includes(q) ||
 (p.notes || '').toLowerCase().includes(q)
 ).slice(0, 15)
 };
 }, [allData, query]);

 if (!isOpen) return null;

 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[12000] bg-white/95 /98 backdrop-blur-3xl flex flex-col items-center p-6 md:p-12 overflow-hidden"
 >
 <div className="w-full max-w-4xl flex flex-col h-full">
 <header className="flex justify-between items-center mb-12 shrink-0">
 <div className="flex items-center gap-4 text-nous-subtle">
 <Search size={18} />
 <span className="font-sans text-[10px] uppercase tracking-[0.5em] font-black italic">Global Registry Audit</span>
 </div>
 <button onClick={onClose} className="p-3 bg-nous-base rounded-none hover:bg-red-500 hover:text-nous-text transition-all"><X size={20}/></button>
 </header>

 <div className="relative mb-16 shrink-0">
 <input 
 autoFocus
 type="text"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Trace an artifact by intent or form..."
 className="w-full bg-transparent border-b-2 border-nous-border py-8 font-serif italic text-3xl md:text-6xl text-nous-text  focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-all placeholder:text-nous-text"
 />
 {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-nous-subtle"/></div>}
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar space-y-16 pb-32">
 {query.trim() ? (
 <>
 {filtered.isWalletSearch && (
 <section className="space-y-8 mb-12">
 <div className="flex items-center gap-3 text-green-500">
 <Network size={14} className="animate-pulse" />
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Sovereign Identity Protocol</span>
 </div>
 <button 
 onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('mimi:open_port')); }}
 className="w-full text-left p-6 bg-stone-900 border border-green-900/50 hover:border-green-500 transition-all flex flex-col md:flex-row justify-between items-start md:items-center group gap-6 relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-green-500">
 <Globe size={160} />
 </div>

 <div className="space-y-2 relative z-10">
 <div className="flex items-center gap-2">
 <Lock size={14} className="text-stone-400 group-hover:text-green-500 transition-colors" />
 <h4 className="font-serif italic text-xl text-stone-200 group-hover:text-white transition-colors">Access The Port</h4>
 </div>
 <p className="font-sans text-[10px] uppercase tracking-widest text-stone-500">Manage Editorial Ledger • Secure Taste Architecture • Contribute to Global Patterning</p>
 </div>
 
 <div className="relative z-10 flex items-center gap-4">
 <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-green-600/50 group-hover:text-green-400 transition-colors">Enter Port Terminal</span>
 <div className="w-10 h-10 border border-green-900/50 group-hover:border-green-500 flex items-center justify-center transition-colors">
 <ChevronRight size={14} className="text-green-600/50 group-hover:text-green-400 transition-all group-hover:translate-x-1" />
 </div>
 </div>
 </button>
 </section>
 )}

 {filtered.zines.length > 0 && (
 <section className="space-y-8">
 <div className="flex items-center gap-3 text-nous-subtle">
 <FileText size={14} />
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Authored Manifests</span>
 </div>
 <div className="grid gap-4">
 {filtered.zines.map(z => (
 <button 
 key={z.id} 
 onClick={() => { onSelectZine(z); onClose(); }}
 className="w-full text-left p-6 bg-white border border-nous-border rounded-none hover:border-nous-border transition-all flex justify-between items-center group"
 >
 <div className="space-y-1">
 <h4 className="font-serif italic text-xl text-nous-text text-nous-text">{z.content?.headlines?.[0] || z.title ||"Untitled"}</h4>
 <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle">{z.tone} // {new Date(z.timestamp).toLocaleDateString()}</span>
 </div>
 <ChevronRight size={14} className="text-nous-subtle group-hover:translate-x-1 transition-transform"/>
 </button>
 ))}
 </div>
 </section>
 )}

 {filtered.pocket.length > 0 && (
 <section className="space-y-8">
 <div className="flex items-center gap-3 text-amber-500">
 <Archive size={14} />
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Archival Shards</span>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filtered.pocket.map(p => (
 <div 
 key={p.id} 
 className="p-5 bg-nous-base /50 border border-nous-border rounded-none flex gap-4 items-center group cursor-help"
 >
 <div className="w-12 h-12 bg-black overflow-hidden rounded-none flex-shrink-0">
 {p.type === 'image' && <img src={p.content.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0"/>}
 {p.type !== 'image' && <div className="w-full h-full flex items-center justify-center text-nous-subtle"><Radio size={16}/></div>}
 </div>
 <div className="flex-1 min-w-0">
 <h5 className="font-serif italic text-sm text-nous-subtle truncate">{p.content.prompt || p.content.name || 'Untitled'}</h5>
 <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">{p.type}</span>
 </div>
 </div>
 ))}
 </div>
 </section>
 )}

 {filtered.zines.length === 0 && filtered.pocket.length === 0 && (
 <div className="py-24 text-center opacity-30 space-y-6">
 <Radio size={48} className="mx-auto"/>
 <p className="font-serif italic text-2xl">“The query yielded no resonance.”</p>
 </div>
 )}
 </>
 ) : (
 <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-8 py-20">
 <div className="p-10 border border-nous-border rounded-none">
 <Archive size={64} strokeWidth={1} />
 </div>
 <div className="space-y-2 text-center">
 <p className="font-serif italic text-3xl">Search Sovereign Registry.</p>
 <p className="font-sans text-[9px] uppercase tracking-widest font-black">All Authored and Curated Material</p>
 </div>
 </div>
 )}
 </div>
 
 <footer className="shrink-0 h-20 border-t border-nous-border flex items-center justify-center">
 <p className="font-serif italic text-nous-subtle text-sm">"The archive is a mirror of consistent intent."</p>
 </footer>
 </div>
 </motion.div>
 );
};

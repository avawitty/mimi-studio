
// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchCommunityZines } from '../services/firebase';
import { ZineMetadata } from '../types';
import { useUser } from '../contexts/UserContext';
import { Search, Globe, Radio, Zap, ArrowUpRight, Loader2, RefreshCw, Hash, Eye, LayoutGrid, Layers, Ghost } from 'lucide-react';
import { ZineCoverCard } from './ZineCoverCard';

const TICKER_ITEMS = [
"SIGNAL_DENSITY: HIGH",
"MEMETIC_DRIFT: STABLE",
"CURRENT_ERA: POST-AUTHENTICITY",
"ARCHETYPE_TREND: NOIR_SURREALISM",
"GLOBAL_SYNC: 98.4%",
"DEBRIS_INDEX: OPTIMAL"
];

export const TheStand: React.FC<{ onSelectZine: (zine: ZineMetadata) => void }> = ({ onSelectZine }) => {
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<'FRESH' | 'TRENDING' | 'DEEP'>('FRESH');
 const [searchQuery, setSearchQuery] = useState('');

 useEffect(() => {
 const load = async () => {
 setLoading(true);
 try {
 // Fetching more to populate the masonry
 const data = await fetchCommunityZines(40);
 setZines(data || []);
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };
 load();
 }, []);

 const filteredZines = useMemo(() => {
 let result = zines;
 
 if (searchQuery) {
 const q = searchQuery.toLowerCase();
 result = result.filter(z => 
 z.title.toLowerCase().includes(q) || 
 (z.content?.headlines?.[0] && z.content.headlines[0].toLowerCase().includes(q)) ||
 z.tone.toLowerCase().includes(q) ||
 z.userHandle.toLowerCase().includes(q)
 );
 }

 if (filter === 'TRENDING') {
 // Mock trending logic - typically this would sort by likes/views
 return [...result].sort((a, b) => (b.likes || 0) - (a.likes || 0));
 }
 
 // Default FRESH (Time sort)
 return [...result].sort((a, b) => b.timestamp - a.timestamp);
 }, [zines, filter, searchQuery]);

 return (
 <div className="flex-1 w-full h-full flex flex-col bg-nous-base dark:bg-nous-base transition-colors duration-1000 relative overflow-hidden">
 
 {/* GLOBAL TICKER */}
 <div className="w-full h-8 bg-nous-text text-nous-base flex items-center overflow-hidden border-b border-black/5 shrink-0 z-20">
 <div className="flex items-center px-4 h-full bg-nous-base0 text-white shrink-0 font-sans text-[9px] uppercase tracking-widest font-black gap-2">
 <Radio size={10} className="animate-pulse"/> Live Wire
 </div>
 <div className="flex-1 relative overflow-hidden">
 <motion.div 
 animate={{ x: [0, -1000] }}
 transition={{ duration: 30, repeat: Infinity, ease:"linear"}}
 className="absolute top-0 left-0 h-full flex items-center whitespace-nowrap gap-12"
 >
 {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
 <span key={i} className="font-mono text-[9px] uppercase tracking-widest opacity-80">{item}</span>
 ))}
 </motion.div>
 </div>
 </div>

 {/* MAIN CONTENT */}
 <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
 
 {/* HEADER HERO */}
 <header className="px-6 md:px-16 pt-16 md:pt-24 pb-12">
 <div className="flex flex-col gap-8">
 <div className="flex justify-between items-start">
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Globe size={16} />
 <span className="font-sans text-[10px] uppercase tracking-[0.4em] font-black italic">Global Signal Exchange</span>
 </div>
 <h1 className="font-serif text-7xl md:text-[10rem] italic tracking-tighter text-nous-text  leading-[0.8] mix-blend-difference">
 The Stand.
 </h1>
 </div>
 <div className="hidden md:flex flex-col items-end gap-2">
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Vol. 44</span>
 <span className="font-serif italic text-2xl text-nous-text text-nous-text">{new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
 </div>
 </div>

 <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-12 border-b border-nous-border pb-6">
 {/* FILTER TABS */}
 <div className="flex gap-8">
 {['FRESH', 'TRENDING', 'DEEP'].map(f => (
 <button 
 key={f} 
 onClick={() => setFilter(f as any)}
 className={`font-sans text-[10px] uppercase tracking-[0.2em] font-black pb-2 transition-all ${filter === f ? 'text-nous-subtle border-b-2 border-nous-border' : 'text-nous-subtle hover:text-nous-subtle border-b-2 border-transparent'}`}
 >
 {f}
 </button>
 ))}
 </div>

 {/* SEARCH */}
 <div className="relative group w-full md:w-auto">
 <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-nous-subtle group-focus-within:text-nous-subtle transition-colors"/>
 <input 
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="FILTER SIGNAL..."
 className="w-full md:w-64 bg-transparent border-b border-nous-border py-2 pl-6 font-mono text-xs focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-colors uppercase placeholder:text-nous-subtle"
 />
 </div>
 </div>
 </div>
 </header>

 {/* MASONRY GRID */}
 <div className="px-4 md:px-12">
 {loading ? (
 <div className="py-48 flex flex-col items-center justify-center gap-6 opacity-50">
 <Loader2 size={32} className="animate-spin text-nous-subtle"/>
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black">Syncing Global Feed...</span>
 </div>
 ) : filteredZines.length === 0 ? (
 <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-30">
 <Ghost size={48} />
 <p className="font-serif italic text-2xl">No signal found on this frequency.</p>
 </div>
 ) : (
 <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
 {filteredZines.map((zine, i) => (
 <div key={zine.id} className="break-inside-avoid">
 <ZineCoverCard 
 zine={zine} 
 onClick={() => onSelectZine(zine)} 
 />
 </div>
 ))}
 </div>
 )}
 </div>

 <footer className="mt-32 border-t border-nous-border py-12 text-center opacity-40">
 <p className="font-serif italic text-xs">"We are what we behold."</p>
 </footer>
 </div>
 </div>
 );
};

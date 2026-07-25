import React, { useState, useEffect, useMemo } from 'react';
import { ZineMetadata } from '../types';
import { fetchCommunityZines } from '../services/firebase';
import Fuse from 'fuse.js';

interface ArchetypeIndexProps {
 onSelectZine: (zine: ZineMetadata) => void;
}

const COLOR_MAP: Record<string, { color: string, key: string }> = {
 'VOID': { color: '#0F0F0F', key: 'The Void' },
 'SOMNAMBULIST': { color: '#E6E6FA', key: 'The Somnambulist' },
 'ARCHIVIST': { color: '#A84832', key: 'The Archivist' },
 'PRISM': { color: '#E5E4E8', key: 'The Prism' },
 'BOTANIST': { color: '#4F7942', key: 'The Botanist' },
 'ECHO': { color: '#A3B1C6', key: 'The Echo' },
 'NOIR': { color: '#800000', key: 'The Noir' },
};

export const ArchetypeIndex: React.FC<ArchetypeIndexProps> = ({ onSelectZine }) => {
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [search, setSearch] = useState('');
 const [loading, setLoading] = useState(true);
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);

 useEffect(() => {
 fetchCommunityZines(100).then((data) => {
 setZines(data);
 setLoading(false);
 }).catch(e => {
 console.error("MIMI // Failed to fetch community zines", e);
 setLoading(false);
 });
 }, []);

 const fuse = useMemo(() => new Fuse(zines, {
 keys: ['title', 'content.taste_context.active_archetype', 'content.vocal_summary_blurb'],
 threshold: 0.3,
 }), [zines]);

 const filtered = useMemo(() => {
 let result = zines;
 
 if (search) {
 result = fuse.search(search).map(r => r.item);
 }

 return result.filter(z => {
 const archetype = z.content.taste_context?.active_archetype?.toLowerCase() || '';

 // Color/Archetype Filter
 let matchesColor = true;
 if (selectedColorFilter) {
 const targetKey = COLOR_MAP[selectedColorFilter]?.key.toLowerCase();
 if (targetKey) {
 matchesColor = archetype.includes(targetKey.replace('the ', ''));
 }
 }

 let matchesDate = true;
 if (startDate) {
 const [y, m, d] = startDate.split('-').map(Number);
 const start = new Date(y, m - 1, d).getTime();
 matchesDate = matchesDate && z.timestamp >= start;
 }
 if (endDate) {
 const [y, m, d] = endDate.split('-').map(Number);
 const end = new Date(y, m - 1, d);
 end.setHours(23, 59, 59, 999);
 matchesDate = matchesDate && z.timestamp <= end.getTime();
 }

 return matchesDate && matchesColor;
 });
 }, [zines, search, startDate, endDate, selectedColorFilter, fuse]);

 const handleSynthesize = () => {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message: `Synthesizing ${filtered.length} archetypes...`, type: 'success' } 
 }));
 };

 return (
 <div className="w-full max-w-5xl mx-auto px-6 md:px-12 animate-fade-in pt-12 pb-24">
 <div className="mb-12 border-b border-nous-border pb-8">
 <div className="flex justify-between items-end mb-8">
 <div>
 <h2 className="font-serif text-3xl italic text-nous-text mb-2">Archetype Index</h2>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle">
 The compendium of detected states.
 </p>
 </div>
 {filtered.length > 0 && (
 <button 
 onClick={handleSynthesize}
 className="px-6 py-3 bg-nous-text text-nous-base font-sans text-[9px] uppercase tracking-widest font-black rounded-none hover:bg-stone-600 transition-all"
 >
 Synthesize {filtered.length}
 </button>
 )}
 </div>
 
 <div className="space-y-8">
 
 {/* Color Wheel Filter */}
 <div className="flex flex-col gap-3">
 <label className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">Filter by Frequency</label>
 <div className="flex gap-3 flex-wrap">
 {Object.entries(COLOR_MAP).map(([key, data]) => (
 <button 
 key={key}
 onClick={() => setSelectedColorFilter(selectedColorFilter === key ? null : key)}
 className={`w-8 h-8 rounded-none border border-nous-border transition-all duration-300 relative group ${selectedColorFilter === key ? 'ring-2 ring-offset-2 ring-nous-text scale-110' : 'hover:scale-105'}`}
 style={{ backgroundColor: data.color }}
 title={data.key}
 >
 {selectedColorFilter === key && (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-1.5 h-1.5 bg-white rounded-none"/>
 </div>
 )}
 <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[8px] uppercase tracking-widest whitespace-nowrap bg-white px-2 py-0.5 rounded-none transition-opacity pointer-events-none z-10">
 {data.key}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Keywords Search */}
 <div className="flex flex-col gap-2">
 <label className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">Search Keywords</label>
 <input 
 type="text"
 placeholder="e.g. 'Velvet', 'Digital', 'Rot'..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-nous-base border-b border-nous-border p-4 font-serif text-lg focus:outline-none focus:border-nous-text transition-colors"
 />
 </div>

 {/* Date Filter */}
 <div className="flex flex-wrap items-end gap-6 pt-4">
 <div className="flex flex-col gap-2">
 <label className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">From</label>
 <input 
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="bg-transparent border-b border-nous-border py-2 font-sans text-xs uppercase tracking-widest text-nous-text focus:outline-none focus:border-nous-text"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">To</label>
 <input 
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="bg-transparent border-b border-nous-border py-2 font-sans text-xs uppercase tracking-widest text-nous-text focus:outline-none focus:border-nous-text"
 />
 </div>
 
 {(startDate || endDate || selectedColorFilter || search) && (
 <button 
 onClick={() => { setStartDate(''); setEndDate(''); setSelectedColorFilter(null); setSearch(''); }}
 className="mb-2 font-sans text-[9px] uppercase tracking-widest text-red-400 hover:text-red-600 border-b border-transparent hover:border-red-600 transition-colors"
 >
 Clear Filters
 </button>
 )}
 </div>
 </div>
 </div>

 {loading ? (
 <div className="text-center py-12 font-sans text-[10px] uppercase tracking-widest text-nous-subtle">
 Accessing Archives...
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4">
 {filtered.length === 0 ? (
 <p className="text-center font-serif italic text-nous-subtle py-12">No archetypes found matching these coordinates.</p>
 ) : (
 <div className="border-t border-nous-border">
 {filtered.map((zine) => (
 <div 
 key={zine.id}
 onClick={() => onSelectZine(zine)}
 className="group flex flex-col md:flex-row md:items-center justify-between py-6 border-b border-nous-border hover:bg-nous-base transition-colors cursor-pointer px-4"
 >
 <div className="flex items-baseline gap-6 flex-1">
 <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle w-24 shrink-0">
 {new Date(zine.timestamp).toLocaleDateString()}
 </span>
 <div className="flex flex-col gap-1">
 <span className="font-serif text-xl text-nous-text group-hover:italic transition-all">
 {zine.content.taste_context?.active_archetype ||"Unknown State"}
 </span>
 <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle/50">
 {zine.title}
 </span>
 </div>
 </div>
 
 <div className="mt-4 md:mt-0 flex items-center gap-3 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
 <img 
 src={zine.userAvatar || `https://ui-avatars.com/api/?name=${zine.userHandle}`}
 alt={zine.userHandle}
 className="w-5 h-5 rounded-none border border-nous-border"
 />
 <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">
 {zine.userHandle}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
};

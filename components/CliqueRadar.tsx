
// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchCommunityZines } from '../services/firebase';
import { generateSeasonReport, generateAestheticSiblings } from '../services/geminiService';
import { ZineMetadata, SeasonReport, ProsceniumRole } from '../types';
import { Radio, Activity, Clock, Shield, Eye, MessageSquare, Headphones, Loader2, Zap, ChevronRight, Sparkles, Layers, PenTool, Wind, Map, Info, Orbit, Users } from 'lucide-react';
import { ZineCard } from './ZineCard';
import { useUser } from '../contexts/UserContext';

export const CliqueRadar: React.FC<{ onSelectZine: (zine: ZineMetadata) => void }> = ({ onSelectZine }) => {
 const { profile } = useUser();
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [report, setReport] = useState<SeasonReport | null>(null);
 const [siblings, setSiblings] = useState<{ name: string; explanation: string }[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeIndex, setActiveIndex] = useState(0);
 const [syncLevel, setSyncLevel] = useState(90);

 useEffect(() => {
 const loadRadar = async () => {
 setLoading(true);
 try {
 const data = await fetchCommunityZines(30);
 setZines(data || []);
 if (data && data.length > 0) {
 try {
 const r = await generateSeasonReport(profile, data.slice(0, 10));
 setReport(r);
 } catch (re) {}
 }
 if (profile?.tasteVector) {
 try {
 const s = await generateAestheticSiblings(profile.tasteVector);
 setSiblings(s);
 } catch (se) {}
 }
 } catch (e) {} finally { setLoading(false); }
 };
 loadRadar();

 const interval = setInterval(() => {
 setSyncLevel(prev => Math.min(100, Math.max(70, prev + (Math.random() - 0.5) * 5)));
 }, 3000);

 return () => clearInterval(interval);
 }, [profile?.tasteVector]);

 const activeZine = zines[activeIndex];
 const queue = zines.filter((_, i) => i !== activeIndex).slice(0, 8);

 if (loading) return (
 <div className="w-full h-full flex flex-col items-center justify-center gap-12 bg-nous-base">
 <Loader2 className="animate-spin text-nous-subtle"size={32} />
 <span className="font-sans text-[8px] uppercase tracking-[0.6em] text-nous-subtle font-black">Connecting Continuum...</span>
 </div>
 );

 return (
 <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar relative bg-nous-base transition-colors duration-1000">
 
 {/* CONTINUUM SIGNAL LOOP (BACKGROUND) */}
 <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center overflow-hidden">
 <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="border-[0.5px] border-nous-border  w-[1200px] h-[1200px] rounded-none flex items-center justify-center">
 <div className="w-px h-full bg-current absolute"/>
 <div className="h-px w-full bg-current absolute"/>
 </motion.div>
 </div>

 <div className="flex-1 max-w-7xl mx-auto w-full px-8 pt-12 md:pt-20 pb-64 relative z-10">
 
 <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-32 border-b border-nous-border pb-16 gap-12">
 <div className="space-y-6">
 <div className="flex items-center gap-6">
 <span className="font-sans text-[10px] uppercase tracking-[1em] text-red-500 font-black flex items-center gap-4">
 <Radio size={14} className="animate-pulse"/> CONTINUUM_ACTIVE
 </span>
 </div>
 <h2 className="font-serif text-6xl md:text-[10rem] italic tracking-tighter text-nous-text  leading-[0.8] -ml-2">
 The Floor.
 </h2>
 </div>
 </header>

 <div className="mb-64 relative">
 <AnimatePresence mode="wait">
 {activeZine && (
 <motion.div key={activeZine.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 1.2 }}>
 <ZineCard zine={activeZine} onClick={() => onSelectZine(activeZine)} isSocialFloor />
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {siblings.length > 0 && (
 <div className="mb-64">
 <h3 className="font-sans text-[10px] uppercase tracking-[0.5em] text-nous-subtle font-black mb-12 flex items-center gap-4">
 <Users size={14} /> Aesthetic Siblings
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
 {siblings.map((sibling, i) => (
 <div key={i} className="border-l border-nous-border pl-8">
 <h4 className="font-serif italic text-3xl text-nous-text text-nous-text mb-4">{sibling.name}</h4>
 <p className="font-sans text-[10px] leading-relaxed text-nous-subtle">{sibling.explanation}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
 {queue.map((zine, i) => (
 <div key={zine.id} onClick={() => setActiveIndex(zines.indexOf(zine))} className="group cursor-pointer border-l-2 border-stone-50 pl-8 py-4 hover:border-nous-text transition-all">
 <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">@{zine.userHandle}</span>
 <h3 className="font-serif italic text-2xl text-nous-subtle group-hover:text-nous-text transition-colors">{zine.content?.headlines?.[0] || zine.title ||"Untitled"}</h3>
 </div>
 ))}
 </div>
 </div>

 <div className="fixed bottom-0 left-0 w-full z-[100] border-t border-nous-border bg-white/95 /95 backdrop-blur-3xl px-12 py-10 flex justify-between items-center">
 <div className="flex items-center gap-6">
 <Zap size={20} className="text-amber-500 animate-pulse"/>
 <div className="space-y-1">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle block">Collective Sync</span>
 <div className="w-64 h-1 bg-nous-base rounded-none overflow-hidden">
 <motion.div animate={{ width: `${syncLevel}%` }} className="h-full bg-nous-base0"/>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <Orbit size={18} className="text-nous-subtle"/>
 <span className="font-mono text-[10px] text-nous-subtle font-black tracking-widest uppercase">Continuum Handshake: {syncLevel.toFixed(1)}%</span>
 </div>
 </div>
 </div>
 );
};

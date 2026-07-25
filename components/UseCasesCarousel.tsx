
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shirt, Camera, Heart, Briefcase, ChevronLeft, ChevronRight, Zap, Target, PenTool, Layout, Layers, Box, Sparkles } from 'lucide-react';

const USE_CASES = [
 {
 id: 'social-manager',
 title:"Sovereign Social Manager",
 icon: <Sparkles size={20} />,
 description:"The savior for the multi-hyphenate lead who wears many hats. Generate presentable concepts on the fly while pinpointing semiotic resonance for your audience frequency.",
 tag:"Velocity Strategy"
 },
 {
 id: 'stylist',
 title:"The Strategist's Manifest",
 icon: <Layout size={20} />,
 description:"Translate abstract concepts into executable Dossiers. Prepare for high-end production by auditing motifs and generating narrative-aligned roadmaps for collaborators.",
 tag:"Professional Workflow"
 },
 {
 id: 'influencer',
 title:"Sovereign Branding",
 icon: <Target size={20} />,
 description:"For the creator positioning themselves in the collective field. Curate a personal taste profile that justifies your presence in the feed through structural intent.",
 tag:"Personal Identity"
 },
 {
 id: 'business',
 title:"Archival Infrastructure",
 icon: <Layers size={20} />,
 description:"Businesses utilize Dossier stacks to architect user personas and future-state product lines, translating debris into defensible strategic vision.",
 tag:"Strategic Vision"
 }
];

export const UseCasesCarousel: React.FC = () => {
 const [index, setIndex] = useState(0);

 useEffect(() => {
 const timer = setInterval(() => {
 setIndex((prev) => (prev + 1) % USE_CASES.length);
 }, 8000);
 return () => clearInterval(timer);
 }, []);

 const next = () => setIndex((prev) => (prev + 1) % USE_CASES.length);
 const prev = () => setIndex((prev) => (prev - 1 + USE_CASES.length) % USE_CASES.length);

 const active = USE_CASES[index];

 return (
 <div className="w-full bg-white border border-nous-border rounded-none p-8 md:p-12 relative overflow-hidden">
 <div className="absolute top-0 right-0 p-8 opacity-5">
 <Box size={120} />
 </div>
 
 <AnimatePresence mode="wait">
 <motion.div 
 key={index}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="space-y-8"
 >
 <div className="flex items-center gap-4">
 <div className="p-3 bg-nous-base rounded-none text-nous-accent">
 {active.icon}
 </div>
 <div>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">{active.tag}</span>
 <h4 className="font-serif text-2xl italic tracking-tighter text-nous-text ">{active.title}</h4>
 </div>
 </div>
 
 <p className="font-serif italic text-xl text-nous-subtle leading-snug max-w-xl">
"{active.description}"
 </p>
 </motion.div>
 </AnimatePresence>

 <div className="flex gap-4 mt-12">
 <button onClick={prev} className="p-2 border border-nous-border rounded-none text-nous-subtle hover:text-nous-text transition-all"><ChevronLeft size={16} /></button>
 <button onClick={next} className="p-2 border border-nous-border rounded-none text-nous-subtle hover:text-nous-text transition-all"><ChevronRight size={16} /></button>
 <div className="flex-1 flex items-center justify-end gap-2">
 {USE_CASES.map((_, i) => (
 <div key={i} className={`w-1.5 h-1.5 rounded-none transition-all ${i === index ? 'bg-nous-accent w-4' : 'bg-stone-200'}`} />
 ))}
 </div>
 </div>
 </div>
 );
};

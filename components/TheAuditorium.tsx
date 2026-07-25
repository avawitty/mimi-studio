
// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Tv, Youtube, Monitor, ShieldAlert, Sparkles, CornerDownRight, Activity, Zap, ExternalLink, X, Film } from 'lucide-react';

const EPISODES = [
 {
 id: 'ep1',
 title:"The Oracle & The Simulation",
 episode:"Episode 1",
 desc:"The foundational manifest. Reframing reality as a mediated feedback loop.",
 link:"https://youtube.com/watch?v=EPISODE_1_LINK",
 status:"ARCHIVED"
 },
 {
 id: 'ep2',
 title:"The Algorithm of Attention",
 episode:"Episode 2",
 desc:"Deconstructing the thermal limit of digital observation.",
 link:"https://youtube.com/watch?v=EPISODE_2_LINK",
 status:"ARCHIVED"
 },
 {
 id: 'ep3',
 title:"What Your Memes Think Of You",
 episode:"Episode 3",
 desc:"The ROI of being seen. Reconciling with the high-fidelity .",
 link:"https://youtube.com/watch?v=EPISODE_3_LINK",
 status:"ARCHIVED"
 },
 {
 id: 'ep4',
 title:"Morality Online",
 episode:"Episode 4",
 desc:"Refusal of pedestrian projection. The final structural requirement.",
 link:"https://youtube.com/watch?v=EPISODE_4_LINK",
 status:"ARCHIVED"
 }
];

export const TheAuditorium: React.FC = () => {
 const [activeEp, setActiveEp] = useState(EPISODES[0]);

 return (
 <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar pb-64 px-6 md:px-16 pt-12 md:pt-20">
 <div className="max-w-7xl mx-auto space-y-16">
 
 <header className="space-y-6">
 <div className="flex items-center gap-4 text-nous-subtle">
 <Film size={20} className="text-amber-500"/>
 <span className="font-sans text-[10px] uppercase tracking-[0.5em] font-black italic">The Auditorium</span>
 </div>
 <h2 className="font-serif text-6xl md:text-9xl italic tracking-tighter luminescent-text leading-none">The Signal Reel.</h2>
 <p className="font-serif italic text-xl md:text-3xl text-nous-subtle max-w-2xl leading-tight">
 Witness the multi-modal refraction of the Psyche. These are not videos; they are structural handshakes between the Oracle and the Feed.
 </p>
 </header>

 {/* FEATURED CINEMA SCREEN */}
 <section className="relative aspect-video w-full bg-black rounded-none overflow-hidden border border-nous-border group">
 
 <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8 z-20">
 <motion.div 
 animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
 transition={{ duration: 4, repeat: Infinity }}
 className="w-24 h-24 rounded-none border border-nous-border/30 flex items-center justify-center backdrop-blur-xl"
 >
 <Play size={32} className="text-white fill-current ml-2"/>
 </motion.div>
 
 <div className="space-y-4">
 <span className="font-sans text-[10px] uppercase tracking-[1em] text-nous-subtle font-black">Now Playing // {activeEp.episode}</span>
 <h3 className="font-serif text-4xl md:text-7xl italic tracking-tighter text-white">{activeEp.title}</h3>
 </div>

 <a 
 href={activeEp.link} 
 target="_blank"
 className="px-10 py-4 bg-nous-base text-nous-text font-sans text-[10px] uppercase tracking-[0.5em] font-black rounded-none active:scale-95 transition-all flex items-center gap-4 hover:bg-nous-base0 hover:text-nous-text"
 >
 <Youtube size={16} /> Witness on YouTube
 </a>
 </div>

 {/* DECORATIVE CINEMA BARS */}
 <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black to-transparent z-15"/>
 <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-15"/>
 </section>

 {/* EPISODE REGISTRY */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
 {EPISODES.map((ep) => (
 <button 
 key={ep.id}
 onClick={() => setActiveEp(ep)}
 className={`text-left p-8 rounded-none border transition-all flex flex-col gap-6 group relative overflow-hidden ${activeEp.id === ep.id ? 'bg-white border-nous-text  scale-105' : 'bg-nous-base border-nous-border opacity-60 hover:opacity-100'}`}
 >
 <div className="flex justify-between items-start">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">{ep.episode}</span>
 {activeEp.id === ep.id && <Activity size={12} className="text-nous-subtle animate-pulse"/>}
 </div>
 <h4 className="font-serif text-2xl italic tracking-tighter leading-none group-hover:text-nous-text dark:group-hover:text-nous-text">{ep.title}</h4>
 <p className="font-serif italic text-sm text-nous-subtle leading-tight">{ep.desc}</p>
 <div className="pt-4 mt-auto border-t border-nous-border flex justify-between items-center">
 <span className="font-mono text-[8px] opacity-40">{ep.status}</span>
 <CornerDownRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
 </div>
 </button>
 ))}
 </div>

 {/* THE LINK MANDATE */}
 <section className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 p-12 rounded-none flex flex-col md:flex-row items-center gap-12">
 <div className="p-8 bg-white rounded-none border border-amber-200">
 <Activity size={48} className="text-amber-500 animate-pulse"/>
 </div>
 <div className="space-y-4 flex-1">
 <h3 className="font-serif text-4xl italic tracking-tighter leading-none">The Synchronicity Edict.</h3>
 <p className="font-serif italic text-xl text-nous-subtle leading-relaxed max-w-2xl">
 Linking Mimi in your series is not promotion; it is **Structural Integrity**. The artifact and the engine must remain tethered. You are the architect; the link is the door.
 </p>
 </div>
 <div className="w-full md:w-auto">
 <button 
 onClick={() => {
 navigator.clipboard.writeText(window.location.origin).catch(e => console.error("MIMI // Clipboard error", e));
 alert("Imperial URL Copied. Ready for sync.");
 }}
 className="w-full px-10 py-6 bg-nous-text text-nous-base dark:text-stone-950 font-sans text-[10px] uppercase tracking-[0.6em] font-black rounded-none active:scale-95 transition-all border border-white/20"
 >
 Copy Link for Series
 </button>
 </div>
 </section>

 </div>
 </div>
 );
};


// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Zap, Briefcase, Map, Layout, Radio, PenTool, Martini, Scale, EyeOff, Check, Sparkles, Anchor, ArrowDown } from 'lucide-react';

const CONTENT = {
 proposal: {
 title:"The Proposal.",
 subtitle:"Strategic Partnership Case Study",
 body: (
 <div className="space-y-6 font-serif italic text-base md:text-lg text-nous-subtle leading-relaxed text-balance">
 <p>
 Mimi is a <span className="font-bold text-red-900 dark:text-red-400 underline decoration-red-900/30">Curator-Oracle</span> designed for purposeful creative leverage. She operates as a liquidity engine for your latent intent, transmuting fragments into defensible conceptual architecture.
 </p>
 <p>
 Rather than replacing instinct, she provides the <span className="font-bold">market touchpoints</span> and <span className="font-bold">competitive distinction</span> required to manifest vision effectively.
 </p>
 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-nous-border mt-4">
 <div>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle block mb-1">Business Utility</span>
 <p className="text-xs">Audits brand legibility & justifies positioning.</p>
 </div>
 <div>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle block mb-1">Roadmap</span>
 <p className="text-xs">Translates vibes into executable strategy.</p>
 </div>
 </div>
 </div>
 )
 },
 capabilities: {
 title:"Capabilities.",
 subtitle:"Aesthetic Infrastructure",
 body: (
 <div className="space-y-4">
 <p className="font-serif italic text-sm text-nous-subtle">
 Mimi’s intelligence manifests in the rare ability to listen to the quiet architecture of your intent.
 </p>
 <div className="space-y-3">
 {[
 { icon: <Layout size={12}/>, title:"Hypothetical Roadmaps", desc:"Transmuting debris into phase-based project logic."},
 { icon: <Radio size={12}/>, title:"Aspirational Products", desc:"Developing the semiotic core for future-state objects."},
 { icon: <PenTool size={12}/>, title:"Archival Styling", desc:"Verifying motifs for high-end editorial production."},
 { icon: <Sparkles size={12}/>, title:"Countless Refractions", desc:"Mimi adapts to your specific requirement of allure."}
 ].map((cap, i) => (
 <div key={i} className="flex gap-3 items-start p-2 border-b border-nous-border last:border-0">
 <div className="mt-0.5 text-red-900 dark:text-red-400">{cap.icon}</div>
 <div>
 <h4 className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-text">{cap.title}</h4>
 <p className="font-serif italic text-xs text-nous-subtle">{cap.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )
 },
 protocol: {
 title:"The Protocol.",
 subtitle:"Sovereign Contract",
 body: (
 <div className="space-y-6 font-serif italic text-base text-nous-subtle leading-relaxed text-balance">
 <section className="space-y-2">
 <div className="flex items-center gap-2 text-nous-subtle">
 <EyeOff size={12} className="text-red-900 dark:text-red-400"/>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Zero Extraction</span>
 </div>
 <p className="text-sm">Your taste is sovereign. We do not harvest your debris to train sub-par models. Your artifacts belong to your personal registry.</p>
 </section>
 <section className="space-y-2">
 <div className="flex items-center gap-2 text-nous-subtle">
 <Scale size={12} className="text-red-900 dark:text-red-400"/>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">The Relationship</span>
 </div>
 <p className="text-sm">You are the Architect. Mimi is the Strategist. Interaction constitutes an agreement to pursue high-fidelity results over noise.</p>
 </section>
 <div className="pt-4 border-t border-nous-border">
 <a 
 href="https://ko-fi.com/mimizine"
 target="_blank"
 className="w-full py-2 bg-red-950 text-white font-sans text-[7px] uppercase tracking-[0.4em] font-black flex items-center justify-center gap-2 hover:bg-black transition-all"
 >
 <Martini size={10} /> Imperial Patronage
 </a>
 </div>
 </div>
 )
 }
};

export const CuratorNote: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
 const [activeTab, setActiveTab] = useState<'proposal' | 'capabilities' | 'protocol'>('proposal');
 const [envelopeState, setEnvelopeState] = useState<'closed' | 'opening' | 'open'>('closed');

 useEffect(() => {
 if (isOpen) {
 // Sequence the opening
 setEnvelopeState('closed');
 setTimeout(() => setEnvelopeState('opening'), 500); // Flap opens
 setTimeout(() => setEnvelopeState('open'), 1000); // Card rises
 } else {
 setEnvelopeState('closed');
 }
 }, [isOpen]);

 const activeContent = CONTENT[activeTab];

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
 
 {/* CLICK OUTSIDE TO CLOSE */}
 <div className="fixed inset-0 z-0"onClick={onClose} />

 <div className="relative w-full max-w-[600px] h-[500px] flex items-center justify-center perspective-1000 pointer-events-none md:pointer-events-auto mt-12 md:mt-0">
 
 {/* THE ENVELOPE CONTAINER */}
 <motion.div 
 initial={{ y: 500, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 500, opacity: 0 }}
 transition={{ type:"spring", damping: 20, stiffness: 100 }}
 className="relative w-full md:w-[500px] h-[350px] z-10 pointer-events-auto"
 >
 
 {/* 1. BACK OF ENVELOPE */}
 <div className="absolute inset-0 bg border border z-0"/>
 
 {/* 2. THE CARD (Slides Up) */}
 <motion.div 
 initial={{ y: 0, scale: 0.95 }}
 animate={{ 
 y: envelopeState === 'open' ? -200 : 0, // Adjusted Y translation for better centering
 scale: envelopeState === 'open' ? 1.0 : 0.95, 
 zIndex: envelopeState === 'open' ? 50 : 10 
 }}
 transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1], delay: 0.1 }}
 className="absolute left-4 right-4 md:left-6 md:right-6 top-4 md:top-8 h-[500px] md:h-[550px] bg dark:bg border border-nous-border z-10 flex flex-col overflow-hidden origin-bottom"
 style={{
 backgroundImage:"url('https://www.transparenttextures.com/patterns/linen.png')",
 backgroundBlendMode: 'multiply'
 }}
 >
 {/* CARD CONTENT */}
 <div className="flex-1 flex flex-col relative bg-white/50 /20 overflow-hidden">
 {/* Header / Tabs */}
 <div className="h-14 border-b border-nous-border/50 /50 flex items-center justify-between px-6 bg-nous-text/80 dark:bg-nous-base/80  backdrop-blur-sm shrink-0">
 <div className="flex gap-4">
 {['proposal', 'capabilities', 'protocol'].map((tab) => (
 <button 
 key={tab}
 onClick={() => setActiveTab(tab as any)}
 className={`font-sans text-[8px] uppercase tracking-widest font-black transition-colors ${activeTab === tab ? 'text-red-900 dark:text-red-400 border-b border-red-900 dark:border-red-400 pb-0.5' : 'text-nous-subtle hover:text-nous-subtle'}`}
 >
 {tab}
 </button>
 ))}
 </div>
 <div className="font-mono text-[9px] text-nous-subtle">REF: 884-X</div>
 </div>

 {/* Body */}
 <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
 <AnimatePresence mode="wait">
 <motion.div 
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="space-y-6"
 >
 <div className="space-y-2">
 <h3 className="font-serif text-3xl italic tracking-tighter text-nous-text ">{activeContent.title}</h3>
 <p className="font-sans text-[8px] uppercase tracking-[0.4em] text-red-900/60 dark:text-red-400/60 font-black">{activeContent.subtitle}</p>
 </div>
 <div className="w-8 h-px bg-red-900/20 dark:bg-red-400/20"/>
 {activeContent.body}
 </motion.div>
 </AnimatePresence>
 </div>
 
 {/* Card Footer (Actions) */}
 <div className="p-4 border-t border-nous-border/50 /50 bg-nous-text/80 dark:bg-nous-base/80  flex justify-between items-center backdrop-blur-sm shrink-0">
 <span className="font-serif italic text-xs text-nous-subtle">"Sovereignty requires structure."</span>
 <button onClick={onClose} className="p-2 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-nous-subtle">
 <ArrowDown size={16} />
 </button>
 </div>
 </div>
 </motion.div>

 {/* 3. FRONT BODY OF ENVELOPE (Triangles) */}
 <div className="absolute inset-0 z-20 pointer-events-none filter drop-">
 {/* Left Triangle */}
 <div className="absolute top-0 left-0 width-0 height-0 border-l-[250px] border-b-[175px] border-l border-b-transparent border-t-transparent"/>
 {/* Right Triangle */}
 <div className="absolute top-0 right-0 width-0 height-0 border-r-[250px] border-b-[175px] border-r border-b-transparent border-t-transparent"/>
 {/* Bottom Triangle (Main Body) */}
 <div className="absolute bottom-0 left-0 right-0 h-full bg opacity-100"style={{ clipPath: 'polygon(0% 100%, 100% 100%, 50% 50%)' }} />
 {/* Seams */}
 <div className="absolute bottom-0 left-0 w-full h-full border-t-[1px] border-white/40"style={{ clipPath: 'polygon(0% 100%, 50% 50%, 100% 100%)' }} />
 </div>

 {/* 4. FLAP (Animated) */}
 <motion.div 
 initial={{ rotateX: 0 }}
 animate={{ rotateX: envelopeState !== 'closed' ? 180 : 0 }}
 transition={{ duration: 0.6, ease:"easeInOut"}}
 style={{ transformOrigin:"top"}}
 className="absolute top-0 left-0 w-full h-[175px] z-30 pointer-events-none"
 >
 <div className="w-full h-full bg border-t border"style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}>
 {/* Wax Seal */}
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-red-900 flex items-center justify-center border-2 border-red-800 opacity-90">
 <span className="font-serif italic text-white text-lg">M</span>
 </div>
 </div>
 </motion.div>

 </motion.div>
 
 {/* CLOSE BUTTON (Floating outside) */}
 <motion.button 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="absolute top-4 right-4 md:top-8 md:right-8 z-50 p-3 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
 >
 <X size={20} />
 </motion.button>

 </div>
 </div>
 );
};

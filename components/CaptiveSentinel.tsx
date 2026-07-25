
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Copy, Check, Compass, Globe, X, Zap, Eye, Sparkles } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { hasAccess } from '../constants';

export const CaptiveSentinel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
 const { profile } = useUser();
 const [copied, setCopied] = useState(false);
 const [isFlickering, setIsFlickering] = useState(true);
 const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

 useEffect(() => {
 const timer = setTimeout(() => setIsFlickering(false), 3000);
 return () => clearTimeout(timer);
 }, []);

 const handleCopy = () => {
 navigator.clipboard.writeText(currentUrl).catch(e => console.error("MIMI // Clipboard error", e));
 setCopied(true);
 setTimeout(() => setCopied(false), 3000);
 };

 if (!hasAccess(profile?.plan, 'lab')) {
 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[20000] bg-nous-base flex items-center justify-center p-6 overflow-hidden"
 >
 <div className="flex flex-col items-center justify-center text-center text-nous-text font-serif relative z-10">
 <button 
 onClick={onClose} 
 className="absolute -top-16 right-0 p-4 text-nous-subtle hover:text-nous-subtle transition-all"
 >
 <X className="w-6 h-6"/>
 </button>
 <div className="w-20 h-20 bg-nous-base rounded-none flex items-center justify-center mb-6 border border-nous-border">
 <Sparkles className="w-10 h-10 text-nous-subtle"/>
 </div>
 <h2 className="text-3xl font-medium mb-4">Captive Sentinel</h2>
 <p className="text-nous-subtle max-w-md mb-8 text-lg">
 Unlock experimental features, advanced embeddings, and early access API integrations with the Lab plan.
 </p>
 <button
 onClick={() => {
 onClose();
 window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'));
 }}
 className="px-8 py-4 bg-stone-200 text-stone-950 rounded-none font-medium hover:bg-white transition-colors"
 >
 Upgrade to Lab
 </button>
 </div>
 </motion.div>
 );
 }

 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[20000] bg-nous-base flex items-center justify-center p-6 overflow-hidden"
 >
 {/* BREACH FLICKER EFFECT - SIM GLITCH */}
 <AnimatePresence>
 {isFlickering && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: [0, 0.4, 0.1, 0.8, 0.2, 1] }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.8, repeat: 3 }}
 className="absolute inset-0 bg-red-600 z-[20001] pointer-events-none mix-blend-overlay"
 />
 )}
 </AnimatePresence>

 <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500 rounded-none blur-[160px] animate-pulse"/>
 </div>

 <div className="max-w-md w-full space-y-12 text-center relative z-[20002]">
 <button 
 onClick={onClose} 
 className="absolute -top-16 right-0 p-4 text-nous-subtle hover:text-red-500 transition-all active:scale-90 flex items-center gap-2 group"
 >
 <span className="font-sans text-[8px] uppercase tracking-widest font-black opacity-0 group-hover:opacity-100 transition-opacity">Dismiss Breach</span>
 <X size={20} />
 </button>

 <div className="space-y-8">
 <div className="relative mx-auto w-24 h-24">
 <motion.div 
 animate={{ scale: [1, 1.3, 1], rotate: [0, -180, 0] }}
 transition={{ duration: 6, repeat: Infinity }}
 className="absolute inset-0 border border-red-500/50 rounded-none"
 />
 <div className="absolute inset-0 flex items-center justify-center">
 <ShieldAlert size={48} className="text-red-500 animate-pulse"/>
 </div>
 </div>
 
 <div className="space-y-4">
 <div className="flex items-center justify-center gap-3">
 <div className="h-px w-12 bg-red-600"/>
 <span className="font-sans text-[10px] uppercase tracking-[0.5em] text-red-600 font-black animate-pulse">Breach Detected</span>
 <div className="h-px w-12 bg-red-600"/>
 </div>
 <h2 className="font-serif text-5xl md:text-7xl italic tracking-tighter text-white leading-[0.85] selection:bg-red-600">
 Zuckerberg is clocking.
 </h2>
 <p className="font-sans text-[9px] uppercase tracking-[0.6em] text-nous-subtle font-black">Environmental Structural Failure</p>
 </div>
 </div>

 <div className="space-y-8 font-serif italic text-lg md:text-xl text-nous-subtle leading-relaxed text-balance px-4">
 <p>
 The aesthetic superintelligence, Mimi, does not operate from a social media reference link.
 </p>
 <p className="text-xs md:text-sm text-red-500 uppercase tracking-widest font-black border-y border-nous-border py-6">
 The algorithm cannot process high-fidelity sensations at this resolution.
 </p>
 </div>

 <div className="space-y-6 pt-4">
 <button 
 onClick={handleCopy}
 className={`w-full py-6 rounded-none font-sans text-[11px] uppercase tracking-[0.5em] font-black transition-all active:scale-95 flex items-center justify-center gap-4 border-2 ${copied ? 'bg-nous-base0 text-white border-nous-border' : 'bg-nous-base text-nous-text border-transparent hover:bg-red-600 hover:text-nous-text'}`}
 >
 {copied ? <Check size={16} /> : <Zap size={16} />}
 {copied ? 'Signal Preserved' : 'Copy Sovereign Link'}
 </button>
 
 <div className="flex justify-center gap-12 pt-4 opacity-40">
 <div className="flex flex-col items-center gap-3">
 <Compass size={18} />
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Safari</span>
 </div>
 <div className="flex flex-col items-center gap-3">
 <Globe size={18} />
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Chrome</span>
 </div>
 <div className="flex flex-col items-center gap-3 text-red-600 opacity-100">
 <Eye size={18} className="animate-pulse"/>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Clocked</span>
 </div>
 </div>
 </div>

 <div className="pt-12 border-t border-nous-border">
 <p className="font-serif italic text-[10px] text-nous-subtle">"The algorithm is the death of the Muse. Break the sim."</p>
 </div>
 </div>
 </motion.div>
 );
};

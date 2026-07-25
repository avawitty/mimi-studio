
import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ZapOff, Fingerprint } from 'lucide-react';

export const ValidationLegend: React.FC = () => {
 return (
 <div 
 className="clinical-legend absolute -bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[320px] z-[5000] opacity-0 translate-y-2 blur-sm group-hover:opacity-100 group-hover:translate-y-0 group-hover:blur-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:blur-0 transition-all duration-700 pointer-events-none"
 >
 <div className="bg-white/95 /95 backdrop-blur-2xl border border-black/5 /10 p-5 rounded-none flex flex-col gap-4 overflow-hidden relative group/legend">
 <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover/legend:rotate-0 transition-transform duration-700">
 <Fingerprint size={48} />
 </div>

 <div className="flex items-center justify-between border-b border-black/5 /5 pb-3">
 <div className="flex items-center gap-2">
 <div className="w-1 h-1 bg-amber-500 rounded-none animate-pulse"/>
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black text-nous-subtle">The Audit Key</span>
 </div>
 <span className="font-mono text-[7px] uppercase text-nous-subtle">Ref: CL-099</span>
 </div>
 
 <div className="space-y-3">
 <div className="flex items-center gap-4 cursor-default">
 <div className="w-2 h-2 rounded-none bg"/>
 <div className="flex flex-col">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Structural Alignment</span>
 <span className="font-serif italic text-[11px] text-nous-subtle leading-none">The fragment adheres to simulation logic.</span>
 </div>
 </div>
 
 <div className="flex items-center gap-4 cursor-default">
 <div className="w-2 h-2 rounded-none bg"/>
 <div className="flex flex-col">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-red-600 dark:text-red-400">Archival Dissonance</span>
 <span className="font-serif italic text-[11px] text-nous-subtle leading-none">Recalibration required for manifestation.</span>
 </div>
 </div>
 </div>

 <div className="pt-2 flex justify-center opacity-30">
 <p className="font-serif italic text-[9px] text-nous-subtle">“Validation is a requirement of form.”</p>
 </div>
 </div>
 </div>
 );
};

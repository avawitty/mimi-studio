
// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TailorAuditReport } from '../types';
import { X, Sparkles, Target, Check, ArrowRight, Quote, Info, Layers, Copy, CheckCircle2 } from 'lucide-react';

interface TailorAuditOverlayProps {
 auditReport: TailorAuditReport;
 onClose: () => void;
 onApplyToGeneration?: (manifestoText: string) => void;
}

export const TailorAuditOverlay: React.FC<TailorAuditOverlayProps> = ({ auditReport, onClose = () => {}, onApplyToGeneration }) => {
 const [isCopied, setIsCopied] = useState(false);

 const handleManifest = () => {
 if (onApplyToGeneration && auditReport?.profileManifesto) {
 onApplyToGeneration(auditReport.profileManifesto);
 }
 };

 const handleCopyManifesto = () => {
 if (!auditReport?.profileManifesto) return;
 const fullBrief = `
SOVEREIGN MANIFESTO:
"${auditReport.profileManifesto}"

STRATEGIC OPPORTUNITY:
${auditReport.strategicOpportunity}

AESTHETIC DIRECTIVES:
${auditReport.aestheticDirectives.map(d => `- ${d}`).join('\n')}
 `.trim();

 navigator.clipboard.writeText(fullBrief).catch(e => console.error("MIMI // Clipboard error", e));
 setIsCopied(true);
 setTimeout(() => setIsCopied(false), 3000);
 };

 if (!auditReport) return null;

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] bg-nous-base/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 overflow-y-auto">
 <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-5xl bg-nous-base border border-nous-border rounded-none overflow-hidden flex flex-col max-h-[90vh]">
 
 <header className="flex justify-between items-center p-8 border-b border-nous-border shrink-0">
 <div className="space-y-2">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Target size={18} className="animate-pulse"/>
 <span className="font-sans text-[9px] uppercase tracking-[0.4em] font-black italic">Strategic Audit Protocol</span>
 </div>
 <h2 className="font-serif text-3xl md:text-5xl italic tracking-tighter text-nous-text  leading-none">The Manifesto.</h2>
 </div>
 <div className="flex items-center gap-4">
 <button 
 onClick={handleCopyManifesto} 
 className="flex items-center gap-2 px-4 py-2 bg-nous-base rounded-none font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text transition-all"
 >
 {isCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
 {isCopied ? 'Protocol Preserved' : 'Copy Manifesto'}
 </button>
 <button onClick={onClose} className="p-3 text-nous-subtle hover:text-red-500 transition-colors bg-nous-base rounded-none"><X size={20} /></button>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto no-scrollbar p-8 md:p-16 space-y-24 bg dark:bg">
 
 {/* MANIFESTO STATEMENT */}
 <section className="space-y-10">
 <div className="flex items-center gap-4 text-nous-subtle">
 <Quote size={20} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Sovereign Statement</span>
 </div>
 <p className="font-header italic text-3xl md:text-5xl text-nous-text leading-[1.1] text-balance">
"{auditReport.profileManifesto ||"Logic incomplete. The Oracle is refining your frequency."}"
 </p>
 </section>

 <div className="grid md:grid-cols-12 gap-16 border-t border-black/5 /5 pt-16">
 
 {/* STRATEGIC OPPORTUNITY */}
 <section className="md:col-span-7 space-y-8">
 <div className="space-y-3">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Layers size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Strategic Opportunity</span>
 </div>
 <p className="font-serif italic text-xl md:text-2xl text-nous-subtle leading-snug border-l-4 border-nous-border/20 pl-8">
 {auditReport.strategicOpportunity ||"Awaiting structural signal..."}
 </p>
 </div>

 <div className="space-y-6 pt-12">
 <div className="flex items-center gap-3 text-amber-500">
 <Sparkles size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Suggested Touchpoints</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {(auditReport.suggestedTouchpoints || []).map((t, i) => (
 <div key={i} className="p-4 bg-nous-base border border-black/5 /5 rounded-none">
 <p className="font-serif italic text-lg text-nous-subtle">{t}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* AESTHETIC DIRECTIVES */}
 <section className="md:col-span-5 space-y-8">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Check size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Aesthetic Directives</span>
 </div>
 <div className="space-y-3">
 {(auditReport.aestheticDirectives || []).map((d, i) => (
 <motion.div 
 initial={{ opacity: 0, x: 10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.1 }}
 key={i} 
 className="flex items-start gap-4 p-5 bg-white border border-black/5 /5 rounded-none"
 >
 <Check size={14} className="text-nous-subtle mt-1 shrink-0"/>
 <p className="font-serif italic text-base md:text-lg text-nous-subtle leading-tight">{d}</p>
 </motion.div>
 ))}
 </div>
 </section>
 </div>

 <div className="pt-20 opacity-20 text-center flex flex-col items-center gap-4">
 <Info size={24} />
 <p className="font-serif italic text-sm">"This manifesto is a living artifact. It evolves with your registry."</p>
 </div>
 </div>

 <footer className="p-8 border-t border-nous-border bg-nous-base shrink-0 flex flex-col sm:flex-row justify-between items-center gap-6">
 <p className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">LOG_ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
 <div className="flex gap-4 w-full sm:w-auto">
 <button onClick={onClose} className="flex-1 sm:flex-none px-10 py-4 font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-subtle transition-colors">Dismiss</button>
 <button onClick={handleManifest} disabled={!auditReport.profileManifesto} className="flex-1 sm:flex-none px-12 py-5 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-[0.4em] font-black active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-nous-base0 disabled:opacity-50">
 <Sparkles size={16} /> Manifest Zine
 </button>
 </div>
 </footer>
 </motion.div>
 </motion.div>
 );
};

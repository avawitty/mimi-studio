
// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, Target, X, Loader2, Sparkles, Activity, Layers, ArrowRight, Info, CheckCircle, AlertTriangle, Radio } from 'lucide-react';
import { generateResonanceMapping } from '../services/geminiService';
import { TailorLogicDraft } from '../types';
import { VisualLanguageReflection } from './VisualLanguageReflection';

interface ShardAnalyzerProps {
 shards: string[];
 draft: TailorLogicDraft;
 onClose?: () => void;
}

export const ShardAnalyzer: React.FC<ShardAnalyzerProps> = ({ shards, draft, onClose }) => {
 const [report, setReport] = useState<any | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const performAudit = async () => {
 if (!shards || shards.length === 0) return;
 setLoading(true);
 setReport(null);
 setError(null);
 try {
 const res = await generateResonanceMapping(shards, draft);
 if (!res) throw new Error("Visual signal lost in the threshold.");
 setReport(res);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Resonance Mapping Complete.", icon: <CheckCircle size={14} className="text-nous-subtle"/> } 
 }));
 } catch (e) {
 console.error("MIMI // Shard Audit Failure:", e);
 setError(e.message ||"Oracle Handshake Failed.");
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"The Shard Oracle is silent. Recalibrate fragments.", icon: <Radio size={14} className="text-red-500"/> } 
 }));
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="w-full space-y-12 py-12 border-t border-black/5 /5 animate-fade-in">
 <div className="flex justify-between items-center px-4">
 <div className="space-y-1">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Radar size={16} className={loading ? 'animate-spin' : ''} />
 <span className="font-sans text-[10px] uppercase tracking-[0.4em] font-black italic">Visual Language Reflection</span>
 </div>
 <p className="font-serif italic text-sm text-nous-subtle">Audit your visual artifacts against your stated core logic.</p>
 </div>
 {!report && !loading && (
 <button 
 onClick={performAudit}
 disabled={!shards || shards.length === 0}
 className="px-8 py-3 bg-nous-text text-nous-base rounded-none font-sans text-[9px] uppercase tracking-widest font-black active:scale-95 transition-all disabled:opacity-30"
 >
 Conduct Audit
 </button>
 )}
 </div>

 <AnimatePresence mode="wait">
 {loading ? (
 <motion.div key="loading"initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 flex flex-col items-center gap-6">
 <div className="relative">
 <Loader2 className="animate-spin text-nous-subtle"size={32} />
 <div className="absolute inset-0 border-t border-nous-border rounded-none animate-ping opacity-20"/>
 </div>
 <span className="font-sans text-[8px] uppercase tracking-[0.6em] text-nous-subtle font-black animate-pulse">Triangulating Frequencies...</span>
 </motion.div>
 ) : error ? (
 <motion.div key="error"initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center space-y-6">
 <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-none border border-red-100 dark:border-red-900/30 inline-block">
 <AlertTriangle size={24} className="text-red-500 animate-pulse"/>
 </div>
 <p className="font-serif italic text-xl text-nous-subtle">"{error}"</p>
 <button onClick={performAudit} className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle border-b border-nous-border pb-1">Retry Analysis</button>
 </motion.div>
 ) : report ? (
 <motion.div key="report"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4">
 <VisualLanguageReflection 
 resonanceScore={`${report.resonanceScore}%`}
 reflection={report.summary}
 archivalRedirects={report.archivalRedirects}
 resonanceClusters={report.resonanceClusters}
 divergentSignals={report.divergentSignals}
 />
 
 <div className="md:col-span-12 pt-12 border-t border-black/5 flex justify-center">
 <button onClick={() => setReport(null)} className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle hover:text-red-500 transition-colors flex items-center gap-2">
 <X size={12} /> Clear Audit Data
 </button>
 </div>
 </motion.div>
 ) : (!shards || shards.length === 0) ? (
 <div className="py-20 text-center opacity-20">
 <Target size={48} className="mx-auto mb-4"/>
 <p className="font-serif italic text-2xl">Upload shards to begin analysis.</p>
 </div>
 ) : null}
 </AnimatePresence>
 </div>
 );
};

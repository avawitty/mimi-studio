
// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Terminal, History, Activity, ZapOff, Sparkles, Layers } from 'lucide-react';
import { getAuditLedger } from '../services/auditService';
import { sanitizeHtml } from '../lib/htmlSanitizer';

export const AuditLedger: React.FC<{ onClose: () => void }> = ({ onClose }) => {
 const [filter, setFilter] = useState<'manifest' | 'archive'>('manifest');
 const ledger = getAuditLedger(filter);

 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-nous-base/98 backdrop-blur-3xl"
 >
 <div className="relative w-full max-w-2xl bg-black border border-nous-border p-8 md:p-12 rounded-none space-y-10">
 <div className="flex justify-between items-start">
 <div className="space-y-2">
 <div className="flex items-center gap-3 text-red-500">
 <ShieldAlert size={18} className="animate-pulse"/>
 <h2 className="font-sans text-[10px] uppercase tracking-[0.6em] font-black italic">Structural Audit Ledger</h2>
 </div>
 <p className="font-serif italic text-sm text-nous-subtle">Black-box recording of protocol evolution and form-reclamation.</p>
 </div>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-nous-text transition-colors"><X size={24} /></button>
 </div>

 <div className="flex gap-4 border-b border-nous-border pb-6">
 <button 
 onClick={() => setFilter('manifest')}
 className={`flex-1 py-4 px-6 rounded-none font-sans text-[9px] uppercase tracking-widest font-black flex items-center justify-center gap-3 transition-all ${filter === 'manifest' ? 'bg-nous-base text-nous-text' : 'border border-nous-border text-nous-subtle hover:text-nous-text'}`}
 >
 <Sparkles size={12} /> Structural Expansion
 </button>
 <button 
 onClick={() => setFilter('archive')}
 className={`flex-1 py-4 px-6 rounded-none font-sans text-[9px] uppercase tracking-widest font-black flex items-center justify-center gap-3 transition-all ${filter === 'archive' ? 'bg-red-500 text-white' : 'border border-nous-border text-nous-subtle hover:text-red-500'}`}
 >
 <ZapOff size={12} /> Form Reclamation
 </button>
 </div>

 <div className="space-y-8 max-h-[50vh] overflow-y-auto no-scrollbar pr-4">
 <AnimatePresence mode="wait">
 <motion.div 
 key={filter}
 initial={{ opacity: 0, x: filter === 'manifest' ? -20 : 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: filter === 'manifest' ? 20 : -20 }}
 className="space-y-8"
 >
 {ledger.map((entry) => (
 <div key={entry.id} className="group border-l border-nous-border pl-8 space-y-4 relative">
 <div className={`absolute left-[-4.5px] top-1 w-2 h-2 rounded-none transition-colors ${filter === 'manifest' ? 'bg-nous-base0 ' : 'bg-red-500 '}`} />
 <div className="flex justify-between items-baseline">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">{new Date(entry.timestamp).toLocaleDateString()} // {entry.id}</span>
 {filter === 'manifest' ? <Sparkles size={12} className="text-nous-subtle"/> : <ZapOff size={12} className="text-red-500"/>}
 </div>
 <div className="space-y-2">
 <h3 className="font-mono text-base text-nous-subtle uppercase tracking-tighter">{entry.featureName}</h3>
 <p className="font-serif italic text-sm text-nous-subtle">Reason: {entry.reason}</p>
 <div className="p-3 bg-nous-base/50 rounded-none border border-nous-border/50">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle block mb-1">Impact Analysis</span>
 <p
   className="font-serif italic text-xs text-nous-subtle"
   dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.impact, "html") }}
 />
 </div>
 </div>
 </div>
 ))}
 {ledger.length === 0 && (
 <div className="py-20 text-center space-y-4 opacity-20">
 <Terminal size={32} className="mx-auto"/>
 <p className="font-serif italic">Structural integrity nominal. No protocols {filter === 'manifest' ? 'manifested' : 'retired'} in this cycle.</p>
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </div>

 <div className="pt-8 border-t border-nous-border flex justify-between items-center text-nous-subtle">
 <div className="flex items-center gap-3">
 <Activity size={12} className="text-nous-subtle animate-pulse"/>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Audit Sync Active</span>
 </div>
 <span className="font-mono text-[7px]">LOG_LEVEL: CLINICAL_REFINEMENT</span>
 </div>
 </div>
 </motion.div>
 );
};

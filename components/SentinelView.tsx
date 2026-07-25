
// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useAgents } from '../contexts/AgentContext';
import { ShieldCheck, Activity, BrainCircuit, AlertTriangle, Fingerprint, Layers, Clock, Zap, Target, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TheWard } from './TheWard';

const IntegrityMeter: React.FC<{ score: number }> = ({ score }) => (
 <div className="space-y-2">
 <div className="flex justify-between items-end">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Structural Integrity</span>
 <span className="font-mono text-xl font-black text-nous-subtle">{score}%</span>
 </div>
 <div className="h-2 w-full bg-nous-base rounded-none overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${score}%` }}
 transition={{ duration: 1.5, ease:"easeOut"}}
 className={`h-full ${score > 80 ? 'bg-nous-base0' : score > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
 />
 </div>
 </div>
);

const ArchetypeBar: React.FC<{ label: string, count: number, total: number }> = ({ label, count, total }) => {
 const percentage = total > 0 ? (count / total) * 100 : 0;
 return (
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <span className="font-serif italic text-sm text-nous-subtle">{label.replace(/-/g, ' ')}</span>
 <span className="font-mono text-[9px] text-nous-subtle">{Math.round(percentage)}%</span>
 </div>
 <div className="h-1 w-full bg-nous-base rounded-none overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${percentage}%` }}
 className="h-full bg-nous-text"
 />
 </div>
 </div>
 );
};

export const SentinelView: React.FC = () => {
 const { profile } = useUser();
 const { agentLogs } = useAgents();
 const [isWardOpen, setIsWardOpen] = useState(false);

 const archetypes = profile?.tasteProfile?.archetype_weights || {};
 const validArchetypes = Object.entries(archetypes).filter(([_, v]) => typeof v === 'number' && !isNaN(v));
 const totalWeight = validArchetypes.reduce((a, [_, b]) => a + b, 0);
 
 // Calculate"Integrity": How focused is the taste? (High dominance = High integrity)
 const integrityScore = useMemo(() => {
 if (totalWeight <= 0 || validArchetypes.length === 0) return 0;
 const max = Math.max(...validArchetypes.map(([_, v]) => v));
 // Normalize: If one archetype is 100% of weight, score is 100. If spread thin, score is lower.
 const score = Math.round((max / totalWeight) * 100 * 1.5);
 return isNaN(score) ? 0 : Math.min(100, score); 
 }, [validArchetypes, totalWeight]);

 const recentDrifts = profile?.tasteProfile?.audit_history || [];

 const driftScore = useMemo(() => {
 const score = recentDrifts.length * 15 + (100 - integrityScore) * 0.5;
 return isNaN(score) ? 0 : Math.min(100, score);
 }, [recentDrifts, integrityScore]);

 const omissionIndex = useMemo(() => {
 const score = 100 - (validArchetypes.length * 10);
 return isNaN(score) ? 0 : Math.max(0, score);
 }, [validArchetypes]);

 return (
 <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar pb-64 px-6 md:px-16 pt-12 md:pt-20 bg-nous-base dark:bg text-white  transition-all duration-1000 relative">
 <div className="max-w-6xl mx-auto space-y-16 relative z-10">
 
 {/* HEADER */}
 <header className="space-y-8 border-b border-black/5 /5 pb-12">
 <div className="flex items-center gap-4 text-nous-subtle">
 <ShieldCheck size={18} className="animate-pulse"/>
 <span className="font-sans text-[10px] uppercase tracking-[0.6em] font-black italic">System Self-Reflection</span>
 </div>
 <div className="space-y-4">
 <h2 className="font-serif text-5xl md:text-7xl italic tracking-tighter leading-none">The Sentinel.</h2>
 <p className="font-serif italic text-xl text-nous-subtle max-w-2xl">
 Visualization of your aesthetic algorithm. The Sentinel tracks consistency, drift, and structural integrity across all manifests.
 </p>
 </div>
 </header>

 <div className="grid md:grid-cols-12 gap-12">
 
 {/* LEFT COLUMN: THE ALGORITHM */}
 <div className="md:col-span-7 space-y-12">
 
 {/* FINGERPRINT CARD */}
 <section className="bg-white border border-nous-border p-10 rounded-none space-y-8">
 <div className="flex items-start justify-between">
 <div className="space-y-2">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Fingerprint size={16} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Aesthetic Fingerprint</span>
 </div>
 <h3 className="font-serif text-3xl italic tracking-tighter">Dominant Logic.</h3>
 </div>
 <IntegrityMeter score={integrityScore} />
 </div>

 <div className="space-y-6 pt-4">
 {validArchetypes
 .sort(([,a], [,b]) => b - a)
 .slice(0, 5)
 .map(([key, count]) => (
 <ArchetypeBar key={key} label={key} count={count} total={totalWeight} />
 ))
 }
 {totalWeight === 0 && (
 <div className="text-center py-8 opacity-40">
 <Activity size={24} className="mx-auto mb-2"/>
 <p className="font-sans text-[8px] uppercase tracking-widest font-black">No Signal Detected</p>
 </div>
 )}
 </div>
 </section>

 {/* RECENT AGENT LOGS */}
 <section className="space-y-6">
 <div className="flex items-center gap-3 text-nous-subtle">
 <BrainCircuit size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Agent Activity Log</span>
 </div>
 <div className="border-l border-nous-border space-y-8 pl-8 relative">
 {agentLogs.length > 0 ? agentLogs.slice(0, 5).map(log => (
 <div key={log.id} className="relative">
 <div className={`absolute -left-[37px] top-1 w-2 h-2 rounded-none ${log.agent === 'sentinel' ? 'bg-red-500' : 'bg-indigo-500'} ring-4 ring-white dark:ring`} />
 <div className="flex flex-col gap-1">
 <div className="flex justify-between items-baseline">
 <span className={`font-sans text-[8px] uppercase tracking-widest font-black ${log.agent === 'sentinel' ? 'text-red-500' : 'text-indigo-500'}`}>{log.agent}</span>
 <span className="font-mono text-[8px] text-nous-subtle">{new Date(log.timestamp).toLocaleTimeString()}</span>
 </div>
 <p className="font-serif italic text-sm text-nous-subtle">{log.message}</p>
 </div>
 </div>
 )) : (
 <p className="font-serif italic text-sm text-nous-subtle">System quiet. No agents active.</p>
 )}
 </div>
 </section>
 </div>

 {/* RIGHT COLUMN: DRIFT & ALERTS */}
 <div className="md:col-span-5 space-y-12">
 
 {/* DRIFT ALERT CARD */}
 <div className="p-8 bg-nous-base /50 border border-nous-border rounded-none space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 text-amber-500">
 <AlertTriangle size={16} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Drift Detection</span>
 </div>
 <button 
 onClick={() => setIsWardOpen(true)}
 className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-none hover:bg-red-500 hover:text-nous-text transition-all group"
 >
 <Mic size={12} className="group-hover:animate-pulse"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Enter The Ward</span>
 </button>
 </div>
 <p className="font-serif italic text-lg text-nous-subtle leading-relaxed text-balance">
 The Sentinel monitors deviations from your stated"Tailor"manifesto. High drift indicates an evolving aesthetic or a loss of coherence.
 </p>
 
 <div className="grid grid-cols-2 gap-4 pt-2">
 <div className="p-4 bg-white border border-nous-border rounded-none">
 <div className="flex justify-between items-end mb-2">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Drift Score</span>
 <span className={`font-mono text-lg font-black ${driftScore > 50 ? 'text-red-500' : 'text-nous-subtle'}`}>{Math.round(driftScore)}</span>
 </div>
 <div className="h-1 w-full bg-nous-base rounded-none overflow-hidden">
 <motion.div initial={{ width: 0 }} animate={{ width: `${driftScore}%` }} className={`h-full ${driftScore > 50 ? 'bg-red-500' : 'bg-nous-base0'}`} />
 </div>
 </div>
 <div className="p-4 bg-white border border-nous-border rounded-none">
 <div className="flex justify-between items-end mb-2">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Omission Index</span>
 <span className={`font-mono text-lg font-black ${omissionIndex > 50 ? 'text-amber-500' : 'text-nous-subtle'}`}>{Math.round(omissionIndex)}</span>
 </div>
 <div className="h-1 w-full bg-nous-base rounded-none overflow-hidden">
 <motion.div initial={{ width: 0 }} animate={{ width: `${omissionIndex}%` }} className={`h-full ${omissionIndex > 50 ? 'bg-amber-500' : 'bg-nous-base0'}`} />
 </div>
 </div>
 </div>

 <div className="space-y-4 pt-4">
 {recentDrifts.length > 0 ? recentDrifts.slice().reverse().slice(0, 3).map((drift, i) => (
 <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-none border border-black/5 /5">
 <Zap size={14} className="text-amber-500 mt-1 shrink-0"/>
 <div className="space-y-1">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle block">{new Date(drift.timestamp).toLocaleDateString()}</span>
 <p className="font-serif italic text-sm text-nous-subtle">
 Shift from <span className="font-bold">{drift.before.archetype || 'Void'}</span> to <span className="font-bold">{drift.after.archetype}</span>
 </p>
 </div>
 </div>
 )) : (
 <div className="flex items-center gap-3 p-4 bg-nous-base0/10 border border-nous-border/20 rounded-none text-nous-subtle">
 <CheckCircle size={14} />
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Zero Drift Detected</span>
 </div>
 )}
 </div>
 </div>

 {/* CURRENT MANDATE */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Target size={16} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Active Mandate</span>
 </div>
 <div className="p-8 bg-nous-text text-nous-base rounded-none space-y-6 relative overflow-hidden">
 <div className="absolute top-0 right-0 p-6 opacity-20"><Layers size={64} /></div>
 <div className="relative z-10 space-y-4">
 <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Primary Logic</span>
 <p className="font-header text-3xl italic tracking-tighter leading-none">
"{profile?.tailorDraft?.aestheticCore?.eraFocus ||"Undefined Era"} / {profile?.tasteProfile?.dominant_archetypes?.[0] ||"Unknown Archetype"}"
 </p>
 <p className="font-serif italic text-nous-subtle text-sm border-t border-white/20 pt-4">
 Use the Tailor view to recalibrate this core logic if the Sentinel reports high drift.
 </p>
 </div>
 </div>
 </div>

 </div>
 </div>
 </div>
 <AnimatePresence>
 {isWardOpen && <TheWard onClose={() => setIsWardOpen(false)} />}
 </AnimatePresence>
 </div>
 );
};

const CheckCircle = ({ size, className }) => (
 <svg xmlns="http://www.w3.org/2000/svg"width={size} height={size} viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DeltaVerdict } from '../types';
import { Activity, ChevronDown, ChevronUp, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { GlossaryTooltip } from './GlossaryTooltip';

interface DeltaVerdictCardProps {
 verdict: DeltaVerdict;
 compact?: boolean;
}

export const DeltaVerdictCard: React.FC<DeltaVerdictCardProps> = ({ verdict, compact = false }) => {
 const [expanded, setExpanded] = useState(false);

 // Determine color based on alignment
 const getAlignmentColor = (score: number) => {
 if (score > 0.8) return 'text-nous-subtle'; // High alignment
 if (score < 0.3) return 'text-red-500'; // Anomaly / Mutant
 return 'text-amber-500'; // Drift
 };

 const getAlignmentLabel = (score: number) => {
 if (score > 0.8) return 'CORE ALIGNMENT';
 if (score < 0.3) return 'AESTHETIC ANOMALY';
 return 'STYLISTIC DRIFT';
 };

 const Icon = verdict.alignmentScore < 0.3 ? ShieldAlert : verdict.alignmentScore > 0.8 ? CheckCircle2 : Zap;

 return (
 <div className="w-full border border-nous-border bg-nous-base overflow-hidden">
 {/* Header / Summary */}
 <div 
 className={`p-4 flex items-start justify-between cursor-pointer hover:bg-nous-base /50 transition-colors ${expanded ? 'border-b border-nous-border /50' : ''}`}
 onClick={() => setExpanded(!expanded)}
 >
 <div className="flex gap-4 items-start">
 <div className={`mt-1 ${getAlignmentColor(verdict.alignmentScore)}`}>
 <Icon size={18} />
 </div>
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-3">
 <GlossaryTooltip 
 term="Delta Verdict"
 poeticMeaning="The distance between your core identity and this new signal."
 functionalMeaning="A calculated score representing how much this input diverges from your established aesthetic profile."
 >
 <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${getAlignmentColor(verdict.alignmentScore)}`}>
 {getAlignmentLabel(verdict.alignmentScore)}
 </span>
 </GlossaryTooltip>
 <span className="font-mono text-[10px] text-nous-subtle">
 Δ {(verdict.alignmentScore * 100).toFixed(0)}%
 </span>
 </div>
 <p className="font-serif italic text-sm text-nous-text leading-snug">
"{verdict.surpriseVerdict}"
 </p>
 </div>
 </div>
 {!compact && (
 <button className="text-nous-subtle hover:text-primary hover:text-nous-text transition-colors">
 {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
 </button>
 )}
 </div>

 {/* Expanded Details */}
 <AnimatePresence>
 {expanded && !compact && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="p-4 flex flex-col gap-6 bg-nous-base/50 /20">
 
 {/* Divergence Points */}
 <div className="flex flex-col gap-2">
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Divergence Points</span>
 <ul className="flex flex-col gap-2">
 {verdict.divergencePoints.map((point, idx) => (
 <li key={idx} className="flex items-start gap-2 text-xs text-nous-subtle font-sans">
 <span className="text-nous-subtle mt-0.5">•</span>
 {point}
 </li>
 ))}
 </ul>
 </div>

 {/* Resonance Analysis */}
 <div className="flex flex-col gap-2">
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Resonance Analysis</span>
 <p className="text-xs text-nous-subtle font-sans leading-relaxed">
 {verdict.resonanceAnalysis}
 </p>
 </div>

 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

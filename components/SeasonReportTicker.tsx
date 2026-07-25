
// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import { SeasonReport } from '../types';
import { AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const SeasonReportTicker: React.FC<{ report: SeasonReport | null }> = ({ report }) => {
 const { theme } = useTheme();
 if (!report) return null;

 const reportingStrings = [
 `VAULT STATUS: SECURE`,
 `COLLECTION PULSE: ${report.currentVibe.toUpperCase()}`,
 `PRODUCTION CYCLE: CALIBRATED`,
 `AESTHETIC DEVIATION: 0.04%`,
 `STRATEGIC BRIEF: ${report.cliqueLogic.toUpperCase()}`,
 `SIGNAL RESONANCE: OPTIMAL`,
 `DEEP STORAGE TEMP: 4°C`
 ];

 return (
 <div className="w-full h-8 bg-nous-text dark:bg-nous-text text-nous-base overflow-hidden flex items-center border-y border-nous-border transition-colors duration-500">
 <div className={`flex shrink-0 items-center px-4 h-full gap-2 animate-pulse ${theme === 'dark' ? 'bg-nous-base/40 text-nous-subtle' : 'bg-stone-600'}`}>
 <ShieldCheck size={10} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-bold">
 System Registry
 </span>
 </div>
 
 <div className="flex-1 relative flex items-center">
 <motion.div 
 animate={{ x: [0, -1000] }}
 transition={{ duration: 40, repeat: Infinity, ease:"linear"}}
 className="flex whitespace-nowrap gap-12"
 >
 {[...reportingStrings, ...reportingStrings, ...reportingStrings].map((s, i) => (
 <span key={i} className="font-sans text-[9px] uppercase tracking-[0.4em] opacity-80">
 {s}
 </span>
 ))}
 </motion.div>
 </div>
 
 <div className="shrink-0 px-4 font-mono text-[8px] opacity-40">
 REF:REG_0{ (report.timestamp % 1000) }
 </div>
 </div>
 );
};

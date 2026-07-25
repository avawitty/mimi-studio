// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Shield, Activity, RefreshCw } from 'lucide-react';

const STANDARD_PHASES = [
  { id: 'extraction', label: 'PHASE I: SYNTHESIZING AESTHETIC', duration: 3500, desc: "Filtering memetic debris for latent architectural intent." },
  { id: 'synthesis', label: 'PHASE II: BEATING BRAIN ROT', duration: 4500, desc: "Binding fragments into a coherent conceptual throughline." },
  { id: 'rendering', label: 'PHASE III: COMPILING ZINE JSON', duration: 4000, desc: "Calibrating the scotopic field for plate generation." },
  { id: 'finalizing', label: 'PHASE IV: PATIENCE IS A VIRTUE', duration: 2500, desc: "Finalizing the Sovereign Registry for witness display." }
];

const DEEP_PHASES = [
  { id: 'recursive_audit', label: 'PHASE I: SYNTHESIZING AESTHETIC', duration: 8000, desc: "Performing deep semiotic scan of archival debris." },
  { id: 'archetypal_mapping', label: 'PHASE II: BEATING BRAIN ROT', duration: 10000, desc: "Calculating resonance against historical aesthetic canons." },
  { id: 'high_fidelity_synthesis', label: 'PHASE III: COMPILING ZINE JSON', duration: 12000, desc: "Architecting a defensible creative manifesto." },
  { id: 'calibration', label: 'PHASE IV: PATIENCE IS A VIRTUE', duration: 8000, desc: "Optimizing latent space for alluring resonance." }
];

const ANTI_BRAIN_ROT_FACTS = [
  "Visual over-saturation blunts discernment. Taste is established in the absolute negatives—what you exclude.",
  "Infinite scroll triggers foraging behaviors in ancestral dopaminergic pathways. Direct selection activates higher intelligence.",
  "The average digital attention span has collapsed to 47 seconds. Curation is an act of cognitive rebellion.",
  "Algorithmically optimized feeds seek to commodify desire. Slow curation is sovereign self-determination.",
  "The human mind thrives on structured silence, not perpetual novelty. Reclaim your prefrontal sovereignty.",
  "Subsecond notifications cultivate hyper-reactive vigilance. Creative depth demands spacious silence.",
  "Boredom is the silent nursery of original thought. Let your attention settle in the negative space."
];

interface ElevatorLoaderProps {
  onComplete?: () => void;
  onBypass?: (lastPrompt?: string) => void;
  isDeep?: boolean;
  loadingMessage?: string;
  minDuration?: number;
  authLoading?: boolean;
}

export const ElevatorLoader: React.FC<ElevatorLoaderProps> = ({ onComplete, onBypass, isDeep, loadingMessage, minDuration = 0, authLoading = false }) => {
  const phases = isDeep ? DEEP_PHASES : STANDARD_PHASES;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showBypass, setShowBypass] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  
  useEffect(() => {
    if (minDuration > 0) {
      const timer = setTimeout(() => {
        setMinDurationElapsed(true);
      }, minDuration);
      return () => clearTimeout(timer);
    } else {
      setMinDurationElapsed(true);
    }
  }, [minDuration]);

  useEffect(() => {
    if (minDurationElapsed && !authLoading) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [minDurationElapsed, authLoading]);

  useEffect(() => {
    console.info(`MIMI // Protocol Initiated: ${isDeep ? 'Imperial Refraction (32k Budget)' : 'Standard Render'}`);
    
    const phaseInterval = setInterval(() => {
      setPhaseIndex(prev => (prev < phases.length - 1 ? prev + 1 : prev));
    }, isDeep ? 9000 : 4000);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const slowdownThreshold = 88;
        const increment = isDeep 
          ? (prev > slowdownThreshold ? 0.015 : 0.06)
          : (prev > slowdownThreshold ? 0.04 : 0.15);
        return Math.min(99.8, prev + increment);
      });
    }, 100);

    const bypassTimer = setTimeout(() => setShowBypass(true), isDeep ? 40000 : 8000);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(progressInterval);
      clearTimeout(bypassTimer);
    };
  }, [isDeep, phases]);

  const activePhase = phases[phaseIndex];
  const activeFact = ANTI_BRAIN_ROT_FACTS[phaseIndex % ANTI_BRAIN_ROT_FACTS.length];

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[20000] overflow-hidden cursor-wait flex bg-[#FCFCFA] dark:bg-[#0A0907]"
        >
          {/* LEFT DOOR */}
          <motion.div 
            initial={{ x: 0 }} 
            exit={{ x: '-100%' }}
            transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
            className="absolute top-0 left-0 bottom-0 w-1/2 bg-[#FCFCFA] dark:bg-[#0A0907] border-r border-stone-200 dark:border-stone-850 z-10"
          />

          {/* RIGHT DOOR */}
          <motion.div 
            initial={{ x: 0 }} 
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
            className="absolute top-0 right-0 bottom-0 w-1/2 bg-[#FCFCFA] dark:bg-[#0A0907] border-l border-stone-200 dark:border-stone-850 z-10"
          />

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center text-stone-800 dark:text-stone-200 font-sans p-6"
          >
            {/* BACKGROUND GRID */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                 style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />

            {/* HEADLINE */}
            <div className="text-center mb-10 md:mb-14">
              <h1 className="font-serif text-2xl md:text-4xl italic tracking-tight text-[#5C1A1A] dark:text-[#E89E9E]">Who are you when no one is watching?</h1>
              <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 mt-2 block">MIMI // ANTIDOTE FOR BRAIN ROT</span>
            </div>

            {/* CONSOLE & ELEVATOR OUTLINE */}
            <div className="w-full max-w-2xl bg-[#F8F7F4] dark:bg-[#0D0C09] border border-stone-200 dark:border-stone-850 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden shadow-sm">
              
              {/* BACKDROP GLOW */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl pointer-events-none rounded-full" />
              
              {/* LEFT: ELEVATOR OUTLINE */}
              <div className="relative w-36 h-40 border-l border-r border-[#5C1A1A]/10 dark:border-[#E89E9E]/15 flex flex-col justify-between py-2 shrink-0 bg-stone-100/35 dark:bg-black/20">
                <div className="absolute left-2 text-[7.5px] font-mono text-stone-400">4F Penthouse</div>
                <div className="absolute left-2 top-[30%] text-[7.5px] font-mono text-stone-400">3F Plate</div>
                <div className="absolute left-2 top-[60%] text-[7.5px] font-mono text-stone-400">2F Curate</div>
                <div className="absolute left-2 bottom-2 text-[7.5px] font-mono text-stone-400">1F Ingest</div>

                {/* Vertical Cable track line */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px border-l border-stone-200 dark:border-stone-800 border-dashed" />

                {/* Elevator Box moving up dynamically */}
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 w-16 h-10 border border-[#5C1A1A] dark:border-[#E89E9E] bg-white dark:bg-black flex flex-col items-center justify-center z-10 shadow-md rounded-none"
                  style={{
                    bottom: `${(progress / 100) * 75 + 5}%`,
                  }}
                  transition={{ type: "spring", stiffness: 45, damping: 15 }}
                >
                  <span className="font-mono text-[9px] font-extrabold text-[#5C1A1A] dark:text-[#E89E9E]">FL {phaseIndex + 1}</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <motion.span
                      animate={{ y: [-1.5, 1.5, -1.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-[7.5px] text-emerald-500"
                    >
                      ▲
                    </motion.span>
                    <span className="font-mono text-[6.5px] uppercase tracking-widest text-stone-400 font-black">MIMI</span>
                  </div>
                </motion.div>
              </div>

              {/* RIGHT: LIVE TELEMETRY & PHASE DETAILED */}
              <div className="flex-1 flex flex-col justify-between h-40 w-full space-y-4">
                <div className="space-y-1.5 align-left text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-none text-[#5C1A1A] dark:text-[#E89E9E] font-mono text-[8px] uppercase tracking-widest font-black">
                      {isDeep ? "32K DEEP ANALYSIS" : "STANDARD RENDER"}
                    </span>
                    <span className="font-mono text-[8.5px] text-stone-400 animate-pulse">Floor {phaseIndex + 1}/4</span>
                  </div>
                  
                  <h3 className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-stone-800 dark:text-stone-200">
                    {activePhase.label}
                  </h3>
                  
                  <p className="font-serif italic text-xs text-stone-500 leading-relaxed">
                    {activePhase.desc}
                  </p>
                </div>

                {/* ANTI BRAIN ROT FACT PANEL */}
                <div className="p-3 bg-white dark:bg-black/50 border border-stone-250/25 dark:border-stone-850 text-left relative">
                  <span className="block font-mono text-[6.5px] tracking-widest text-[#5C1A1A]/70 dark:text-[#E89E9E]/70 uppercase font-black mb-1">
                    ANTI BRAIN ROT INSTRUCTION
                  </span>
                  <p className="font-sans text-[10px] text-stone-500 leading-normal italic">
                    "{activeFact}"
                  </p>
                </div>
              </div>
            </div>

            {/* PERCENTAGE BAR BOTTOM */}
            <div className="w-full max-w-2xl mt-6 space-y-2">
              <div className="flex justify-between items-center font-mono text-[8.5px] text-stone-400 uppercase tracking-widest">
                <span>SYSTEM ASCENSION</span>
                <span className="font-semibold text-stone-700 dark:text-stone-300">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1 bg-stone-200 dark:bg-stone-850 relative overflow-hidden">
                <motion.div 
                  className="absolute left-0 top-0 bottom-0 bg-[#5C1A1A] dark:bg-[#E89E9E]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* BYPASS BUTTON IN CASE OF TIMEOOUTS */}
            {showBypass && onBypass && (
              <button 
                onClick={() => onBypass()}
                className="mt-8 font-mono text-[8px] uppercase tracking-wider text-stone-400 hover:text-red-400 border border-stone-300 dark:border-stone-800 hover:border-red-500/30 px-3 py-1.5 transition-all text-center"
              >
                [ BYPASS PROTOCOL ]
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

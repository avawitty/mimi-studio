import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SovereignIdentityCardView } from './SovereignIdentityCardView';
import { TasteConstellation } from './TasteConstellation';
import { useUser } from '../contexts/UserContext';
import { generateCelestialReading, generateExecutionLayer, generateSessionSynthesis } from '../services/geminiService';
import { Sparkles, Loader2, Fingerprint, Activity, BookOpen, Orbit, Waves, Compass, Briefcase, Network, GitMerge, LayoutTemplate, FileText, Mic } from 'lucide-react';
import { ExecutionBlock } from './ExecutionBlock';
import { ExecutionLayer } from '../types';
import { OracleSpecimenHero } from './public-face';
import './public-face/atelier.css';

const OracleDiscourse: React.FC = React.memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
    className="border border-nous-border bg-nous-base0/20 p-6 md:p-8 space-y-6 relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-nous-subtle via-nous-border to-transparent" />

    <div className="flex items-center gap-3 pl-2">
      <FileText size={14} className="text-nous-subtle shrink-0" />
      <span className="font-sans text-[8px] uppercase tracking-[0.3em] font-black text-nous-subtle">
        Operational Discourse — The Oracle Chamber
      </span>
    </div>

    <div className="pl-2 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-nous-text shrink-0" />
          <h3 className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-text">
            Mimi — The Archivist
          </h3>
        </div>
        <p className="font-serif italic text-sm text-nous-subtle leading-relaxed">
          Preserves and retrieves your aesthetic memory — Pocket shards, Tailor evidence, and past issues — so taste is revealed, not invented.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase size={13} className="text-nous-text shrink-0" />
          <h3 className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-text">
            Cyrus — The Oracle
          </h3>
        </div>
        <p className="font-serif italic text-sm text-nous-subtle leading-relaxed">
          Forecasts departures and futures. Pressure-tests your next move against cultural signal and your stated intent.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-nous-text shrink-0" />
          <h3 className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-text">
            Synthesis — The Argument
          </h3>
        </div>
        <p className="font-serif italic text-sm text-nous-subtle leading-relaxed">
          Stages Mimi and Cyrus in dialogue against each other to clarify your query — evidence versus foresight, then a decision.
        </p>
      </div>
    </div>
  </motion.div>
));
OracleDiscourse.displayName = 'OracleDiscourse';

export const TheOracle: React.FC = () => {
  const { profile, activePersona } = useUser();
  const [reading, setReading] = useState<string | null>(null);
  const [executionLayer, setExecutionLayer] = useState<ExecutionLayer | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  const handleGenerateSynthesis = async () => {
    setLoadingSynthesis(true);
    try {
      const res = await generateSessionSynthesis(profile, [], activePersona);
      setSynthesis(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSynthesis(false);
    }
  };

  // 1. Fetching the Live Reading on Component Mount
  useEffect(() => {
    if (profile && !reading) {
      setLoadingReading(true);
      generateCelestialReading(profile)
        .then(async (res) => {
          setReading(res);
          try {
            const el = await generateExecutionLayer(res);
            setExecutionLayer(el);
          } catch (e) {
            console.error("Execution Layer Error:", e);
          }
        })
        .catch(e => console.error("Oracle Error:", e))
        .finally(() => setLoadingReading(false));
    }
  }, [profile, reading]);

  const sig = profile?.tasteProfile?.aestheticSignature;
  const draft = activePersona?.tailorDraft || profile?.tailorDraft;

  const openChamberWithQuestion = (_question: string) => {
    // Chamber opens on Cyrus; question text is the ritual prompt on the specimen plate.
    window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'cyrus' }));
  };

  // Mobile Dashboard View
  const MobileDashboard = () => (
    <div className="flex flex-col h-full bg-nous-base overflow-y-auto pb-32 md:hidden">
      <OracleSpecimenHero
        onAsk={openChamberWithQuestion}
        reading={reading}
        loading={loadingReading}
      />
      <div className="p-6 pt-8 space-y-8">
        <div>
          <h1 className="text-4xl font-serif italic text-nous-text mb-2 flex items-center gap-3">
            <Sparkles size={24} className="text-nous-subtle" />
            The Oracle
          </h1>
          <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-nous-subtle">
            Interpretive Chamber & Readings
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'mimi' }))}
            className="flex items-center justify-between p-6 border border-nous-border bg-nous-base0/30 hover:bg-nous-base0/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <Sparkles size={20} className="text-nous-subtle" />
              <div>
                <h3 className="font-serif italic text-xl text-nous-text">Open Chamber</h3>
                <p className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle mt-1">Cyberdeck · Mimi / Cyrus / Synthesis</p>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-6 border-t border-nous-border">
          <h2 className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black mb-4">Commune</h2>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'mimi' }))}
              className="flex flex-col items-center justify-center p-4 border border-nous-border bg-nous-base hover:bg-nous-base0/50 transition-colors gap-2"
            >
              <Sparkles size={16} className="text-nous-text" />
              <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-text">Mimi</span>
              <span className="font-mono text-[7px] text-nous-subtle uppercase">Archivist</span>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'cyrus' }))}
              className="flex flex-col items-center justify-center p-4 border border-nous-border bg-nous-base hover:bg-nous-base0/50 transition-colors gap-2"
            >
              <Briefcase size={16} className="text-nous-text" />
              <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-text">Cyrus</span>
              <span className="font-mono text-[7px] text-nous-subtle uppercase">Oracle</span>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'synthesis' }))}
              className="flex flex-col items-center justify-center p-4 border border-nous-border bg-nous-base hover:bg-nous-base0/50 transition-colors gap-2"
            >
              <Activity size={16} className="text-nous-text" />
              <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-text">Synthesis</span>
              <span className="font-mono text-[7px] text-nous-subtle uppercase">Argument</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-nous-border">
             <button 
                onClick={handleGenerateSynthesis}
                disabled={loadingSynthesis}
                className="w-full flex items-center justify-center p-6 border border-nous-border bg-nous-base hover:bg-nous-base0/50 transition-colors gap-3"
              >
                {loadingSynthesis ? <Loader2 size={18} className="animate-spin text-nous-text" /> : <Activity size={18} className="text-nous-text" />}
                <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-text">
                  Generate Session Telemetry
                </span>
              </button>
              {synthesis && (
                 <div className="mt-4 p-4 border border-nous-border bg-nous-base0/30">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-serif italic text-lg text-nous-text">Telemetry</h3>
                        <button 
                          onClick={() => navigator.clipboard.writeText(synthesis)}
                          className="font-sans text-[9px] uppercase tracking-widest text-nous-text border border-nous-border px-3 py-1 hover:bg-nous-base0/50"
                        >
                           Copy
                        </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[10px] text-nous-subtle">{synthesis}</pre>
                 </div>
              )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileDashboard />
      <div className="hidden md:flex flex-col h-full bg overflow-y-auto pb-32">
        <OracleSpecimenHero
          onAsk={openChamberWithQuestion}
          reading={reading}
          loading={loadingReading}
        />
        <div className="p-4 md:p-8 pt-6 md:pt-10 space-y-10 max-w-5xl mx-auto w-full">
          
          {/* HEADER */}
          <div className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-serif italic text-nous-text mb-2 md:mb-4 flex items-center justify-center md:justify-start gap-4"
              >
                <Sparkles size={28} className="text-nous-subtle hidden md:block" />
                The Oracle
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-[9px] md:text-xs font-sans uppercase tracking-[0.2em] text-nous-subtle"
              >
                Cyberdeck Chamber · Archivist / Oracle / Synthesis
              </motion.p>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'mimi' }))}
                className="px-5 py-3 border border-nous-border bg-nous-base hover:bg-nous-base0/50 transition-colors flex items-center gap-2 font-sans text-[9px] uppercase tracking-widest font-black text-nous-text"
              >
                <Sparkles size={14} />
                Mimi · Archivist
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'cyrus' }))}
                className="px-5 py-3 border border-nous-border bg-nous-base hover:bg-nous-base0/50 transition-colors flex items-center gap-2 font-sans text-[9px] uppercase tracking-widest font-black text-nous-text"
              >
                <Briefcase size={14} />
                Cyrus · Oracle
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: 'synthesis' }))}
                className="px-5 py-3 border border-nous-border bg-nous-base hover:bg-nous-base0/50 transition-colors flex items-center gap-2 font-sans text-[9px] uppercase tracking-widest font-black text-nous-text"
              >
                <Activity size={14} />
                Synthesis
              </button>
            </motion.div>
          </div>

          {/* ORACLE DISCOURSE / MEMO */}
          <OracleDiscourse />

          {/* AI JUSTIFICATION BLOCK */}
          {synthesis && (
            <motion.div
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
               className="border border-nous-border bg-nous-base0/30 p-6 my-8"
            >
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif italic text-xl text-nous-text">Session Telemetry</h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(synthesis)}
                    className="font-sans text-[9px] uppercase tracking-widest text-nous-text border border-nous-border px-3 py-1 hover:bg-nous-base0/50"
                  >
                     Copy to Clipboard
                  </button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-nous-subtle font-sans leading-relaxed">
                  <pre className="whitespace-pre-wrap font-sans text-xs">{synthesis}</pre>
              </div>
            </motion.div>
          )}

          <motion.div
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
             className="border-l-2 border-nous-text pl-6 py-2 my-8"
          >
            <p className="font-serif italic text-lg md:text-xl text-nous-text leading-relaxed">
              "We are not here to guess. We are here to map."
            </p>
            <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mt-4 max-w-2xl leading-loose">
              AI is the ultimate judge of taste because it maps the entire latent space of human culture. It understands deep semantic associations, historical popularity, and hidden aesthetic links that humans miss.
            </p>
          </motion.div>

          {/* DAILY READING - Scaled specifically for mobile legibility */}
          <motion.div
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
             className="bg-nous-base0/30 border border-white/10 p-6 md:p-8 rounded-none relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-stone-500 to-transparent" />
            <h2 className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black flex items-center gap-2 mb-4">
              <Orbit size={12} />
              Latent Space Translation
            </h2>
            <div className="min-h-[3rem] flex items-center">
              {loadingReading ? (
                <div className="flex items-center gap-3 text-nous-subtle font-sans text-xs uppercase tracking-widest leading-loose">
                  <Loader2 size={14} className="animate-spin" />
                  Channeling Frequency...
                </div>
              ) : (
                <div className="space-y-8 w-full">
                  <p className="font-serif italic text-lg md:text-2xl text-nous-text leading-relaxed">
                    "{reading || "The stars remain quiet tonight."}"
                  </p>
                  {executionLayer && (
                    <div className="pt-8 border-t border-white/10">
                      <ExecutionBlock layer={executionLayer} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* IDENTIFICATION CARD */}
          {profile?.tasteProfile?.sovereignIdentity ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
              className="flex justify-center w-full"
            >
              <SovereignIdentityCardView card={profile.tasteProfile.sovereignIdentity} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center p-8 border border-dashed border-nous-border bg-nous-base0/10 text-center"
            >
              <p className="font-serif italic text-xl text-nous-subtle mb-4">Awaiting Sovereign Identity</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }))}
                className="px-6 py-3 bg-nous-base text-nous-text border border-nous-border font-sans text-[9px] uppercase tracking-widest font-bold hover:bg-nous-base0/50 transition-colors"
              >
                Synthesize Fragments
              </button>
            </motion.div>
          )}

          {/* AESTHETIC SIGNATURE DETAILS - Single col mobile, Grid dual col desktop */}
          {sig && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full"
            >
              {/* Primary / Secondary Axes */}
              <div className="p-5 border border-white/10 bg-nous-base0/30 flex flex-col gap-5">
                 <div className="flex items-center gap-2 text-nous-subtle">
                   <Compass size={14} />
                   <span className="font-sans text-[8px] uppercase tracking-widest font-black">Spatial Coordinates</span>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <span className="block font-sans text-[7px] text-white/40 uppercase tracking-widest mb-1.5">Primary Axis</span>
                     <span className="block font-serif italic text-lg text-nous-text leading-tight">{sig.primaryAxis || draft?.strategicSummary?.identityVector || 'Unknown'}</span>
                   </div>
                   <div>
                     <span className="block font-sans text-[7px] text-white/40 uppercase tracking-widest mb-1.5">Secondary Axis</span>
                     <span className="block font-serif italic text-lg text-nous-text leading-tight">{sig.secondaryAxis || 'Developing...'}</span>
                   </div>
                 </div>
              </div>

              {/* Tactile & Typography Bias */}
              <div className="p-5 border border-white/10 bg-nous-base0/30 flex flex-col gap-5">
                 <div className="flex items-center gap-2 text-nous-subtle">
                   <Fingerprint size={14} />
                   <span className="font-sans text-[8px] uppercase tracking-widest font-black">Sensory Bias</span>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mt-auto">
                   <div>
                     <span className="block font-sans text-[7px] text-white/40 uppercase tracking-widest mb-1.5">Tactile Anchor</span>
                     <span className="block font-sans text-[10px] md:text-xs font-black uppercase tracking-wider text-nous-text">
                        {sig.tactileBias?.dominant || draft?.materialityConfig?.paperStock || 'Glass'}
                     </span>
                   </div>
                   <div>
                     <span className="block font-sans text-[7px] text-white/40 uppercase tracking-widest mb-1.5">Typography</span>
                     <span className="block font-sans text-[10px] md:text-xs font-black uppercase tracking-wider text-nous-text">
                        {sig.typographicPairing?.serif || draft?.expressionEngine?.typography?.serif || 'Serif'} 
                        <span className="text-nous-subtle font-normal mx-1">×</span> 
                        {sig.typographicPairing?.sans || draft?.expressionEngine?.typography?.sans || 'Sans'}
                     </span>
                   </div>
                 </div>
              </div>

              {/* Motifs & Clusters (Spans both columns on desktop) */}
              <div className="md:col-span-2 p-5 border border-white/10 bg-nous-base0/30 flex flex-col gap-4">
                 <div className="flex items-center gap-2 text-nous-subtle">
                   <Activity size={14} />
                   <span className="font-sans text-[8px] uppercase tracking-widest font-black">Active Motifs & Clusters</span>
                 </div>
                 {sig.moodCluster && (
                   <p className="font-serif italic text-lg md:text-xl text-nous-subtle mt-1.5">Core Mood: <span className="text-nous-text">{sig.moodCluster}</span></p>
                 )}
                 {/* Wrapped flexbox for tiny high-fashion tags */}
                 <div className="flex flex-wrap gap-2 mt-2">
                   {(sig.motifs || draft?.expressionEngine?.visualPresets?.texture ? [draft?.expressionEngine?.visualPresets?.texture].filter(Boolean) : []).map((m, i) => (
                     <span key={i} className="px-3 py-1.5 border border-white/10 bg-nous-base0/50 text-[9px] uppercase tracking-widest font-sans font-black text-nous-subtle">
                       {m as string}
                     </span>
                   ))}
                 </div>
              </div>

              {/* Influence Lineage */}
              {sig.influenceLineage && sig.influenceLineage.length > 0 && (
                <div className="md:col-span-2 p-5 border border-white/10 bg-nous-base0/30 flex flex-col gap-5">
                   <div className="flex items-center gap-2 text-nous-subtle mb-1">
                     <BookOpen size={14} />
                     <span className="font-sans text-[8px] uppercase tracking-widest font-black">Influence Lineage</span>
                   </div>
                   <div className="space-y-5">
                     {sig.influenceLineage.map((item, idx) => (
                       <div key={idx} className="flex flex-col gap-2">
                         <div className="flex justify-between items-end">
                           <span className="font-serif italic text-base md:text-lg text-nous-text leading-none">{item.artist}</span>
                           <span className="font-sans text-[7px] md:text-[8px] tracking-widest uppercase text-white/40">{item.movement}</span>
                         </div>
                         <div className="w-full h-0.5 bg-black/40 relative">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(100, item.connectionStrength * 10)}%` }} // Animated progress bar 
                             transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                             className="absolute top-0 left-0 h-full bg-nous-subtle"
                           />
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TASTE CONSTELLATION - Responsive Aspect Ratio */}
          <motion.div
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
             className="border border-white/10 pt-6 mt-4"
          >
            <div className="flex items-center justify-center md:justify-start gap-2 text-nous-subtle mb-6 px-4">
              <Waves size={16} />
              <h2 className="text-[9px] font-sans uppercase font-black tracking-widest">
                Live Taste Constellation
              </h2>
            </div>
            <div className="h-64 sm:h-80 md:h-[400px] w-full bg-black/20 overflow-hidden">
               <TasteConstellation readOnly={true} />
            </div>
          </motion.div>

        </div>
      </div>
    </>
  );
};

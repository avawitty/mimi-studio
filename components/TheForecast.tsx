import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { fetchContentForecast, ResearchSynthesisResponse } from '../services/researchService';
import { 
  CloudRain, Sun, Snowflake, Flame, 
  Wind, Navigation, ThermometerSun, 
  Activity, Compass, Radio, Sparkles, User, Building2, Target, Brain,
  Loader2, Link2, ExternalLink
} from 'lucide-react';

export const TheForecast: React.FC = () => {
  const { user, profile, apiKeys } = useUser();
  const [forecastingScope, setForecastingScope] = useState<'personal' | 'company'>('personal');
  const [selectedVector, setSelectedVector] = useState<'overview' | 'content' | 'culture'>('overview');
  
  const [contentForecast, setContentForecast] = useState<ResearchSynthesisResponse | null>(null);
  const [isPingingLabs, setIsPingingLabs] = useState(false);

  useEffect(() => {
    if (selectedVector === 'content' && !contentForecast) {
      setIsPingingLabs(true);
      fetchContentForecast(apiKeys).then(res => {
        setContentForecast(res);
        setIsPingingLabs(false);
      });
    }
  }, [selectedVector, contentForecast, apiKeys]);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-nous-base p-8">
        <p className="font-mono text-nous-subtle uppercase tracking-widest text-[10px]">
          Identity Not Established
        </p>
      </div>
    );
  }

  // Weather Mapping based on user.currentSeason
  const weatherIcons: Record<string, React.ReactNode> = {
    'rotting': <CloudRain size={48} className="text-nous-text opacity-70" />,
    'blooming': <Sun size={48} className="text-nous-text opacity-90" />,
    'frozen': <Snowflake size={48} className="text-nous-text opacity-60" />,
    'burning': <Flame size={48} className="text-nous-text animate-pulse" />
  };

  const weatherDescriptors: Record<string, string> = {
    'rotting': 'Deconstructive / Composting old aesthetics.',
    'blooming': 'Generative / Rapid aesthetic synthesis.',
    'frozen': 'Stagnant / Archival preservation mode.',
    'burning': 'High-entropy / Radical reinvention.'
  };

  const currentSeason = profile?.currentSeason || 'rotting';
  
  // Safely extract properties
  const dna = profile?.aestheticDNA || null;
  const geo = profile?.geoProfile || null;
  const vectorEntropy = Number(
    (profile as { aestheticVector?: { entropy?: number } } | null)?.aestheticVector
      ?.entropy,
  );
  const driftScore =
    typeof geo?.driftScore === "number" && Number.isFinite(geo.driftScore)
      ? geo.driftScore
      : Number.isFinite(vectorEntropy)
        ? Math.round(Math.min(100, Math.max(0, vectorEntropy * 100)))
        : null;
  const driftDirection =
    driftScore == null
      ? "Insufficient Signal"
      : driftScore > 50
        ? "Severe Turbulence"
        : "Stable Micro-Climate";

  return (
    <div className="flex-1 flex overflow-hidden bg-[#EAE8E4] text-nous-text">
      
      {/* Sidebar: Forecast Scope */}
      <div className="w-80 border-r border-nous-border flex flex-col bg-nous-surface shadow-lg z-10 shrink-0">
        <div className="p-6 border-b border-nous-border bg-nous-base border-l-4 border-l-[#a8b79f]">
          <h2 className="font-serif italic text-2xl mb-1 text-nous-text">The Forecast</h2>
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle leading-tight">
            Predictive Content & Aesthetic Flow
          </p>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h3 className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-3">Forecasting Scope</h3>
            <div className="space-y-2">
               <button 
                onClick={() => setForecastingScope('personal')}
                className={`w-full text-left p-3 border font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-between ${forecastingScope === 'personal' ? 'bg-nous-text text-nous-base border-nous-text' : 'border-nous-border bg-nous-base hover:bg-nous-surface'}`}
              >
                <div className="flex items-center gap-2">
                  <User size={14} /> Sovereign Curator
                </div>
              </button>
              <button 
                onClick={() => setForecastingScope('company')}
                className={`w-full text-left p-3 border font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-between ${forecastingScope === 'company' ? 'bg-nous-text text-nous-base border-nous-text' : 'border-nous-border bg-nous-base hover:bg-nous-surface'}`}
              >
                <div className="flex items-center gap-2">
                  <Building2 size={14} /> Brand OS (Company)
                </div>
              </button>
            </div>
            {forecastingScope === 'company' && (
               <p className="mt-3 font-sans text-[10px] text-nous-subtle leading-relaxed bg-[#a8b79f]/10 p-2 border border-[#a8b79f]/30 text-[#4a5c41]">
                 Operating via Brand OS. Forecasting is derived from systemic brand guidelines and global market trajectories.
               </p>
            )}
             {forecastingScope === 'personal' && (
               <p className="mt-3 font-sans text-[10px] text-nous-subtle leading-relaxed border border-nous-border border-dashed p-2">
                 Operating as Sovereign Curator. Forecasting is derived directly from your Thimble and aesthetic networking history. 
               </p>
            )}
          </div>
          
          <div className="space-y-2">
             <h3 className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-3">Available Vectors</h3>
             <button 
               onClick={() => setSelectedVector('overview')}
               className={`w-full text-left p-3 border font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedVector === 'overview' ? 'bg-nous-text text-nous-base border-nous-text' : 'border-nous-border bg-nous-base hover:bg-nous-surface'}`}
             >
                <Radio size={14} /> Overview
              </button>
             <button 
               onClick={() => setSelectedVector('content')}
               className={`w-full text-left p-3 border font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedVector === 'content' ? 'bg-nous-text text-nous-base border-nous-text' : 'border-nous-border bg-nous-base hover:bg-nous-surface'}`}
             >
                <Target size={14} /> Content Forecasting
              </button>
              <button 
               onClick={() => setSelectedVector('culture')}
               className={`w-full text-left p-3 border font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedVector === 'culture' ? 'bg-nous-text text-nous-base border-nous-text' : 'border-nous-border bg-nous-base hover:bg-nous-surface'}`}
             >
                <Brain size={14} /> Cultural Shifts
              </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-nous-base text-nous-text p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 border-b border-nous-border pb-6 flex items-end justify-between">
          <div>
            <h1 className="font-serif italic text-3xl md:text-5xl text-nous-text">The Forecast</h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-nous-subtle mt-2">
              Aesthetic Meteorology & Identity Metrics
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] text-nous-subtle uppercase tracking-widest">
            <Radio size={12} className="animate-pulse" />
            Live Telemetry
          </div>
        </div>

        {selectedVector === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]">
            
            {/* Main Weather Condition (2x2 on desktop) */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 md:row-span-2 bg-nous-surface border border-nous-border p-6 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none scale-150 origin-top-right">
                {weatherIcons[currentSeason]}
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <ThermometerSun size={14} className="text-nous-subtle" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Current Condition</span>
                </div>
                <h2 className="font-serif italic text-5xl md:text-7xl mb-2 capitalize">{currentSeason}</h2>
                <p className="font-mono text-xs uppercase tracking-widest text-nous-text/80">
                  {weatherDescriptors[currentSeason]}
                </p>
              </div>

              <div className="relative z-10 mt-12 grid grid-cols-2 gap-4 border-t border-nous-border/50 pt-4">
                <div>
                  <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Drift Probability</span>
                  <span className="font-sans text-xl tracking-tight">
                    {driftScore == null ? "—" : `${driftScore}%`}
                  </span>
                </div>
                <div>
                  <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Atmospheric State</span>
                  <span className="font-sans text-sm tracking-tight">{driftDirection}</span>
                </div>
              </div>
            </motion.div>

            {/* Aesthetic DNA / Identity */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-2 bg-transparent border border-nous-border p-6 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-nous-subtle" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Core Identity</span>
              </div>
              {dna ? (
                <>
                  <p className="font-serif text-lg leading-snug mb-4">"{dna.dnaStatement}"</p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {dna.archetypes.map((a, i) => (
                      <span key={i} className="px-2 py-1 border border-nous-text/20 font-mono text-[8px] uppercase tracking-widest">
                        {a}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-nous-subtle font-mono text-xs">
                  No DNA profile generated.
                </div>
              )}
            </motion.div>

            {/* Market / Generative Positioning */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-1 bg-nous-surface border border-nous-border p-6 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <Navigation size={14} className="text-nous-subtle" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Generative Vector</span>
              </div>
              {geo ? (
                <div className="flex flex-col gap-4 flex-1 justify-center">
                  <div>
                    <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Archetype Map</span>
                    <span className="font-sans text-sm font-medium">{geo.marketMirror?.consumerArchetype || 'Undefined'}</span>
                  </div>
                  <div>
                    <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Semantic Clusters</span>
                    <div className="flex flex-wrap gap-1">
                      {geo.retrievalIdentity?.semanticClusters?.slice(0,3).map((c, i) => (
                        <span key={i} className="text-[9px] text-nous-text/80">{c}{i !== 2 && ','}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-nous-subtle font-mono text-[9px]">
                  GEO uncalibrated.
                </div>
              )}
            </motion.div>

            {/* Aesthetic Trajectory */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-1 bg-transparent border border-nous-border p-6 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 mb-4">
                <Compass size={14} className="text-nous-subtle" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Projected Shift</span>
              </div>
              {(profile as any)?.tasteVector ? (
                <div className="space-y-3">
                  {Object.entries((profile as any)?.tasteVector || {}).map(([key, val], i) => (
                    <div key={key}>
                      <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest mb-1">
                        <span>{key}</span>
                        <span>{Math.round((val as number)*100)}%</span>
                      </div>
                      <div className="w-full h-px bg-nous-border">
                        <div className="h-full bg-nous-text" style={{ width: `${(val as number)*100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-nous-subtle font-mono text-[9px]">
                  Vector data missing.
                </div>
              )}
            </motion.div>

            {/* Full-width textual radar / insights stream */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="md:col-span-4 bg-nous-surface border border-nous-border p-6 relative overflow-hidden group"
            >
              <div className="flex flex-col md:flex-row gap-6 md:items-center">
                <div className="shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind size={14} className="text-nous-subtle" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Atmospheric Resonance</span>
                  </div>
                  <h3 className="font-serif italic text-2xl">The Oracle's Read</h3>
                </div>
                <div className="w-px h-full bg-nous-border hidden md:block opacity-50" />
                <div className="flex-1">
                  <p className="font-mono text-xs md:text-sm leading-relaxed text-nous-text/80">
                    {geo?.semanticSignature?.stylisticLanguage || 
                     dna?.poeticExpansion || 
                     "You are currently in a state of observation. The system requires more inputs to form a high-resolution forecast. Continue gathering artifacts to crystalize your signal."}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedVector === 'content' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-serif italic text-2xl flex items-center gap-3">
              <Target size={20}/> Content Forecasting 
              <span className="text-[10px] uppercase font-sans tracking-widest text-nous-subtle ml-2 bg-nous-border/30 px-2 py-1 rounded-sm flex items-center gap-2">
                Powered by {contentForecast ? contentForecast.provider : 'Research Synthesis'} {isPingingLabs && <Loader2 size={10} className="animate-spin" />}
              </span>
            </h2>

            {isPingingLabs && !contentForecast ? (
              <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center border border-nous-border border-dashed p-12 text-nous-subtle">
                <Loader2 className="animate-spin mb-4" size={24} />
                <p className="font-mono text-xs uppercase tracking-widest">Pinging Research API...</p>
                <p className="font-sans text-[10px] mt-2 opacity-60">Synthesizing deep research vectors</p>
              </div>
            ) : contentForecast ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-nous-surface border border-nous-border p-6 flex flex-col gap-6">
                   <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Format Resonance Index</h3>
                   <div className="space-y-6">
                     {contentForecast.trends.length === 0 ? (
                       <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle leading-relaxed">
                         No live format vectors yet. Connect You.com / AI Gateway credits and retry.
                       </p>
                     ) : (
                       contentForecast.trends.map((trend, idx) => (
                       <div key={idx} className="space-y-2">
                         <div className="flex justify-between font-mono text-[9px] uppercase items-center">
                           <span className="font-bold text-[11px]">{trend.format}</span>
                           <span className={trend.velocity === 'Surging' ? 'text-green-500' : trend.velocity === 'Rising' ? 'text-blue-400' : 'text-orange-500'}>
                             {trend.velocity}
                           </span>
                         </div>
                         <div className="w-full h-1 bg-nous-border relative overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${trend.score}%` }}
                             transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                             className={`h-full ${trend.velocity === 'Surging' ? 'bg-nous-text' : 'bg-nous-subtle'}`}
                           />
                         </div>
                         <p className="font-sans text-[11px] text-nous-text/80 leading-snug mt-2">{trend.analysis}</p>
                         
                         {/* Sources Section */}
                         {trend.sources.length > 0 && (
                           <div className="mt-3 pt-2 border-t border-nous-border/50 flex flex-col gap-1.5">
                             <div className="flex items-center gap-1.5 text-nous-subtle">
                               <Link2 size={10} />
                               <span className="font-mono text-[8px] uppercase tracking-widest">Sourced Citations</span>
                             </div>
                             {trend.sources.map((source, sIdx) => (
                               <a key={sIdx} href={source.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between hover:bg-nous-base p-1.5 rounded-sm transition-colors border border-transparent hover:border-nous-border">
                                 <span className="font-sans text-[10px] underline decoration-nous-border group-hover:decoration-nous-text/50 truncate pr-4">{source.title}</span>
                                 <div className="flex items-center gap-2 shrink-0">
                                   <span className="font-mono text-[8px] text-nous-subtle bg-nous-border/30 px-1 py-0.5 rounded-sm">{(source.credibility * 100).toFixed(0)}% CQ</span>
                                   <ExternalLink size={10} className="text-nous-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                               </a>
                             ))}
                           </div>
                         )}
                       </div>
                     ))
                     )}
                   </div>
                 </div>
                 <div className="bg-transparent border border-nous-border p-6 flex flex-col justify-between sticky top-4 h-fit">
                   <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-4 flex items-center gap-2">
                     <Brain size={14} /> The Synthesis
                   </h3>
                   <p className="font-serif text-xl leading-relaxed italic text-nous-text/90">"{contentForecast.synthesis}"</p>
                 </div>
              </div>
            ) : null}
          </div>
        )}

        {selectedVector === 'culture' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-serif italic text-2xl flex items-center gap-3"><Brain size={20}/> Cultural Shifts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="md:col-span-2 bg-nous-surface border border-nous-border p-6">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-4">Macro Atmospheric Currents</h3>
                  <ul className="space-y-4">
                    <li className="flex gap-4 items-start">
                       <CloudRain size={16} className="text-nous-subtle mt-1 shrink-0"/>
                       <div>
                         <strong className="font-mono text-[10px] uppercase tracking-widest block mb-1">Post-Authenticity</strong>
                         <p className="font-sans text-xs text-nous-text/80 leading-relaxed">The shift away from forced "rawness" towards deliberate, theatrical curation. Hyper-stylization as a form of honesty.</p>
                       </div>
                    </li>
                    <li className="flex gap-4 items-start">
                       <Snowflake size={16} className="text-nous-subtle mt-1 shrink-0"/>
                       <div>
                         <strong className="font-mono text-[10px] uppercase tracking-widest block mb-1">Neo-Luddite Aesthetics</strong>
                         <p className="font-sans text-xs text-nous-text/80 leading-relaxed">Fetishization of analog interfaces, low-fidelity captures, and friction-heavy user experiences in a frictionless digital landscape.</p>
                       </div>
                    </li>
                  </ul>
               </div>
               <div className="bg-transparent border border-nous-border border-dashed p-6 flex flex-col items-center justify-center text-center">
                  <Activity size={24} className="text-nous-subtle mb-4"/>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest mb-2">Memetic Velocity</h4>
                  <span className="font-sans text-4xl mb-2">High</span>
                  <p className="font-sans text-[10px] text-nous-subtle">Cultural cycles are completing in 3 weeks average.</p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

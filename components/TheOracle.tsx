import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { SovereignIdentityCardView } from './SovereignIdentityCardView';
import { TasteConstellation } from './TasteConstellation';
import { useUser } from '../contexts/UserContext';
import { generateCelestialReading, generateExecutionLayer } from '../services/geminiService';
import {
  Sparkles,
  Loader2,
  Fingerprint,
  Activity,
  BookOpen,
  Orbit,
  Waves,
  Compass,
  Briefcase,
  FileText,
  Disc3,
} from 'lucide-react';
import { ExecutionBlock } from './ExecutionBlock';
import { ExecutionLayer } from '../types';
import { OracleSpecimenHero } from './public-face';
import { OracleChamberReports } from './oracle/OracleChamberReports';
import { OracleCyberdeckAtmosphere, OracleCyberdeckDeck } from './oracle/OracleCyberdeckDeck';
import type { OracleEntityId } from '../services/oracleChamberService';
import './public-face/atelier.css';

const openChamber = (entity: OracleEntityId) => {
  window.dispatchEvent(new CustomEvent('mimi:open_scribe', { detail: entity }));
};

export const TheOracle: React.FC = () => {
  const { profile, activePersona, user } = useUser();
  const [reading, setReading] = useState<string | null>(null);
  const [executionLayer, setExecutionLayer] = useState<ExecutionLayer | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);

  const userId = user?.uid || 'ghost';

  const handleAsk = useCallback((_question: string) => {
    openChamber('cyrus');
  }, []);

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
            console.error('Execution Layer Error:', e);
          }
        })
        .catch((e) => console.error('Oracle Error:', e))
        .finally(() => setLoadingReading(false));
    }
  }, [profile, reading]);

  const sig = profile?.tasteProfile?.aestheticSignature;
  const draft = activePersona?.tailorDraft || profile?.tailorDraft;

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32">
      <OracleSpecimenHero onAsk={handleAsk} reading={reading} loading={loadingReading} />

      <OracleCyberdeckAtmosphere className="min-h-0">
        <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto w-full space-y-10">

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Disc3 size={14} className="text-amber-500/80" />
                <span className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/45">
                  Interpretive Chamber
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-serif italic text-[#f5f4f0]">
                The Oracle
              </h1>
              <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/40 mt-2">
                Cyberdeck · Archivist / Oracle / Synthesis
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['mimi', 'cyrus', 'synthesis'] as OracleEntityId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openChamber(id)}
                  className="px-4 py-2.5 border border-white/15 bg-white/[0.03] hover:border-amber-500/40 hover:bg-amber-500/5 font-mono text-[8px] uppercase tracking-widest text-white/70 hover:text-amber-400/90 transition-colors"
                >
                  {id === 'mimi' && <Sparkles size={10} className="inline mr-1.5 -mt-0.5" />}
                  {id === 'cyrus' && <Briefcase size={10} className="inline mr-1.5 -mt-0.5" />}
                  {id === 'synthesis' && <Activity size={10} className="inline mr-1.5 -mt-0.5" />}
                  {id === 'mimi' ? 'Mimi' : id === 'cyrus' ? 'Cyrus' : 'Synthesis'}
                </button>
              ))}
            </div>
          </motion.header>

          {/* Cyberdeck deck + reports */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-10 items-start">
            <motion.aside
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="flex flex-col items-center lg:sticky lg:top-8"
            >
              <OracleCyberdeckDeck onSelectEntity={openChamber} />
              <button
                type="button"
                onClick={() => openChamber('cyrus')}
                className="mt-6 w-full max-w-xs py-3 border border-amber-500/50 bg-amber-500/10 text-amber-400/95 font-mono text-[8px] uppercase tracking-[0.24em] hover:bg-amber-500/20 transition-colors"
              >
                Enter Cyberdeck
              </button>
            </motion.aside>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <OracleChamberReports userId={userId} onOpenChamber={openChamber} />
            </motion.div>
          </div>

          {/* Operational discourse — compact cyberdeck memo */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-white/10 bg-white/[0.02] p-5 md:p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <FileText size={12} className="text-amber-500/70" />
              <span className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/45">
                Operational Discourse
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Sparkles size={12} />,
                  title: 'Mimi — Archivist',
                  body: 'Preserves aesthetic memory — Pocket shards, Tailor evidence, past issues.',
                },
                {
                  icon: <Briefcase size={12} />,
                  title: 'Cyrus — Oracle',
                  body: 'Forecasts departures. Pressure-tests your next move against cultural signal.',
                },
                {
                  icon: <Activity size={12} />,
                  title: 'Synthesis — Argument',
                  body: 'Stages Mimi and Cyrus in dialogue — evidence vs foresight, then a decision.',
                },
              ].map((item) => (
                <div key={item.title} className="space-y-2 border-l border-amber-500/30 pl-4">
                  <div className="flex items-center gap-2 text-white/70">
                    {item.icon}
                    <h3 className="font-mono text-[8px] uppercase tracking-widest">{item.title}</h3>
                  </div>
                  <p className="font-serif italic text-sm text-white/55 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Latent space translation */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="border border-white/10 bg-black/40 p-6 md:p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-amber-500/60 to-transparent" />
            <h2 className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/45 font-black flex items-center gap-2 mb-4">
              <Orbit size={12} className="text-amber-500/70" />
              Latent Space Translation
            </h2>
            <div className="min-h-[3rem]">
              {loadingReading ? (
                <div className="flex items-center gap-3 text-white/40 font-mono text-[9px] uppercase tracking-widest">
                  <Loader2 size={14} className="animate-spin" />
                  Channeling frequency…
                </div>
              ) : (
                <div className="space-y-8">
                  <p className="font-serif italic text-lg md:text-2xl text-white/90 leading-relaxed">
                    &ldquo;{reading || 'The stars remain quiet tonight.'}&rdquo;
                  </p>
                  {executionLayer && (
                    <div className="pt-6 border-t border-white/10">
                      <ExecutionBlock layer={executionLayer} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.section>

          {/* Sovereign identity */}
          {profile?.tasteProfile?.sovereignIdentity ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.14 }}
              className="flex justify-center"
            >
              <SovereignIdentityCardView card={profile.tasteProfile.sovereignIdentity} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.14 }}
              className="flex flex-col items-center p-8 border border-dashed border-white/15 text-center"
            >
              <p className="font-serif italic text-xl text-white/45 mb-4">Awaiting Sovereign Identity</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }))}
                className="px-6 py-3 border border-white/20 font-mono text-[8px] uppercase tracking-widest text-white/70 hover:border-amber-500/40 hover:text-amber-400/90 transition-colors"
              >
                Synthesize Fragments
              </button>
            </motion.div>
          )}

          {/* Aesthetic signature */}
          {sig && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="p-5 border border-white/10 bg-white/[0.03] flex flex-col gap-4">
                <div className="flex items-center gap-2 text-white/45">
                  <Compass size={12} />
                  <span className="font-mono text-[8px] uppercase tracking-widest">Spatial Coordinates</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block font-mono text-[7px] text-white/30 uppercase tracking-widest mb-1">Primary</span>
                    <span className="font-serif italic text-base text-white/85">
                      {sig.primaryAxis || draft?.strategicSummary?.identityVector || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[7px] text-white/30 uppercase tracking-widest mb-1">Secondary</span>
                    <span className="font-serif italic text-base text-white/85">
                      {sig.secondaryAxis || 'Developing…'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 border border-white/10 bg-white/[0.03] flex flex-col gap-4">
                <div className="flex items-center gap-2 text-white/45">
                  <Fingerprint size={12} />
                  <span className="font-mono text-[8px] uppercase tracking-widest">Sensory Bias</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block font-mono text-[7px] text-white/30 uppercase tracking-widest mb-1">Tactile</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-white/80">
                      {sig.tactileBias?.dominant || draft?.materialityConfig?.paperStock || 'Glass'}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[7px] text-white/30 uppercase tracking-widest mb-1">Type</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-white/80">
                      {sig.typographicPairing?.serif || draft?.expressionEngine?.typography?.serif || 'Serif'}
                      <span className="text-white/35 mx-1">×</span>
                      {sig.typographicPairing?.sans || draft?.expressionEngine?.typography?.sans || 'Sans'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 p-5 border border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2 text-white/45 mb-3">
                  <Activity size={12} />
                  <span className="font-mono text-[8px] uppercase tracking-widest">Active Motifs</span>
                </div>
                {sig.moodCluster && (
                  <p className="font-serif italic text-base text-white/60 mb-3">
                    Core mood: <span className="text-white/90">{sig.moodCluster}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(sig.motifs || (draft?.expressionEngine?.visualPresets?.texture
                    ? [draft.expressionEngine.visualPresets.texture]
                    : []
                  )).map((m, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 border border-white/10 font-mono text-[8px] uppercase tracking-widest text-white/50"
                    >
                      {m as string}
                    </span>
                  ))}
                </div>
              </div>

              {sig.influenceLineage && sig.influenceLineage.length > 0 && (
                <div className="md:col-span-2 p-5 border border-white/10 bg-white/[0.03] space-y-4">
                  <div className="flex items-center gap-2 text-white/45">
                    <BookOpen size={12} />
                    <span className="font-mono text-[8px] uppercase tracking-widest">Influence Lineage</span>
                  </div>
                  {sig.influenceLineage.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="font-serif italic text-base text-white/85">{item.artist}</span>
                        <span className="font-mono text-[7px] uppercase text-white/30">{item.movement}</span>
                      </div>
                      <div className="h-0.5 bg-white/10 relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, item.connectionStrength * 10)}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + idx * 0.08 }}
                          className="absolute inset-y-0 left-0 bg-amber-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Taste constellation */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="border border-white/10 pt-5"
          >
            <div className="flex items-center gap-2 text-white/45 mb-4 px-1">
              <Waves size={14} />
              <h2 className="font-mono text-[8px] uppercase tracking-[0.28em]">Live Taste Constellation</h2>
            </div>
            <div className="h-64 md:h-80 w-full bg-black/50 overflow-hidden border border-white/5">
              <TasteConstellation readOnly />
            </div>
          </motion.section>
        </div>
      </OracleCyberdeckAtmosphere>
    </div>
  );
};

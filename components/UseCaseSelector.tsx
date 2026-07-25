import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Layout, Radio, Layers, Globe } from 'lucide-react';

export type GatewayCapabilityRole = 'text-fast' | 'text-deep' | 'research-deep';

export interface BriefPreset {
  id: string;
  title: string;
  icon: React.ReactNode;
  tag: string;
  description: string;
  briefInstruction: string;
  outputContract: string[];
  temperature: number;
  gatewayCapability: GatewayCapabilityRole;
  routingPolicy: 'gateway-auto';
  telemetryCode: string;
}

// Product presets describe the work to perform. Provider and model selection
// stay behind the AI Gateway and may change without changing the preset.
export const BRIEF_PRESETS: BriefPreset[] = [
  {
    id: 'social-manager',
    title: 'Sovereign Social Manager',
    icon: <Sparkles className="w-4 h-4" />,
    tag: 'Velocity Strategy',
    description: 'Turns source material into a channel-aware audience brief while preserving the creator’s voice, evidence, and anti-trend point of view.',
    briefInstruction: 'Identify the strongest audience tension, translate it into a focused distribution idea, and preserve the creator’s original language rather than flattening it into generic engagement copy.',
    outputContract: ['audience tension', 'editorial angle', 'channel adaptations', 'publishing cadence'],
    temperature: 0.85,
    gatewayCapability: 'text-fast',
    routingPolicy: 'gateway-auto',
    telemetryCode: 'BRIEF_VELOCITY_TEXT_FAST_0.85'
  },
  {
    id: 'strategist-manifest',
    title: "The Strategist's Manifest",
    icon: <Layout className="w-4 h-4" />,
    tag: 'Professional Workflow',
    description: 'Architects structured B2B Dossiers, pricing models, and functional roadmaps out of raw research debris.',
    briefInstruction: 'Convert the supplied research into a decision-ready strategic brief with explicit evidence, assumptions, risks, recommendations, and next actions.',
    outputContract: ['executive summary', 'evidence', 'strategic options', 'decision queue'],
    temperature: 0.15,
    gatewayCapability: 'text-deep',
    routingPolicy: 'gateway-auto',
    telemetryCode: 'BRIEF_STRATEGY_TEXT_DEEP_0.15'
  },
  {
    id: 'client-refraction',
    title: 'Client Refraction Engine',
    icon: <Globe className="w-4 h-4" />,
    tag: 'Consulting Wedge',
    description: 'Crawl remote client URLs instantly to draft high-fidelity brand audits and customized consulting proposals.',
    briefInstruction: 'Separate observed client evidence from inference, identify the most consequential gaps, and shape a scoped consulting response without inventing unsupported brand claims.',
    outputContract: ['observed evidence', 'diagnosis', 'opportunity areas', 'scoped proposal'],
    temperature: 0.3,
    gatewayCapability: 'research-deep',
    routingPolicy: 'gateway-auto',
    telemetryCode: 'BRIEF_REFRACT_RESEARCH_DEEP_0.30'
  },
  {
    id: 'archival-infrastructure',
    title: 'Archival Infrastructure',
    icon: <Layers className="w-4 h-4" />,
    tag: 'Data Sovereignty',
    description: 'Leverages historical-conceptual databases to cluster fragments and organize a localized private research hub.',
    briefInstruction: 'Organize approved fragments into a retrievable research structure, preserve provenance, and mark observed, inferred, and unresolved material explicitly.',
    outputContract: ['source clusters', 'named patterns', 'provenance map', 'open questions'],
    temperature: 0.4,
    gatewayCapability: 'text-deep',
    routingPolicy: 'gateway-auto',
    telemetryCode: 'BRIEF_ARCHIVE_TEXT_DEEP_0.40'
  }
];

export const CUSTOM_BRIEF_PRESETS_KEY = 'mimi_custom_brief_presets';

export const loadCustomBriefPresets = (): BriefPreset[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_BRIEF_PRESETS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((preset) => preset?.id && preset?.title && preset?.briefInstruction)
      .map((preset) => ({
        ...preset,
        icon: <Layout className="w-4 h-4" />,
        routingPolicy: 'gateway-auto',
      }));
  } catch {
    return [];
  }
};

export const saveCustomBriefPresets = (presets: BriefPreset[]) => {
  const serializable = presets.map(({ icon, ...preset }) => preset);
  localStorage.setItem(CUSTOM_BRIEF_PRESETS_KEY, JSON.stringify(serializable));
};

export const getBriefPreset = (id?: string): BriefPreset =>
  [...BRIEF_PRESETS, ...loadCustomBriefPresets()].find((preset) => preset.id === id) || BRIEF_PRESETS[0];

interface UseCaseSelectorProps {
  activeId: string;
  onSelectPersona: (persona: BriefPreset) => void;
  playClickSound?: () => void;
}

export const UseCaseSelector: React.FC<UseCaseSelectorProps> = ({ 
  activeId,
  onSelectPersona, 
  playClickSound = () => {} 
}) => {
  const [logs, setLogs] = useState<string[]>([
    'AI GATEWAY READY // PROVIDER ROUTING AVAILABLE',
    'AWAITING BRIEF PRESET...'
  ]);

  const activePersona = getBriefPreset(activeId);
  const availablePresets = [...BRIEF_PRESETS, ...loadCustomBriefPresets()];

  const handleSelect = (persona: BriefPreset) => {
    playClickSound();
    
    // Append real-time cybernetic logging sequences
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      `[${timestamp}] DECK LOADED: ${persona.telemetryCode}`,
      `[${timestamp}] GATEWAY ROLE: ${persona.gatewayCapability.toUpperCase()}`,
      `[${timestamp}] ROUTING POLICY: AUTO / COMPATIBLE PROVIDER`,
      ...prev.slice(0, 4)
    ]);

    onSelectPersona(persona);
  };

  return (
    <div className="w-full border border-nous-border bg-[#FCFCFA] dark:bg-[#070707] rounded-none p-5 font-mono text-xs text-stone-800 dark:text-stone-300 transition-all select-none">
      <div className="flex justify-between items-center border-b border-nous-border/40 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span className="font-sans font-bold tracking-widest text-[#141414] dark:text-[#fcfcfa] uppercase text-[10px]">✥ BRIEF CALIBRATION DECK</span>
        </div>
        <span className="text-[9px] text-[#A8A29E] font-bold">GATEWAY_PROFILE_V1</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Persona Matrix Cards */}
        <div className="space-y-2">
          {availablePresets.map((persona) => {
            const isActive = persona.id === activeId;
            return (
              <button
                key={persona.id}
                onClick={() => handleSelect(persona)}
                className={`w-full text-left p-3 border transition-all relative flex flex-col gap-1.5 group rounded-none ${
                  isActive 
                    ? 'border-amber-500 bg-amber-50/10 text-stone-900 dark:text-stone-100 ring-1 ring-amber-500/20' 
                    : 'border-nous-border hover:border-stone-400 dark:hover:border-stone-600 bg-transparent text-stone-500 dark:text-stone-400'
                }`}
              >
                {/* Active Selector Indicator Light */}
                {isActive && (
                  <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-amber-500 rounded-none shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                )}
                
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 border transition-all rounded-none ${
                    isActive ? 'border-amber-500 text-amber-500' : 'border-nous-border group-hover:text-stone-700'
                  }`}>
                    {persona.icon}
                  </div>
                  <div>
                    <div className="text-[8px] uppercase font-bold tracking-widest text-stone-400 dark:text-stone-500 leading-none">
                      {persona.tag}
                    </div>
                    <div className="font-bold tracking-tight text-[11px] mt-0.5">
                      {persona.title}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Dynamic Parameters & Telemetry Console */}
        <div className="flex flex-col justify-between border border-nous-border bg-transparent p-4">
          <div className="space-y-3">
            <div>
              <span className="text-[8px] uppercase text-[#A8A29E] font-bold tracking-wider">Preset Intent</span>
              <p className="font-serif italic text-xs text-stone-700 dark:text-stone-300 leading-normal mt-1">
                "{activePersona.description}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-nous-border/20">
              <div className="col-span-2">
                <span className="text-[8px] uppercase text-[#A8A29E] font-bold tracking-wider">Creative Range</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-stone-100 dark:bg-stone-900 h-1.5 border border-nous-border relative rounded-none">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${activePersona.temperature * 100}%` }}
                      transition={{ type: 'spring', stiffness: 80 }}
                      className="h-full bg-amber-500 rounded-none"
                    />
                  </div>
                  <span className="font-bold text-[#141414] dark:text-[#fcfcfa] text-[10px]">{activePersona.temperature.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <span className="text-[8px] uppercase text-[#A8A29E] font-bold tracking-wider">Gateway Role</span>
                <div className="font-bold mt-1 text-[#141414] dark:text-[#fcfcfa] text-[10px]">
                  {activePersona.gatewayCapability.toUpperCase()}
                </div>
              </div>

              <div>
                <span className="text-[8px] uppercase text-[#A8A29E] font-bold tracking-wider">Provider Route</span>
                <div className="font-bold mt-1 text-[#141414] dark:text-[#fcfcfa] text-[10px]">
                  AUTO / FALLBACK
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Logs Panel */}
          <div className="mt-4 border-t border-nous-border/20 pt-3">
            <span className="text-[8px] uppercase text-[#A8A29E] font-bold tracking-wider">Gateway Routing Log</span>
            <div className="mt-1.5 space-y-1 bg-stone-500/5 border border-nous-border/30 p-2 font-mono text-[8px] leading-tight text-stone-400 dark:text-stone-500 h-20 overflow-y-hidden select-none">
              {logs.map((log, i) => (
                <div key={i} className={i === 0 ? 'text-amber-500 font-bold' : ''}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

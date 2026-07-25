import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartHandshake, ShieldAlert, Sparkles, Loader2, 
  ShieldCheck, Anchor, BookOpen, PenTool, Check, 
  Orbit, Feather, ArrowRight, Trash2, Download, Database
} from 'lucide-react';
import { executeConfidenceModule, generateCelestialReading, generateSanctuaryReport } from '../services/geminiService';
import { useUser } from '../contexts/UserContext';
import { SanctuaryReport } from '../types';

interface SavedReflection {
  id: string;
  timestamp: number;
  type: 'calibration' | 'module' | 'celestial';
  moduleLabel?: string;
  input: string;
  output: string;
}

const MODULES = [
  { id: 'reality_anchor', label: 'Reality Anchor', icon: <Anchor size={14} />, desc: 'Dismantle triangulation and toxic comparison loops.' },
  { id: 'attachment_translator', label: 'Attachment Translator', icon: <HeartHandshake size={14} />, desc: 'Recode jealousy into a clear aesthetic signal.' },
  { id: 'projection_diffuser', label: 'Projection Diffuser', icon: <ShieldAlert size={14} />, desc: 'Disfuse passive self-blame loops.' },
  { id: 'confidence_ledger', label: 'Confidence Ledger', icon: <BookOpen size={14} />, desc: 'Compile sensory, physical evidence of style and worth.' },
  { id: 'language_rewriter', label: 'Language Rewriter', icon: <PenTool size={14} />, desc: 'Transform apologetic drafts into secure, assertive copy.' }
];

export const SanctuaryView: React.FC = () => {
  const { user, profile } = useUser();
  const [activeTab, setActiveTab] = useState<'begin' | 'modules' | 'celestial' | 'archive'>('begin');
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const [moduleInput, setModuleInput] = useState('');
  const [moduleResult, setModuleResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Tab 1 (Calibration) state
  const [sanctuaryInput, setSanctuaryInput] = useState('');
  const [sanctuaryReport, setSanctuaryReport] = useState<SanctuaryReport | null>(null);

  // Tab 3 (Celestial) state
  const [celestialReading, setCelestialReading] = useState<string | null>(null);

  // Archive / Local persistence of past sanctuary records
  const [reflections, setReflections] = useState<SavedReflection[]>([]);

  useEffect(() => {
    // Load existing reflections from state
    const saved = localStorage.getItem(`mimi:sanctuary_reflections:${user?.uid || 'local'}`);
    if (saved) {
      try {
        setReflections(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse reflections", e);
      }
    }
  }, [user]);

  const saveReflection = (type: 'calibration' | 'module' | 'celestial', input: string, output: string, moduleLabel?: string) => {
    const newRef: SavedReflection = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type,
      moduleLabel,
      input,
      output
    };
    const updated = [newRef, ...reflections];
    setReflections(updated);
    localStorage.setItem(`mimi:sanctuary_reflections:${user?.uid || 'local'}`, JSON.stringify(updated));
  };

  const deleteReflection = (id: string) => {
    const filtered = reflections.filter(r => r.id !== id);
    setReflections(filtered);
    localStorage.setItem(`mimi:sanctuary_reflections:${user?.uid || 'local'}`, JSON.stringify(filtered));
  };

  const handleSanctuaryCalibration = async () => {
    if (!sanctuaryInput.trim() || isLoading) return;
    setIsLoading(true);
    setSanctuaryReport(null);
    try {
      const res = await generateSanctuaryReport(sanctuaryInput, profile);
      setSanctuaryReport(res);
      if (res) {
        saveReflection(
          'calibration',
          sanctuaryInput,
          `Validation: ${res.validation}\nClinical Observation: ${res.objectiveReframing}\nSartorial Affirmation: ${res.sartorialAffirmation}`
        );
      }
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
        detail: { type: 'error', message: 'Calibration error. Please ensure your key is valid.' }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleExecution = async () => {
    if (!moduleInput.trim() || isLoading) return;
    setIsLoading(true);
    setModuleResult(null);
    const modObj = MODULES.find(m => m.id === activeModule);
    try {
      const res = await executeConfidenceModule(activeModule, moduleInput, profile);
      setModuleResult(res);
      saveReflection('module', moduleInput, res, modObj?.label);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCelestialReading = async () => {
    setIsLoading(true);
    setCelestialReading(null);
    try {
      const res = await generateCelestialReading(profile);
      setCelestialReading(res);
      saveReflection('celestial', 'Generated Latent Space Map', res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const exportArchive = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reflections, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mimi_sanctuary_archive_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar pb-62 px-6 md:px-16 pt-12 md:pt-20 bg-[#121212] text-stone-100 transition-all duration-500 relative selection:bg-stone-200 selection:text-stone-900">
      
      {/* Decorative Blueprint Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none opacity-40" />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        <header className="space-y-6 border-b border-stone-800 pb-8">
          <div className="flex items-center gap-3 text-stone-400">
            <ShieldCheck size={14} className="animate-pulse text-emerald-500" />
            <span className="font-mono text-[9px] uppercase tracking-[0.5em] font-black">Private Intellectual Clearing</span>
          </div>
          
          <div className="space-y-2">
            <h2 className="font-serif text-5xl md:text-7xl tracking-tighter text-white font-medium leading-[0.9]">
              The Sanctuary
            </h2>
            <p className="font-serif italic text-base text-stone-400 max-w-2xl leading-relaxed">
              An offline aesthetic clearing. No performance, no feeds, no public metrics. Recalibrate comparison loops, translate visual desire, and log stylistic evolution in secure local sandbox.
            </p>
          </div>

          {/* Navigation Bar */}
          <div className="flex flex-wrap gap-4 md:gap-8 pt-4 border-t border-stone-800/60 mt-6">
            <button 
              onClick={() => setActiveTab('begin')} 
              className={`font-mono text-[9px] uppercase tracking-widest font-black transition-all pb-1.5 ${activeTab === 'begin' ? 'text-white border-b-2 border-emerald-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              I. Clearing Calibration
            </button>
            <button 
              onClick={() => setActiveTab('modules')} 
              className={`font-mono text-[9px] uppercase tracking-widest font-black transition-all pb-1.5 ${activeTab === 'modules' ? 'text-white border-b-2 border-emerald-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              II. Somatic Refinement
            </button>
            <button 
              onClick={() => setActiveTab('celestial')} 
              className={`font-mono text-[9px] uppercase tracking-widest font-black transition-all pb-1.5 ${activeTab === 'celestial' ? 'text-white border-b-2 border-emerald-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              III. Latent Space Map
            </button>
            <button 
              onClick={() => setActiveTab('archive')} 
              className={`font-mono text-[9px] uppercase tracking-widest font-black transition-all pb-1.5 ${activeTab === 'archive' ? 'text-white border-b-2 border-emerald-500 flex items-center gap-1.5' : 'text-stone-500 hover:text-stone-300 flex items-center gap-1.5'}`}
            >
              IV. Log Registry <span className="bg-stone-800 text-stone-400 text-[8px] px-1.5 py-0.5 font-bold rounded-full">{reflections.length}</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'begin' && (
            <motion.div 
              key="begin"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold block">Local Sanctuary Entry</span>
                  <p className="font-serif italic text-lg text-stone-300 leading-relaxed">
                    Write down any current stylist anxieties, body mismatch insecurities, or comparative frustration you're carrying. Let mimi untangle and translate the distress.
                  </p>
                </div>

                <textarea 
                  value={sanctuaryInput} 
                  onChange={(e) => setSanctuaryInput(e.target.value)} 
                  className="w-full bg-stone-900/80 border border-stone-800 p-6 font-serif text-lg italic text-stone-100 focus:outline-none focus:border-stone-600 transition-all resize-none h-44 rounded-none placeholder:text-stone-600 leading-relaxed"
                  placeholder="What feels out of sync or stressful right now?..."
                />

                <button 
                  onClick={handleSanctuaryCalibration} 
                  disabled={isLoading || !sanctuaryInput.trim()} 
                  className="w-full py-4.5 bg-stone-100 hover:bg-white text-stone-950 rounded-none font-mono text-[9px] uppercase tracking-[0.3em] font-black transition-all flex items-center justify-center gap-3 disabled:opacity-40"
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin text-stone-900" /> : <Feather size={12} />} 
                  Initiate Clearing Calibration
                </button>
              </div>

              <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-stone-800/80 lg:pl-12 pt-8 lg:pt-0 flex flex-col justify-center">
                {sanctuaryReport ? (
                  <div className="space-y-8 animate-fade-in">
                    <div className="space-y-2">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold">I. Gentle Attunement</span>
                      <p className="font-serif italic text-xl text-stone-200 leading-relaxed">{sanctuaryReport.validation}</p>
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold">II. Systemic Diagnostic</span>
                      <p className="font-mono text-xs text-stone-400 leading-relaxed bg-stone-900/60 border border-stone-850 p-4 font-normal">{sanctuaryReport.objectiveReframing}</p>
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold">III. Somatic Strategy</span>
                      <p className="font-serif text-base text-stone-300 leading-relaxed">{sanctuaryReport.sartorialAffirmation}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-4 opacity-30 select-none">
                    <Orbit size={32} className="mx-auto text-stone-500 animate-[spin_10s_linear_infinite]" />
                    <p className="font-serif italic text-lg text-stone-400">Ready to receive clearing signals.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'modules' && (
            <motion.div 
              key="modules"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Rail: Module Selector */}
              <div className="lg:col-span-4 space-y-3">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-bold block pb-1 border-b border-stone-850">Select Active Module</span>
                {MODULES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveModule(m.id);
                      setModuleResult(null);
                      setModuleInput('');
                    }}
                    className={`w-full text-left p-4 border transition-all flex flex-col gap-1.5 ${
                      activeModule === m.id 
                        ? 'bg-stone-905 border-stone-200 text-white' 
                        : 'border-stone-850 bg-stone-900/20 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={activeModule === m.id ? 'text-emerald-400' : 'text-stone-500'}>{m.icon}</span>
                      <span className="font-mono text-[9px] uppercase tracking-widest font-black">{m.label}</span>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-normal pl-6">{m.desc}</p>
                  </button>
                ))}
              </div>

              {/* Right Workstation Area */}
              <div className="lg:col-span-8 space-y-6">
                <div className="p-5 border border-stone-800 bg-stone-900/30 flex flex-col justify-between min-h-[400px]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start border-b border-stone-850 pb-3">
                      <div>
                        <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-500 font-bold">Workstation Active</span>
                        <h4 className="font-serif italic text-2xl text-stone-100">
                          {MODULES.find(m => m.id === activeModule)?.label}
                        </h4>
                      </div>
                      <span className="font-mono text-[8px] tracking-widest text-stone-600">MIMI_CONF_v1.0</span>
                    </div>

                    <p className="text-xs text-stone-400 leading-relaxed font-serif italic max-w-xl">
                      Configure your prompt template according to the selected clearing parameters:
                    </p>

                    <textarea
                      value={moduleInput}
                      onChange={e => setModuleInput(e.target.value)}
                      className="w-full bg-stone-950/80 border border-stone-850 p-4 font-mono text-[11px] leading-relaxed text-stone-200 focus:outline-none focus:border-stone-600 h-32 rounded-none resize-none placeholder:text-stone-750"
                      placeholder={`Enter your text here... (e.g. paste competitive comparisons, style distress, or email text)`}
                    />
                  </div>

                  <div className="pt-4 border-t border-stone-855 flex justify-between items-center gap-4 mt-4">
                    <p className="text-[9px] font-mono text-stone-600 uppercase tracking-widest hidden sm:block">No records shared with ad networks</p>
                    <button
                      onClick={handleModuleExecution}
                      disabled={isLoading || !moduleInput.trim()}
                      className="px-6 py-2.5 bg-stone-105 hover:bg-stone-50 text-stone-900 rounded-none font-mono text-[8px] uppercase tracking-widest font-black flex items-center gap-2 disabled:opacity-40"
                    >
                      {isLoading ? <Loader2 size={10} className="animate-spin text-stone-900" /> : <ArrowRight size={10} />}
                      Execute Calibration
                    </button>
                  </div>
                </div>

                {/* Module Output */}
                {moduleResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border border-emerald-900/45 bg-stone-950/80 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Check size={12} />
                      <span className="font-mono text-[8px] uppercase tracking-widest font-bold">Calibration Complete</span>
                    </div>
                    <div className="text-stone-300 font-serif text-sm leading-relaxed whitespace-pre-wrap">
                      {moduleResult}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'celestial' && (
            <motion.div 
              key="celestial"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="max-w-xl mx-auto space-y-8 py-10 text-center"
            >
              <div className="space-y-3">
                <Orbit size={48} className={`mx-auto text-emerald-500 ${isLoading ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_12s_linear_infinite]'}`} />
                <h3 className="font-serif italic text-3xl text-stone-100">Latent Space Alignment Mapping</h3>
                <p className="font-serif italic text-stone-400 text-sm leading-relaxed">
                  Triggers an automated omniscient projection of your aggregate onboarding profiles, color preferences, and style guidelines across current latent cultural coordinates.
                </p>
              </div>

              <button
                onClick={handleCelestialReading}
                disabled={isLoading}
                className="px-10 py-4 bg-stone-950 hover:bg-stone-900 border border-stone-850 text-stone-200 uppercase tracking-widest font-mono text-[9px] font-bold inline-flex items-center gap-3"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                {celestialReading ? 'Recount Aesthetic DNA' : 'Extract Structural Projections'}
              </button>

              {celestialReading && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-stone-900/35 border border-stone-800 text-left space-y-4 relative"
                >
                  <div className="absolute top-4 right-4 text-[7px] font-mono text-emerald-500 font-bold uppercase border border-emerald-900/30 px-2 py-0.5">MAPPED_STATE</div>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-500 block">Ethereal Projection Mapping // Oracle Output</span>
                  <p className="font-serif text-lg leading-relaxed text-stone-200 italic">
                    "{celestialReading}"
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'archive' && (
            <motion.div 
              key="archive"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-800">
                <div>
                  <h3 className="font-serif italic text-2xl">Confidence Ledger History</h3>
                  <p className="text-xs text-stone-500 font-serif italic">Your raw aesthetic evolution log entries stored safely in local memory space.</p>
                </div>

                {reflections.length > 0 && (
                  <button
                    onClick={exportArchive}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-850 border border-stone-850 text-[9px] font-mono uppercase tracking-widest text-stone-300 flex items-center gap-2"
                  >
                    <Download size={11} /> Export Vault
                  </button>
                )}
              </div>

              {reflections.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <BookOpen size={24} className="mx-auto text-stone-500 mb-2" />
                  <p className="font-serif italic text-lg text-stone-400">Ledger registry is completely cleared.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reflections.map(ref => (
                    <div 
                      key={ref.id}
                      className="border border-stone-850 p-6 bg-stone-900/20 flex flex-col justify-between gap-4 group hover:border-stone-800 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[8px] font-mono text-stone-500">
                          <span className="uppercase tracking-widest font-black">
                            {ref.type === 'calibration' ? 'I. Clearing Calibration' : ref.type === 'module' ? `II. Somatic Module - ${ref.moduleLabel}` : 'III. Celestial Map'}
                          </span>
                          <span>{new Date(ref.timestamp).toLocaleString()}</span>
                        </div>

                        {ref.type !== 'celestial' && (
                          <div className="text-xs italic text-stone-400 font-serif border-l border-stone-800 pl-4 py-1">
                            "{ref.input}"
                          </div>
                        )}

                        <div className="text-xs text-stone-200 leading-relaxed pt-2 whitespace-pre-wrap bg-stone-950/40 p-3 border border-stone-950 font-sans">
                          {ref.output}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-stone-850/60 opacity-20 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteReflection(ref.id)}
                          className="text-stone-500 hover:text-red-500 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1"
                        >
                          <Trash2 size={10} /> Delete Log
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

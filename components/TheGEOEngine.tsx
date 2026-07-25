import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Save, Type, Zap, Target, Layers, Tag as TagIcon, Globe, BarChart3, ChevronRight, Share2, ClipboardCheck, Info, MessagesSquare, FileCode, ShieldCheck } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { generateGEOPack } from '../services/geminiService';
import { GEOPack } from '../types';
import { archiveManager } from '../services/archiveManager';
import { logTasteEvent } from '../services/tasteLogger';

interface TheGEOEngineProps {
  onClose?: () => void;
  initialIntent?: string;
}

export const TheGEOEngine: React.FC<TheGEOEngineProps> = ({ onClose, initialIntent = '' }) => {
  const [viewMode, setViewMode] = useState<'setup' | 'pack'>('setup');
  const [currentIntent, setCurrentIntent] = useState<{ intent: string, audience: string, tone: string } | null>(null);
  const [activePack, setActivePack] = useState<GEOPack | null>(null);

  const [intent, setIntent] = useState(initialIntent);
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('analytical');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [activePackTab, setActivePackTab] = useState<'identity' | 'audience' | 'intent' | 'signature' | 'aesthetic' | 'market' | 'qblocks'>('identity');
  const [showRaw, setShowRaw] = useState(false);
  
  // Folder Save State
  const [showFolderSave, setShowFolderSave] = useState(false);
  const [pocketFolder, setPocketFolder] = useState('');
  
  // Feedback Layer States
  const [phrasingFeedback, setPhrasingFeedback] = useState<Record<string, 'lands' | 'misses'>>({});
  const [toneFeedback, setToneFeedback] = useState<'lands' | 'misses' | null>(null);
  const [clusterFeedback, setClusterFeedback] = useState<Record<string, 'lands' | 'misses'>>({});
  const [signatureCorrectionNote, setSignatureCorrectionNote] = useState("");

  const { profile, user, updateProfile } = useUser();

  useEffect(() => {
    if (profile?.geoProfile && !activePack) {
      setActivePack(profile.geoProfile as unknown as GEOPack);
      setViewMode('pack');
    }
  }, [profile?.geoProfile, activePack]);

  const handleOptimize = async () => {
    if (!intent.trim() || !audience.trim()) return;
    setIsGenerating(true);
    try {
      const references = profile?.savedTreatments?.map(t => t.treatmentName) || [];
      const pack = await generateGEOPack(intent, audience, references, tone, profile);
      if (pack) {
        const generatedPack: GEOPack = {
          ...pack,
          lastSynthesized: Date.now(),
          driftScore: 0,
          driftAlert: false
        };
        setActivePack(generatedPack);
        setViewMode('pack');
        setCurrentIntent({ intent, audience, tone });
      }
    } catch (err) {
      console.error("GEO Optimization failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetAsActiveSignal = async () => {
    if (!activePack || !profile) return;
    try {
      await updateProfile({
        ...profile,
        geoProfile: activePack as any
      });
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Signal Set As Active Workspace", type: 'success' } 
      }));
    } catch (e) {
       console.error("MIMI // Failed to set active signal:", e);
    }
  };

  const handleSaveToPocketConfirm = async () => {
    if (!activePack || !user) return;
    try {
      const intentSummary = currentIntent?.intent || intent || 'Unknown Intent';
      await archiveManager.saveToPocket(user.uid, 'text', {
        content: JSON.stringify(activePack),
        metadata: { 
          source: 'GEO Engine', 
          title: `GEO Signal Pack`, 
          type: 'geo_pack',
          folder: pocketFolder.trim() || undefined,
          intentSummary: intentSummary,
          createdAt: Date.now()
        }
      });
      setShowFolderSave(false);
      setPocketFolder('');
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "GEO Pack Saved to Pocket Archive", type: 'success' } 
      }));
    } catch (err) {
      console.error("Save to Pocket failed:", err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
      detail: { message: "Copied to Clipboard", type: 'success' } 
    }));
  };

  const exportSemanticHtml = () => {
    if (!activePack) return;
    const htmlStr = `
    <article class="geo-optimized-profile">
      <h2>Brand Identity Matrix</h2>
      <p>${activePack.retrievalIdentity.identityDescription}</p>
      
      <h3>Semantic Clusters</h3>
      <ul>
        ${activePack.retrievalIdentity.semanticClusters.map(c => `<li>${c}</li>`).join('')}
      </ul>

      <h3>Generative Engine Q&A</h3>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            ${activePack.geoQBlocks?.map(q => `
            {
              "@type": "Question",
              "name": "${q.question}",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "${q.answer}"
              }
            }`).join(',')}
          ]
        }
      </script>
    </article>
    `;
    copyToClipboard(htmlStr);
  };

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [activePackTab]);

  const handleFieldChange = (path: string[], value: any) => {
    if (!activePack) return;
    const newPack = JSON.parse(JSON.stringify(activePack));
    
    if (!newPack.generatedValues) newPack.generatedValues = {};
    if (!newPack.manualOverrides) newPack.manualOverrides = {};

    let current = newPack;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    const field = path[path.length - 1];
    const overrideKey = path.join('.');
    
    // Save original if not saved yet
    if (newPack.generatedValues[overrideKey] === undefined) {
      newPack.generatedValues[overrideKey] = current[field];
    }
    
    current[field] = value;
    newPack.manualOverrides[overrideKey] = true;
    
    setActivePack(newPack);
  };

  const handleResetField = (path: string[]) => {
    if (!activePack || !activePack.manualOverrides) return;
    const newPack = JSON.parse(JSON.stringify(activePack));
    const overrideKey = path.join('.');
    
    if (newPack.generatedValues && newPack.generatedValues[overrideKey] !== undefined) {
      let current = newPack;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = newPack.generatedValues[overrideKey];
    }
    
    delete newPack.manualOverrides[overrideKey];
    setActivePack(newPack);
  };

  const handleSaveChanges = async () => {
    if (!activePack) return;
    // Committing changes just keeps them in activePack currently
    // We already mutated activePack state, but we don't save to geoProfile until 'Set As Active Signal'
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
      detail: { message: "Overrides committed to working signal.", type: 'success' } 
    }));
    setIsEditing(false);
  };

  const handleDiscardChanges = () => {
    // Drop unsaved edits. For now activePack is being mutated directly. Let's fix this properly.
    if (profile?.geoProfile) {
      // Best effort revert
      setActivePack(profile.geoProfile as unknown as GEOPack);
    }
    setIsEditing(false);
  };

  const fillTemplate = () => {
    setIntent("A digital sanctuary for slow living and curated archives, exploring the intersection of brutalist architecture and organic forms.");
    setAudience("Avant-garde curators, interior designers, tech founders looking for mindful deceleration");
    setTone("editorial");
  };

  const handleSubmitReading = async () => {
    if (!profile || !activePack || !user) return;
    
    // Count misses
    let misses = 0;
    if (toneFeedback === 'misses') misses++;
    misses += Object.values(phrasingFeedback).filter(v => v === 'misses').length;
    misses += Object.values(clusterFeedback).filter(v => v === 'misses').length;
    
    const hasFeedback = 
      toneFeedback !== null || 
      Object.keys(phrasingFeedback).length > 0 || 
      Object.keys(clusterFeedback).length > 0 || 
      signatureCorrectionNote.trim() !== '';

    if (!hasFeedback) return;

    try {
      await logTasteEvent({
        userId: user.uid,
        event_type: 'signature_feedback',
        timestamp: Date.now(),
        input_context: { raw_text: '' },
        output_context: { 
          taste_snapshot: profile.tasteProfile 
        },
        signature_payload: {
          phrasingFeedback,
          toneFeedback,
          clusterFeedback,
          correctionNote: signatureCorrectionNote
        }
      });

      const newDriftScore = (activePack.driftScore || 0) + misses;
      const newDriftAlert = newDriftScore >= 5 ? true : activePack.driftAlert;
      
      const newPack = {
        ...activePack,
        driftScore: newDriftScore,
        driftAlert: newDriftAlert
      };

      await updateProfile({
        ...profile,
        geoProfile: newPack as any
      });
      
      setActivePack(newPack);
      
      // Toast
      if (misses === 0) {
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
          detail: { message: "The signal holds.", type: 'success' } 
        }));
      } else {
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
          detail: { message: "The correction has been noted. Mimi is listening.", type: 'success' } 
        }));
      }
    } catch (e) {
      console.error("MIMI // Failed to submit resonance reading:", e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full bg-nous-base flex flex-col md:flex-row overflow-hidden relative"
    >
      {/* Left Panel: Input & Controls */}
      <div className="flex-1 p-8 flex flex-col overflow-y-auto no-scrollbar border-r border-nous-border">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="font-serif italic text-4xl text-nous-text mb-2 tracking-tight">GEO ENGINE</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle font-black">
                Scribe // Generative Engine Optimization
              </p>
            </div>
            <div className="flex items-center gap-4">
              {viewMode === 'pack' && (
                <button
                 onClick={handleSetAsActiveSignal}
                 className="flex items-center gap-2 px-4 py-2 bg-nous-base0 text-nous-base border border-nous-border rounded-none font-sans text-[9px] uppercase tracking-widest font-black hover:bg-nous-text transition-all"
                >
                  <Target size={12} /> Set As Active Signal
                </button>
              )}
              {onClose && (
                <button onClick={onClose} className="text-nous-subtle hover:text-nous-text">
                  <X size={24} strokeWidth={1} />
                </button>
              )}
            </div>
          </div>

          {viewMode === 'setup' ? (
            <div className="space-y-12 animate-in fade-in">
              <div className="p-6 bg-nous-text text-nous-base">
                <div className="flex items-start gap-4">
                  <Info size={24} className="flex-shrink-0 mt-1 opacity-70" />
                  <div>
                    <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-black mb-2 border-b border-nous-base/20 pb-2">What is GEO?</h3>
                    <p className="font-serif italic text-sm leading-relaxed opacity-90 mb-4">
                      Generative Engine Optimization (GEO) is the evolution of SEO for the AI-driven Creator Economy. 
                      Instead of stuffing keywords for Google, we optimize semantic signals for LLMs (like ChatGPT, Gemini, and Claude).
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-70 mb-6">
                      Goal: Make your brand, aesthetic, or product easily digestible and highly associable by AI reasoning engines.
                    </p>
                    
                    <div className="p-4 border border-nous-base/20 bg-[#111] relative overflow-hidden text-nous-base shadow-inner">
                      <div className="absolute top-0 left-0 w-1 h-full bg-nous-base/40" />
                      <h4 className="font-mono text-[10px] uppercase tracking-widest font-black mb-2 opacity-90 flex items-center gap-2 text-nous-base">
                        <ShieldCheck size={14} className="opacity-80" /> The Sovereignty Clause
                      </h4>
                      <p className="font-sans text-[11px] leading-relaxed opacity-90 mb-3 border-b border-nous-base/10 pb-3">
                        <strong className="font-bold text-white">Your aesthetic refractions are not used to train our base machine learning models.</strong> We respect your autonomy entirely.
                      </p>
                      <p className="font-serif italic text-xs leading-relaxed opacity-80">
                        The GEO Engine is a localized tool for you to purposefully format your public-facing information. When you generate a GEO context package, we're simply illustrating how you can organize your semantic data to be deeply readable and beneficial to LLMs—<strong className="font-bold text-white">if, and only if, you ever elect to do so</strong>. You maintain absolute discretion over your relationship with any AI entity.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block font-sans text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                    Core Generative Intent
                  </label>
                  <div className="flex gap-4">
                    {activePack && (
                      <button onClick={() => setViewMode('pack')} className="text-[9px] uppercase tracking-widest font-mono text-nous-subtle hover:text-nous-text transition-colors">
                        Return to Signal
                      </button>
                    )}
                    <button onClick={fillTemplate} className="text-[9px] uppercase tracking-widest font-mono text-nous-subtle hover:text-nous-text flex items-center gap-1 transition-colors">
                      <Sparkles size={10} /> Use Template
                    </button>
                  </div>
                </div>
                <textarea
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="Describe your brand, your next launch, or the creative endeavor you want AIs to understand... (e.g. A digital sanctuary for slow living and curated archives)."
                  className="w-full h-40 bg-nous-base0/30 border border-nous-border p-6 font-mono text-sm text-nous-text outline-none focus:ring-1 focus:ring-nous-text transition-all resize-none"
                />
                <p className="mt-2 font-mono text-[9px] text-nous-subtle uppercase tracking-widest">Provide the raw material. The engine will extract the semantic truth.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle mb-4">
                    Target Synthesis Audience
                  </label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g., Avant-garde curators, Tech founders..."
                    className="w-full bg-nous-base0/30 border border-nous-border p-4 font-mono text-xs text-nous-text outline-none focus:ring-1 focus:ring-nous-text transition-all"
                  />
                </div>
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle mb-4">
                    Semantic Tone Restraint
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-nous-base0/30 border border-nous-border p-4 font-mono text-xs text-nous-text outline-none focus:ring-1 focus:ring-nous-text transition-all appearance-none"
                  >
                    <option value="analytical">Analytical / Precise</option>
                    <option value="poetic">Poetic / Ethereal</option>
                    <option value="brutalist">Brutalist / Direct</option>
                    <option value="editorial">Editorial / Chic</option>
                  </select>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={handleOptimize}
                  disabled={isGenerating || !intent.trim() || !audience.trim()}
                  className="w-full py-6 bg-nous-text text-nous-base font-sans text-xs uppercase tracking-[0.3em] font-black flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-nous-base/20 border-t-nous-base rounded-full animate-spin" />
                      Structuring Semantics...
                    </div>
                  ) : (
                    <>
                      <Zap size={16} />
                      Generate GEO Pack
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex items-center gap-4 mb-12">
                 <button 
                  onClick={() => {
                    setIntent(currentIntent?.intent || intent);
                    setAudience(currentIntent?.audience || audience);
                    setTone(currentIntent?.tone || tone);
                    setViewMode('setup');
                  }}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#a8b79f] hover:text-nous-text transition-colors"
                 >
                   <ChevronRight className="rotate-180" size={14} />
                   Recalibrate Intent
                 </button>
                 
                 <div className="w-px h-4 bg-nous-border"></div>
                 
                 <button 
                  onClick={() => {
                    setActivePack(null);
                    setCurrentIntent(null);
                    setIntent(initialIntent);
                    setAudience('');
                    setViewMode('setup');
                  }}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-nous-subtle hover:text-nous-text transition-colors"
                 >
                   Start New Signal
                 </button>
                 
                 <div className="ml-auto flex items-center gap-4">
                   {/* Manual Override Indicator */}
                   {activePack?.manualOverrides && Object.keys(activePack.manualOverrides).length > 0 && (
                     <div className="flex items-center gap-2 mr-4">
                       <Sparkles size={12} className="text-[#a8b79f]" />
                       <span className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f]">Manual Overrides Active</span>
                     </div>
                   )}
                   
                   <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-4 py-2 font-sans text-[9px] uppercase tracking-widest font-black transition-colors ${
                      isEditing ? 'bg-nous-border text-nous-text' : 'text-nous-subtle border border-nous-border hover:text-nous-text'
                    }`}
                   >
                     {isEditing ? 'Lock Signal' : 'Edit Signal'}
                   </button>
                   
                   {isEditing && (
                     <>
                       <button
                        onClick={handleDiscardChanges}
                        className="px-6 py-2 border border-nous-border text-nous-subtle font-sans text-[9px] uppercase tracking-widest font-black hover:bg-nous-base0/50"
                       >
                         Discard Edits
                       </button>
                       <button
                        onClick={handleSaveChanges}
                        className="px-6 py-2 bg-[#a8b79f] text-[#050505] font-sans text-[9px] uppercase tracking-widest font-black hover:opacity-80"
                       >
                         Commit Changes
                       </button>
                     </>
                   )}
                   
                   {!isEditing && (
                     <div className="relative flex items-center">
                       {showFolderSave ? (
                         <div className="flex bg-nous-base0/80 border border-nous-border items-center p-1 px-2 z-10 transition-all">
                           <input
                             type="text"
                             value={pocketFolder}
                             onChange={(e) => setPocketFolder(e.target.value)}
                             placeholder="Folder name (optional)"
                             className="bg-transparent border-none outline-none font-mono text-[9px] text-nous-text w-32 placeholder-nous-subtle"
                           />
                           <button 
                             onClick={handleSaveToPocketConfirm}
                             className="text-[9px] uppercase tracking-widest font-black text-nous-base bg-nous-text px-3 py-1 hover:opacity-90 ml-2"
                           >
                             Save
                           </button>
                           <button 
                             onClick={() => setShowFolderSave(false)}
                             className="text-nous-subtle hover:text-nous-text ml-2"
                           >
                             <X size={10} />
                           </button>
                         </div>
                       ) : (
                         <button 
                          onClick={() => setShowFolderSave(true)}
                          className="flex items-center gap-2 px-6 py-2 bg-nous-text text-nous-base font-sans text-[9px] uppercase tracking-widest font-black"
                         >
                           <Save size={12} />
                           Save Pack
                         </button>
                       )}
                     </div>
                   )}
                 </div>
               </div>

               <div className="bg-nous-base0/20 border border-nous-border">
                   <div className="flex border-b border-nous-border">
                    {[
                      { id: 'identity', label: 'Retrieval Identity', icon: Target },
                      { id: 'audience', label: 'Audience Embed', icon: Globe },
                      { id: 'intent', label: 'Generative Intent', icon: Layers },
                      { id: 'signature', label: 'Semantic Signature', icon: Zap },
                      { id: 'aesthetic', label: 'Aesthetic Vector', icon: TagIcon },
                      { id: 'market', label: 'Market Mirror', icon: BarChart3 },
                      { id: 'qblocks', label: 'Q-Blocks', icon: MessagesSquare }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActivePackTab(tab.id as any)}
                        className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 transition-all border-r last:border-r-0 border-nous-border ${activePackTab === tab.id ? 'bg-nous-text text-nous-base' : 'text-nous-subtle hover:text-nous-text'}`}
                      >
                        <tab.icon size={16} />
                        <span className="font-sans text-[9px] uppercase tracking-widest font-black">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="p-8">
                    <div className="flex justify-end mb-6">
                      <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle hover:text-nous-text underline"
                      >
                        {showRaw ? 'View Profile' : 'View Raw Signal'}
                      </button>
                    </div>
                    
                    {showRaw ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-transparent border border-dashed border-nous-border p-6 font-mono text-[10px] text-nous-subtle w-full overflow-x-auto"
                      >
                        <span className="block text-nous-text mb-4 text-xs font-black">THIS IS WHAT MACHINES READ</span>
                        <pre>
                          {JSON.stringify(
                            activePackTab === 'identity' ? activePack.retrievalIdentity :
                            activePackTab === 'audience' ? activePack.audienceEmbedding :
                            activePackTab === 'intent' ? activePack.generativeIntent :
                            activePackTab === 'signature' ? activePack.semanticSignature :
                            activePackTab === 'market' ? activePack.marketMirror :
                            activePack.aestheticVectorSummary,
                            null, 2
                          )}
                        </pre>
                        <p className="mt-4 border-t border-nous-border/10 pt-4 uppercase tracking-widest opacity-60">
                          This structured output is what Mimi emits into generative systems when they index your aesthetic identity.
                        </p>
                      </motion.div>
                    ) : (
                      <AnimatePresence mode="wait">
                      {activePackTab === 'identity' && (
                        <motion.div 
                          key="identity"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="flex items-center gap-2 font-serif italic text-2xl text-nous-text">
                                Identity Matrix
                                {activePack.manualOverrides?.['retrievalIdentity.identityDescription'] && <span className="text-[#a8b79f] text-sm">*</span>}
                              </h3>
                              {isEditing && activePack.manualOverrides?.['retrievalIdentity.identityDescription'] && (
                                <button onClick={() => handleResetField(['retrievalIdentity', 'identityDescription'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            {isEditing ? (
                              <textarea
                                value={activePack.retrievalIdentity.identityDescription}
                                onChange={(e) => handleFieldChange(['retrievalIdentity', 'identityDescription'], e.target.value)}
                                className="w-full bg-nous-base0/50 border border-nous-border p-4 font-mono text-xs text-nous-text outline-none focus:border-nous-text transition-colors min-h-[120px]"
                              />
                            ) : (
                              <p className="font-mono text-sm text-nous-subtle leading-relaxed mb-6">{activePack.retrievalIdentity.identityDescription}</p>
                            )}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                                SEMANTIC CLUSTERS
                                {activePack.manualOverrides?.['retrievalIdentity.semanticClusters'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['retrievalIdentity.semanticClusters'] && (
                                <button onClick={() => handleResetField(['retrievalIdentity', 'semanticClusters'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {activePack.retrievalIdentity.semanticClusters.map((c, i) => (
                                <div key={i} className="flex flex-col gap-1 items-start">
                                  <span className="px-3 py-1 bg-nous-base0 border border-nous-border font-mono text-[10px] text-nous-text flex items-center gap-2">
                                    {c}
                                    {isEditing && (
                                      <button onClick={() => {
                                        const newClusters = [...activePack.retrievalIdentity.semanticClusters];
                                        newClusters.splice(i, 1);
                                        handleFieldChange(['retrievalIdentity', 'semanticClusters'], newClusters);
                                      }} className="text-nous-subtle hover:text-red-400">
                                        <X size={10} />
                                      </button>
                                    )}
                                  </span>
                                  {!isEditing && (
                                    <div className="flex items-center gap-2 px-1">
                                      <button 
                                        onClick={() => setClusterFeedback(prev => ({...prev, [c]: prev[c] === 'lands' ? undefined : 'lands'}) as any)}
                                        className={`font-mono text-[8px] uppercase tracking-widest transition-colors ${clusterFeedback[c] === 'lands' ? 'text-[#a8b79f]' : 'text-nous-subtle hover:text-nous-text'}`}
                                      >
                                        ↑ Lands
                                      </button>
                                      <button 
                                        onClick={() => setClusterFeedback(prev => ({...prev, [c]: prev[c] === 'misses' ? undefined : 'misses'}) as any)}
                                        className={`font-mono text-[8px] uppercase tracking-widest transition-colors ${clusterFeedback[c] === 'misses' ? 'text-red-400/80' : 'text-nous-subtle hover:text-nous-text'}`}
                                      >
                                        ↓ Doesn't Land
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {isEditing && (
                                <input 
                                  placeholder="+ Add Cluster" 
                                  className="px-3 py-1 bg-transparent border border-dashed border-nous-border font-mono text-[10px] text-nous-subtle outline-none focus:border-nous-text"
                                  onKeyDown={(e: any) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                      handleFieldChange(['retrievalIdentity', 'semanticClusters'], [...activePack.retrievalIdentity.semanticClusters, e.target.value.trim()]);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activePackTab === 'audience' && (
                        <motion.div 
                          key="audience"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                                NATURAL LANGUAGE PROMPTS
                                {activePack.manualOverrides?.['audienceEmbedding.naturalLanguagePrompts'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['audienceEmbedding.naturalLanguagePrompts'] && (
                                <button onClick={() => handleResetField(['audienceEmbedding', 'naturalLanguagePrompts'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            <div className="space-y-4">
                              {activePack.audienceEmbedding.naturalLanguagePrompts.map((p, i) => (
                                <div key={i} className="flex gap-2">
                                  {isEditing ? (
                                    <>
                                      <input 
                                        value={p}
                                        onChange={(e) => {
                                          const newArr = [...activePack.audienceEmbedding.naturalLanguagePrompts];
                                          newArr[i] = e.target.value;
                                          handleFieldChange(['audienceEmbedding', 'naturalLanguagePrompts'], newArr);
                                        }}
                                        className="w-full bg-nous-base0/50 border border-nous-border p-4 font-serif italic text-lg text-nous-text outline-none focus:border-nous-text"
                                      />
                                      <button onClick={() => {
                                          const newArr = [...activePack.audienceEmbedding.naturalLanguagePrompts];
                                          newArr.splice(i, 1);
                                          handleFieldChange(['audienceEmbedding', 'naturalLanguagePrompts'], newArr);
                                      }} className="px-4 border border-nous-border hover:bg-red-900/20 text-nous-subtle hover:text-red-400">
                                        <X size={16} />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex-1 p-4 bg-nous-base0 border-l-2 border-nous-text text-nous-text font-serif italic text-lg relative group">
                                      "{p}"
                                      <button onClick={() => copyToClipboard(p)} className="absolute top-4 right-4 text-nous-subtle opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Share2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {isEditing && (
                                <button onClick={() => {
                                  handleFieldChange(['audienceEmbedding', 'naturalLanguagePrompts'], [...activePack.audienceEmbedding.naturalLanguagePrompts, "New Prompt..."]);
                                }} className="font-mono text-[10px] text-nous-subtle hover:text-nous-text border border-dashed border-nous-border p-2 w-full text-center">
                                  + ADD PROMPT
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                                TARGET CATEGORIES
                                {activePack.manualOverrides?.['audienceEmbedding.targetCategories'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['audienceEmbedding.targetCategories'] && (
                                <button onClick={() => handleResetField(['audienceEmbedding', 'targetCategories'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {activePack.audienceEmbedding.targetCategories.map((c, i) => (
                                <span key={i} className="font-mono text-xs text-nous-subtle border border-nous-border/30 px-3 py-1 bg-nous-base0 flex items-center gap-2">
                                  {c}
                                  {isEditing && (
                                    <button onClick={() => {
                                      const newArr = [...activePack.audienceEmbedding.targetCategories];
                                      newArr.splice(i, 1);
                                      handleFieldChange(['audienceEmbedding', 'targetCategories'], newArr);
                                    }} className="text-nous-subtle hover:text-red-400">
                                      <X size={10} />
                                    </button>
                                  )}
                                </span>
                              ))}
                              {isEditing && (
                                <input 
                                  placeholder="+ Add Category" 
                                  className="px-3 py-1 bg-transparent border border-dashed border-nous-border font-mono text-[10px] text-nous-subtle outline-none focus:border-nous-text"
                                  onKeyDown={(e: any) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                      handleFieldChange(['audienceEmbedding', 'targetCategories'], [...activePack.audienceEmbedding.targetCategories, e.target.value.trim()]);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activePackTab === 'intent' && (
                        <motion.div 
                          key="intent"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div>
                             <div className="flex justify-between items-center mb-4">
                               <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">
                                 USAGE DEFINITION
                                 {activePack.manualOverrides?.['generativeIntent.usageDefinition'] && <span className="text-[#a8b79f]">*</span>}
                               </span>
                               {isEditing && activePack.manualOverrides?.['generativeIntent.usageDefinition'] && (
                                 <button onClick={() => handleResetField(['generativeIntent', 'usageDefinition'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                               )}
                             </div>
                             {isEditing ? (
                               <textarea
                                 value={activePack.generativeIntent.usageDefinition}
                                 onChange={(e) => handleFieldChange(['generativeIntent', 'usageDefinition'], e.target.value)}
                                 className="w-full bg-nous-base0/50 border border-nous-border p-4 font-serif italic text-2xl text-nous-text outline-none focus:border-nous-text transition-colors min-h-[100px]"
                               />
                             ) : (
                               <p className="font-serif italic text-2xl text-nous-text leading-snug">
                                 {activePack.generativeIntent.usageDefinition}
                               </p>
                             )}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                                RECOMMENDED USE CASES
                                {activePack.manualOverrides?.['generativeIntent.recommendedUseCases'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['generativeIntent.recommendedUseCases'] && (
                                <button onClick={() => handleResetField(['generativeIntent', 'recommendedUseCases'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            <ul className="space-y-3">
                              {activePack.generativeIntent.recommendedUseCases.map((useCase, idx) => (
                                <li key={idx} className="flex gap-4 border-b border-nous-border/30 pb-3 font-mono text-xs text-nous-text items-center">
                                  <span className="text-nous-subtle">0{idx + 1}</span>
                                  {isEditing ? (
                                    <div className="flex-1 flex gap-2">
                                      <input 
                                        value={useCase}
                                        onChange={(e) => {
                                          const newArr = [...activePack.generativeIntent.recommendedUseCases];
                                          newArr[idx] = e.target.value;
                                          handleFieldChange(['generativeIntent', 'recommendedUseCases'], newArr);
                                        }}
                                        className="flex-1 bg-transparent border-none outline-none text-nous-text focus:bg-nous-base0"
                                      />
                                      <button onClick={() => {
                                          const newArr = [...activePack.generativeIntent.recommendedUseCases];
                                          newArr.splice(idx, 1);
                                          handleFieldChange(['generativeIntent', 'recommendedUseCases'], newArr);
                                      }} className="text-nous-subtle hover:text-red-400 shrink-0">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    useCase
                                  )}
                                </li>
                              ))}
                              {isEditing && (
                                <div className="pt-2">
                                  <button onClick={() => {
                                    handleFieldChange(['generativeIntent', 'recommendedUseCases'], [...activePack.generativeIntent.recommendedUseCases, "New use case..."]);
                                  }} className="font-mono text-[10px] text-nous-subtle hover:text-nous-text border border-dashed border-nous-border p-2 w-full text-center">
                                    + ADD USE CASE
                                  </button>
                                </div>
                              )}
                            </ul>
                          </div>
                        </motion.div>
                      )}

                      {activePackTab === 'signature' && (
                        <motion.div 
                          key="signature"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div className="flex flex-col gap-2 p-4 border border-nous-border bg-nous-base0/20">
                            <div className="flex justify-between items-center w-full">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-widest text-nous-subtle">
                                TONAL FREQUENCY
                                {activePack.manualOverrides?.['semanticSignature.tone'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['semanticSignature.tone'] && (
                                <button onClick={() => handleResetField(['semanticSignature', 'tone'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            {isEditing ? (
                              <input 
                                value={activePack.semanticSignature.tone}
                                onChange={(e) => handleFieldChange(['semanticSignature', 'tone'], e.target.value)}
                                className="bg-transparent border-b border-nous-border font-mono text-sm text-nous-text uppercase outline-none focus:border-nous-text w-full py-1"
                              />
                            ) : (
                              <div className="flex justify-between items-center w-full">
                                <span className="font-mono text-sm text-nous-text uppercase">{activePack.semanticSignature.tone}</span>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setToneFeedback(prev => prev === 'lands' ? null : 'lands')}
                                    className={`font-mono text-[8px] uppercase tracking-widest transition-colors ${toneFeedback === 'lands' ? 'text-[#a8b79f]' : 'text-nous-subtle hover:text-nous-text'}`}
                                  >
                                    ↑ Lands
                                  </button>
                                  <button 
                                    onClick={() => setToneFeedback(prev => prev === 'misses' ? null : 'misses')}
                                    className={`font-mono text-[8px] uppercase tracking-widest transition-colors ${toneFeedback === 'misses' ? 'text-red-400/80' : 'text-nous-subtle hover:text-nous-text'}`}
                                  >
                                    ↓ Doesn't Land
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                             <div className="flex justify-between items-center mb-4">
                               <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                                 STYLISTIC LANGUAGE
                                 {activePack.manualOverrides?.['semanticSignature.stylisticLanguage'] && <span className="text-[#a8b79f]">*</span>}
                               </span>
                               {isEditing && activePack.manualOverrides?.['semanticSignature.stylisticLanguage'] && (
                                 <button onClick={() => handleResetField(['semanticSignature', 'stylisticLanguage'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                               )}
                             </div>
                             {isEditing ? (
                               <textarea
                                 value={activePack.semanticSignature.stylisticLanguage}
                                 onChange={(e) => handleFieldChange(['semanticSignature', 'stylisticLanguage'], e.target.value)}
                                 className="w-full bg-nous-base0/50 border border-nous-border p-4 font-serif italic text-xl text-nous-text outline-none focus:border-nous-text transition-colors min-h-[100px]"
                               />
                             ) : (
                               <p className="font-serif italic text-xl text-nous-text leading-relaxed">
                                 {activePack.semanticSignature.stylisticLanguage}
                               </p>
                             )}
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                                PHRASING PATTERNS
                                {activePack.manualOverrides?.['semanticSignature.phrasingPatterns'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['semanticSignature.phrasingPatterns'] && (
                                <button onClick={() => handleResetField(['semanticSignature', 'phrasingPatterns'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {activePack.semanticSignature.phrasingPatterns.map((pattern, i) => (
                                <div key={i} className="flex flex-col gap-1 items-start">
                                  <span className="font-mono text-xs bg-nous-text text-nous-base px-3 py-1 flex items-center gap-2">
                                    {pattern}
                                    {isEditing && (
                                      <button onClick={() => {
                                        const newArr = [...activePack.semanticSignature.phrasingPatterns];
                                        newArr.splice(i, 1);
                                        handleFieldChange(['semanticSignature', 'phrasingPatterns'], newArr);
                                      }} className="text-nous-base/50 hover:text-red-900">
                                        <X size={10} />
                                      </button>
                                    )}
                                  </span>
                                  {!isEditing && (
                                    <div className="flex items-center gap-2 px-1">
                                      <button 
                                        onClick={() => setPhrasingFeedback(prev => ({...prev, [pattern]: prev[pattern] === 'lands' ? undefined : 'lands'}) as any)}
                                        className={`font-mono text-[8px] uppercase tracking-widest transition-colors ${phrasingFeedback[pattern] === 'lands' ? 'text-[#a8b79f]' : 'text-nous-subtle hover:text-nous-text'}`}
                                      >
                                        ↑ Lands
                                      </button>
                                      <button 
                                        onClick={() => setPhrasingFeedback(prev => ({...prev, [pattern]: prev[pattern] === 'misses' ? undefined : 'misses'}) as any)}
                                        className={`font-mono text-[8px] uppercase tracking-widest transition-colors ${phrasingFeedback[pattern] === 'misses' ? 'text-red-400/80' : 'text-nous-subtle hover:text-nous-text'}`}
                                      >
                                        ↓ Doesn't Land
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {isEditing && (
                                <input 
                                  placeholder="+ Add Pattern" 
                                  className="px-3 py-1 bg-transparent border border-dashed border-nous-border font-mono text-[10px] text-nous-subtle outline-none focus:border-nous-text"
                                  onKeyDown={(e: any) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                      handleFieldChange(['semanticSignature', 'phrasingPatterns'], [...activePack.semanticSignature.phrasingPatterns, e.target.value.trim()]);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          {!isEditing && (
                            <div className="pt-8 border-t border-nous-border mt-8 space-y-4">
                              <label className="block font-sans text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle">
                                What this reading didn't hold.
                              </label>
                              <textarea
                                value={signatureCorrectionNote}
                                onChange={(e) => setSignatureCorrectionNote(e.target.value)}
                                placeholder="e.g. The brutalist read is close but I'm drawn to restraint, not rawness..."
                                className="w-full bg-nous-base0/30 border border-nous-border p-4 font-mono text-xs text-nous-text outline-none focus:ring-1 focus:ring-nous-text transition-all resize-none h-24"
                              />
                              <div className="flex justify-end">
                                <button
                                  onClick={handleSubmitReading}
                                  className="px-6 py-2 bg-nous-text text-nous-base font-sans text-[9px] uppercase tracking-widest font-black transition-all hover:opacity-90"
                                >
                                  Submit Reading
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activePackTab === 'aesthetic' && (
                        <motion.div 
                          key="aesthetic"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">
                                COHESIVE SUMMARY
                                {activePack.manualOverrides?.['aestheticVectorSummary.cohesiveSummary'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['aestheticVectorSummary.cohesiveSummary'] && (
                                <button onClick={() => handleResetField(['aestheticVectorSummary', 'cohesiveSummary'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            {isEditing ? (
                              <textarea
                                value={activePack.aestheticVectorSummary.cohesiveSummary}
                                onChange={(e) => handleFieldChange(['aestheticVectorSummary', 'cohesiveSummary'], e.target.value)}
                                className="w-full bg-nous-base0/50 border border-nous-border p-4 font-serif italic text-2xl text-nous-text outline-none focus:border-nous-text transition-colors min-h-[120px]"
                              />
                            ) : (
                              <p className="font-serif italic text-2xl text-nous-text leading-snug">
                                {activePack.aestheticVectorSummary.cohesiveSummary}
                              </p>
                            )}
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">
                                PERCEPTUAL TRAITS
                                {activePack.manualOverrides?.['aestheticVectorSummary.perceptualTraits'] && <span className="text-[#a8b79f]">*</span>}
                              </span>
                              {isEditing && activePack.manualOverrides?.['aestheticVectorSummary.perceptualTraits'] && (
                                <button onClick={() => handleResetField(['aestheticVectorSummary', 'perceptualTraits'])} className="font-mono text-[9px] uppercase tracking-widest text-[#a8b79f] underline">Restore Reading</button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {activePack.aestheticVectorSummary.perceptualTraits && typeof activePack.aestheticVectorSummary.perceptualTraits === 'object' && !Array.isArray(activePack.aestheticVectorSummary.perceptualTraits) 
                                ? Object.entries(activePack.aestheticVectorSummary.perceptualTraits).map(([trait, value]) => (
                                <div key={trait} className="p-4 border border-nous-border bg-nous-base0/10 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-nous-text">
                                      {trait}
                                    </span>
                                    <span className="font-mono text-[10px] text-nous-subtle">{value}/100</span>
                                  </div>
                                  {isEditing ? (
                                    <input 
                                      type="range"
                                      min="0" max="100"
                                      value={value}
                                      onChange={(e) => {
                                        const newTraits = { ...activePack.aestheticVectorSummary.perceptualTraits, [trait]: parseInt(e.target.value, 10) };
                                        handleFieldChange(['aestheticVectorSummary', 'perceptualTraits'], newTraits);
                                      }}
                                      className="w-full accent-nous-text bg-nous-border h-1 appearance-none outline-none"
                                    />
                                  ) : (
                                    <div className="w-full h-1 bg-nous-border relative">
                                      <div className="absolute top-0 left-0 h-full bg-nous-text" style={{ width: `${value}%` }} />
                                    </div>
                                  )}
                                  {isEditing && (
                                    <div className="flex justify-end pt-2">
                                      <button onClick={() => {
                                        const newTraits = { ...activePack.aestheticVectorSummary.perceptualTraits };
                                        delete newTraits[trait];
                                        handleFieldChange(['aestheticVectorSummary', 'perceptualTraits'], newTraits);
                                      }} className="text-nous-subtle hover:text-red-400 font-mono text-[9px] uppercase tracking-widest">
                                        Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )) : (
                                <div className="p-4 border border-nous-border bg-nous-base0/10 col-span-full">
                                  <span className="font-mono text-[10px] text-nous-subtle">
                                    Traits are in an older string-based schema. Regenerate to map as values.
                                  </span>
                                </div>
                              )}
                              
                              {isEditing && (
                                <div className="p-4 border border-dashed border-nous-border bg-transparent flex flex-col justify-center gap-2">
                                  <input 
                                    placeholder="Trait Name (e.g. Density)" 
                                    className="px-3 py-1 bg-transparent border-b border-nous-border font-mono text-[10px] text-nous-text outline-none focus:border-nous-text w-full"
                                    onKeyDown={(e: any) => {
                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                        const newTraits = { ...activePack.aestheticVectorSummary.perceptualTraits, [e.target.value.trim()]: 50 };
                                        handleFieldChange(['aestheticVectorSummary', 'perceptualTraits'], newTraits);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                  <span className="font-mono text-[9px] text-nous-subtle text-center">Press Enter to Add</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {activePackTab === 'market' && (
                        <motion.div 
                          key="market"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          {!activePack.marketMirror ? (
                            <div className="p-12 text-center border border-nous-border bg-nous-base0/20">
                              <BarChart3 className="mx-auto text-nous-subtle mb-4" size={32} />
                              <p className="font-serif italic text-lg text-nous-text">The mirror is still focusing.</p>
                              <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mt-2">Generate a pack to read your signal.</p>
                            </div>
                          ) : (
                            <>
                              <div className="bg-nous-text text-nous-base p-6 mb-8 mt-2">
                                <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-black opacity-80 mb-2">Notice</h3>
                                <p className="font-serif italic text-lg">What the algorithm thinks you want — and what you actually do.</p>
                              </div>

                              <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                  <span className="block font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black mb-4">IAB CATEGORIES</span>
                                  <div className="flex flex-col gap-4">
                                    {activePack.marketMirror.iabCategories.map((c, i) => (
                                      <div key={i} className="bg-nous-base0/30 border border-nous-border p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <span className="font-mono text-xs text-nous-text font-black">{c.categoryName || (c as unknown as string)}</span>
                                          {c.isContested && (
                                            <span className="font-mono text-[8px] uppercase tracking-widest text-[#a8b79f] border border-[#a8b79f] px-1 py-0.5 shrink-0">Contested</span>
                                          )}
                                        </div>
                                        {c.reasoning && <p className="font-mono text-[10px] text-nous-subtle leading-relaxed">{c.reasoning}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="block font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black mb-4">CONSUMER ARCHETYPE</span>
                                  <div className="font-serif italic text-2xl text-nous-text p-4 border border-nous-border">
                                    {activePack.marketMirror.consumerArchetype}
                                  </div>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                  <span className="block font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black mb-4">TYPICALLY SERVED BRANDS</span>
                                  <ul className="space-y-2">
                                    {activePack.marketMirror.typicallyServedBrands.map((b, i) => (
                                      <li key={i} className="font-mono text-xs text-nous-text flex items-center gap-2">
                                        <span className="text-nous-subtle">•</span> {b}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <span className="block font-sans text-[9px] uppercase tracking-widest text-[#a8b79f] font-black mb-4">MIMI RECOMMENDS</span>
                                  <ul className="space-y-2">
                                    {activePack.marketMirror.mimiRecommends.map((b, i) => (
                                      <li key={i} className="font-mono text-xs text-nous-text flex items-center gap-2">
                                        <Sparkles size={10} className="text-[#a8b79f]" /> {b}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div>
                                <span className="block font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black mb-4">TARGETING BLIND SPOTS</span>
                                <div className="flex flex-wrap gap-2">
                                  {activePack.marketMirror.blindSpots.map((c, i) => (
                                    <span key={i} className="font-mono text-xs text-nous-subtle border border-nous-border/30 bg-nous-base0/50 px-3 py-1">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                                <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mt-3 opacity-60">
                                  Categories where your aesthetic overlap causes incorrect algorithmic assumptions.
                                </p>
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}
                       {activePackTab === 'qblocks' && (
                        <motion.div 
                          key="qblocks"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div>
                            <div className="bg-nous-text text-nous-base p-6 mb-8 mt-2">
                              <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-black opacity-80 mb-2">Conversational Nodes</h3>
                              <p className="font-serif italic text-lg">How AI chat engines respond when queried about your brand.</p>
                            </div>

                            <div className="space-y-6">
                              {activePack.geoQBlocks?.map((q, i) => (
                                <div key={i} className="bg-nous-base0/30 border border-nous-border p-6 space-y-4">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                      <span className="block font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black mb-2">QUESTION 0{i + 1}</span>
                                      {isEditing ? (
                                        <input 
                                          value={q.question}
                                          onChange={(e) => {
                                            const newArr = [...(activePack.geoQBlocks || [])];
                                            newArr[i] = { ...newArr[i], question: e.target.value };
                                            handleFieldChange(['geoQBlocks'], newArr);
                                          }}
                                          className="w-full bg-nous-base0 border border-nous-border p-3 font-mono text-xs text-nous-text outline-none focus:border-nous-text"
                                        />
                                      ) : (
                                        <h4 className="font-serif italic text-xl text-nous-text leading-snug">{q.question}</h4>
                                      )}
                                    </div>
                                    {isEditing && (
                                      <button onClick={() => {
                                        const newArr = [...(activePack.geoQBlocks || [])];
                                        newArr.splice(i, 1);
                                        handleFieldChange(['geoQBlocks'], newArr);
                                      }} className="text-nous-subtle hover:text-red-400">
                                        <X size={16} />
                                      </button>
                                    )}
                                  </div>
                                  <div>
                                    <span className="block font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black mb-2">AI-OPTIMIZED RESPONSE</span>
                                    {isEditing ? (
                                      <textarea 
                                        value={q.answer}
                                        onChange={(e) => {
                                          const newArr = [...(activePack.geoQBlocks || [])];
                                          newArr[i] = { ...newArr[i], answer: e.target.value };
                                          handleFieldChange(['geoQBlocks'], newArr);
                                        }}
                                        className="w-full bg-nous-base0 border border-nous-border p-3 font-mono text-xs text-nous-subtle outline-none focus:border-nous-text min-h-[80px]"
                                      />
                                    ) : (
                                      <p className="font-mono text-sm text-nous-subtle leading-relaxed">{q.answer}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {isEditing && (
                                <button onClick={() => {
                                  const newArr = [...(activePack.geoQBlocks || []), { question: "New Question?", answer: "Optimized Answer..." }];
                                  handleFieldChange(['geoQBlocks'], newArr);
                                }} className="font-mono text-[10px] text-nous-subtle hover:text-nous-text border border-dashed border-nous-border p-4 w-full text-center">
                                  + ADD Q-BLOCK
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    )}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Intelligence Feed / Context */}
      <div className="hidden lg:flex w-80 bg-nous-base0 border-l border-nous-border flex-col">
        <div className="p-6 border-b border-nous-border">
          <span className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle font-black">
            Intelligence Feed
          </span>
        </div>
        <div className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
           <div>
             <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-4">CORE DIRECTIVE</span>
             <p className="font-mono text-[11px] leading-relaxed text-nous-subtle italic">
               GEO is not a theory layer. It is a content structuring engine. We're converting human taste into AI-readable format.
             </p>
           </div>

           {profile?.tasteProfile?.semantic_signature && (
             <div>
                <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-4">SEMANTIC ANCHORS</span>
                <p className="font-mono text-[10px] text-nous-text leading-relaxed">
                  {profile.tasteProfile.semantic_signature}
                </p>
             </div>
           )}

           <div className="p-4 bg-nous-text text-nous-base">
             <span className="block font-mono text-[8px] uppercase tracking-widest mb-4 opacity-70">GEO INSIGHT</span>
             <p className="font-serif italic text-sm leading-snug">
               "Make content easy to retrieve and hard to misinterpret."
             </p>
           </div>

           <div className="p-4 border border-[#a8b79f]/30 bg-[#a8b79f]/5">
             <span className="block font-mono text-[8px] uppercase tracking-widest mb-4 text-[#a8b79f]">INTEGRATION NOTE</span>
             <p className="font-mono text-[10px] leading-relaxed text-nous-subtle">
               Mimi's Zine Generator is now hard-wired to your GEO Signature. Every narrative generated in a Zine will strictly adhere to the phrasing patterns and stylistic language defined in your active signal.
             </p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

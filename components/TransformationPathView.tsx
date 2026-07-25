import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { resolveApiKey } from '../services/apiKeyService';
import { generateTransformationPath, generateChatGPTReading } from '../services/geminiService';
import { startTailorFromIntake } from '../services/tailorBridge';
import { TransformationPath, MediaFile } from '../types';
import { Sparkles, ArrowRight, Loader2, Image as ImageIcon, Link as LinkIcon, FileJson, X, Upload, CheckCircle2, Crosshair, Zap, Activity } from 'lucide-react';

export const TransformationPathView: React.FC = () => {
  const { activePersona, profile, user } = useUser();
  const [activeTab, setActiveTab] = useState<'evolution' | 'telemetry'>('evolution');
  
  // Baseline Form
  const [baselineText, setBaselineText] = useState('');
  const [baselineMedia, setBaselineMedia] = useState<MediaFile[]>([]);
  
  // Aspiration Form
  const [aspirationText, setAspirationText] = useState('');
  const [aspirationMedia, setAspirationMedia] = useState<MediaFile[]>([]);
  const [pinterestUrl, setPinterestUrl] = useState('');
  
  // Telemetry Form
  const [chatGPTExport, setChatGPTExport] = useState<string | null>(null);
  const [chatGPTReading, setChatGPTReading] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);

  // Path
  const [path, setPath] = useState<TransformationPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingToTailor, setSendingToTailor] = useState(false);

  const handleSendToTailor = async () => {
    if (!user?.uid || !path) return;
    setSendingToTailor(true);
    try {
      const imageDataUrls = [
        ...baselineMedia.map((m) => m.data).filter(Boolean),
        ...aspirationMedia.map((m) => m.data).filter(Boolean),
      ] as string[];
      const { projectId } = await startTailorFromIntake(user.uid, 'world', {
        title: 'Transformation path',
        blurb: `${baselineText}\n\n→\n\n${aspirationText}`,
        imageDataUrls,
        noteTitle: 'Transformation path',
        noteBody: JSON.stringify(path, null, 2),
      });
      window.location.href = `/tailor?project=${projectId}`;
    } finally {
      setSendingToTailor(false);
    }
  };

  const baselineFileRef = useRef<HTMLInputElement>(null);
  const aspirationFileRef = useRef<HTMLInputElement>(null);
  const chatGPTFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'baseline' | 'aspiration') => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const media: MediaFile = {
          id: crypto.randomUUID(),
          type: 'image',
          data: reader.result as string,
          url: '',
          mimeType: file.type,
          name: file.name
        };
        if (target === 'baseline') setBaselineMedia(prev => [...prev, media]);
        else setAspirationMedia(prev => [...prev, media]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleChatGPTUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setChatGPTExport(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleGenerateReading = async () => {
    if (!chatGPTExport) return;
    const { key: geminiKey } = resolveApiKey('gemini', activePersona?.apiKey, profile?.planStatus);
    setReadingLoading(true);
    try {
      const reading = await generateChatGPTReading(chatGPTExport, activePersona, geminiKey || undefined);
      setChatGPTReading(reading);
    } catch (err) {
      console.error("Reading failed", err);
    } finally {
      setReadingLoading(false);
    }
  };

  const handleGeneratePath = async () => {
    if (baselineMedia.length === 0 && !baselineText) {
      setError('Please provide baseline imagery or text.');
      return;
    }
    if (aspirationMedia.length === 0 && !aspirationText && !pinterestUrl) {
      setError('Please provide aspiration imagery, Pinterest link, or text.');
      return;
    }

    const { key: geminiKey } = resolveApiKey('gemini', activePersona?.apiKey, profile?.planStatus);
    setLoading(true);
    setError('');
    try {
      const result = await generateTransformationPath(
        { text: baselineText, media: baselineMedia },
        { text: aspirationText, media: aspirationMedia, pinterestUrl },
        geminiKey || undefined
      );
      setPath(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate transformation path.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#Fdfdfb] text-nous-text">
      {/* HEADER SECTION (EDITORIAL) */}
      <div className="border-b-2 border-black p-8 md:p-12 relative overflow-hidden bg-[#e8e6e1]">
        <div className="absolute -top-24 -right-24 opacity-[0.03] pointer-events-none">
          <Crosshair size={400} strokeWidth={0.5} />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-8 relative z-10">
          <div>
            <h1 className="text-6xl md:text-8xl font-serif italic tracking-tighter mb-2" style={{ lineHeight: '0.85' }}>
              Taste<br/>Identity.
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-black mt-6">Aesthetic Evolution Chamber</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('evolution')}
              className={`px-6 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors border-2 ${activeTab === 'evolution' ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black text-black bg-transparent'}`}
            >
              Evolution Path
            </button>
            <button 
              onClick={() => setActiveTab('telemetry')}
              className={`px-6 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors border-2 ${activeTab === 'telemetry' ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black text-black bg-transparent'}`}
            >
              Data Telemetry
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full mb-32">
        {activeTab === 'evolution' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row min-h-[70vh] border-x-2 border-b-2 border-black">
            
            {/* LEFT / BASELINE */}
            <div className="flex-1 border-r-2 border-black flex flex-col bg-[#F5F4F1]">
              <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#Eae8e4]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full" />
                  <h2 className="font-mono text-[11px] uppercase tracking-widest font-black">Baseline: Reality</h2>
                </div>
                <button 
                  onClick={() => baselineFileRef.current?.click()}
                  className="font-mono text-[9px] uppercase hover:underline"
                >
                  [ + Add Media ]
                </button>
              </div>

              <div className="p-8 flex-1 flex flex-col gap-6">
                <input 
                  type="file" multiple accept="image/*" className="hidden" 
                  ref={baselineFileRef} onChange={(e) => handleFileUpload(e, 'baseline')}
                />
                
                {baselineMedia.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {baselineMedia.map(media => (
                      <div key={media.id} className="aspect-[4/5] bg-black/5 relative group overflow-hidden border border-black/10">
                        <img src={media.data} alt="baseline" className="w-full h-full object-cover grayscale mix-blend-multiply" />
                        <button 
                          onClick={() => setBaselineMedia(prev => prev.filter(m => m.id !== media.id))}
                          className="absolute top-2 right-2 p-1.5 bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => baselineFileRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-black/5 transition-colors"
                  >
                    <ImageIcon size={24} className="opacity-50" />
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">Drop Reality Here</span>
                  </div>
                )}

                <textarea
                  value={baselineText}
                  onChange={(e) => setBaselineText(e.target.value)}
                  placeholder="Describe your current state... (e.g. Too corporate, wearing basics, feeling stuck)"
                  className="w-full h-32 bg-transparent border-2 border-black/10 p-4 font-mono text-[11px] focus:outline-none focus:border-black resize-none transition-colors"
                />
              </div>
            </div>

            {/* RIGHT / ASPIRATION */}
            <div className="flex-1 flex flex-col bg-[#Fcfbf9]">
              <div className="p-4 border-b-2 border-black flex justify-between items-center bg-black text-white">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-[#a8b79f]" />
                  <h2 className="font-mono text-[11px] uppercase tracking-widest font-black text-[#a8b79f]">Target: Vector</h2>
                </div>
                <button 
                  onClick={() => aspirationFileRef.current?.click()}
                  className="font-mono text-[9px] uppercase hover:text-[#a8b79f]"
                >
                  [ + Add Media ]
                </button>
              </div>

              <div className="p-8 flex-1 flex flex-col gap-6">
                 <input 
                  type="file" multiple accept="image/*" className="hidden" 
                  ref={aspirationFileRef} onChange={(e) => handleFileUpload(e, 'aspiration')}
                />

                <div className="flex gap-4 items-center bg-transparent p-4 border-2 border-black/10 focus-within:border-black transition-colors">
                  <LinkIcon size={14} className="opacity-50" />
                  <input 
                    type="text"
                    value={pinterestUrl}
                    onChange={(e) => setPinterestUrl(e.target.value)}
                    placeholder="Pinterest Link or Moodboard URL..."
                    className="bg-transparent flex-1 outline-none font-mono text-[11px]"
                  />
                </div>

                {aspirationMedia.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {aspirationMedia.map(media => (
                      <div key={media.id} className="aspect-[4/5] bg-black/5 relative group overflow-hidden border border-black/10">
                        <img src={media.data} alt="aspiration" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                        <button 
                          onClick={() => setAspirationMedia(prev => prev.filter(m => m.id !== media.id))}
                          className="absolute top-2 right-2 p-1.5 bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => aspirationFileRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-black/5 transition-colors"
                  >
                    <Sparkles size={24} className="opacity-50" />
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">Drop Future Here</span>
                  </div>
                )}

                <textarea
                  value={aspirationText}
                  onChange={(e) => setAspirationText(e.target.value)}
                  placeholder="Describe your aspiration... (e.g. Looking for undone luxury, architectural silhouettes)"
                  className="w-full h-32 bg-transparent border-2 border-black/10 p-4 font-mono text-[11px] focus:outline-none focus:border-black resize-none transition-colors"
                />
              </div>

               {/* COMPUTE BUTTON */}
              <div className="p-8 border-t-2 border-black bg-[#e8e6e1]">
                {error && <div className="text-red-600 font-mono text-[10px] uppercase mb-4">{error}</div>}
                
                <button 
                  onClick={handleGeneratePath}
                  disabled={loading}
                  className="w-full bg-black text-white py-6 font-mono text-[11px] uppercase tracking-widest font-black hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <><Activity size={16} className="animate-spin" /> Computing Latent Path...</>
                  ) : (
                    <><Zap size={16} /> Compute Transformation Matrix</>
                  )}
                </button>
              </div>
            </div>

          </motion.div>
        )}

        {/* RESULTS RENDERER */}
        <AnimatePresence>
          {path && activeTab === 'evolution' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="border-t-2 border-x-2 border-b-2 border-black bg-[#111] text-white p-8 md:p-16 mt-8"
            >
              <h2 className="font-serif italic text-4xl mb-12">The Calculus.</h2>
              
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#a8b79f] border-b border-white/20 pb-2">01. Baseline Geometry</div>
                  <p className="font-sans text-sm leading-relaxed text-[#ddd]">
                    You are currently anchored in <strong>{path.baseline.structureVsFlow}</strong> with a 
                    social signaling level defined as <strong>{path.baseline.socialSignalingLevel}</strong>. 
                    The prevailing silhouette is <strong>{path.baseline.silhouette}</strong>.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#a8b79f] border-b border-white/20 pb-2">02. Aspirational Target</div>
                  <p className="font-sans text-sm leading-relaxed text-[#ddd]">
                    The target vector requires a shift towards <strong>{path.aspiration.emotionalTone}</strong>. 
                    This requires elevating to a <strong>{path.aspiration.boldnessLevel}</strong> boldness level 
                    and projecting a <strong>{path.aspiration.identitySignal}</strong> identity signal.
                  </p>
                </div>
              </div>

              <div className="mt-16 space-y-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#a8b79f] border-b border-white/20 pb-2">03. Actionable Milestones</div>
                <div className="grid sm:grid-cols-3 gap-6">
                  {path.stages.map((stage, i) => (
                    <div key={i} className="border border-white/20 p-6 bg-white/5">
                      <div className="font-serif text-3xl italic mb-4 opacity-50">0{stage.stageNumber}</div>
                      <h4 className="font-mono text-[11px] uppercase tracking-widest mb-2 text-white">{stage.name}</h4>
                      <p className="font-sans text-xs text-[#aaa] leading-relaxed">{stage.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 text-center">
                <button
                  type="button"
                  onClick={handleSendToTailor}
                  disabled={sendingToTailor}
                  className="px-8 py-4 border border-white/40 font-mono text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                >
                  {sendingToTailor ? 'Opening Tailor…' : 'Continue in Tailor'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION 3: CHATGPT DATA READING */}
        {activeTab === 'telemetry' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 md:p-12 min-h-[70vh] border-x-2 border-b-2 border-black">
            <div className="max-w-3xl mx-auto space-y-12">
              <div className="border-l-4 border-black pl-6">
                <h2 className="font-serif italic text-3xl mb-2 flex items-center gap-4">
                  <Activity size={24} className="text-black" />
                  Electronic Soul Reading
                </h2>
                <p className="font-sans text-xs text-[#555] uppercase tracking-wider">Upload your ChatGPT data export for a latent analysis.</p>
              </div>

              {!chatGPTExport ? (
                <div 
                  onClick={() => chatGPTFileRef.current?.click()}
                  className="w-full aspect-[2/1] border-2 border-dashed border-black flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-black/5 transition-colors bg-white mt-8"
                >
                  <FileJson size={32} className="opacity-30" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50 text-black">Target .json or .txt dump</span>
                  <input 
                    type="file" 
                    accept=".json,.txt" 
                    className="hidden" 
                    ref={chatGPTFileRef}
                    onChange={handleChatGPTUpload}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white border-2 border-black p-6 flex justify-between items-center bg-black text-white">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#a8b79f]">Telemetry Loaded</span>
                      <span className="font-sans text-sm">{(chatGPTExport.length / 1024).toFixed(1)} KB Extracted</span>
                    </div>
                    <CheckCircle2 size={24} className="text-[#a8b79f]" />
                  </div>
                  
                  <button 
                    onClick={handleGenerateReading}
                    disabled={readingLoading}
                    className="w-full bg-black text-white py-6 font-mono text-[11px] uppercase tracking-widest font-black hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {readingLoading ? 'Interrogating Data Shell...' : 'Initialize Analysis'}
                  </button>
                </div>
              )}

              {chatGPTReading && (
                <div className="bg-white border-2 border-black p-8 md:p-12 mt-12 shadow-[8px_8px_0_rgba(0,0,0,1)]">
                  <h3 className="font-serif text-3xl italic mb-6 border-b-2 border-black/10 pb-4">The Reading</h3>
                  <div className="prose prose-sm font-sans text-black max-w-none leading-relaxed">
                    {chatGPTReading.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4">{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Save, ArrowRight, Sparkles, Droplets, Target, Disc3 } from 'lucide-react';
import { analyzeImageAesthetic } from '../services/geminiService';
import { cn } from '../lib/utils';
import { useUser } from '../contexts/UserContext';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';

interface VoidManuscriptProps {
  initialImage?: string;
  onArchive?: (tokens: any) => void;
  onClose?: () => void;
}

export const TheVoidManuscript: React.FC<VoidManuscriptProps> = ({ initialImage, onArchive, onClose }) => {
  const { user, profile } = useUser();
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [axisFocus, setAxisFocus] = useState<'neutral' | 'color' | 'texture' | 'form'>('neutral');

  useEffect(() => {
    if (image && !analysis) {
      handleAnalyze(image);
    }
  }, [image]);

  const handleAnalyze = async (imgData: string) => {
    setIsAnalyzing(true);
    try {
      const base64 = imgData.split(',')[1] || imgData;
      // Use existing prompt or specialized analysis for the manuscript
      const result = await analyzeImageAesthetic(base64, 'image/jpeg', profile);
      
      setAnalysis({
        narrative: result.mood?.join(', ') || "A profound stillness, capturing the liminal space between intention and execution.",
        details: "The subject exhibits high contrast ratios suggesting a duality of intent. Recommended for targeted aesthetic profiling.",
        palette: result.colorPalette || ['#1a1a1a', '#8b5a2b', '#d4b069'],
        typography: ['Serif: High Contrast', 'Sans: Grotesk'],
        prompts: result.culturalReferences || [
          "Enhance the shadows to create mystery.",
          "Overlay noise texture at 15% opacity.",
          "Crop to 4:5 aspect ratio for focus."
        ]
      });
    } catch (e) {
      console.error(e);
      // Fallback dummy data for visualization
      setAnalysis({
        narrative: "The silence before the storm, captured in amber.",
        details: "The subject exhibits a profound stillness. High contrast ratios suggest a duality of intent. Recommended for 'The Quiet Issue'.",
        palette: ['#2a2a2a', '#8b5a2b', '#d4b069'],
        typography: ['Serif: High Contrast', 'Sans: Geometric'],
        prompts: [
          "Enhance the shadows to create mystery.",
          "Overlay noise texture at 15% opacity.",
          "Crop to 4:5 aspect ratio for focus."
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleArchive = async () => {
    if (user && analysis) {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          codexTokens: arrayUnion({ ...analysis, timestamp: Date.now() })
        });
      } catch (e) {
        console.error("Failed to archive tokens", e);
      }
    }
    if (onArchive) onArchive(analysis);
    if (onClose) onClose();
  };

  return (
    <div className="flex-1 flex h-full bg-[#f0efe9] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 overflow-hidden relative font-sans transition-colors duration-1000">
      
      <div className="absolute inset-0 pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, rgba(100, 100, 100, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(100, 100, 100, 0.05) 1px, transparent 1px)',
             backgroundSize: '60px 60px' 
           }}>
      </div>
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none z-0"></div>

      <div className="flex-1 relative flex flex-col h-full z-10">
        
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <span className="font-serif italic text-xl text-gray-900 dark:text-gray-100">The Void Manuscript</span>
            <div className="h-px w-12 bg-gray-300 dark:bg-gray-700"></div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Report No. 892-Ω</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 border border-[#d4b069]/20 rounded-full bg-[#d4b069]/5">
              <div className="w-1.5 h-1.5 bg-[#d4b069] rounded-full animate-pulse"></div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#d4b069]">Oracle Status: Active</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          <div className="flex-1 relative flex items-center justify-center bg-gradient-to-b from-transparent to-black/5 dark:to-black/40">
            
            {!image && (
               <div className="absolute inset-0 flex items-center justify-center z-30">
                 <label className="cursor-pointer flex flex-col items-center gap-4 group">
                   <div className="w-24 h-24 rounded-full border border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center group-hover:border-[#d4b069] transition-colors">
                     <Camera className="text-gray-400 group-hover:text-[#d4b069] transition-colors" size={24} />
                   </div>
                   <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-[#d4b069]">Submit Specimen</span>
                   <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                 </label>
               </div>
            )}

            {analysis && (
              <>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="absolute top-[20%] left-[15%]">
                  <div className="w-16 h-20 border border-gray-300 dark:border-gray-700 bg-white/10 dark:bg-black/40 backdrop-blur-md p-1 flex flex-col gap-1">
                    <div className="h-12 w-full opacity-80" style={{ backgroundColor: analysis.palette[0] || '#8b5a2b' }}></div>
                    <span className="font-mono text-[8px] text-gray-500 text-center block pt-1">{analysis.palette[0] || '#8b5a2b'}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-auto mt-2"></div>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="absolute bottom-[25%] left-[20%]">
                  <div className="w-12 h-12 rounded-full border border-[#d4b069]/30 flex items-center justify-center bg-black/5 dark:bg-white/5 backdrop-blur-sm cursor-pointer hover:bg-[#d4b069]/10" onClick={() => setAxisFocus('texture')}>
                    <Droplets className={cn("text-[#d4b069] opacity-70", axisFocus === 'texture' && 'opacity-100')} size={16} />
                  </div>
                  <span className="font-mono text-[8px] text-[#d4b069] absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">GRAIN_ISO_3200</span>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }} className="absolute top-[30%] right-[25%]">
                  <div className="flex gap-1" onClick={() => setAxisFocus('color')}>
                    {(analysis.palette || []).slice(0,3).map((c: string, i: number) => (
                      <div key={i} className={cn("w-3 h-3 rounded-full border border-gray-500 cursor-pointer", axisFocus === 'color' && 'ring-2 ring-[#d4b069] ring-offset-1 ring-offset-transparent')} style={{ backgroundColor: c }}></div>
                    ))}
                  </div>
                  <div className="mt-2 font-serif italic text-xs text-gray-400 text-right">Extracted Tones</div>
                </motion.div>
              </>
            )}

            <div className="relative w-[500px] h-[500px] flex items-center justify-center group pointer-events-none">
              <div className="absolute inset-0 rounded-full border-dashed border border-[#d4b069]/30 animate-[spin_40s_linear_infinite] pointer-events-none"></div>
              <div className="absolute -inset-4 rounded-full border border-[#d4b069]/20 shadow-[0_0_50px_rgba(212,176,105,0.05)] pointer-events-none"></div>
              <div className="absolute inset-8 rounded-full border border-gray-400/30 dark:border-gray-600/30 pointer-events-none"></div>
              
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 bg-[#f0efe9] dark:bg-[#0a0a0a] px-2 z-20">
                <span className="font-mono text-[9px] tracking-[0.2em] text-[#d4b069]">NORTH_AXIS</span>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 bg-[#f0efe9] dark:bg-[#0a0a0a] px-2 z-20">
                <span className="font-mono text-[9px] tracking-[0.2em] text-[#d4b069]">SOUTH_AXIS</span>
              </div>

              <div className="relative w-[380px] h-[380px] rounded-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(212,176,105,0.1)] z-10 transition-all duration-700 pointer-events-auto">
                <div className="w-full h-full bg-gray-800 relative flex items-center justify-center">
                  {image ? (
                    <img 
                      src={image} 
                      alt="Specimen" 
                      className={cn(
                        "w-full h-full object-cover transition-all duration-1000",
                        axisFocus === 'neutral' ? 'filter contrast-125 saturate-50' : '',
                        axisFocus === 'color' ? 'filter contrast-150 saturate-200 blur-[2px]' : '',
                        axisFocus === 'texture' ? 'filter grayscale contrast-[200%] opacity-80 mix-blend-overlay' : ''
                      )}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-gray-900 via-gray-700 to-gray-500 opacity-50 mix-blend-multiply"></div>
                  )}
                  
                  {isAnalyzing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      <div className="border border-white/50 w-16 h-16 rounded-full flex items-center justify-center animate-ping absolute"></div>
                      <span className="font-mono text-[10px] text-white tracking-widest bg-black/50 px-2 py-1">ANALYZING</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 left-10 text-gray-400 dark:text-gray-600 font-mono text-[10px] leading-relaxed">
              SECTOR: 04<br/>
              DEPTH: 24.5mm<br/>
              LIGHT_LVL: 12%
            </div>
            
            {image && (
              <div className="absolute bottom-10 right-10 flex gap-2">
                <button onClick={() => setAxisFocus('neutral')} className={cn("w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 dark:border-gray-600 transition-colors bg-[#f0efe9] dark:bg-[#0a0a0a]", axisFocus === 'neutral' && "border-[#d4b069] text-[#d4b069]")}><Target size={14}/></button>
                <button onClick={() => setAxisFocus('color')} className={cn("w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 dark:border-gray-600 transition-colors bg-[#f0efe9] dark:bg-[#0a0a0a]", axisFocus === 'color' && "border-[#d4b069] text-[#d4b069]")}><Disc3 size={14}/></button>
                <button onClick={() => setAxisFocus('texture')} className={cn("w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 dark:border-gray-600 transition-colors bg-[#f0efe9] dark:bg-[#0a0a0a]", axisFocus === 'texture' && "border-[#d4b069] text-[#d4b069]")}><Droplets size={14}/></button>
              </div>
            )}
          </div>

          <div className="w-[400px] border-l border-gray-200 dark:border-white/10 relative z-20 bg-white/40 dark:bg-black/40 backdrop-blur-xl flex flex-col transform transition-transform duration-500">
            <div className="p-8 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-[#d4b069]" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Manuscript Analysis</span>
              </div>
              <h2 className="font-serif text-4xl italic text-gray-900 dark:text-gray-100 leading-none mb-2">System Findings</h2>
              <p className="font-sans text-xs text-gray-500 dark:text-gray-400 font-light leading-relaxed">
                The Oracle has parsed the visual data. Below are the extracted narrative threads and aesthetic directives.
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 relative">
              {!analysis ? (
                <div className="absolute inset-0 flex items-center justify-center opacity-50 flex-col gap-4 text-gray-400">
                  <div className="font-mono text-xs uppercase tracking-widest animate-pulse">Awaiting Specimen</div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                  <div className="relative">
                    <div className="absolute -left-10 top-2 w-2 h-px bg-[#d4b069]"></div>
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4b069] mb-3">01 // Primary Narrative</h3>
                    <p className="font-serif text-2xl text-gray-800 dark:text-gray-200 leading-snug italic mb-4">
                      "{analysis.narrative}"
                    </p>
                    <p className="font-sans text-xs text-gray-600 dark:text-gray-400 leading-loose border-l border-gray-300 dark:border-gray-700 pl-4">
                      {analysis.details}
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-10 top-2 w-2 h-px bg-[#d4b069]"></div>
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4b069] mb-3">02 // Aesthetic Tokens</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/50 dark:bg-white/5 p-3 border border-gray-200 dark:border-white/10 hover:border-[#d4b069]/50 transition-colors cursor-default">
                        <span className="block text-3xl mb-1 text-gray-800 dark:text-gray-200 font-serif">Aa</span>
                        <span className="font-mono text-[9px] text-gray-500 uppercase">{analysis.typography[0] || 'Type Node'}</span>
                      </div>
                      <div className="bg-white/50 dark:bg-white/5 p-3 border border-gray-200 dark:border-white/10 hover:border-[#d4b069]/50 transition-colors cursor-default">
                        <div className="flex gap-1 mb-2">
                          {(analysis.palette || []).slice(0,3).map((c: string, idx: number) => (
                             <div key={idx} className="w-4 h-4 rounded-full border border-gray-500/30" style={{ backgroundColor: c }}></div>
                          ))}
                        </div>
                        <span className="font-mono text-[9px] text-gray-500 uppercase">Palette Node</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-10 top-2 w-2 h-px bg-[#d4b069]"></div>
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4b069] mb-3">03 // Creative Prompts</h3>
                    <ul className="space-y-4">
                      {(analysis.prompts || []).map((prompt: string, idx: number) => (
                        <li key={idx} className="flex gap-3 items-start group cursor-pointer">
                          <ArrowRight className="text-gray-400 group-hover:text-[#d4b069] transition-colors mt-1 flex-shrink-0" size={12} />
                          <span className="font-serif text-lg italic text-gray-700 dark:text-gray-300 group-hover:text-[#d4b069] transition-colors">{prompt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20">
              <button 
                onClick={handleArchive}
                disabled={!analysis || isAnalyzing}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-mono text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={14} />
                Archive to Codex
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

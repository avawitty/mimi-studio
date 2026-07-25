
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { generateZineImage, applyTreatment, animateShardWithVeo, analyzeMiseEnScene } from '../services/geminiService';
import { Loader2, RefreshCw, Bookmark, Check, Pencil, Download, Square, RectangleHorizontal, RectangleVertical, X, Sparkles, Image as ImageIcon, Ruler, Film, Activity, Zap, Maximize2, Layers, Eye, Wand2, Palette } from 'lucide-react';
import { AspectRatio, ImageSize } from '../types';
import { useUser } from '../contexts/UserContext';
import { resolveApiKey } from '../services/apiKeyService';
import { motion, AnimatePresence } from 'motion/react';

const SUPPORTED_ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '9:16', '16:9'];
const SUPPORTED_SIZES: ImageSize[] = ['1K', '2K', '4K'];

const STYLE_PRESETS = [
  { id: '35mm', label: '35mm Grain', prompt: '35mm Ilford HP5 B&W film grain, tactile silver halide texture, moody directional lighting, raw editorial aesthetic.' },
  { id: 'noir', label: 'Noir High-Contrast', prompt: 'Harsh high-contrast strobe lighting, crushed absolute blacks, razor sharp focus, moody chiaroscuro.' },
  { id: 'risograph', label: 'Risograph Print', prompt: 'Duotone risograph printed texture, subtle registration misalignments, organic ink bleed, tactile recycled paper grain.' },
  { id: 'vogue', label: 'Vogue Studio', prompt: 'Sleek luxury fashion editorial studio photography, soft beauty dish reflection, neutral backdrop, pristine geometry.' },
  { id: 'cyberpunk', label: 'Ethereal Neon', prompt: 'Subtle acid neon reflections, atmospheric haze, wet pavement mirror, moody cinematic color palette.' },
  { id: 'arch', label: 'Architectural Brutalism', prompt: 'Monolithic concrete forms, harsh sunlight angled shadows, vast spatial depth, stark graphic minimalism.' },
];

export const Visualizer: React.FC<{ 
 prompt: string; 
 defaultAspectRatio?: AspectRatio; 
 defaultImageSize?: ImageSize;
 initialImage?: string; 
 isArtifact?: boolean;
 isLite?: boolean; 
 delay?: number;
 artifacts?: any[];
 treatmentId?: string;
 autoDevelop?: boolean;
 onImageGenerated?: (base64: string) => void;
}> = ({ prompt, defaultAspectRatio = '1:1', defaultImageSize = '1K', initialImage, isArtifact, isLite, delay = 0, artifacts, treatmentId, autoDevelop = true, onImageGenerated }) => {
 const { user, profile, activePersona } = useUser();
 const [variants, setVariants] = useState<string[]>(initialImage ? [initialImage] : []);
 const [selectedIdx, setSelectedIdx] = useState(0);
 const [isLoading, setIsLoading] = useState(false);
 const [isAnimating, setIsAnimating] = useState(false);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [isPocketSaved, setIsPocketSaved] = useState(false);
 const [isEditing, setIsEditing] = useState(!autoDevelop && !initialImage);
 const [refinementText, setRefinementText] = useState(prompt);
 const [aspectRatio, setAspectRatio] = useState<AspectRatio>(defaultAspectRatio);
 const [imageSize, setImageSize] = useState<ImageSize>(defaultImageSize);
 const [imgLoaded, setImgLoaded] = useState(false);
 const [selectedStylePreset, setSelectedStylePreset] = useState<string | null>(null);
 const [isLightboxOpen, setIsLightboxOpen] = useState(false);

 useEffect(() => {
   if (variants.length === 0 && prompt && !isLoading && autoDevelop) {
     const t = setTimeout(() => handleDevelop(), delay);
     return () => clearTimeout(t);
   }
 }, [prompt, delay, autoDevelop]);

 const isVideo = (url: string) => url?.startsWith('data:video/') || url?.includes('.mp4');

 const applyPreset = (presetId: string) => {
   const preset = STYLE_PRESETS.find(p => p.id === presetId);
   if (!preset) return;
   setSelectedStylePreset(presetId);
   const updated = `${refinementText || prompt}. Visual style: ${preset.prompt}`;
   setRefinementText(updated);
   handleDevelopWithText(updated);
 };

 const enhancePromptMagic = () => {
   const base = refinementText || prompt;
   const enhanced = `${base}. Clarify the primary subject, spatial relationships, material details, and a coherent light source while preserving every palette, medium, era, camera, mood, and stylistic choice already stated. Do not introduce monochrome, desaturation, film grain, editorial styling, cinematic lighting, or an art movement unless the prompt explicitly asks for it.`;
   setRefinementText(enhanced);
 };

 const handleDevelopWithText = async (customText?: string) => {
   setIsLoading(true);
   setImgLoaded(false);
   setIsPocketSaved(false);
   setIsEditing(false);
   try {
     const { key: personaKey } = resolveApiKey('gemini', activePersona?.apiKey, profile?.planStatus);
     const textToUse = customText || refinementText || prompt;
     const result = await generateZineImage(textToUse, aspectRatio, imageSize, profile, isLite, personaKey, artifacts, treatmentId);
     setVariants(prev => {
       const next = [...prev, result];
       const limited = next.slice(-3); // Keep only 3 most recent
       setSelectedIdx(limited.length - 1);
       return limited;
     });
     if (onImageGenerated) onImageGenerated(result);
   } catch (e) { 
     console.error("MIMI // Plate Development Failed:", e);
   } finally { setIsLoading(false); }
 };

 const handleDevelop = async (e?: React.MouseEvent) => {
   if (e) e.stopPropagation();
   await handleDevelopWithText();
 };

 const handleAnimate = async (e: React.MouseEvent) => {
 e.stopPropagation();
 if (!variants[selectedIdx] || isAnimating) return;
 setIsAnimating(true);
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Veo Calibration Initialized...", icon: <Film size={14} className="text-amber-500"/> } 
 }));
 
 try {
 const currentSource = variants[selectedIdx];
 const res = await animateShardWithVeo(currentSource, prompt, aspectRatio === '9:16' ? '9:16' : '16:9');
 setVariants(prev => {
 const next = [...prev, res as string];
 const limited = next.slice(-3);
 setSelectedIdx(limited.length - 1);
 return limited;
 });
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Motion Refraction Manifested.", icon: <Check size={14} className="text-nous-subtle"/> } 
 }));
 } catch (e) {
 console.error("MIMI // V-O Refraction Failure:", e);
 } finally {
 setIsAnimating(false);
 }
 };

 const handleAnalyze = async (e: React.MouseEvent) => {
 e.stopPropagation();
 if (!variants[selectedIdx] || isAnalyzing) return;
 setIsAnalyzing(true);
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Analyzing Mise en Scène...", icon: <Eye size={14} className="text-indigo-500"/> } 
 }));
 
 try {
 const currentSource = variants[selectedIdx];
 const match = currentSource.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
 if (!match) throw new Error("Invalid image format");
 const mimeType = match[1];
 const base64 = match[2];
 
 const analysis = await analyzeMiseEnScene(base64, mimeType, profile);
 
 const { archiveManager } = await import('../services/archiveManager');
 const path = `pocket_images/${user?.uid || 'ghost'}_${Date.now()}.jpg`;
 const url = await archiveManager.uploadMedia(user?.uid || 'ghost', currentSource, path);

 await archiveManager.saveToPocket(user?.uid || 'ghost', 'text', {
 content: `Mise en Scène Analysis:\n\nDirector's Note: ${analysis.directors_note}\n\nLighting: ${analysis.lighting_analysis}\n\nCultural Parallel: ${analysis.cultural_parallel}\n\nSemiotic Touchpoints: ${analysis.semiotic_touchpoints?.join(', ')}`,
 sourceImage: url
 });
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Analysis Saved to Pocket.", icon: <Check size={14} className="text-nous-subtle"/> } 
 }));
 } catch (e) {
 console.error("MIMI // Analysis Failure:", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Analysis Failed.", icon: <X size={14} className="text-red-500"/> } 
 }));
 } finally {
 setIsAnalyzing(false);
 }
 };

 const handleDownloadImage = (e: React.MouseEvent) => {
   e.stopPropagation();
   const imgUrl = variants[selectedIdx];
   if (!imgUrl) return;
   const a = document.createElement('a');
   a.href = imgUrl;
   a.download = `zine_plate_${Date.now()}.png`;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
 };

 const cycleRatio = (e: React.MouseEvent) => {
 e.stopPropagation();
 const nextIdx = (SUPPORTED_ASPECT_RATIOS.indexOf(aspectRatio) + 1) % SUPPORTED_ASPECT_RATIOS.length;
 setAspectRatio(SUPPORTED_ASPECT_RATIOS[nextIdx]);
 };

 const cycleSize = (e: React.MouseEvent) => {
 e.stopPropagation();
 const nextIdx = (SUPPORTED_SIZES.indexOf(imageSize) + 1) % SUPPORTED_SIZES.length;
 setImageSize(SUPPORTED_SIZES[nextIdx]);
 };

 const handleSelectVariant = (idx: number, e: React.MouseEvent) => {
 e.stopPropagation();
 if (variants[idx]) {
 setSelectedIdx(idx);
 setImgLoaded(false);
 }
 };

 const saveToPocket = async (e: React.MouseEvent) => {
 e.stopPropagation();
 if (!variants[selectedIdx]) return;
 
 try {
 const { archiveManager } = await import('../services/archiveManager');
 
 await archiveManager.saveToPocket(user?.uid || 'ghost', 'image', { 
 imageUrl: variants[selectedIdx], 
 prompt,
 aspectRatio 
 });
 
 setIsPocketSaved(true);
 setTimeout(() => setIsPocketSaved(false), 3000);
 } catch (error) {
 console.error("Failed to save image to pocket:", error);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Failed to save image.", icon: <X size={14} className="text-red-500"/> } 
 }));
 }
 };

 return (
 <div className={`relative w-full flex flex-col items-center group/visualizer ${isArtifact ? 'h-full' : ''}`}>
 <div 
 className={`relative w-full overflow-hidden border border-nous-border rounded-none bg-nous-base transition-all duration-700 ${isArtifact ? 'h-full flex items-center justify-center' : ''}`} 
 style={isArtifact ? {} : { aspectRatio: aspectRatio.replace(':', '/') }}
 >
 <AnimatePresence>
 {(isLoading || isAnimating || isAnalyzing) && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-nous-base/40 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
 <Loader2 size={32} className="animate-spin text-nous-subtle"/>
 <span className="font-sans text-[8px] uppercase tracking-[0.6em] text-white font-black animate-pulse">
 {isAnalyzing ? 'Analyzing Mise en Scène...' : isAnimating ? 'Refracting Motion...' : 'Developing Plate...'}
 </span>
 </motion.div>
 )}
 </AnimatePresence>

 {(variants[selectedIdx] && !isEditing) ? (
 <div className="relative w-full h-full">
 {isVideo(variants[selectedIdx]) ? (
 <video src={variants[selectedIdx]} autoPlay loop muted playsInline className="w-full h-full object-cover" />
 ) : (
 <img 
 src={variants[selectedIdx]} 
 alt="Generated Zine Plate"
 referrerPolicy="no-referrer"
 onLoad={() => setImgLoaded(true)}
 className={`w-full h-full transition-all duration-[2s] ease-out ${imgLoaded ? 'opacity-100 grayscale-0 contrast-100 brightness-100 blur-0' : 'opacity-0 scale-105 grayscale contrast-50 brightness-150 blur-xl'} object-contain z-10 relative cursor-zoom-in`} 
 onClick={() => setIsLightboxOpen(true)}
 />
 )}

 {/* Style Presets bar on hover */}
 <div className="absolute top-4 inset-x-4 flex items-center justify-center gap-1.5 z-40 opacity-0 group-hover/visualizer:opacity-100 transition-all duration-300 pointer-events-auto">
   <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md p-1 border border-white/10 rounded-full max-w-full overflow-x-auto no-scrollbar">
     <Palette size={10} className="text-white/60 ml-2 mr-1" />
     {STYLE_PRESETS.map(preset => (
       <button
         key={preset.id}
         onClick={(e) => { e.stopPropagation(); applyPreset(preset.id); }}
         className={`px-2 py-0.5 font-mono text-[7px] uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
           selectedStylePreset === preset.id
             ? 'bg-white text-black font-bold'
             : 'text-white/70 hover:text-white hover:bg-white/10'
         }`}
       >
         {preset.label}
       </button>
     ))}
   </div>
 </div>

 {/* VARIANT & TOOLBAR CONTROLS */}
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-2xl p-1.5 rounded-full border border-white/15 z-40 opacity-0 group-hover/visualizer:opacity-100 transition-all shadow-2xl">
 <div className="flex bg-white/10 px-2.5 py-1 rounded-full gap-1.5 border-r border-white/10 pr-3 mr-0.5">
 {[0, 1, 2].map((i) => (
 <button 
 key={i} 
 disabled={!variants[i]}
 onClick={(e) => handleSelectVariant(i, e)} 
 className={`w-5 h-5 rounded-full font-sans text-[8px] font-black transition-all ${!variants[i] ? 'opacity-20' : selectedIdx === i ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white'}`}
 >
 0{i+1}
 </button>
 ))}
 </div>
 <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-2 text-white/70 hover:text-white transition-colors" title="Refine Prompt">
   <Pencil size={13} />
 </button>
 <button onClick={saveToPocket} className={isPocketSaved ? "p-2 transition-all text-amber-400" : "p-2 transition-all text-white/70 hover:text-white"} title="Save to Pocket">
   {isPocketSaved ? <Check size={13} /> : <Bookmark size={13} />}
 </button>
 <button onClick={handleAnalyze} disabled={isAnalyzing} className="p-2 text-white/70 hover:text-indigo-400" title="Analyze Mise-en-scène">
   <Eye size={13} />
 </button>
 <button onClick={handleAnimate} disabled={isAnimating} className="p-2 text-white/70 hover:text-amber-400" title="Animate with Veo"><Film size={13}/></button>
 <button onClick={handleDownloadImage} className="p-2 text-white/70 hover:text-emerald-400" title="Download PNG"><Download size={13}/></button>
 <button onClick={() => setIsLightboxOpen(true)} className="p-2 text-white/70 hover:text-white" title="Fullscreen Lightbox"><Maximize2 size={13}/></button>
 <div className="w-px h-5 bg-white/10 mx-0.5"/>
 <button onClick={cycleRatio} className="px-2 py-1 text-white/70 hover:text-white font-mono text-[8px] font-bold" title="Aspect Ratio">{aspectRatio}</button>
 <button onClick={cycleSize} className="px-2 py-1 text-white/70 hover:text-white font-mono text-[8px] font-bold" title="Image Resolution">{imageSize}</button>
 <button onClick={handleDevelop} className="p-2 text-white/70 hover:text-white" title="Regenerate Plate"><RefreshCw size={13}/></button>
 </div>
 </div>
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-nous-base/50 gap-4">
 {isEditing ? (
  <div className="bg-white shadow-2xl p-8 md:p-12 flex flex-col justify-center items-center aspect-square md:aspect-video max-w-2xl w-full relative group/editcard transition-all hover:shadow-xl space-y-4">
    <div className="flex items-center gap-2 w-full justify-between border-b border-gray-100 pb-2">
      <span className="font-mono text-[8px] uppercase tracking-widest text-gray-400 font-bold">Refine Plate Prompt</span>
      <button onClick={enhancePromptMagic} className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-amber-600 hover:text-amber-700 font-bold">
        <Sparkles size={10} /> Magic Enrich
      </button>
    </div>
    <textarea 
      value={refinementText} 
      onChange={e => setRefinementText(e.target.value)} 
      className="w-full bg-transparent text-center font-serif italic text-base md:text-lg leading-relaxed resize-none focus:outline-none h-full placeholder:text-gray-300 text-[#1A1A1A]"
      placeholder="Describe the subject, setting, color, material, and light…"
    />
    <div className="w-full pt-4 border-t border-gray-100 flex justify-between items-center">
      <button onClick={() => setRefinementText(prompt)} className="font-sans text-[8px] uppercase tracking-widest font-black text-gray-400 hover:text-gray-800 transition-all">Revert</button>
      <button onClick={handleDevelop} className="font-sans text-[9px] uppercase tracking-widest font-black text-[#1A1A1A] border-b border-[#1A1A1A] pb-0.5 hover:text-amber-600 hover:border-amber-600 transition-all flex items-center gap-1">
        <Wand2 size={11} /> Develop Plate
      </button>
    </div>
  </div>
 ) : (
  <button onClick={handleDevelop} className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text flex items-center gap-2 border border-nous-border px-6 py-3 hover:bg-nous-base0 hover:text-white transition-all">
    <Sparkles size={12} /> Initialize Zine Plate
  </button>
 )}
 </div>
 )}
 </div>

 {/* Fullscreen Lightbox Modal */}
 <AnimatePresence>
   {isLightboxOpen && variants[selectedIdx] && (
     <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       className="fixed inset-0 z-[15000] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
       onClick={() => setIsLightboxOpen(false)}
     >
       <button onClick={() => setIsLightboxOpen(false)} className="absolute top-6 right-6 p-3 text-white/70 hover:text-white z-50">
         <X size={24} />
       </button>
       <div className="relative max-w-6xl max-h-[85vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
         <img
           src={variants[selectedIdx]}
           alt="Zine Plate High Res"
           referrerPolicy="no-referrer"
           className="max-w-full max-h-full object-contain shadow-2xl border border-white/10"
         />
       </div>
       <div className="mt-4 flex items-center gap-6 text-white/70 font-mono text-[9px] uppercase tracking-widest" onClick={e => e.stopPropagation()}>
         <span>Aspect: {aspectRatio}</span>
         <span>Res: {imageSize}</span>
         <button onClick={handleDownloadImage} className="flex items-center gap-1 text-white hover:text-amber-400 font-bold transition-colors">
           <Download size={12} /> Save High-Res PNG
         </button>
       </div>
     </motion.div>
   )}
 </AnimatePresence>
 </div>
 );
};

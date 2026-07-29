import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Image as ImageIcon, Loader2, Play, Sparkles, Upload, X, Terminal, Eye, Sliders, Zap, Check } from 'lucide-react';
import { getClient } from '../services/geminiClient';
import { GoogleGenAI } from '@google/genai';
import { modelFor } from '../services/modelConfig';

interface CatalystData {
 url: string;
 base64: string;
 mimeType: string;
}

export const DarkroomGeneration: React.FC = () => {
 const [prompt, setPrompt] = useState('');
 const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
 const [generationType, setGenerationType] = useState<'video' | 'image' | 'anime'>('video');
 const [isGenerating, setIsGenerating] = useState(false);
 const [resultUrl, setResultUrl] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 // Instant Filter Preview State
 const [instantPreviewActive, setInstantPreviewActive] = useState(true);
 const [selectedFilter, setSelectedFilter] = useState<'noir' | 'analog' | 'cyber' | 'amber' | 'sepia' | 'halftone'>('analog');
 const [grainIntensity, setGrainIntensity] = useState(40);
 const [contrastBoost, setContrastBoost] = useState(30);

 const getFilterStyle = (): React.CSSProperties => {
  if (!instantPreviewActive) return {};
  const contrastVal = 100 + contrastBoost * 0.8;
  switch (selectedFilter) {
   case 'noir':
    return { filter: `grayscale(100%) contrast(${contrastVal}%) brightness(90%)` };
   case 'analog':
    return { filter: `sepia(35%) contrast(${contrastVal}%) saturate(120%) hue-rotate(-10deg)` };
   case 'cyber':
    return { filter: `invert(15%) hue-rotate(180deg) contrast(${contrastVal + 15}%) saturate(180%)` };
   case 'amber':
    return { filter: `sepia(85%) saturate(300%) hue-rotate(15deg) contrast(${contrastVal}%)` };
   case 'sepia':
    return { filter: `sepia(90%) contrast(${contrastVal - 10}%) brightness(95%)` };
   case 'halftone':
    return { filter: `grayscale(100%) contrast(${contrastVal + 40}%) brightness(110%)` };
   default:
    return {};
  }
 };

 // Stage 01 State
 const [dragActive, setDragActive] = useState(false);
 const [catalyst, setCatalyst] = useState<CatalystData | null>(null);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [analysisData, setAnalysisData] = useState<any>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 // Terminal Logs
 const [logs, setLogs] = useState<string[]>([]);

 const addLog = (msg: string) => {
 setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${msg}`]);
 };

 const handleDrag = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.type ==="dragenter"|| e.type ==="dragover") {
 setDragActive(true);
 } else if (e.type ==="dragleave") {
 setDragActive(false);
 }
 };

 const analyzeCatalyst = async (base64: string, mimeType: string) => {
 setIsAnalyzing(true);
 setAnalysisData(null);
 addLog("INGESTING CATALYST ARTIFACT...");
 
 try {
 const { ai } = getClient();
 const analysisPrompt = `Analyze this image and provide the following data in JSON format:
 1. palette: An array of 4 dominant hex color codes.
 2. dof: Estimated depth of field (e.g.,"f/2.8 (SHALLOW)","f/8 (DEEP)").
 3. contrast: Estimated contrast ratio (e.g.,"HIGH (12:1)","LOW (3:1)").
 4. luminance: Overall luminance description (e.g.,"LOW-KEY","HIGH-KEY","MID-TONE").
 Return ONLY valid JSON.`;

 addLog("EXTRACTING CHROMATIC SIGNATURE...");
 addLog("CALCULATING DEPTH OF FIELD...");
 addLog("ANALYZING CONTRAST RATIOS...");

 const response = await ai.models.generateContent({
 model: modelFor('textFast', 'gemini'),
 contents: {
 parts: [
 { inlineData: { data: base64, mimeType } },
 { text: analysisPrompt }
 ]
 },
 config: {
 responseMimeType: 'application/json'
 }
 });

 if (response.text) {
 const data = JSON.parse(response.text);
 setAnalysisData(data);
 addLog("CATALYST ANALYSIS COMPLETE.");
 }
 } catch (err) {
 console.error("Analysis error:", err);
 addLog("ANALYSIS FAILED. USING FALLBACK DATA.");
 setAnalysisData({
 palette: ['#1A1A1A', '#E5E5E5', '#8C8C8C', '#404040'],
 dof: 'f/2.8 (SHALLOW)',
 contrast: 'HIGH (12:1)',
 luminance: 'LOW-KEY'
 });
 } finally {
 setIsAnalyzing(false);
 }
 };

 const processFile = (file: File) => {
 if (!file.type.startsWith('image/')) {
 setError("Only images can be used as catalysts.");
 return;
 }
 setError(null);
 const reader = new FileReader();
 reader.onload = (e) => {
 const result = e.target?.result as string;
 const base64 = result.split(',')[1];
 setCatalyst({ url: result, base64, mimeType: file.type });
 analyzeCatalyst(base64, file.type);
 };
 reader.onerror = (e) => console.error("MIMI // FileReader error", e);
 reader.readAsDataURL(file);
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setDragActive(false);
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 processFile(e.dataTransfer.files[0]);
 }
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 e.preventDefault();
 if (e.target.files && e.target.files[0]) {
 processFile(e.target.files[0]);
 }
 };

 const handleGenerate = async () => {
 if (!prompt) return;
 setIsGenerating(true);
 setError(null);
 setResultUrl(null);
 setLogs([]);
 addLog("INITIALIZING SYNTHESIS PROTOCOL...");

 try {
 const { ai, keyUsed } = getClient();
 
 if (generationType === 'video') {
 addLog("ALLOCATING VEO-3.1-FAST COMPUTE...");
 
 const videoParams: any = {
 model: modelFor('video', 'gemini'),
 prompt: prompt,
 config: {
 numberOfVideos: 1,
 resolution: '720p',
 aspectRatio: aspectRatio === '1:1' ? '16:9' : aspectRatio
 }
 };

 if (catalyst) {
 addLog("INJECTING CATALYST IMAGE DATA...");
 videoParams.image = {
 imageBytes: catalyst.base64,
 mimeType: catalyst.mimeType
 };
 }

 let operation = await ai.models.generateVideos(videoParams);
 addLog("SYNTHESIS IN PROGRESS. AWAITING RENDER...");

 while (!operation.done) {
 await new Promise(resolve => setTimeout(resolve, 10000));
 operation = await ai.operations.getVideosOperation({ operation: operation });
 addLog("POLLING RENDER STATUS... [ACTIVE]");
 }

 const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
 if (downloadLink) {
 addLog("FETCHING VIDEO BLOB...");
 const response = await fetch(downloadLink, {
 method: 'GET',
 headers: {
 'x-goog-api-key': keyUsed,
 },
 });
 const blob = await response.blob();
 const videoUrl = URL.createObjectURL(blob);
 setResultUrl(videoUrl);
 addLog("RENDER COMPLETE. OUTPUT VAT READY.");
 } else {
 throw new Error("Failed to get video URL");
 }
 } else {
 // Image or Anime
 addLog("ALLOCATING GEMINI IMAGE COMPUTE...");
 const model = modelFor('image', 'gemini');
 const finalPrompt = generationType === 'anime' ? `Anime style, high quality, masterpiece: ${prompt}` : prompt;
 
 let contents: any = {
 parts: [
 { text: finalPrompt }
 ]
 };
 
 if (catalyst) {
 addLog("INJECTING CATALYST IMAGE DATA...");
 contents = {
 parts: [
 { inlineData: { data: catalyst.base64, mimeType: catalyst.mimeType } },
 { text: finalPrompt }
 ]
 };
 }

         const response = await ai.models.generateContent({
 model,
 contents,
 config: {
 imageConfig: {
 aspectRatio: aspectRatio as any,
 imageSize: '1K'
 }
 }
 });

 let imageBytes = null;
 let mimeType = "image/png";
 for (const part of response.candidates[0].content.parts) {
 if (part.inlineData) {
 imageBytes = part.inlineData.data;
 mimeType = part.inlineData.mimeType || "image/png";
 break;
 }
 }

 if (imageBytes) {
 setResultUrl(`data:${mimeType};base64,${imageBytes}`);
 addLog("RENDER COMPLETE. OUTPUT VAT READY.");
 } else {
 throw new Error("Failed to generate image");
 }
 }
 } catch (err: any) {
 console.error("Generation error:", err);
 setError(err.message ||"Failed to generate content.");
 addLog(`ERR: ${err.message ||"SYNTHESIS FAILED"}`);
 } finally {
 setIsGenerating(false);
 }
 };

 return (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
 {/* LEFT COLUMN: STAGES 01 & 02 */}
 <div className="lg:col-span-4 space-y-12">
 
 {/* STAGE 01: CATALYST INGESTION */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-4 border-b border-nous-text/10 dark:border-nous-base/10 pb-4">
 <h2 className="text-3xl font-serif italic text tracking-tight luminescent-text animate-crt">Stage 01 // Catalyst Ingestion</h2>
 {catalyst && (
 <button onClick={() => { setCatalyst(null); setAnalysisData(null); }} className="ml-auto text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50 hover:text transition-colors flex items-center gap-1">
 <X size={12} /> Clear
 </button>
 )}
 </div>

 {!catalyst ? (
 <div 
 className={`border border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 aspect-video cursor-pointer
 ${dragActive ? 'border-nous-text/50 dark:border-nous-base/50 bg-nous-text/5 dark:bg-nous-base/5' : 'border-nous-text/20 dark:border-nous-base/20 hover:border-nous-text/40 dark:border-nous-base/40 hover:bg-nous-text/5 dark:bg-nous-base/5'}`}
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 >
 <input ref={fileInputRef} type="file"accept="image/*"className="hidden"onChange={handleChange} />
 <Upload size={20} className={`mb-3 ${dragActive ? 'text' : 'text-nous-text/50 dark:text-nous-base/50'}`} />
 <p className="text-[10px] uppercase tracking-[0.2em] text-nous-text/70 dark:text-nous-base/70 text-center">Drop Reference Artifact</p>
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-4">
 <div className="relative aspect-square bg-black border border-nous-text/20 dark:border-nous-base/20 overflow-hidden">
 <img src={catalyst.url} alt="Catalyst" style={getFilterStyle()} className={`w-full h-full object-cover transition-all duration-300 ${isAnalyzing ? 'grayscale contrast-150 brightness-75' : ''}`} />
 {instantPreviewActive && (
 <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 border border-amber-400/50 text-[7px] font-mono uppercase tracking-widest text-amber-300 font-bold z-10 flex items-center gap-1">
 <Zap size={8} /> {selectedFilter.toUpperCase()} PREVIEW
 </div>
 )}
 {isAnalyzing && (
 <div className="absolute inset-0 pointer-events-none">
 <div className="absolute inset-0 bg-nous-text/10 dark:bg-nous-base/10 mix-blend-overlay"/>
 <motion.div 
 animate={{ top: ['0%', '100%', '0%'] }} 
 transition={{ duration: 2, repeat: Infinity, ease:"linear"}}
 className="absolute left-0 right-0 h-[1px] bg-nous-text/50 dark:bg-nous-base/50"
 />
 </div>
 )}
 </div>
 <div className="flex flex-col justify-center space-y-3">
 {isAnalyzing ? (
 <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50">
 <Loader2 size={12} className="animate-spin"/>
 <span>Analyzing...</span>
 </div>
 ) : analysisData ? (
 <div className="space-y-3 text-[9px] uppercase tracking-[0.15em] font-mono text-nous-text/70 dark:text-nous-base/70">
 <div>
 <span className="text-nous-text/40 dark:text-nous-base/40 block mb-1">Palette</span>
 <div className="flex gap-1">
 {analysisData.palette?.map((color: string, i: number) => (
 <div key={i} className="w-4 h-4 border border-nous-text/20 dark:border-nous-base/20"style={{ backgroundColor: color }} />
 ))}
 </div>
 </div>
 <div>
 <span className="text-nous-text/40 dark:text-nous-base/40 block">DOF</span>
 <span>{analysisData.dof}</span>
 </div>
 <div>
 <span className="text-nous-text/40 dark:text-nous-base/40 block">Contrast</span>
 <span>{analysisData.contrast}</span>
 </div>
 </div>
 ) : null}
 </div>
 </div>
 )}
 </div>

 {/* INSTANT FILTER PREVIEW CONTROL PANEL */}
 <div className="border border-nous-text/20 dark:border-nous-base/20 bg-[#FAF9F6] dark:bg-[#11110F] p-4 space-y-4 shadow-sm">
  <div className="flex items-center justify-between border-b border-nous-text/10 dark:border-nous-base/10 pb-3">
   <div className="flex items-center gap-2">
    <Eye size={14} className="text-amber-600 dark:text-amber-400" />
    <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-nous-text dark:text-nous-base">
     Instant Filter Refraction Preview
    </span>
   </div>
   <div className="flex items-center gap-3">
    <span className="text-[8px] uppercase tracking-widest font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 font-bold flex items-center gap-1">
     <Zap size={10} /> 100% Tokens Saved
    </span>
    <button
     onClick={() => setInstantPreviewActive(!instantPreviewActive)}
     className={`px-2.5 py-1 text-[8px] uppercase font-mono tracking-widest border transition-colors cursor-pointer ${
      instantPreviewActive ? 'bg-amber-400/10 text-amber-700 dark:text-amber-300 font-bold border-amber-500/50 dark:border-amber-400/40' : 'text-nous-text/40 border-nous-text/20'
     }`}
    >
     {instantPreviewActive ? '[ PREVIEW ON ]' : '[ PREVIEW OFF ]'}
    </button>
   </div>
  </div>

  {instantPreviewActive && (
   <div className="space-y-4">
    <div>
     <span className="text-[8.5px] uppercase font-mono tracking-widest text-nous-text/50 dark:text-nous-base/50 block mb-2">
      Select Style Filter Preset
     </span>
     <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-[8px] uppercase tracking-widest">
      {[
       { id: 'noir', label: 'Noir' },
       { id: 'analog', label: '35mm Analog' },
       { id: 'cyber', label: 'Cyber Cyan' },
       { id: 'amber', label: 'Solenoid' },
       { id: 'sepia', label: 'Archive Sepia' },
       { id: 'halftone', label: 'Halftone' },
      ].map((filter) => (
       <button
        key={filter.id}
        onClick={() => setSelectedFilter(filter.id as any)}
        className={`py-1.5 px-2 text-center border transition-all cursor-pointer ${
         selectedFilter === filter.id
          ? 'border-amber-500 bg-amber-400/10 text-amber-700 dark:border-amber-400 dark:text-amber-300 font-bold'
          : 'border-nous-text/20 dark:border-nous-base/20 text-nous-text/60 dark:text-nous-base/60 hover:border-nous-text/40'
        }`}
       >
        {filter.label}
       </button>
      ))}
     </div>
    </div>

    <div className="grid grid-cols-2 gap-4 pt-1">
     <div className="space-y-1">
      <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50">
       <span>Grain Density</span>
       <span>{grainIntensity}%</span>
      </div>
      <input
       type="range"
       min="0"
       max="100"
       value={grainIntensity}
       onChange={(e) => setGrainIntensity(Number(e.target.value))}
       className="w-full accent-amber-400 h-1 bg-nous-text/20 rounded-none cursor-pointer"
      />
     </div>

     <div className="space-y-1">
      <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50">
       <span>Contrast Refraction</span>
       <span>+{contrastBoost}%</span>
      </div>
      <input
       type="range"
       min="0"
       max="100"
       value={contrastBoost}
       onChange={(e) => setContrastBoost(Number(e.target.value))}
       className="w-full accent-amber-400 h-1 bg-nous-text/20 rounded-none cursor-pointer"
      />
     </div>
    </div>
   </div>
  )}
 </div>

 {/* STAGE 02: SYNTHESIS DIRECTIVES */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-4 border-b border-nous-text/10 dark:border-nous-base/10 pb-4">
 <h2 className="text-3xl font-serif italic text tracking-tight">Stage 02 // Synthesis Directives</h2>
 </div>

 <div className="space-y-4">
 <div>
 <h3 className="text-[9px] uppercase tracking-[0.2em] text-nous-text/50 dark:text-nous-base/50 mb-2 font-mono">Narrative Parameters</h3>
 <div className="relative">
 <div className="absolute top-3 left-3 text-nous-text/30 dark:text-nous-base/30 font-mono text-xs">{'>'}</div>
 <textarea 
 value={prompt}
 onChange={(e) => setPrompt(e.target.value)}
 placeholder="Enter synthesis directives..."
 className="w-full bg border border-nous-text/20 dark:border-nous-base/20 p-3 pl-8 font-mono text-xs text focus:outline-none focus:border-nous-text/50 dark:border-nous-base/50 min-h-[120px] resize-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <h3 className="text-[9px] uppercase tracking-[0.2em] text-nous-text/50 dark:text-nous-base/50 mb-2 font-mono">Mode</h3>
 <div className="flex border border-nous-text/20 dark:border-nous-base/20 bg">
 <button 
 onClick={() => setGenerationType('video')}
 className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest transition-colors ${generationType === 'video' ? 'bg-nous-text/10 dark:bg-nous-base/10 text' : 'text-nous-text/50 dark:text-nous-base/50 hover:bg-nous-text/5 dark:bg-nous-base/5'}`}
 >
 Video
 </button>
 <div className="w-px bg-nous-text/20 dark:bg-nous-base/20"/>
 <button 
 onClick={() => setGenerationType('image')}
 className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest transition-colors ${generationType === 'image' ? 'bg-nous-text/10 dark:bg-nous-base/10 text' : 'text-nous-text/50 dark:text-nous-base/50 hover:bg-nous-text/5 dark:bg-nous-base/5'}`}
 >
 Image
 </button>
 <div className="w-px bg-nous-text/20 dark:bg-nous-base/20"/>
 <button 
 onClick={() => setGenerationType('anime')}
 className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest transition-colors ${generationType === 'anime' ? 'bg-nous-text/10 dark:bg-nous-base/10 text' : 'text-nous-text/50 dark:text-nous-base/50 hover:bg-nous-text/5 dark:bg-nous-base/5'}`}
 >
 Anime
 </button>
 </div>
 </div>

 <div>
 <h3 className="text-[9px] uppercase tracking-[0.2em] text-nous-text/50 dark:text-nous-base/50 mb-2 font-mono">Frame Boundaries</h3>
 <div className="flex border border-nous-text/20 dark:border-nous-base/20 bg">
 <button 
 onClick={() => setAspectRatio('16:9')}
 className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest transition-colors ${aspectRatio === '16:9' ? 'bg-nous-text/10 dark:bg-nous-base/10 text' : 'text-nous-text/50 dark:text-nous-base/50 hover:bg-nous-text/5 dark:bg-nous-base/5'}`}
 >
 16:9
 </button>
 <div className="w-px bg-nous-text/20 dark:bg-nous-base/20"/>
 <button 
 onClick={() => setAspectRatio('9:16')}
 className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest transition-colors ${aspectRatio === '9:16' ? 'bg-nous-text/10 dark:bg-nous-base/10 text' : 'text-nous-text/50 dark:text-nous-base/50 hover:bg-nous-text/5 dark:bg-nous-base/5'}`}
 >
 9:16
 </button>
 <div className="w-px bg-nous-text/20 dark:bg-nous-base/20"/>
 <button 
 onClick={() => setAspectRatio('1:1')}
 disabled={generationType === 'video'}
 className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${aspectRatio === '1:1' ? 'bg-nous-text/10 dark:bg-nous-base/10 text' : 'text-nous-text/50 dark:text-nous-base/50 hover:bg-nous-text/5 dark:bg-nous-base/5'}`}
 >
 1:1
 </button>
 </div>
 </div>
 </div>

 <div className="pt-6">
 <button 
 onClick={handleGenerate}
 disabled={isGenerating || !prompt}
 className={`w-full py-3 text-[10px] uppercase tracking-[0.3em] font-bold transition-all flex items-center justify-center gap-2 border
 ${isGenerating || !prompt ? 'border-nous-text/10 dark:border-nous-base/10 text-nous-text/30 dark:text-nous-base/30 cursor-not-allowed' : 'border-nous-text/50 dark:border-nous-base/50 text hover:bg-nous-text/10 dark:bg-nous-base/10'}`}
 >
 {isGenerating ? (
 <><Loader2 size={14} className="animate-spin"/> SYNTHESIZING...</>
 ) : (
 <>[ INITIALIZE SYNTHESIS ]</>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* RIGHT COLUMN: STAGE 03 */}
 <div className="lg:col-span-8 space-y-6 flex flex-col">
 <div className="flex items-center gap-3 mb-4 border-b border-nous-text/10 dark:border-nous-base/10 pb-4">
 <h2 className="text-3xl font-serif italic text tracking-tight">Stage 03 // The Output Vat</h2>
 </div>

 <div className="flex-1 min-h-[600px] border border-nous-text/20 dark:border-nous-base/20 bg relative flex flex-col overflow-hidden">
 
 {/* Background Grid / CRT Effect */}
 <div className="absolute inset-0 pointer-events-none opacity-20"
 style={{ backgroundImage: 'radial-gradient(#F2F1ED 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
 <div className="absolute inset-0 pointer-events-none bg bg-[length:100%_4px]"/>

 {error && (
 <div className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center bg-red-950/20 backdrop-blur-sm">
 <p className="text-red-400 font-mono text-xs uppercase tracking-widest">{error}</p>
 </div>
 )}

 {!isGenerating && !resultUrl && !error && (
 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-8">
 {prompt ? (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-4 max-w-md"
 >
 <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-nous-text/40 dark:text-nous-base/40">Latent Directive</p>
 <h3 className="font-serif italic text-2xl text-nous-text/80 dark:text-nous-base/80 leading-tight tracking-tight">
 "{prompt}"
 </h3>
 <div className="w-12 h-px bg-nous-text/20 dark:bg-nous-base/20 mx-auto mt-6" />
 <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-nous-text/30 dark:text-nous-base/30 mt-4">
 [ Ready for Synthesis ]
 </p>
 </motion.div>
 ) : (
 <div className="text-nous-text/30 dark:text-nous-base/30 font-mono text-[10px] uppercase tracking-[0.3em]">
 [ VAT INACTIVE // AWAITING DIRECTIVES ]
 </div>
 )}
 </div>
 )}

 {resultUrl && !isGenerating && (
 <motion.div 
 initial={{ opacity: 0, scale: 0.98 }}
 animate={{ opacity: 1, scale: 1 }}
 className="absolute inset-0 z-10 flex items-center justify-center p-8"
 >
 {generationType === 'video' ? (
 <video 
 src={resultUrl} 
 controls 
 autoPlay 
 loop 
 style={getFilterStyle()}
 className="max-w-full max-h-full object-contain border border-nous-text/20 dark:border-nous-base/20 transition-all duration-300"
 />
 ) : (
 <img 
 src={resultUrl} 
 alt="Generated Artifact"
 style={getFilterStyle()}
 className="max-w-full max-h-full object-contain border border-nous-text/20 dark:border-nous-base/20 transition-all duration-300"
 />
 )}
 </motion.div>
 )}

 {/* Terminal Logs Overlay */}
 <div className="absolute bottom-0 left-0 right-0 p-4 z-20 pointer-events-none">
 <div className="max-w-xl space-y-1">
 <AnimatePresence>
 {logs.map((log, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0 }}
 className="font-mono text-[9px] text-nous-text/60 dark:text-nous-base/60 uppercase tracking-widest"
 >
 {log}
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 </div>

 </div>
 </div>
 </div>
 );
};

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Save, Beaker, ScanLine, Activity, Layers, Check, Sparkles, Image as ImageIcon, ToggleLeft, ToggleRight, Link as LinkIcon, Globe, Loader2 } from 'lucide-react';
import { resolveApiKey } from '../services/apiKeyService';
import { useUser } from '../contexts/UserContext';
import { analyzeCanonicalTaste, applyAestheticRefraction, analyzePinterestBoard } from '../services/geminiService';
import { StyleTreatment, CanonicalTasteObject } from '../types';
import { DarkroomGeneration } from './DarkroomGeneration';
import { DarkroomTranscription } from './DarkroomTranscription';
import { mirrorDarkroomTreatmentToEvidenceAtom } from '../services/taste/mirrorDarkroomToEvidenceAtom';

import { TranslationTerminal } from './TranslationTerminal';

type DarkroomMode = 'extract' | 'batch' | 'generation' | 'transcription' | 'translation';

interface BatchImage {
 id: string;
 url: string;
 base64: string;
 mimeType: string;
 status: 'pending' | 'processing' | 'done' | 'error';
 resultUrl?: string;
 error?: string;
}

export const DarkroomView: React.FC = () => {
 const { user, profile, updateProfile, activePersona } = useUser();
 const [mode, setMode] = useState<DarkroomMode>('generation');
 const [safelight, setSafelight] = useState(false);
 
 // Extraction State
 const [dragActive, setDragActive] = useState(false);
 const [uploadedImage, setUploadedImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
 const [isExtracting, setIsExtracting] = useState(false);
 const [treatment, setTreatment] = useState<CanonicalTasteObject | null>(null);
 const [treatmentName, setTreatmentName] = useState<string>('');
 const [isSaved, setIsSaved] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 // Web/Pinterest Board Extraction State
 const [boardUrl, setBoardUrl] = useState<string>('');
 const [isFetchingBoard, setIsFetchingBoard] = useState(false);
 const [boardTitle, setBoardTitle] = useState<string>('');
 const [boardPins, setBoardPins] = useState<Array<{ id?: string; src: string; alt?: string; url?: string }>>([]);
 const [boardPreviewWarning, setBoardPreviewWarning] = useState<string>('');
 const [boardAnalysis, setBoardAnalysis] = useState<any | null>(null);
 const [analysisSubTab, setAnalysisSubTab] = useState<'report' | 'variables'>('report');

 // Batch State
 const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
 const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
 const [isBatchProcessing, setIsBatchProcessing] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const batchInputRef = useRef<HTMLInputElement>(null);

 // --- Extraction Handlers ---
 const handleDrag = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.type ==="dragenter"|| e.type ==="dragover") {
 setDragActive(true);
 } else if (e.type ==="dragleave") {
 setDragActive(false);
 }
 };

 const processFile = (file: File) => {
 if (!file.type.startsWith('image/')) {
 setError("Only images can be processed in the darkroom.");
 return;
 }
 setError(null);
 const reader = new FileReader();
 reader.onload = (e) => {
 const result = e.target?.result as string;
 const base64 = result.split(',')[1];
 setUploadedImage({ url: result, base64, mimeType: file.type });
 setTreatment(null);
 setIsSaved(false);
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

 const handleExtraction = async () => {
  if (!uploadedImage) return;
  const { key: geminiKey } = resolveApiKey('gemini', activePersona?.apiKey, profile?.planStatus);
  setIsExtracting(true);
  setError(null);
 try {
 const result = await analyzeCanonicalTaste({ base64: uploadedImage.base64, mimeType: uploadedImage.mimeType }, geminiKey);
 setTreatment(result);
 setTreatmentName(`Taste_${Date.now().toString().slice(-4)}`);
 } catch (err: any) {
 setError(err.message ||"Failed to extract canonical taste.");
 } finally {
 setIsExtracting(false);
 }
 };

 const handleSave = () => {
 if (!treatment || !treatmentName) return;
 const newTreatment: StyleTreatment = {
 id: `trt_${Date.now()}`,
 createdAt: Date.now(),
 treatmentName: treatmentName,
 canonicalTaste: treatment
 };

 const currentTreatments = profile?.savedTreatments || [];
 if (profile) {
 updateProfile({
 ...profile,
 savedTreatments: [newTreatment, ...currentTreatments]
 });
 setIsSaved(true);

 void mirrorDarkroomTreatmentToEvidenceAtom(profile.uid, newTreatment).catch((err) => {
   console.warn("MIMI // Darkroom treatment → EvidenceAtom mirror failed:", err);
 });
 
 if (user?.isAnonymous || user?.uid?.startsWith('local_')) {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Cloud Database requires an active Sync. Artifact saved locally."} 
 }));
 }
 }
 };

 const resetDarkroom = () => {
  setUploadedImage(null);
  setBoardUrl('');
  setBoardPins([]);
  setBoardTitle('');
  setBoardPreviewWarning('');
  setBoardAnalysis(null);
  setTreatment(null);
  setIsSaved(false);
  setError(null);
 };

 const handleFetchBoard = async () => {
  if (!boardUrl.trim()) return;
  setIsFetchingBoard(true);
  setTreatment(null);
  setBoardAnalysis(null);
  setUploadedImage(null); // Clear single image exposure if loading a board
  setBoardPreviewWarning('');
  setError(null);
  setIsSaved(false);

  try {
   const res = await fetch(`/api/pinterest?url=${encodeURIComponent(boardUrl.trim())}`);
   const data = await res.json().catch(() => ({}));
   if (!res.ok) {
    throw new Error(data.error || "Failed to contact the Pinterest preview service.");
   }
   if (data.pins && data.pins.length > 0) {
    setBoardPins(data.pins);
    setBoardTitle(data.title || "Latent Board Specimen");
    setBoardUrl(data.url || boardUrl.trim());
    setBoardPreviewWarning(data.warning || '');
    setTreatmentName(data.title ? data.title.split('//')[0].trim() : "Board_Reg_Taste");
    
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
     detail: { message: `Loaded ${data.pins.length} real public Pinterest thumbnails. Review the contact sheet before analysis.`, type: 'success' } 
    }));
   } else {
    throw new Error("No image positives resolved on this board URL.");
   }
  } catch (err: any) {
   console.error("Board exposure failed:", err);
   setError(err.message || "Failed to parse public collection url. Make sure it's public.");
  } finally {
   setIsFetchingBoard(false);
  }
 };

 const handleBoardExtraction = async () => {
  if (boardPins.length === 0) return;
  setIsExtracting(true);
  setError(null);
  setBoardAnalysis(null);
  setTreatment(null);
  setIsSaved(false);

  try {
   const result = await analyzePinterestBoard(
    profile?.tasteProfile || "Unknown Taste Profile",
    boardUrl.trim() || "https://pinterest.com/latent_vibe",
    boardPins
   );

   if (result) {
    setBoardAnalysis(result);
    setAnalysisSubTab('report');
    if (result.canonicalTaste) {
     setTreatment({
      motifs: result.canonicalTaste.motifs || [],
      palette: result.canonicalTaste.palette || [],
      form: result.canonicalTaste.form || [],
      mood: result.canonicalTaste.mood || [],
      era_refs: result.canonicalTaste.era_refs || [],
      density: result.canonicalTaste.density || 0.6,
      entropy: result.canonicalTaste.entropy || 0.4,
      prompt_fragments: result.sourcingStrategy || [],
      commercial_signals: result.suggestedItems || [],
      novelty_score: (result.alignmentScore || 80) / 100
     } as any);

     // Add custom text property
     (result.canonicalTaste as any).subject_comprehension = result.canonicalTaste.subject_comprehension || result.boardAnalysis;
    } else {
     // Fallback parsing if JSON schema is loose
     setTreatment({
      motifs: [result.coreArchetype || "High Curation"],
      palette: ["Aesthetic Hue"],
      form: ["Structured Layering"],
      mood: ["Sovereign Curation"],
      era_refs: ["Contemporary"],
      density: 0.6,
      entropy: 0.4,
      prompt_fragments: result.sourcingStrategy || [],
      commercial_signals: result.suggestedItems || [],
      novelty_score: (result.alignmentScore || 80) / 100
     } as any);
    }
   } else {
    throw new Error("Aesthetic analysis failed. The chemical trace was lost.");
   }
  } catch (err: any) {
   setError(err.message || "Failed to analyze board aesthetic values.");
  } finally {
   setIsExtracting(false);
  }
 };

 // --- Batch Handlers ---
 const handleBatchFiles = (files: FileList | null) => {
 if (!files) return;
 Array.from(files).forEach(file => {
 if (file.type.startsWith('image/')) {
 const reader = new FileReader();
 reader.onload = (e) => {
 const result = e.target?.result as string;
 const base64 = result.split(',')[1];
 setBatchImages(prev => [...prev, {
 id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 url: result,
 base64,
 mimeType: file.type,
 status: 'pending'
 }]);
 };
 reader.onerror = (e) => console.error("MIMI // FileReader error", e);
 reader.readAsDataURL(file);
 }
 });
 };

 const handleBatchDrop = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setDragActive(false);
 handleBatchFiles(e.dataTransfer.files);
 };

 const processBatch = async () => {
 if (!selectedTreatmentId || batchImages.length === 0) return;
 const selectedTreatment = profile?.savedTreatments?.find(t => t.id === selectedTreatmentId);
 if (!selectedTreatment) return;

 setIsBatchProcessing(true);
 
 for (let i = 0; i < batchImages.length; i++) {
 if (batchImages[i].status === 'done') continue;
 
 setBatchImages(prev => prev.map((img, idx) => idx === i ? { ...img, status: 'processing' } : img));
 
 try {
 const stylePrompt = selectedTreatment.canonicalTaste ? 
 `Apply these motifs: ${selectedTreatment.canonicalTaste.motifs?.join(', ')}. Use palette: ${selectedTreatment.canonicalTaste.palette?.join(', ')}. Mood: ${selectedTreatment.canonicalTaste.mood?.join(', ')}` : 
 'Apply aesthetic treatment';
 const resultUrl = await applyAestheticRefraction(batchImages[i].url, stylePrompt, profile);
 setBatchImages(prev => prev.map((img, idx) => idx === i ? { ...img, status: 'done', resultUrl } : img));
 } catch (err: any) {
 setBatchImages(prev => prev.map((img, idx) => idx === i ? { ...img, status: 'error', error: err.message } : img));
 }
 }
 
 setIsBatchProcessing(false);
 };

 const saveToPocket = async (img: BatchImage) => {
 if (!profile || !img.resultUrl || img.status !== 'done') return;
 
 try {
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(profile.uid, 'image', {
 imageUrl: img.resultUrl,
 source: 'Darkroom Batch',
 provenanceFrom: 'darkroom',
 provenanceArtifactId: img.id,
 notes: `Processed with treatment: ${profile.savedTreatments?.find(t => t.id === selectedTreatmentId)?.treatmentName || 'Unknown'}`
 });
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Image saved to Pocket.", type: 'success' } 
 }));
 } catch (e) {
 console.error("Failed to save to pocket", e);
 }
 };

 const batchExport = async () => {
 if (!profile) return;
 const doneImages = batchImages.filter(img => img.status === 'done' && img.resultUrl);
 if (doneImages.length === 0) return;

 setIsExporting(true);
 const treatmentName = profile.savedTreatments?.find(t => t.id === selectedTreatmentId)?.treatmentName || 'Unknown Treatment';
 
 try {
 const { archiveManager } = await import('../services/archiveManager');
 for (const img of doneImages) {
 await archiveManager.saveToPocket(profile.uid, 'image', {
 imageUrl: img.resultUrl!,
 source: 'Darkroom Batch Export',
 provenanceFrom: 'darkroom',
 provenanceArtifactId: img.id,
 notes: `Batch processed with treatment: ${treatmentName}`
 });
 }

 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message: `Exported ${doneImages.length} images to Pocket.`, type: 'success' } 
 }));
 } catch (e) {
 console.error("Failed to batch export", e);
 } finally {
 setIsExporting(false);
 }
 };

 const removeBatchImage = (id: string) => {
 setBatchImages(prev => prev.filter(img => img.id !== id));
 };

 const toggleZineAesthetic = () => {
 if (!profile) return;
 const currentZineOptions = profile.zineOptions || {
 style: 'balanced',
 theme: 'organic',
 contentFocus: 'balanced'
 };
 const isCurrentlyEnabled = currentZineOptions.selectedTreatmentId === selectedTreatmentId;
 
 updateProfile({
 ...profile,
 zineOptions: {
 ...currentZineOptions,
 selectedTreatmentId: isCurrentlyEnabled ? undefined : selectedTreatmentId
 }
 });
 };

 return (
  <div className={`w-full h-full min-h-0 transition-all duration-700 font-sans p-6 md:p-10 overflow-y-auto pb-32 relative ${safelight ? 'bg-neutral-950 text-red-500 selection:bg-red-500/20' : 'bg-[#FAF8F5] text-stone-900 dark:bg-[#080808] dark:text-[#FAF9F6] selection:bg-amber-500/20'}`}>
   {/* Safelight ambient glowing mask */}
   {safelight && (
    <div className="fixed inset-0 pointer-events-none z-40 bg-red-600/[0.04] mix-blend-color-burn shadow-[inset_0_0_120px_rgba(239,68,68,0.15)] animate-pulse" style={{ animationDuration: '6s' }} />
   )}
   
   <div className="max-w-7xl mx-auto relative z-10">
    <header className={`mb-10 border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 ${safelight ? 'border-red-950/60' : 'border-stone-200 dark:border-stone-900'}`}>
     <div>
      <div className="flex items-center gap-2 mb-2">
       <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 font-extrabold">
        SOVEREIGN AESTHETICS // DARKROOM PROCESSOR
       </span>
      </div>
      <div className="flex items-center gap-3">
       <span className={`relative flex h-2.5 w-2.5 ${safelight ? 'hidden' : 'flex'}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
       </span>
       <span className={`relative flex h-2.5 w-2.5 ${safelight ? 'flex' : 'hidden'}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
       </span>
       <h1 className={`text-4xl md:text-5xl font-serif italic tracking-tighter ${safelight ? 'text-red-500 font-bold' : 'text-stone-900 dark:text-stone-50'}`}>The Darkroom</h1>
      </div>
      <p className={`text-[9px] uppercase tracking-[0.25em] mt-3 font-mono ${safelight ? 'text-red-800' : 'text-stone-500 dark:text-stone-400'}`}>
       Aesthetic Extraction & Chromatic Processing // MODULE.SYS.8821-X
      </p>
     </div>
     
     <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
      <div className={`flex flex-wrap border p-1 rounded-sm gap-1 ${safelight ? 'border-red-950/80 bg-black/50' : 'border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/30'}`}>
       <button 
        onClick={() => setMode('extract')}
        className={`text-[9px] uppercase tracking-[0.15em] px-3.5 py-1.5 font-mono font-medium transition-all rounded-xs ${mode === 'extract' ? (safelight ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-white dark:bg-stone-850 shadow-xs text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800') : (safelight ? 'text-red-900/60 hover:text-red-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50')}`}
       >
        Extraction
       </button>
       <button 
        onClick={() => setMode('batch')}
        className={`text-[9px] uppercase tracking-[0.15em] px-3.5 py-1.5 font-mono font-medium transition-all rounded-xs ${mode === 'batch' ? (safelight ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-white dark:bg-stone-850 shadow-xs text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800') : (safelight ? 'text-red-900/60 hover:text-red-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50')}`}
       >
        Batch Processing
       </button>
       <button 
        onClick={() => setMode('generation')}
        className={`text-[9px] uppercase tracking-[0.15em] px-3.5 py-1.5 font-mono font-medium transition-all rounded-xs ${mode === 'generation' ? (safelight ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-white dark:bg-stone-850 shadow-xs text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800') : (safelight ? 'text-red-900/60 hover:text-red-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50')}`}
       >
        Synthesis
       </button>
       <button 
        onClick={() => setMode('transcription')}
        className={`text-[9px] uppercase tracking-[0.15em] px-3.5 py-1.5 font-mono font-medium transition-all rounded-xs ${mode === 'transcription' ? (safelight ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-white dark:bg-stone-850 shadow-xs text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800') : (safelight ? 'text-red-900/60 hover:text-red-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50')}`}
       >
        Sonic Decoupling
       </button>
       <button 
        onClick={() => setMode('translation')}
        className={`text-[9px] uppercase tracking-[0.15em] px-3.5 py-1.5 font-mono font-medium transition-all rounded-xs ${mode === 'translation' ? (safelight ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-white dark:bg-stone-850 shadow-xs text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800') : (safelight ? 'text-red-900/60 hover:text-red-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50')}`}
       >
        Translation
       </button>
      </div>

      {/* Safelight Toggle */}
      <button 
       onClick={() => setSafelight(!safelight)}
       className={`text-[9px] uppercase tracking-[0.15em] px-3.5 py-2 border font-mono font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer rounded-xs ${safelight ? 'bg-red-950/60 text-red-400 border-red-700 shadow-[0_0_12px_rgba(239,68,68,0.35)]' : 'border-stone-300 dark:border-stone-755 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-900/50'}`}
      >
       <span className={`w-2 h-2 rounded-full ${safelight ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'bg-stone-400 dark:bg-stone-600'}`} />
       Safelight {safelight ? 'ON' : 'OFF'}
      </button>
     </div>
    </header>

    {error && (
     <div className={`mb-8 p-4 border text-[10px] uppercase tracking-widest font-mono rounded-xs ${safelight ? 'bg-red-950/20 border-red-900 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'bg-red-50 dark:bg-red-950/15 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400'}`}>
      <span className="font-bold">[DEVELOPMENT ERROR STATE]:</span> {error}
     </div>
    )}

    {mode === 'transcription' ? (
     <div className={`p-6 border rounded-xs ${safelight ? 'border-red-950 bg-black/40' : 'border-stone-200 dark:border-stone-900'}`}>
      <DarkroomTranscription />
     </div>
    ) : mode === 'translation' ? (
     <div className={`p-6 border rounded-xs ${safelight ? 'border-red-950 bg-black/40' : 'border-stone-200 dark:border-stone-900'}`}>
      <TranslationTerminal standalone={false} />
     </div>
    ) : mode === 'generation' ? (
     <div className={`p-6 border rounded-xs ${safelight ? 'border-red-950 bg-black/40' : 'border-stone-200 dark:border-stone-900'}`}>
      <DarkroomGeneration />
     </div>
    ) : mode === 'extract' ? (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      
      {/* LEFT: EXPOSURE VIEW */}
      <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
         <ScanLine size={14} className={safelight ? 'text-red-700' : 'text-stone-400'} />
         <h2 className={`text-[10px] font-mono uppercase tracking-[0.2em] font-bold ${safelight ? 'text-red-400' : 'text-stone-900 dark:text-stone-100'}`}>
          Aesthetic Exposure Tray
         </h2>
        </div>
        {(uploadedImage || boardPins.length > 0) && (
         <button 
          onClick={resetDarkroom} 
          className={`text-[9px] uppercase tracking-widest font-mono flex items-center gap-1.5 transition-colors ${safelight ? 'text-red-700 hover:text-red-400' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50'}`}
         >
          <X size={12} /> Reset Exposure
         </button>
        )}
       </div>

       {!uploadedImage && boardPins.length === 0 ? (
        <div className="space-y-6">
         {/* Focus Target / Calibration Drop Zone */}
         <div 
          className={`relative border border-dashed transition-all duration-500 flex flex-col items-center justify-center p-12 aspect-square cursor-pointer rounded-xs overflow-hidden group
          ${dragActive 
           ? (safelight ? 'border-red-500 bg-red-950/20' : 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-900/40') 
           : (safelight ? 'border-red-950 hover:border-red-800 bg-black/20 hover:bg-red-950/10' : 'border-stone-300 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 bg-stone-50 dark:bg-stone-900/10 hover:bg-stone-100/60 dark:hover:bg-stone-900/30')}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
         >
          {/* Visual Enlarger Reticle overlays */}
          <div className={`absolute inset-4 border border-dashed pointer-events-none opacity-20 transition-colors ${safelight ? 'border-red-500' : 'border-stone-400 dark:border-stone-600'}`} />
          <div className={`absolute top-2 left-2 w-3 h-3 border-t border-l pointer-events-none transition-colors ${safelight ? 'border-red-800' : 'border-stone-400 dark:border-stone-600'}`} />
          <div className={`absolute top-2 right-2 w-3 h-3 border-t border-r pointer-events-none transition-colors ${safelight ? 'border-red-800' : 'border-stone-400 dark:border-stone-600'}`} />
          <div className={`absolute bottom-2 left-2 w-3 h-3 border-b border-l pointer-events-none transition-colors ${safelight ? 'border-red-800' : 'border-stone-400 dark:border-stone-600'}`} />
          <div className={`absolute bottom-2 right-2 w-3 h-3 border-b border-r pointer-events-none transition-colors ${safelight ? 'border-red-800' : 'border-stone-400 dark:border-stone-600'}`} />
          
          {/* Centered crosshair scope */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border flex items-center justify-center pointer-events-none transition-all group-hover:scale-110 ${safelight ? 'border-red-900/50 group-hover:border-red-700' : 'border-stone-300 dark:border-stone-700 group-hover:border-stone-400'}`}>
           <div className={`w-2.5 h-2.5 rounded-full transition-colors ${safelight ? 'bg-red-900 group-hover:bg-red-500' : 'bg-stone-300 dark:bg-stone-700 group-hover:bg-stone-550'}`} />
          </div>

          <div className="relative text-center space-y-4 max-w-xs pointer-events-none">
           <div className="flex justify-center">
            <Upload size={32} className={`stroke-[1.2] transition-colors ${safelight ? 'text-red-950 group-hover:text-red-400' : 'text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300'}`} />
           </div>
           <div>
            <p className={`font-serif italic text-sm ${safelight ? 'text-red-650' : 'text-stone-700 dark:text-stone-300'}`}>
             Load Latent Specimen
            </p>
            <p className={`text-[8px] font-mono uppercase tracking-widest mt-1.5 ${safelight ? 'text-red-950' : 'text-stone-400 dark:text-stone-500'}`}>
             Drop raw positive or click to calibrate film carrier
            </p>
           </div>
          </div>
          <input 
           ref={fileInputRef} 
           type="file" 
           accept="image/*" 
           onChange={handleChange} 
           className="hidden" 
          />

          {/* HUD labels on border */}
          <div className={`absolute bottom-2 right-3 font-mono text-[7px] pointer-events-none ${safelight ? 'text-red-950' : 'text-stone-300 dark:text-stone-700'}`}>
           CARRIER SLOT // F-22
          </div>
         </div>

         <div className="relative flex items-center py-2">
          <div className={`flex-grow border-t ${safelight ? 'border-red-950/40' : 'border-stone-200 dark:border-stone-900'}`}></div>
          <span className={`flex-shrink mx-4 font-mono text-[8px] uppercase tracking-widest ${safelight ? 'text-red-900' : 'text-stone-400'}`}>OR</span>
          <div className={`flex-grow border-t ${safelight ? 'border-red-950/40' : 'border-stone-200 dark:border-stone-900'}`}></div>
         </div>

         {/* Pinterest URL Collector card */}
         <div className={`border p-6 rounded-xs ${safelight ? 'border-red-950 bg-black/40' : 'border-stone-200 dark:border-stone-900 bg-stone-50/50 dark:bg-stone-950/10'}`}>
          <div className="flex items-center gap-2 mb-3">
           <LinkIcon size={12} className={safelight ? 'text-red-800' : 'text-stone-500'} />
           <h3 className={`text-[9px] font-mono uppercase tracking-[0.2em] font-bold ${safelight ? 'text-red-500' : 'text-stone-900 dark:text-stone-100'}`}>
            Collection Exposure Port
           </h3>
          </div>
          <p className={`text-[8px] font-mono uppercase tracking-wider mb-4 leading-relaxed ${safelight ? 'text-red-800/85' : 'text-stone-500 dark:text-stone-400'}`}>
           Extract structured aesthetic variables directly from a public board collection to synthesize deep curial treatments.
          </p>
          <div className="flex gap-2">
           <div className="relative flex-1">
            <input
             type="text"
             placeholder="PASTE PINTEREST BOARD URL // PUBLIC ONLY"
             value={boardUrl}
             onChange={e => setBoardUrl(e.target.value)}
             onKeyDown={e => {
              if (e.key === 'Enter' && boardUrl.trim() && !isFetchingBoard) {
               e.preventDefault();
               void handleFetchBoard();
              }
             }}
             aria-label="Public Pinterest board URL"
             className={`w-full px-3 py-2 text-[9px] font-mono tracking-widest border transition-all rounded-xs outline-hidden ${safelight ? 'bg-black text-red-500 border-red-950 focus:border-red-800' : 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 border-stone-200 dark:border-stone-800 focus:border-stone-400'}`}
            />
           </div>
           <button
            onClick={handleFetchBoard}
            disabled={isFetchingBoard || !boardUrl.trim()}
            className={`px-4 py-2 text-[9px] font-mono font-bold uppercase tracking-widest border transition-all rounded-xs ${isFetchingBoard || !boardUrl.trim() ? (safelight ? 'border-red-950/40 text-red-950/40' : 'border-stone-200 text-stone-300 dark:border-stone-800 dark:text-stone-700 cursor-not-allowed') : (safelight ? 'border-red-700 bg-red-950/30 text-red-400 hover:bg-red-900/30' : 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-950 hover:opacity-90')}`}
           >
            {isFetchingBoard ? "LOADING..." : "LOAD PREVIEW"}
           </button>
          </div>
         </div>
        </div>
       ) : uploadedImage ? (
        /* SINGLE IMAGE EXPOSURE CARRIER (35mm filmstrip layout) */
        <div className={`border p-4 rounded-xs ${safelight ? 'border-red-950 bg-black/30' : 'border-stone-200 dark:border-stone-900'}`}>
         {/* Film strip sprockets top */}
         <div className="flex justify-between px-2 py-1 bg-stone-950 border-b border-stone-900 mb-4 rounded-xs">
          {Array.from({ length: 10 }).map((_, i) => (
           <div key={i} className="w-2.5 h-3.5 bg-black border border-stone-850 rounded-xs" />
          ))}
         </div>

         <div className="relative group aspect-square bg-black border border-stone-850 overflow-hidden flex items-center justify-center rounded-xs">
          <img 
           src={uploadedImage.url} 
           alt="Exposed latent positive" 
           className={`max-w-full max-h-full object-contain transition-all duration-700 ${safelight ? 'grayscale brightness-90 contrast-125' : ''}`}
          />
          
          {/* Technical Crosshairs Focus Overlays */}
          <div className="absolute inset-0 pointer-events-none">
           <div className={`absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 ${safelight ? 'border-red-500/60' : 'border-white/40'}`} />
           <div className={`absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 ${safelight ? 'border-red-500/60' : 'border-white/40'}`} />
           <div className={`absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 ${safelight ? 'border-red-500/60' : 'border-white/40'}`} />
           <div className={`absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 ${safelight ? 'border-red-500/60' : 'border-white/40'}`} />
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[7px] px-1.5 py-0.5 rounded-xs ${safelight ? 'text-red-400 bg-black/75' : 'text-white bg-black/60'}`}>
            FOCUS COHERENCE: LOCKED
           </div>
          </div>
         </div>

         {/* Film strip sprockets bottom */}
         <div className="flex justify-between px-2 py-1 bg-stone-950 border-t border-stone-900 mt-4 rounded-xs">
          {Array.from({ length: 10 }).map((_, i) => (
           <div key={i} className="w-2.5 h-3.5 bg-black border border-stone-850 rounded-xs" />
          ))}
         </div>

         {/* Digital HUD Console under film carrier */}
         <div className={`mt-6 p-4 border border-dashed rounded-xs flex flex-col sm:flex-row justify-between items-center gap-4 ${safelight ? 'border-red-950 bg-black/10' : 'border-stone-200 dark:border-stone-800'}`}>
          <div className="space-y-1 text-center sm:text-left">
           <div className="flex items-center gap-2 justify-center sm:justify-start">
            <div className={`w-1.5 h-1.5 rounded-full ${safelight ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-ping'}`} />
            <span className={`font-mono text-[9px] font-bold ${safelight ? 'text-red-400' : 'text-stone-800 dark:text-stone-200'}`}>FILM_READY_FOR_CHEMISTRY</span>
           </div>
           <p className={`font-mono text-[8px] uppercase tracking-widest ${safelight ? 'text-red-800' : 'text-stone-400'}`}>
            SPECIMEN: RAW POSITIVE // FORMAT: {uploadedImage.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'}
           </p>
          </div>

          <button
           onClick={handleExtraction}
           disabled={isExtracting}
           className={`px-5 py-3 text-[10px] uppercase font-bold tracking-[0.2em] font-mono border transition-all rounded-xs ${isExtracting ? (safelight ? 'border-red-950 text-red-950/50 cursor-not-allowed' : 'border-stone-200 text-stone-300 dark:border-stone-800 dark:text-stone-700 cursor-not-allowed') : (safelight ? 'border-red-500 bg-red-950/40 text-red-400 hover:bg-red-900/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-stone-200')}`}
          >
           {isExtracting ? (
            <span className="flex items-center gap-2">
             <Activity size={12} className="animate-spin" /> RUNNING SPECTROGRAPH...
            </span>
           ) : (
            "Extract Aesthetic Values"
           )}
          </button>
         </div>
        </div>
       ) : (
        /* BOARD PINS CONTACT SHEET (3x3 Photographic Grid layout with frame labels) */
        <div className={`border p-4 rounded-xs ${safelight ? 'border-red-950 bg-black/30' : 'border-stone-200 dark:border-stone-900'}`}>
         <div className="flex items-center justify-between mb-4">
          <div>
           <span className={`font-mono text-[9px] uppercase tracking-widest font-bold ${safelight ? 'text-red-800' : 'text-stone-500'}`}>
            COLLECTION CONTACT SHEET: {boardTitle}
           </span>
           <p className={`mt-1 font-mono text-[7px] uppercase tracking-wider ${safelight ? 'text-red-900' : 'text-stone-400'}`}>
            Source: live public Pinterest HTML · review before AI analysis
           </p>
          </div>
          <div className="flex items-center gap-2">
           <span className={`font-mono text-[8px] uppercase px-2 py-0.5 rounded-none ${safelight ? 'bg-red-950/50 text-red-400 border border-red-900/30' : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300'}`}>
            {boardPins.length} THUMBNAILS
           </span>
           <button
            type="button"
            onClick={resetDarkroom}
            className={`font-mono text-[7px] uppercase tracking-widest underline underline-offset-4 ${safelight ? 'text-red-700' : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'}`}
           >
            Change board
           </button>
          </div>
         </div>

         {boardPreviewWarning && (
          <div className={`mb-4 border px-3 py-2 font-mono text-[8px] leading-relaxed ${safelight ? 'border-red-950 text-red-700' : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200'}`}>
           {boardPreviewWarning}
          </div>
         )}

         <div className="grid grid-cols-3 gap-3">
          {boardPins.slice(0, 9).map((pin, idx) => (
           <div key={idx} className={`relative aspect-square p-2 flex flex-col border rounded-xs transition-all duration-300 ${safelight ? 'bg-black border-red-950/70 hover:border-red-500/50' : 'bg-stone-900 border-stone-800 hover:border-stone-600'}`}>
            {/* Film strip edge sprockets */}
            <div className="flex justify-between px-1 mb-1.5 opacity-60">
             <div className={`w-1.5 h-1.5 rounded-none ${safelight ? 'bg-red-950' : 'bg-stone-800'}`} />
             <div className={`w-1.5 h-1.5 rounded-none ${safelight ? 'bg-red-950' : 'bg-stone-800'}`} />
             <div className={`w-1.5 h-1.5 rounded-none ${safelight ? 'bg-red-950' : 'bg-stone-800'}`} />
             <div className={`w-1.5 h-1.5 rounded-none ${safelight ? 'bg-red-950' : 'bg-stone-800'}`} />
            </div>
            
            {/* The image positive frame */}
            <div className="relative flex-1 bg-stone-950 overflow-hidden group/pin border border-stone-900">
             <img 
              src={pin.src} 
              alt={pin.alt || `Specimen ${idx + 1}`} 
              className={`w-full h-full object-cover transition-all duration-500 group-hover/pin:scale-105 ${safelight ? 'grayscale brightness-90 contrast-125 hover:brightness-105 group-hover/pin:grayscale-0' : 'grayscale group-hover/pin:grayscale-0'}`} 
              referrerPolicy="no-referrer" 
             />
             <div className={`absolute bottom-1 right-1 font-mono text-[6px] px-1 bg-black/80 rounded-xs ${safelight ? 'text-red-400' : 'text-stone-500'}`}>{`0${idx + 1}A`}</div>
            </div>

            {/* Film frame footer metadata */}
            <div className="flex justify-between items-center mt-1.5 px-0.5 font-mono text-[5.5px] uppercase tracking-widest leading-none">
             <span className={safelight ? 'text-red-950' : 'text-stone-500'}>MIMI CO-100</span>
             <span className={safelight ? 'text-red-650' : 'text-orange-500'}>{idx + 13}</span>
            </div>
           </div>
          ))}
         </div>

         {/* Spectral Board Extraction Trigger Console */}
         <div className={`mt-6 p-4 border border-dashed rounded-xs flex flex-col sm:flex-row justify-between items-center gap-4 ${safelight ? 'border-red-950 bg-black/10' : 'border-stone-200 dark:border-stone-805'}`}>
          <div className="space-y-1 text-center sm:text-left">
           <div className="flex items-center gap-2 justify-center sm:justify-start">
            <div className={`w-1.5 h-1.5 rounded-full ${safelight ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-ping'}`} />
            <span className={`font-mono text-[9px] font-bold ${safelight ? 'text-red-400' : 'text-stone-800 dark:text-stone-200'}`}>CONTACT_SHEET_CALIBRATED</span>
           </div>
           <p className={`font-mono text-[8px] uppercase tracking-widest ${safelight ? 'text-red-800' : 'text-stone-400'}`}>
            MULTIPLE SPECIMEN INTEGRITY: VERIFIED // READY FOR SPECTRUM
           </p>
          </div>

          <button
           onClick={handleBoardExtraction}
           disabled={isExtracting}
           className={`px-5 py-3 text-[10px] uppercase font-bold tracking-[0.2em] font-mono border transition-all rounded-xs ${isExtracting ? (safelight ? 'border-red-950 text-red-950/50 cursor-not-allowed' : 'border-stone-200 text-stone-300 dark:border-stone-800 dark:text-stone-700 cursor-not-allowed') : (safelight ? 'border-red-500 bg-red-950/40 text-red-400 hover:bg-red-900/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-950 hover:bg-stone-805 dark:hover:bg-stone-200')}`}
          >
           {isExtracting ? (
            <span className="flex items-center gap-2">
             <Activity size={12} className="animate-spin" /> INITIATING ANALYZER...
            </span>
           ) : (
            "Analyze Board Aesthetic"
           )}
          </button>
         </div>
        </div>
       )}
      </div>

      {/* RIGHT: CHEMICAL ANALYSIS AND LEDGER OUTPUT */}
      <div className="space-y-6">
       <div className="flex items-center gap-2">
        <Beaker size={14} className={safelight ? 'text-red-700' : 'text-stone-400'} />
        <h2 className={`text-[10px] font-mono uppercase tracking-[0.2em] font-bold ${safelight ? 'text-red-400' : 'text-stone-900 dark:text-stone-100'}`}>
         Chemical Analysis Ledger
        </h2>
       </div>

       {!isExtracting && !treatment && !boardAnalysis ? (
        <div className={`border p-12 text-center flex flex-col items-center justify-center aspect-square rounded-xs relative ${safelight ? 'border-red-950 bg-black/10' : 'border-stone-200 dark:border-stone-900 bg-stone-50/20'}`}>
         {/* Decorative background grid */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
         
         <Activity size={24} className={`mb-4 stroke-[1.2] ${safelight ? 'text-red-950' : 'text-stone-300 dark:text-stone-700'}`} />
         <p className={`font-serif italic text-sm ${safelight ? 'text-red-800' : 'text-stone-600 dark:text-stone-400'}`}>Awaiting Chromatic Input</p>
         <p className={`text-[8px] font-mono uppercase tracking-widest mt-2 max-w-[200px] leading-relaxed ${safelight ? 'text-red-950' : 'text-stone-400 dark:text-stone-500'}`}>
          Load an image carrier or Pinterest specimen board above to extract curial parameters
         </p>
         
         {/* Ledger telemetry footer */}
         <div className={`absolute bottom-3 left-4 right-4 flex justify-between font-mono text-[6px] uppercase tracking-wider ${safelight ? 'text-red-950' : 'text-stone-300 dark:text-stone-700'}`}>
          <span>SPECTROGRAPH STATE: STANDBY</span>
          <span>NOISE: NORMAL // DUMP: OFF</span>
         </div>
        </div>
       ) : isExtracting ? (
        /* ACTIVE EXTRACTION LOADING SCREEN (High fidelity scanning lasers) */
        <div className={`border p-12 text-center flex flex-col items-center justify-center aspect-square rounded-xs relative overflow-hidden ${safelight ? 'border-red-900 bg-red-950/10' : 'border-stone-300 dark:border-stone-800 bg-stone-50/50'}`}>
         {/* Scanner laser sweep line */}
         <div className={`absolute left-0 right-0 h-[2px] shadow-xs animate-[bounce_3s_infinite] ${safelight ? 'bg-red-500 shadow-red-500/50' : 'bg-emerald-400 shadow-emerald-400/50'}`} />
         
         {/* Moving technical matrix grids */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none animate-pulse" />
         
         <div className="space-y-6 relative z-10">
          <Loader2 size={32} className={`animate-spin mx-auto stroke-[1.2] ${safelight ? 'text-red-500' : 'text-stone-800 dark:text-stone-200'}`} />
          <div>
           <p className={`font-serif italic text-base ${safelight ? 'text-red-400' : 'text-stone-900 dark:text-stone-100'}`}>
            Extracting Latent Chemistry
           </p>
           <p className={`text-[8px] font-mono uppercase tracking-[0.25em] mt-2 animate-pulse ${safelight ? 'text-red-650' : 'text-stone-550 dark:text-stone-400'}`}>
            Decoupling pixels // Re-orienting chromatic matrix...
           </p>
          </div>

          {/* Fictional diagnostic logs popping up */}
          <div className={`mx-auto max-w-[280px] p-3 text-left font-mono text-[7px] space-y-1 bg-black/60 border rounded-xs leading-normal ${safelight ? 'border-red-950 text-red-500' : 'border-stone-200 dark:border-stone-800 text-stone-400'}`}>
           <div className="flex justify-between"><span>[INGEST]</span> <span className="text-emerald-500 font-bold">OK</span></div>
           <div className="flex justify-between"><span>[CHROMATIC SCAN]</span> <span className="animate-pulse text-amber-500">RUNNING</span></div>
           <div className="flex justify-between"><span>[MOTIF MAPPER]</span> <span className="text-stone-500">CALIBRATING</span></div>
           <div className="flex justify-between"><span>[ERA_REF RESOLVE]</span> <span className="text-stone-500">STAGING</span></div>
          </div>
         </div>
        </div>
       ) : (
        /* COMPLETED EXTRACTION RESULTS / SPECTROGRAPH LEDGER */
        <div className={`border p-6 rounded-xs relative overflow-hidden flex flex-col justify-between ${safelight ? 'border-red-950 bg-black/20' : 'border-stone-200 dark:border-stone-900 bg-stone-50/20'}`}>
         
         {/* Ledger report sub-tab buttons */}
         {boardAnalysis && (
          <div className="flex gap-2 mb-6 border-b pb-3 border-stone-200 dark:border-stone-800/60">
           <button
            onClick={() => setAnalysisSubTab('report')}
            className={`text-[9px] font-mono uppercase tracking-widest px-3 py-1 transition-all rounded-xs ${analysisSubTab === 'report' ? (safelight ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-stone-900 text-stone-50 dark:bg-stone-105 dark:text-stone-950') : (safelight ? 'text-red-900 hover:text-red-700' : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100')}`}
           >
            Vibe Report
           </button>
           <button
            onClick={() => setAnalysisSubTab('variables')}
            className={`text-[9px] font-mono uppercase tracking-widest px-3 py-1 transition-all rounded-xs ${analysisSubTab === 'variables' ? (safelight ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-stone-900 text-stone-50 dark:bg-stone-105 dark:text-stone-950') : (safelight ? 'text-red-900 hover:text-red-700' : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100')}`}
           >
            Treatment Variables
           </button>
          </div>
         )}

         <div className="space-y-6">
          {analysisSubTab === 'report' ? (
           /* VIBE REPORT VIEW */
           <div className="space-y-6">
            {boardAnalysis && (
             <div className={`p-4 border rounded-xs ${safelight ? 'border-red-950/60 bg-red-950/5' : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/20'}`}>
              <h4 className={`text-[9px] font-mono uppercase tracking-[0.15em] font-bold mb-1.5 ${safelight ? 'text-red-400' : 'text-stone-905 dark:text-stone-100'}`}>
               Aesthetic Comprehensive Summary
              </h4>
              <p className={`font-serif italic text-xs leading-relaxed ${safelight ? 'text-red-500' : 'text-stone-700 dark:text-stone-300'}`}>
               {boardAnalysis.boardAnalysis || boardAnalysis.tasteAnalysis}
              </p>
             </div>
            )}

            {/* Extracted Chromatic Spectrum Band */}
            {treatment?.palette && treatment.palette.length > 0 && (
             <div className="space-y-2">
              <div className="flex justify-between items-center">
               <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${safelight ? 'text-red-700' : 'text-stone-800 dark:text-stone-200'}`}>CHROMATIC SPECTRUM</span>
               <span className={`font-mono text-[8px] font-semibold uppercase tracking-wider ${safelight ? 'text-red-900' : 'text-stone-700 dark:text-stone-300'}`}>LUMINANCE: BALANCED</span>
              </div>
              <div className={`flex w-full h-12 border rounded-xs overflow-hidden bg-white ${safelight ? 'border-red-950' : 'border-stone-400 dark:border-stone-700'}`}>
               {treatment.palette.map((color: string, i: number) => (
                <div 
                 key={i} 
                 className="flex-1 h-full relative group/color cursor-pointer transition-transform duration-300 hover:scale-y-110 border-r last:border-r-0 border-black/10"
                 style={{ backgroundColor: color }}
                 title={color}
                >
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/color:opacity-100 transition-opacity flex items-center justify-center font-mono text-[7px] text-white">
                  {color}
                 </div>
                </div>
               ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {treatment.palette.map((color: string, i: number) => (
                  <span key={`${color}-${i}`} className="font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-950">
                    {color}
                  </span>
                ))}
              </div>
             </div>
            )}

            {/* Metadata breakdown grids */}
            <div className="grid grid-cols-2 gap-4">
             <div className={`p-3 border rounded-xs ${safelight ? 'border-red-950/60 bg-black/20' : 'border-stone-200 dark:border-stone-800'}`}>
              <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1.5 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>MOTIFS</span>
              <div className="flex flex-wrap gap-1">
               {treatment?.motifs?.map((motif, idx) => (
                <span key={idx} className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border rounded-xs ${safelight ? 'border-red-950/80 bg-red-950/10 text-red-400' : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800'}`}>
                 {motif}
                </span>
               ))}
              </div>
             </div>

             <div className={`p-3 border rounded-xs ${safelight ? 'border-red-950/60 bg-black/20' : 'border-stone-200 dark:border-stone-800'}`}>
              <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1.5 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>MOOD TONALITIES</span>
              <div className="flex flex-wrap gap-1">
               {treatment?.mood?.map((mood, idx) => (
                <span key={idx} className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border rounded-xs ${safelight ? 'border-red-950/80 bg-red-950/10 text-red-400' : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800'}`}>
                 {mood}
                </span>
               ))}
              </div>
             </div>

             <div className={`p-3 border rounded-xs ${safelight ? 'border-red-950/60 bg-black/20' : 'border-stone-200 dark:border-stone-800'}`}>
              <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1.5 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>STRUCTURAL FORM</span>
              <div className="flex flex-wrap gap-1">
               {treatment?.form?.map((f, idx) => (
                <span key={idx} className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border rounded-xs ${safelight ? 'border-red-950/80 bg-red-950/10 text-red-400' : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800'}`}>
                 {f}
                </span>
               ))}
              </div>
             </div>

             <div className={`p-3 border rounded-xs ${safelight ? 'border-red-950/60 bg-black/20' : 'border-stone-200 dark:border-stone-800'}`}>
              <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1.5 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>ERA REFERENCES</span>
              <div className="flex flex-wrap gap-1">
               {treatment?.era_refs?.map((era, idx) => (
                <span key={idx} className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border rounded-xs ${safelight ? 'border-red-950/80 bg-red-950/10 text-red-400' : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800'}`}>
                 {era}
                </span>
               ))}
              </div>
             </div>
            </div>

            {/* Production translation turns the read into a repeatable edit recipe. */}
            <div className={`p-4 border rounded-xs ${safelight ? 'border-red-950 bg-black/15' : 'border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950'}`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${safelight ? 'text-red-700' : 'text-stone-800 dark:text-stone-200'}`}>
                  IMAGE EDIT TRANSLATION
                </span>
                <span className={`font-mono text-[7px] uppercase tracking-wider ${safelight ? 'text-red-900' : 'text-stone-600 dark:text-stone-400'}`}>
                  replication ledger
                </span>
              </div>
              {(() => {
                const translation = (treatment as any)?.media_translation || {};
                const fields = [
                  ['Format', translation.format || 'Derive from source aspect ratio and intended output'],
                  ['Medium', translation.medium || 'Digital editorial image with analog-informed finish'],
                  ['Color space', translation.color_space || 'Edit in wide gamut; export sRGB for web'],
                  ['Capture system', translation.capture_system || 'Camera system not identified — treat as a visual hypothesis'],
                  ['Lens language', translation.lens_language || 'Match the observed perspective and depth of field'],
                  ['Output', translation.output_notes || 'Preserve a full-resolution master before delivery exports'],
                ];
                const procedure = translation.edit_procedure?.length
                  ? translation.edit_procedure
                  : [
                      'Normalize exposure and white balance without flattening the source.',
                      `Build the grade around: ${treatment?.palette?.join(', ') || 'the extracted palette'}.`,
                      `Preserve structural cues: ${treatment?.form?.slice(0, 3).join(', ') || 'composition, depth, and texture'}.`,
                      'Apply grain, sharpening, and export compression last.',
                    ];
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {fields.map(([label, value]) => (
                        <div key={label} className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-2.5">
                          <span className="block font-mono text-[7px] uppercase tracking-widest text-stone-500 mb-1">{label}</span>
                          <p className="font-sans text-[10px] leading-relaxed text-stone-800 dark:text-stone-200">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <span className="block font-mono text-[7px] uppercase tracking-widest text-stone-500 mb-2">Edit procedure</span>
                      <ol className="space-y-1.5">
                        {procedure.map((step: string, index: number) => (
                          <li key={index} className="flex gap-2 font-sans text-[10px] leading-relaxed text-stone-800 dark:text-stone-200">
                            <span className="font-mono text-[8px] text-stone-500">{String(index + 1).padStart(2, '0')}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Generative Prompts details */}
            {treatment?.prompt_fragments && treatment.prompt_fragments.length > 0 && (
             <div className={`p-4 border rounded-xs ${safelight ? 'border-red-950 bg-black/15' : 'border-stone-200 dark:border-stone-800'}`}>
              <span className={`font-mono text-[8px] uppercase tracking-widest block mb-2.5 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>
               RE-SYNTHESIS CUES (PROMPT FRAGMENTS)
              </span>
              <div className="space-y-2">
               {treatment.prompt_fragments.map((frag, idx) => (
                <div 
                 key={idx} 
                 className={`p-2.5 font-mono text-[8.5px] border cursor-pointer hover:opacity-85 transition-opacity rounded-xs flex items-center justify-between ${safelight ? 'border-red-950/50 bg-neutral-900 text-red-400' : 'border-stone-200 dark:border-stone-800/60 bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300'}`}
                 onClick={() => {
                  navigator.clipboard.writeText(frag);
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                   detail: { message: "Fragment copied to terminal clipboard.", type: 'success' } 
                  }));
                 }}
                 title="Click to copy fragment"
                >
                 <span className="line-clamp-2 select-all">{frag}</span>
                 <span className={`text-[7px] uppercase tracking-wider font-bold ml-2 shrink-0 ${safelight ? 'text-red-905' : 'text-stone-400'}`}>[COPY]</span>
                </div>
               ))}
              </div>
             </div>
            )}
           </div>
          ) : (
           /* TREATMENT VARIABLES (TWEAKABLE DIGITAL DIALS) */
           <div className="space-y-6">
            <div className="space-y-4">
             <div>
              <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1.5 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>
               STYLE REGISTRY ALIAS (TREATMENT NAME)
              </span>
              <input
               type="text"
               value={treatmentName}
               onChange={e => setTreatmentName(e.target.value)}
               className={`w-full px-3 py-2 text-[10px] font-mono tracking-widest border transition-all rounded-xs outline-hidden ${safelight ? 'bg-black text-red-500 border-red-950 focus:border-red-805' : 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 border-stone-200 dark:border-stone-800 focus:border-stone-400'}`}
              />
             </div>

             <div className="grid grid-cols-2 gap-4">
              {/* DENSITY SLIDER */}
              <div className={`p-4 border rounded-xs space-y-2.5 ${safelight ? 'border-red-950/60 bg-black/10' : 'border-stone-200 dark:border-stone-800 bg-stone-50/50'}`}>
               <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest">
                <span className={safelight ? 'text-red-800' : 'text-stone-500'}>DENSITY (SATURATION)</span>
                <span className={safelight ? 'text-red-400 font-bold' : 'text-stone-900 dark:text-stone-100 font-bold'}>
                 {(treatment.density || 0.6).toFixed(2)}
                </span>
               </div>
               <div className="relative flex items-center">
                <input 
                 type="range"
                 min="0"
                 max="1"
                 step="0.05"
                 value={treatment.density || 0.6} 
                 onChange={e => setTreatment({ ...treatment, density: parseFloat(e.target.value) })}
                 className={`w-full h-1 rounded-lg appearance-none cursor-pointer outline-hidden ${safelight ? 'bg-red-950 accent-red-500' : 'bg-stone-200 dark:bg-stone-800 accent-stone-900 dark:accent-stone-100'}`}
                />
               </div>
              </div>

              {/* ENTROPY SLIDER */}
              <div className={`p-4 border rounded-xs space-y-2.5 ${safelight ? 'border-red-950/60 bg-black/10' : 'border-stone-200 dark:border-stone-800 bg-stone-50/50'}`}>
               <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest">
                <span className={safelight ? 'text-red-800' : 'text-stone-500'}>ENTROPY (MUTABILITY)</span>
                <span className={safelight ? 'text-red-400 font-bold' : 'text-stone-900 dark:text-stone-100 font-bold'}>
                 {(treatment.entropy || 0.4).toFixed(2)}
                </span>
               </div>
               <div className="relative flex items-center">
                <input 
                 type="range"
                 min="0"
                 max="1"
                 step="0.05"
                 value={treatment.entropy || 0.4} 
                 onChange={e => setTreatment({ ...treatment, entropy: parseFloat(e.target.value) })}
                 className={`w-full h-1 rounded-lg appearance-none cursor-pointer outline-hidden ${safelight ? 'bg-red-950 accent-red-500' : 'bg-stone-200 dark:bg-stone-800 accent-stone-900 dark:accent-stone-100'}`}
                />
               </div>
              </div>
             </div>

             {/* TEXT BOXES FOR VARIABLES */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
               <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>MOTIFS CODES</span>
               <textarea
                value={treatment.motifs?.join(', ')}
                onChange={e => setTreatment({ ...treatment, motifs: e.target.value.split(',').map(s => s.trim()) })}
                rows={2}
                className={`w-full p-2 text-[9px] font-mono tracking-widest border transition-all rounded-xs outline-hidden leading-relaxed resize-none ${safelight ? 'bg-black text-red-500 border-red-950 focus:border-red-800' : 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 border-stone-200 dark:border-stone-800 focus:border-stone-400'}`}
               />
              </div>
              <div>
               <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>PALETTE SCHEMES</span>
               <textarea
                value={treatment.palette?.join(', ')}
                onChange={e => setTreatment({ ...treatment, palette: e.target.value.split(',').map(s => s.trim()) })}
                rows={2}
                className={`w-full p-2 text-[9px] font-mono tracking-widest border transition-all rounded-xs outline-hidden leading-relaxed resize-none ${safelight ? 'bg-black text-red-500 border-red-950 focus:border-red-800' : 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 border-stone-200 dark:border-stone-800 focus:border-stone-400'}`}
               />
              </div>
              <div>
               <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>FORM CONSTRAINTS</span>
               <textarea
                value={treatment.form?.join(', ')}
                onChange={e => setTreatment({ ...treatment, form: e.target.value.split(',').map(s => s.trim()) })}
                rows={2}
                className={`w-full p-2 text-[9px] font-mono tracking-widest border transition-all rounded-xs outline-hidden leading-relaxed resize-none ${safelight ? 'bg-black text-red-500 border-red-950 focus:border-red-800' : 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 border-stone-200 dark:border-stone-800 focus:border-stone-400'}`}
               />
              </div>
              <div>
               <span className={`font-mono text-[8px] uppercase tracking-widest block mb-1 ${safelight ? 'text-red-800' : 'text-stone-500'}`}>MOOD OVERLAYS</span>
               <textarea
                value={treatment.mood?.join(', ')}
                onChange={e => setTreatment({ ...treatment, mood: e.target.value.split(',').map(s => s.trim()) })}
                rows={2}
                className={`w-full p-2 text-[9px] font-mono tracking-widest border transition-all rounded-xs outline-hidden leading-relaxed resize-none ${safelight ? 'bg-black text-red-500 border-red-950 focus:border-red-800' : 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 border-stone-200 dark:border-stone-800 focus:border-stone-400'}`}
               />
              </div>
             </div>
            </div>
           </div>
          )}
         </div>

         {/* SAVE REGISTRY ROW */}
         <div className={`mt-8 pt-6 border-t ${safelight ? 'border-red-950/60' : 'border-stone-200 dark:border-stone-800'}`}>
          <button
           onClick={handleSave}
           disabled={isSaved || !treatment || !treatmentName}
           className={`w-full py-3.5 text-[10px] font-mono uppercase tracking-[0.25em] font-bold border transition-all rounded-xs flex items-center justify-center gap-2 ${isSaved ? (safelight ? 'border-emerald-950 bg-emerald-950/20 text-emerald-500' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400') : (safelight ? 'border-red-500 bg-red-950/30 text-red-400 hover:bg-red-900/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]' : 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-950 hover:opacity-90')}`}
          >
           {isSaved ? (
            <>
             <Check size={14} /> Style saved in Registry
            </>
           ) : (
            <>
             <Save size={14} /> Commit to Style Registry
            </>
           )}
          </button>
         </div>

        </div>
       )}
      </div>

     </div>
    ) : (
     /* BATCH PROCESSING (Double-column Emulsion Desk) */
     <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
      
      {/* LEFT COLUMN: ACTIVE NEGATIVE PROCESSING CARRIER (Images Tray) */}
      <div className="lg:col-span-8 space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
         <Layers size={14} className={safelight ? 'text-red-700' : 'text-stone-400'} />
         <h2 className={`text-[10px] font-mono uppercase tracking-[0.2em] font-bold ${safelight ? 'text-red-400' : 'text-stone-900 dark:text-stone-100'}`}>
          Batch Negative Carrier Tray
         </h2>
        </div>
        {batchImages.length > 0 && (
         <div className="flex items-center gap-4">
          <button
           onClick={batchExport}
           disabled={isExporting || !batchImages.some(img => img.status === 'done')}
           className={`text-[9px] font-mono uppercase tracking-widest flex items-center gap-1 transition-all ${isExporting || !batchImages.some(img => img.status === 'done') ? (safelight ? 'text-red-950/40 cursor-not-allowed' : 'text-stone-300 dark:text-stone-700 cursor-not-allowed') : (safelight ? 'text-red-400 hover:text-red-200' : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-stone-50')}`}
          >
           {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Export all to Pocket
          </button>
          <button 
           onClick={() => setBatchImages([])} 
           className={`text-[9px] font-mono uppercase tracking-widest flex items-center gap-1 transition-colors ${safelight ? 'text-red-700 hover:text-red-400' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50'}`}
          >
           <X size={12} /> Clear all
          </button>
         </div>
        )}
       </div>

       {/* Multi-image upload slide organizer */}
       <div 
        className={`border border-dashed p-10 text-center cursor-pointer transition-all duration-500 rounded-xs relative group
        ${dragActive 
         ? (safelight ? 'border-red-500 bg-red-950/20' : 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-900/40') 
         : (safelight ? 'border-red-950 hover:border-red-800 bg-black/20 hover:bg-red-950/10' : 'border-stone-300 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 bg-stone-50 dark:bg-stone-900/10 hover:bg-stone-100/60 dark:hover:bg-stone-900/30')}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleBatchDrop}
        onClick={() => batchInputRef.current?.click()}
       >
        <div className="absolute inset-2 border border-dashed border-stone-400 dark:border-stone-800 pointer-events-none opacity-10" />
        <div className="space-y-3 pointer-events-none">
         <div className="flex justify-center">
          <ImageIcon size={26} className={`stroke-[1.2] transition-colors ${safelight ? 'text-red-900 group-hover:text-red-400' : 'text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300'}`} />
         </div>
         <div>
          <p className={`font-serif italic text-xs ${safelight ? 'text-red-655' : 'text-stone-700 dark:text-stone-300'}`}>
           Load Batch Slides
          </p>
          <p className={`text-[8px] font-mono uppercase tracking-widest mt-1 ${safelight ? 'text-red-950' : 'text-stone-400 dark:text-stone-500'}`}>
           Drop multiple photographic files or click to pack negatives carrier
          </p>
         </div>
        </div>
        <input 
         ref={batchInputRef} 
         type="file" 
         accept="image/*" 
         multiple 
         onChange={e => handleBatchFiles(e.target.files)} 
         className="hidden" 
        />
       </div>

       {/* Grid of batch files */}
       {batchImages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {batchImages.map((img) => (
          <div 
           key={img.id} 
           className={`border p-4 rounded-xs flex flex-col justify-between transition-all duration-350 ${safelight ? 'border-red-950 bg-black/25' : 'border-stone-200 dark:border-stone-850/60 bg-white/50 dark:bg-stone-900/10'}`}
          >
           {/* Film canister frame layout */}
           <div className="space-y-4">
            <div className="flex justify-between items-center font-mono text-[7px] uppercase tracking-wider text-stone-500">
             <span className={safelight ? 'text-red-900' : 'text-stone-400'}>SLIDE ID: {img.id.slice(-6)}</span>
             <button 
              onClick={() => removeBatchImage(img.id)}
              className={`hover:opacity-100 transition-opacity ${safelight ? 'text-red-700 hover:text-red-500' : 'text-stone-400 hover:text-stone-850'}`}
             >
              <X size={10} />
             </button>
            </div>

            {/* Image displays (Original and refractor comparison side-by-side) */}
            <div className="grid grid-cols-2 gap-2">
             {/* Original specimen */}
             <div className="relative aspect-square bg-stone-950 border border-stone-900 overflow-hidden rounded-2xs group/origin">
              <img src={img.url} className={`w-full h-full object-cover ${safelight ? 'grayscale brightness-90 contrast-125' : ''}`} alt="Original" />
              <div className="absolute top-1 left-1 font-mono text-[6px] text-white/70 bg-black/80 px-1 rounded-2xs">RAW</div>
             </div>

             {/* Refracted result */}
             <div className="relative aspect-square bg-stone-950 border border-stone-900 overflow-hidden rounded-2xs flex items-center justify-center">
              {img.status === 'done' && img.resultUrl ? (
               <img src={img.resultUrl} className="w-full h-full object-cover" alt="Processed" />
              ) : img.status === 'processing' ? (
               <div className="text-center space-y-1.5 p-2">
                <Activity size={12} className={`animate-spin mx-auto ${safelight ? 'text-red-500' : 'text-stone-450'}`} />
                <span className={`font-mono text-[6px] uppercase tracking-wider block ${safelight ? 'text-red-700' : 'text-stone-400'}`}>RE-REFRACTING</span>
               </div>
              ) : img.status === 'error' ? (
               <div className="text-center p-2">
                <span className="font-mono text-[6px] uppercase tracking-wider block text-red-500 font-bold">ERROR</span>
                <span className="text-[5.5px] font-mono block text-red-800 mt-1 line-clamp-3">{img.error}</span>
               </div>
              ) : (
               <div className="text-center p-2">
                <span className={`font-mono text-[6px] uppercase tracking-wider block ${safelight ? 'text-red-950' : 'text-stone-500 dark:text-stone-600'}`}>AWAITING</span>
               </div>
              )}
              <div className="absolute top-1 left-1 font-mono text-[6px] text-white/70 bg-black/80 px-1 rounded-2xs">REFRACT</div>
             </div>
            </div>
           </div>

           {/* CANISTER FOOTER ACTION KEYS */}
           <div className="mt-4 pt-3 border-t border-dashed border-stone-200 dark:border-stone-850 flex items-center justify-between gap-2">
            <div>
             {img.status === 'done' ? (
              <span className="font-mono text-[7px] uppercase tracking-widest text-emerald-500 font-bold">● EMULSION_FIXED</span>
             ) : img.status === 'processing' ? (
              <span className={`font-mono text-[7px] uppercase tracking-widest font-bold animate-pulse ${safelight ? 'text-red-500' : 'text-amber-550'}`}>● ACTIVE_DIFFUSE</span>
             ) : img.status === 'error' ? (
              <span className="font-mono text-[7px] uppercase tracking-widest text-red-500 font-bold">● REFRACTION_LOST</span>
             ) : (
              <span className={`font-mono text-[7px] uppercase tracking-widest ${safelight ? 'text-red-950' : 'text-stone-400 dark:text-stone-500'}`}>● LATENT</span>
             )}
            </div>

            {img.status === 'done' && img.resultUrl && (
             <button
              onClick={() => saveToPocket(img)}
              className={`px-2 py-1 border font-mono text-[7px] uppercase tracking-wider hover:opacity-90 transition-all rounded-xs ${safelight ? 'border-red-700 bg-red-950/25 text-red-400' : 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-950'}`}
             >
              Save to pocket
             </button>
            )}
           </div>

          </div>
         ))}
        </div>
       ) : (
        <div className={`border border-dashed p-12 text-center flex flex-col items-center justify-center aspect-square rounded-xs relative ${safelight ? 'border-red-950/40 bg-black/5' : 'border-stone-200 dark:border-stone-850 bg-stone-50/10'}`}>
         <Layers size={20} className={`mb-3 stroke-[1.2] ${safelight ? 'text-red-950' : 'text-stone-300 dark:text-stone-700'}`} />
         <p className={`font-serif italic text-xs ${safelight ? 'text-red-800' : 'text-stone-400'}`}>Carrier Tray is Empty</p>
         <p className={`text-[8px] font-mono uppercase tracking-widest mt-1 max-w-[200px] leading-relaxed ${safelight ? 'text-red-950' : 'text-stone-400 dark:text-stone-500'}`}>
          Load photographic specimens above to batch process aesthetics
         </p>
        </div>
       )}
      </div>

      {/* RIGHT COLUMN: APPLY PRESET REAGENTS (Sliders & saved presets) */}
      <div className="lg:col-span-4 space-y-6">
       <div className="flex items-center gap-2">
        <Sparkles size={14} className={safelight ? 'text-red-700' : 'text-stone-400'} />
        <h2 className={`text-[10px] font-mono uppercase tracking-[0.2em] font-bold ${safelight ? 'text-red-400' : 'text-stone-900 dark:text-stone-100'}`}>
         Select Preset Reagent
        </h2>
       </div>

       <div className={`border p-6 space-y-6 rounded-xs ${safelight ? 'border-red-950 bg-black/20' : 'border-stone-200 dark:border-stone-850'}`}>
        <div>
         <h3 className={`text-[8px] font-mono uppercase tracking-[0.18em] mb-3.5 font-bold ${safelight ? 'text-red-800' : 'text-stone-500 dark:text-stone-400'}`}>
          SAVED CHEMICAL PRESETS
         </h3>
         
         <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
          {profile?.savedTreatments?.length ? (
           profile.savedTreatments.map(t => (
            <button
             key={t.id}
             onClick={() => setSelectedTreatmentId(t.id)}
             className={`w-full text-left p-3.5 border transition-all flex items-center justify-between rounded-xs ${selectedTreatmentId === t.id ? (safelight ? 'border-red-500 bg-red-950/35 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-900') : (safelight ? 'border-red-950/60 bg-black/25 text-red-800 hover:border-red-800' : 'border-stone-200 dark:border-stone-800 hover:border-stone-400' )}`}
            >
             {/* Liquid container visual mapping preset density */}
             <div className="flex items-center gap-3">
              <div className={`w-1.5 h-8 rounded-full bg-stone-800 dark:bg-stone-950 overflow-hidden relative shrink-0 border ${safelight ? 'border-red-950' : 'border-stone-300'}`}>
               <div 
                className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500 ${safelight ? 'bg-red-500' : 'bg-stone-600 dark:bg-stone-300'}`}
                style={{ height: `${(t.canonicalTaste?.density || 0.6) * 100}%` }}
               />
              </div>
              <div>
               <p className={`font-serif italic text-sm ${selectedTreatmentId === t.id ? (safelight ? 'text-red-400' : 'text-stone-950 dark:text-stone-50') : (safelight ? 'text-red-900' : 'text-stone-600 dark:text-stone-400' )}`}>{t.treatmentName}</p>
               <p className={`text-[8px] font-mono mt-1 line-clamp-1 uppercase tracking-wider ${safelight ? 'text-red-950' : 'text-stone-400'}`}>
                {t.canonicalTaste?.motifs?.join(', ') || 'No defined motifs'}
               </p>
              </div>
             </div>
             {selectedTreatmentId === t.id && <Check size={14} className={safelight ? 'text-red-400' : 'text-stone-900 dark:text-stone-100'} />}
            </button>
           ))
          ) : (
           <p className={`text-[8.5px] font-mono uppercase tracking-widest italic text-center py-4 ${safelight ? 'text-red-950' : 'text-stone-400 dark:text-stone-500'}`}>
            No saved treatments found. Extract one first in the panel.
           </p>
          )}
         </div>
        </div>

        {selectedTreatmentId && (
         <div className={`pt-4 border-t space-y-5 ${safelight ? 'border-red-950/60' : 'border-stone-200 dark:border-stone-800'}`}>
          
          {/* Cover template binder lock */}
          <button
           onClick={toggleZineAesthetic}
           className={`flex items-center gap-2.5 text-[8.5px] font-mono uppercase tracking-widest transition-colors w-full rounded-xs ${safelight ? 'text-red-800 hover:text-red-400' : 'text-stone-500 hover:text-stone-955'}`}
          >
           {profile?.zineOptions?.selectedTreatmentId === selectedTreatmentId ? (
            <ToggleRight size={18} className={safelight ? 'text-red-500' : 'text-stone-900 dark:text-stone-100'} />
           ) : (
            <ToggleLeft size={18} className="opacity-55" />
           )}
           Bind this aesthetic to my Zines
          </button>

          {/* Chemical process launcher */}
          <button 
           onClick={processBatch}
           disabled={isBatchProcessing || batchImages.length === 0}
           className={`w-full py-4 text-[10px] font-mono uppercase tracking-[0.25em] font-bold transition-all flex items-center justify-center gap-2 border rounded-xs cursor-pointer
           ${isBatchProcessing || batchImages.length === 0 
            ? (safelight ? 'border-red-950/40 text-red-950/40 bg-black/10 cursor-not-allowed' : 'border-stone-200 dark:border-stone-850/60 text-stone-300 dark:text-stone-700 cursor-not-allowed') 
            : (safelight ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-950 hover:opacity-90' : 'border-stone-300 dark:border-stone-700 text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-900/50')}`}
          >
           {isBatchProcessing ? (
            <>
             <Activity size={14} className="animate-spin"/> Diffusing Emulsion...
            </>
           ) : (
            <>
             <Sparkles size={14} /> Run Nano Banana Edit
            </>
           )}
          </button>
         </div>
        )}
       </div>
      </div>

     </div>
    )}
   </div>
  </div>
 );

};

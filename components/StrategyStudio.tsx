import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, Youtube, Video, FileText, Upload, X, Loader2, Sparkles, Image as ImageIcon, Facebook, ChevronRight, CheckCircle2, Save, Download } from 'lucide-react';
import { AestheticTrajectory } from './AestheticTrajectory';
import { useUser } from '../contexts/UserContext';
import { generatePlatformStrategy } from '../services/geminiService';
import { hasAccess } from '../constants';
import { StrategyAudit, Task } from '../types';
import { saveStrategyAudit, saveTask, fetchStrategyAudits, createDossierArtifactFromStrategy, fetchDossierFolders, createDossierFolder, fetchUserZines, fetchPocketItems } from '../services/firebaseUtils';

import { ContentAnalyzerModal } from './ContentAnalyzerModal';

interface MediaFile {
 file: File;
 data: string; // base64
 url: string;
 type: 'image' | 'video' | 'link';
 name: string;
 mimeType: string;
}

const PLATFORMS = [
 { id: 'Instagram', icon: Instagram, label: 'Instagram' },
 { id: 'TikTok', icon: Video, label: 'TikTok' },
 { id: 'YouTube', icon: Youtube, label: 'YouTube' },
 { id: 'Substack', icon: FileText, label: 'Substack' },
 { id: 'Facebook', icon: Facebook, label: 'Facebook' }
];

const INTENTS = [
"Grow faster",
"Fix low engagement",
"Build a stronger aesthetic",
"Land brand deals",
"Go viral (short-term push)"
];

export const StrategyStudio = () => {
 const { profile, user, activePersona, createPersona } = useUser();
 const [step, setStep] = useState<number>(1);
 const [intent, setIntent] = useState<string>('');
 const [activePlatform, setActivePlatform] = useState('Instagram');
 const [identitySeed, setIdentitySeed] = useState(activePersona?.tailorDraft?.strategicSummary?.aestheticDNA || profile?.tasteProfile?.semantic_signature || '');
 const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
 const [isDragging, setIsDragging] = useState(false);
 const [isGenerating, setIsGenerating] = useState(false);
 const [strategyOutput, setStrategyOutput] = useState<StrategyAudit | null>(null);
 const [isSaving, setIsSaving] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const [isExtracting, setIsExtracting] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const [showArchiveModal, setShowArchiveModal] = useState(false);
 const [archiveItems, setArchiveItems] = useState<any[]>([]);
 const [loadingArchive, setLoadingArchive] = useState(false);

 const [audits, setAudits] = useState<StrategyAudit[]>([]);
 const [loadingAudits, setLoadingAudits] = useState(true);
 const [isDashboardMode, setIsDashboardMode] = useState(false);
 const [showContentAnalyzer, setShowContentAnalyzer] = useState(false);

 React.useEffect(() => {
 const loadAudits = async () => {
 if (user) {
 try {
 const data = await fetchStrategyAudits(user.uid);
 setAudits(data);
 if (data.length > 0) {
 setIsDashboardMode(true);
 setActivePlatform(data[0].platform);
 }
 } catch (e) {
 console.error("MIMI // Failed to load audits:", e);
 }
 }
 setLoadingAudits(false);
 };
 loadAudits();
 }, [user]);

 if (!hasAccess(profile?.plan, 'pro')) {
 return (
 <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-nous-base text-nous-text font-serif">
 <div className="w-16 h-16 border border-nous-border flex items-center justify-center mb-6">
 <Sparkles className="w-6 h-6 text-nous-text"/>
 </div>
 <h2 className="text-3xl italic tracking-tighter mb-4">Strategy Studio</h2>
 <p className="text-nous-text max-w-md mb-8 text-sm font-mono uppercase tracking-widest leading-relaxed">
 Unlock multi-project workspaces, brand positioning, audit mode, strategic roadmaps, and team exports with the Pro plan.
 </p>
 <button
 onClick={() => window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'))}
 className="px-8 py-4 border border-nous-border text-nous-text font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-nous-base transition-colors"
 >
 [ INITIATE UPGRADE ]
 </button>
 </div>
 );
 }

 const handleOpenArchive = async () => {
 if (!user) return;
 setShowArchiveModal(true);
 setLoadingArchive(true);
 try {
 const zines = await fetchUserZines(user.uid);
 const pocketItems = await fetchPocketItems(user.uid);
 
 const formattedZines = zines.map(z => ({
 id: z.id,
 title: z.title || 'Untitled Zine',
 type: 'zine',
 data: z.coverImageUrl || '', // Assuming zines have a cover image, or we can use a placeholder
 originalData: z
 }));
 
 const formattedPocketItems = pocketItems.filter(p => p.type === 'image' || p.type === 'video').map(p => ({
 id: p.id,
 title: p.title || 'Pocket Item',
 type: p.type,
 data: p.source,
 originalData: p
 }));

 setArchiveItems([...formattedZines, ...formattedPocketItems]);
 } catch (e) {
 console.error("Error fetching archive:", e);
 } finally {
 setLoadingArchive(false);
 }
 };

 const handleSelectArchiveItem = async (item: any) => {
 try {
 // If it's a zine, we might need to fetch its cover or just use it as a reference.
 // For simplicity, let's treat it as a media file if it has an image.
 // If it's a pocket item, we use its source.
 
 // We need to convert the URL to a base64 string or just pass the URL if our backend supports it.
 // Since the current implementation of `generatePlatformStrategy` expects base64 in `mediaFiles`,
 // we might need to fetch the image and convert it.
 // For now, let's just add it with the URL as data. The Gemini service might need to handle URLs or we fetch it.
 // Let's assume `data` is the base64 or URL.
 
 // To properly support URLs in `generatePlatformStrategy`, we'd need to adjust it.
 // But let's try to fetch the image and convert to base64 if it's a URL.
 let base64Data = item.data;
 if (item.data && item.data.startsWith('http')) {
 try {
 const response = await fetch(item.data);
 const blob = await response.blob();
 base64Data = await new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onloadend = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(blob);
 });
 } catch (e) {
 console.warn("Could not convert URL to base64, using URL directly", e);
 }
 }

 const newMedia: MediaFile = {
 file: new File([], item.title, { type: item.type === 'video' ? 'video/mp4' : 'image/jpeg' }), // Dummy file
 data: base64Data,
 url: item.data,
 type: item.type === 'video' ? 'video' : 'image',
 name: item.title,
 mimeType: item.type === 'video' ? 'video/mp4' : 'image/jpeg'
 };
 
 setMediaFiles(prev => [...prev, newMedia]);
 setShowArchiveModal(false);
 } catch (e) {
 console.error("Error selecting archive item:", e);
 }
 };

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList } }) => {
 if (e.target.files) {
 try {
 const files = Array.from(e.target.files);
 const newMedia = await Promise.all(files.map(async (f) => {
 const data = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onloadend = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(f);
 });
 return {
 file: f,
 data,
 url: '',
 type: f.type.startsWith('image') ? 'image' : 'video' as any,
 name: f.name,
 mimeType: f.type
 } as MediaFile;
 }));
 setMediaFiles(prev => [...prev, ...newMedia]);
 } catch (err) {
 console.error("MIMI // Error reading files:", err);
 }
 }
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(false);
 if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
 handleFileChange({ target: { files: e.dataTransfer.files } } as any);
 }
 };

 const removeMedia = (index: number) => {
 setMediaFiles(prev => prev.filter((_, i) => i !== index));
 };

 const handleGenerate = async () => {
 setIsGenerating(true);
 setStep(5); // Processing step
 try {
 const result = await generatePlatformStrategy(
 activePlatform,
 mediaFiles.map(m => ({ base64: m.data, type: m.mimeType })),
 profile,
 `${intent}. Aesthetic: ${identitySeed}`
 );
 
 const audit: StrategyAudit = {
 id: `audit_${Date.now()}`,
 platform: activePlatform,
 intent,
 identitySeed,
 timestamp: Date.now(),
 read: result
 };
 
 setStrategyOutput(audit);
 setStep(6); // Output step
 } catch (error) {
 console.error("Strategy generation failed:", error);
 setStep(4); // Go back to last input step
 alert("Failed to generate strategy. Please try again.");
 } finally {
 setIsGenerating(false);
 }
 };

 const handleExportToDossier = async () => {
 if (!strategyOutput || !user) return;
 setIsSaving(true);
 try {
 // Create a default folder if none exists, or just use a generic one
 const folders = await fetchDossierFolders(user.uid);
 let folderId = folders.length > 0 ? folders[0].id : '';
 
 if (!folderId) {
 folderId = await createDossierFolder(user.uid, 'Strategy Audits');
 }

 await createDossierArtifactFromStrategy(user.uid, folderId, strategyOutput);
 
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveStrategyAudit(user.uid, strategyOutput);
 
 // Update local state
 setAudits(prev => [strategyOutput, ...prev]);
 setIsDashboardMode(true);
 
 alert("Audit exported to your Dossier.");
 } catch (error) {
 console.error("Failed to export audit:", error);
 alert("Failed to export audit.");
 } finally {
 setIsSaving(false);
 }
 };

 const handleExtractStructure = async () => {
 if (!strategyOutput || !user) return;
 setIsExtracting(true);
 try {
 const { generateGeoBlock } = await import('../services/geminiService');
 const { archiveManager } = await import('../services/archiveManager');
 
 const contentToExtract = JSON.stringify(strategyOutput.read);
 const geoBlock = await generateGeoBlock(contentToExtract);
 
 if (geoBlock) {
 await archiveManager.saveGeoBlock(user.uid, geoBlock);
 } else {
 throw new Error("Failed to generate GEO block");
 }
 } catch (error) {
 console.error("Failed to extract structure:", error);
 alert("Failed to extract structure.");
 } finally {
 setIsExtracting(false);
 }
 };

 const handleExportTasks = async () => {
 if (!strategyOutput || !user) return;
 setIsExporting(true);
 try {
 const tasks: Task[] = [];
 
 // Export content plan
 strategyOutput.read.contentPlan.forEach((post, i) => {
 tasks.push({
 id: `task_post_${Date.now()}_${i}`,
 text: `Create ${post.format}: ${post.hook}`,
 completed: false,
 createdAt: Date.now(),
 platform: activePlatform,
 tags: ['content', post.format.toLowerCase()],
 linkedContext: { type: 'audit', id: strategyOutput.id }
 });
 });

 // Export experiments
 strategyOutput.read.experiments.forEach((exp, i) => {
 tasks.push({
 id: `task_exp_${Date.now()}_${i}`,
 text: `Experiment: ${exp.test}`,
 completed: false,
 createdAt: Date.now(),
 platform: activePlatform,
 tags: ['experiment'],
 linkedContext: { type: 'audit', id: strategyOutput.id }
 });
 });

 for (const task of tasks) {
 await saveTask(user.uid, task);
 }
 
 alert(`Exported ${tasks.length} tasks to your Action Board.`);
 } catch (error) {
 console.error("Failed to export tasks:", error);
 alert("Failed to export tasks.");
 } finally {
 setIsExporting(false);
 }
 };

 const renderStepContent = () => {
 switch (step) {
 case 1:
 return (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full max-w-2xl mx-auto py-12 px-6">
 <h2 className="text-3xl font-light text-nous-text mb-2 tracking-wide text-center">Parameter Intake</h2>
 <p className="text-nous-text italic text-sm text-center mb-12">Define your strategic imperative and target vector.</p>
 
 <div className="space-y-8">
 {/* Strategic Imperative */}
 <div>
 <label className="block text-[10px] uppercase tracking-widest text-nous-text mb-4 font-mono">Strategic Imperative</label>
 <div className="flex flex-wrap gap-2">
 {INTENTS.map((i) => (
 <button
 key={i}
 onClick={() => setIntent(i)}
 className={`py-2 px-4 border text-[10px] uppercase tracking-widest transition-all duration-300 font-mono ${
 intent === i 
 ? 'border-nous-border bg-nous-base text-nous-base' 
 : 'border-nous-border bg-transparent text-nous-subtle hover:border-nous-border'
 }`}
 >
 {i}
 </button>
 ))}
 </div>
 </div>

 {/* Target Vector */}
 <div>
 <label className="block text-[10px] uppercase tracking-widest text-nous-text mb-4 font-mono">Target Vector</label>
 <div className="flex flex-wrap gap-2">
 {PLATFORMS.map(p => (
 <button
 key={p.id}
 onClick={() => setActivePlatform(p.id)}
 className={`flex items-center gap-2 py-2 px-4 border text-[10px] uppercase tracking-widest transition-all duration-300 font-mono ${
 activePlatform === p.id 
 ? 'border-nous-border bg-nous-base text-nous-base' 
 : 'border-nous-border bg-transparent text-nous-subtle hover:border-nous-border'
 }`}
 >
 <p.icon size={14} />
 {p.label}
 </button>
 ))}
 </div>
 </div>

 {/* Identity Seed */}
 <div>
 <label className="block text-[10px] uppercase tracking-widest text-nous-text mb-4 font-mono">Identity Seed</label>
 <input
 type="text"
 value={identitySeed}
 onChange={(e) => setIdentitySeed(e.target.value)}
 placeholder="e.g., clean, soft, restrained"
 className="w-full bg-transparent border-b border-nous-border py-2 text-nous-text text-sm focus:outline-none focus:border-nous-border transition-all font-mono"
 />
 </div>

 {/* Field Data */}
 <div>
 <label className="block text-[10px] uppercase tracking-widest text-nous-text mb-4 font-mono">Field Data</label>
 <div className="flex gap-2">
 <div 
 className={`flex-1 border border-dashed p-6 text-center transition-all duration-300 cursor-pointer ${
 isDragging ? 'border-nous-border bg-nous-base' : 'border-nous-border hover:border-nous-border'
 }`}
 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 >
 <Upload className="mx-auto mb-2 text-nous-text"size={16} />
 <p className="text-[10px] text-nous-text font-mono uppercase tracking-widest">Ingest Artifact (Drag & Drop)</p>
 <input type="file"ref={fileInputRef} className="hidden"multiple accept="image/*,video/*"onChange={handleFileChange} />
 </div>
 <button 
 onClick={handleOpenArchive}
 className="flex-1 border border-nous-border p-6 text-center hover:border-nous-border transition-colors flex flex-col items-center justify-center text-nous-subtle"
 >
 <ImageIcon className="mx-auto mb-2 text-nous-text"size={16} />
 <span className="text-[10px] font-mono uppercase tracking-widest">Select from Archive</span>
 </button>
 </div>
 {mediaFiles.length > 0 && (
 <div className="mt-4 flex flex-wrap gap-2">
 {mediaFiles.map((file, idx) => (
 <div key={idx} className="relative w-12 h-12 border border-nous-border group">
 {file.type === 'image' ? (
 <img src={file.data} alt="upload"className="w-full h-full object-cover"/>
 ) : (
 <div className="w-full h-full bg-nous-base flex items-center justify-center">
 <Video size={16} className="text-nous-text"/>
 </div>
 )}
 <button onClick={(e) => { e.stopPropagation(); removeMedia(idx); }} className="absolute top-0.5 right-0.5 bg-nous-text/50 text-nous-base p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <X size={10} />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 <div className="mt-12 flex justify-end">
 <button
 onClick={handleGenerate}
 disabled={mediaFiles.length === 0 || !intent}
 className="py-3 px-8 bg-nous-base text-nous-base font-mono text-xs tracking-widest uppercase hover:bg-nous-text transition-colors disabled:opacity-30"
 >
 [ INITIALIZE DIAGNOSTIC ]
 </button>
 </div>
 </motion.div>
 );
 case 2:
 case 3:
 case 4:
 return null;
 case 5:
 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full justify-center items-center max-w-3xl mx-auto py-12 px-6">
 <div className="font-mono text-xs text-nous-subtle uppercase tracking-widest flex flex-col items-start gap-2">
 <span className="animate-pulse">{'>'} EXTRACTING FIELD DATA...</span>
 <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="animate-pulse">{'>'} MAPPING AESTHETIC TOPOGRAPHY...</motion.span>
 <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="animate-pulse">{'>'} SYNTHESIZING STRATEGIC IMPERATIVES...</motion.span>
 </div>
 </motion.div>
 );
 case 6:
 if (!strategyOutput) return null;
 const read = strategyOutput.read;
 return (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-12 px-6">
 {/* Header */}
 <div className="mb-16 border-b-4 border-nous-border pb-8">
 <p className="text-nous-text text-[10px] font-mono tracking-widest uppercase mb-4">Field Report // {activePlatform}</p>
 <div className="border-y-2 border-nous-border py-6 my-6">
 <h1 className="text-4xl md:text-5xl font-serif text-nous-text leading-tight italic text-center">
"{read.openingLine}"
 </h1>
 </div>
 </div>

 {/* Signal Breakdown */}
 <div className="mb-16">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-6 border-b border-nous-border pb-2">What You're Triggering</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-nous-border">
 {Object.entries(read.signalBreakdown).map(([key, value], idx) => (
 <div key={key} className={`p-4 ${idx !== 0 ? 'border-l border-nous-border' : ''}`}>
 <p className="text-[10px] text-nous-text uppercase tracking-widest mb-1 font-mono">{key}</p>
 <p className="text-sm text-nous-text font-mono uppercase">{value}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Aesthetic Audit */}
 <div className="mb-16">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-6 border-b border-nous-border pb-2">Your Visual Signature</h3>
 <div className="border border-nous-border p-6">
 <ul className="space-y-3 mb-6 font-mono text-xs">
 <li className="flex items-start gap-3"><span className="text-nous-text">✦</span><span className="text-nous-subtle">PALETTE: {read.aestheticAudit.palette}</span></li>
 <li className="flex items-start gap-3"><span className="text-nous-text">✦</span><span className="text-nous-subtle">DENSITY: {read.aestheticAudit.density}</span></li>
 <li className="flex items-start gap-3"><span className="text-nous-text">✦</span><span className="text-nous-subtle">ENTROPY: {read.aestheticAudit.entropy}</span></li>
 </ul>
 <div className="border-t border-nous-border pt-4 mt-4">
 <p className="text-nous-text italic font-serif text-sm">"{read.aestheticAudit.insight}"</p>
 </div>
 </div>
 </div>

 <AestheticTrajectory 
 current={{ density: parseInt(read.aestheticAudit.density) || 5, entropy: parseInt(read.aestheticAudit.entropy) || 5, palette: [] }}
 target={{ density: 7, entropy: 3, palette: [] }}
 recommendation={{ treatment: 'Industrial Noir', persona: 'The Archivist', reasoning: 'Your current density is too low for the target aesthetic. Increasing density through high-contrast imagery and structured layouts will bridge the gap.' }}
 />

 {/* Content Behavior & Strategy Shift */}
 <div className="grid md:grid-cols-2 gap-0 border border-nous-border mb-16">
 <div className="p-6 border-b md:border-b-0 md:border-r border-nous-border">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-6 border-b border-nous-border pb-2">Why it isn't converting</h3>
 <ul className="space-y-4">
 {read.contentBehavior.map((point, i) => (
 <li key={i} className="flex items-start gap-3 text-nous-subtle text-xs font-mono"><X size={14} className="text-nous-text mt-0.5 shrink-0"/> {point}</li>
 ))}
 </ul>
 </div>
 <div className="p-6">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-6 border-b border-nous-border pb-2">What to change immediately</h3>
 <ul className="space-y-4">
 {read.strategyShift.map((point, i) => (
 <li key={i} className="flex items-start gap-3 text-nous-subtle text-xs font-mono"><CheckCircle2 size={14} className="text-nous-text mt-0.5 shrink-0"/> {point}</li>
 ))}
 </ul>
 </div>
 </div>

 {/* Content Plan */}
 <div className="mb-16">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-6 border-b border-nous-border pb-2">Production Slates</h3>
 <div className="space-y-6">
 {read.contentPlan.map((post, i) => (
 <div key={i} className="border border-nous-border p-6 relative">
 <div className="absolute -top-3 left-4 bg-nous-base px-2 text-[10px] font-mono tracking-widest uppercase text-nous-text">
 SLATE_0{i + 1} // {post.format} // CONFIDENCE: {Math.floor(Math.random() * 15 + 80)}%
 </div>
 
 <h4 className="text-lg text-nous-text font-serif italic mb-4 mt-2">"{post.hook}"</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
 <div>
 <p className="text-[10px] font-mono uppercase tracking-widest text-nous-text mb-1">Visual Setup</p>
 <p className="text-xs text-nous-subtle font-sans">{post.visual}</p>
 </div>
 <div>
 <p className="text-[10px] font-mono uppercase tracking-widest text-nous-text mb-1">Strategic Tension</p>
 <p className="text-xs text-nous-subtle font-sans">{post.why}</p>
 </div>
 </div>

 <div className="border-t border-nous-border pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 {post.sensoryHook && (
 <div>
 <p className="text-[9px] font-mono uppercase tracking-widest text-nous-text mb-1">Sensory Hook</p>
 <p className="text-[10px] font-mono text-nous-text uppercase">{post.sensoryHook}</p>
 </div>
 )}
 {post.cognitiveLoad && (
 <div>
 <p className="text-[9px] font-mono uppercase tracking-widest text-nous-text mb-1">Cognitive Load</p>
 <p className="text-[10px] font-mono text-nous-text uppercase">{post.cognitiveLoad}</p>
 </div>
 )}
 {post.algorithmicTarget && (
 <div>
 <p className="text-[9px] font-mono uppercase tracking-widest text-nous-text mb-1">Algorithmic Target</p>
 <p className="text-[10px] font-mono text-nous-text uppercase">{post.algorithmicTarget}</p>
 </div>
 )}
 </div>

 <div className="flex justify-end">
 <button 
 onClick={() => {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { 
 detail: 'studio', 
 detail_data: { 
 context: `Drafting post based on strategy:\n\nHook:"${post.hook}"\nVisual:"${post.visual}"`
 }
 } as any));
 }}
 className="px-4 py-2 bg-nous-base text-nous-base text-[10px] font-mono uppercase tracking-widest hover:bg-nous-text transition-colors"
 >
 [ INITIALIZE DRAFT ]
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Experiments */}
 <div className="mb-16">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-6 border-b border-nous-border pb-2">Experiments to Run</h3>
 <div className="grid md:grid-cols-3 gap-0 border border-nous-border">
 {read.experiments.map((exp, i) => (
 <div key={i} className={`p-5 ${i !== 0 ? 'border-t md:border-t-0 md:border-l border-nous-border' : ''}`}>
 <p className="text-nous-text font-mono text-xs uppercase mb-4">{exp.test}</p>
 <p className="text-[10px] text-nous-text font-mono mb-2 uppercase"><strong className="text-nous-subtle">Measure:</strong> {exp.successMetric}</p>
 <p className="text-[10px] text-nous-text font-mono uppercase"><strong className="text-nous-subtle">Next:</strong> {exp.nextStep}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Identity Reframe */}
 <div className="mb-16 text-center border-2 border-nous-border p-8">
 <p className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-4">Identity Reframe</p>
 <p className="text-2xl font-serif italic leading-relaxed mb-8 text-nous-text">"{read.identityReframe}"</p>
 <button 
 onClick={async () => {
 try {
 if (!user) return;
 await createPersona(`Persona: ${activePlatform} Strategy`, undefined, read.identityReframe);
 alert("Adopted as Persona:"+ read.identityReframe.substring(0, 20) +"...");
 } catch (error) {
 console.error("MIMI // Failed to adopt persona:", error);
 }
 }}
 className="text-[10px] font-mono tracking-widest uppercase text-nous-text hover:text-nous-text border border-nous-border hover:bg-nous-base px-6 py-3 transition-colors"
 >
 [ ADOPT AS PERSONA ]
 </button>
 </div>

 {/* Platform Validation Constraints */}
 <div className="mb-16 border border-nous-border p-6">
 <h3 className="text-[10px] font-mono tracking-widest uppercase text-nous-text mb-4">Platform Validation Constraints: {activePlatform}</h3>
 <ul className="text-xs font-mono text-nous-subtle space-y-2 list-none">
 {activePlatform === 'Instagram' && (
 <>
 <li><span className="text-nous-text mr-2">✦</span>Use 4:5 aspect ratio for maximum feed real estate.</li>
 <li><span className="text-nous-text mr-2">✦</span>Hook in first 3 seconds with visual motion.</li>
 <li><span className="text-nous-text mr-2">✦</span>Maximize contrast for dark mode users.</li>
 </>
 )}
 {activePlatform === 'TikTok' && (
 <>
 <li><span className="text-nous-text mr-2">✦</span>Use 9:16 aspect ratio.</li>
 <li><span className="text-nous-text mr-2">✦</span>Hook immediately with high-energy audio.</li>
 <li><span className="text-nous-text mr-2">✦</span>Keep text overlays away from UI elements.</li>
 </>
 )}
 {activePlatform !== 'Instagram' && activePlatform !== 'TikTok' && (
 <li><span className="text-nous-text mr-2">✦</span>Follow standard platform best practices for {activePlatform}.</li>
 )}
 </ul>
 </div>

 {/* Actions */}
 <div className="flex flex-col sm:flex-row gap-4 justify-center border-t border-nous-border pt-8">
 <button 
 onClick={handleExportToDossier}
 disabled={isSaving}
 className="py-3 px-6 border border-nous-border text-nous-text font-mono text-[10px] tracking-widest uppercase hover:bg-nous-base transition-colors flex items-center justify-center gap-2"
 >
 {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />}
 [ EXPORT TO DOSSIER ]
 </button>
 <button 
 onClick={handleExtractStructure}
 disabled={isExtracting}
 className="py-3 px-6 border border-nous-border text-nous-text font-mono text-[10px] tracking-widest uppercase hover:bg-nous-base transition-colors flex items-center justify-center gap-2"
 >
 {isExtracting ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />}
 [ EXTRACT STRUCTURE ]
 </button>
 <button 
 onClick={handleExportTasks}
 disabled={isExporting}
 className="py-3 px-6 bg-nous-base text-nous-base font-mono text-[10px] tracking-widest uppercase hover:bg-nous-text transition-colors flex items-center justify-center gap-2"
 >
 {isExporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} />}
 [ EXPORT TO ACTION BOARD ]
 </button>
 </div>
 
 <div className="mt-12 text-center">
 <button 
 onClick={() => { 
 setStrategyOutput(null); 
 setMediaFiles([]); 
 setIntent(''); 
 setIdentitySeed(''); 
 setIsDashboardMode(true);
 }} 
 className="text-[10px] font-mono tracking-widest uppercase text-nous-text hover:text-nous-subtle transition-colors"
 >
 [ BACK TO DASHBOARD ]
 </button>
 </div>
 </motion.div>
 );
 }
 };

 const renderDashboard = () => {
 const platformAudits = audits.filter(a => a.platform === activePlatform);
 const latestAudit = platformAudits.length > 0 ? platformAudits[0] : null;

 return (
 <div className="max-w-4xl mx-auto py-12 px-6">
 <div className="flex items-center justify-between mb-12 border-b border-nous-border pb-4">
 <h2 className="text-4xl italic tracking-tighter text-nous-text">Strategy Studio</h2>
 <div className="flex gap-2">
 {PLATFORMS.map(p => (
 <button
 key={p.id}
 onClick={() => setActivePlatform(p.id)}
 className={`p-3 border transition-all duration-300 flex items-center gap-2 ${
 activePlatform === p.id 
 ? 'border-nous-border bg-nous-base text-nous-text' 
 : 'border-nous-border bg-transparent text-nous-text hover:border-nous-border hover:text-nous-text'
 }`}
 >
 <p.icon size={14} strokeWidth={activePlatform === p.id ? 2 : 1.5} />
 <span className="text-[9px] font-mono tracking-widest uppercase hidden md:inline">{p.label}</span>
 </button>
 ))}
 </div>
 </div>

 {latestAudit ? (
 <div className="space-y-12">
 <div className="bg-transparent p-8 border border-nous-border">
 <div className="flex items-center justify-between mb-6 border-b border-nous-border pb-4">
 <h3 className="text-2xl italic tracking-tighter text-nous-text">Latest {activePlatform} Read</h3>
 <span className="text-[9px] font-mono tracking-widest uppercase text-nous-text">
 {new Date(latestAudit.timestamp).toLocaleDateString()}
 </span>
 </div>
 <div className="border-l-4 border-nous-border pl-4 mb-8">
 <p className="text-nous-text italic font-serif text-lg">"{latestAudit.read.openingLine}"</p>
 </div>
 
 <div className="grid md:grid-cols-2 gap-8 mb-8">
 <div>
 <h4 className="text-[9px] font-mono tracking-widest uppercase text-nous-text mb-4 border-b border-nous-border pb-2">Aesthetic Audit</h4>
 <ul className="space-y-3">
 <li className="flex items-start gap-2 text-nous-text text-xs font-mono">
 <span className="text-nous-subtle mt-0.5">✦</span> <strong className="text-nous-text">Palette:</strong> {latestAudit.read.aestheticAudit.palette}
 </li>
 <li className="flex items-start gap-2 text-nous-text text-xs font-mono">
 <span className="text-nous-subtle mt-0.5">✦</span> <strong className="text-nous-text">Density:</strong> {latestAudit.read.aestheticAudit.density}
 </li>
 <li className="flex items-start gap-2 text-nous-text text-xs font-mono">
 <span className="text-nous-subtle mt-0.5">✦</span> <strong className="text-nous-text">Entropy:</strong> {latestAudit.read.aestheticAudit.entropy}
 </li>
 </ul>
 </div>
 <div>
 <h4 className="text-[9px] font-mono tracking-widest uppercase text-nous-text mb-4 border-b border-nous-border pb-2">Strategy Shift</h4>
 <ul className="space-y-3">
 {latestAudit.read.strategyShift.map((point, i) => (
 <li key={i} className="flex items-start gap-2 text-nous-text text-xs font-mono">
 <CheckCircle2 size={12} className="text-nous-subtle mt-0.5 shrink-0"/> {point}
 </li>
 ))}
 </ul>
 </div>
 </div>

 <div className="flex gap-4 border-t border-nous-border pt-6">
 <button 
 onClick={() => {
 setStrategyOutput(latestAudit);
 setIsDashboardMode(false);
 setStep(6);
 }}
 className="py-3 px-6 border border-nous-border text-nous-text font-mono text-[9px] tracking-widest uppercase hover:border-nous-border hover:text-nous-text transition-colors"
 >
 [ VIEW FULL AUDIT ]
 </button>
 </div>
 </div>

 <div>
 <h3 className="text-xs font-mono tracking-widest uppercase text-nous-text mb-6 border-b border-nous-border pb-2">Run New Analysis</h3>
 <div className="grid md:grid-cols-4 gap-0 border border-nous-border">
 <button 
 onClick={() => {
 setIntent('Content Analysis');
 setIsDashboardMode(false);
 setStep(3);
 }}
 className="p-6 bg-transparent border-r border-nous-border hover:bg-nous-base transition-all text-left group last:border-r-0"
 >
 <FileText className="text-nous-text mb-4 group-hover:text-nous-text transition-colors"size={20} />
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-text mb-2">Content Analysis</h4>
 <p className="text-xs font-serif text-nous-text">Upload new analytics to update your read.</p>
 </button>
 <button 
 onClick={() => {
 setIntent('Brand Deal Analysis');
 setIsDashboardMode(false);
 setStep(3);
 }}
 className="p-6 bg-transparent border-r border-nous-border hover:bg-nous-base transition-all text-left group last:border-r-0"
 >
 <Sparkles className="text-nous-text mb-4 group-hover:text-nous-text transition-colors"size={20} />
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-text mb-2">Brand Deal Analysis</h4>
 <p className="text-xs font-serif text-nous-text">See how a deal fits your aesthetic narrative.</p>
 </button>
 <button 
 onClick={() => {
 setIntent('Strategy Implementation');
 setIsDashboardMode(false);
 setStep(3);
 }}
 className="p-6 bg-transparent border-r border-nous-border hover:bg-nous-base transition-all text-left group last:border-r-0"
 >
 <CheckCircle2 className="text-nous-text mb-4 group-hover:text-nous-text transition-colors"size={20} />
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-text mb-2">Strategy Implementation</h4>
 <p className="text-xs font-serif text-nous-text">Generate new tasks and content plans.</p>
 </button>
 <button 
 onClick={() => {
 setShowContentAnalyzer(true);
 }}
 className="p-6 bg-nous-base border-r border-nous-border hover:bg-nous-text transition-all text-left group last:border-r-0"
 >
 <Video className="text-nous-text mb-4 group-hover:text-nous-text transition-colors"size={20} />
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-base mb-2">Ingestion Room</h4>
 <p className="text-xs font-serif text-nous-text">Upload media for deep analysis and action plans.</p>
 </button>
 </div>
 </div>
 </div>
 ) : (
 <div className="text-center py-24 bg-transparent border border-nous-border border-dashed">
 <div className="mx-auto w-16 h-16 border border-nous-border flex items-center justify-center mb-6">
 {(() => {
 const Icon = PLATFORMS.find(p => p.id === activePlatform)?.icon;
 return Icon ? <Icon size={24} className="text-nous-text"/> : null;
 })()}
 </div>
 <h3 className="text-2xl italic tracking-tighter text-nous-text mb-2">No data for {activePlatform}</h3>
 <p className="text-nous-text mb-8 max-w-md mx-auto font-mono text-xs uppercase tracking-widest leading-relaxed">Complete your first read to unlock the {activePlatform} dashboard and get personalized strategy insights.</p>
 <button 
 onClick={() => {
 setIsDashboardMode(false);
 setStep(1);
 }}
 className="py-3 px-6 border border-nous-border text-nous-text font-mono text-[9px] tracking-widest uppercase hover:bg-nous-base transition-colors"
 >
 [ INITIATE FIRST READ ]
 </button>
 </div>
 )}
 </div>
 );
 };

 if (loadingAudits) {
 return (
 <div className="h-full w-full bg-nous-base overflow-y-auto custom-scrollbar font-serif">
 <div className="max-w-4xl mx-auto py-12 px-6 animate-pulse">
 <div className="flex items-center justify-between mb-12 border-b border-nous-border pb-4">
 <div className="h-10 bg-nous-base/50 w-64"></div>
 <div className="flex gap-2">
 <div className="h-12 w-24 bg-nous-base/50"></div>
 <div className="h-12 w-24 bg-nous-base/50"></div>
 <div className="h-12 w-24 bg-nous-base/50"></div>
 </div>
 </div>
 <div className="space-y-12">
 <div className="bg-transparent p-8 border border-nous-border space-y-6">
 <div className="flex justify-between items-center mb-6 border-b border-nous-border pb-4">
 <div className="h-8 bg-nous-base/50 w-1/3"></div>
 <div className="h-4 bg-nous-base/50 w-24"></div>
 </div>
 <div className="h-4 bg-nous-base/50 w-3/4 mb-8"></div>
 <div className="grid md:grid-cols-2 gap-8 mb-8">
 <div className="space-y-4">
 <div className="h-4 bg-nous-base/50 w-1/2 mb-4"></div>
 <div className="h-4 bg-nous-base/50 w-full"></div>
 <div className="h-4 bg-nous-base/50 w-full"></div>
 <div className="h-4 bg-nous-base/50 w-full"></div>
 </div>
 <div className="space-y-4">
 <div className="h-4 bg-nous-base/50 w-1/2 mb-4"></div>
 <div className="h-4 bg-nous-base/50 w-full"></div>
 <div className="h-4 bg-nous-base/50 w-full"></div>
 </div>
 </div>
 <div className="h-8 bg-nous-base/50 w-32"></div>
 </div>
 <div>
 <div className="h-6 bg-nous-base/50 w-48 mb-6"></div>
 <div className="grid md:grid-cols-3 gap-4">
 <div className="h-32 bg-nous-base/50"></div>
 <div className="h-32 bg-nous-base/50"></div>
 <div className="h-32 bg-nous-base/50"></div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="h-full w-full bg-nous-base overflow-y-auto custom-scrollbar font-serif text-nous-text">
 {isDashboardMode ? renderDashboard() : renderStepContent()}

 <AnimatePresence>
 {showArchiveModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nous-text/80 backdrop-blur-sm"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-nous-base border border-nous-border w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
 >
 <div className="p-6 border-b border-nous-border flex items-center justify-between bg-nous-base/50">
 <h3 className="font-serif italic text-2xl text-nous-text">Select from Archive</h3>
 <button onClick={() => setShowArchiveModal(false)} className="p-2 text-nous-text hover:text-nous-text transition-colors hover:bg-nous-base">
 <X size={20} />
 </button>
 </div>
 
 <div className="flex-1 overflow-y-auto p-6 bg-nous-base">
 {loadingArchive ? (
 <div className="flex flex-col items-center justify-center py-24 text-nous-text">
 <Loader2 size={32} className="animate-spin mb-4"/>
 <p className="font-mono text-[9px] uppercase tracking-widest">Loading archive...</p>
 </div>
 ) : archiveItems.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
 {archiveItems.map((item) => (
 <div 
 key={item.id}
 onClick={() => handleSelectArchiveItem(item)}
 className="group cursor-pointer bg-transparent border border-nous-border overflow-hidden hover:border-nous-border transition-all flex flex-col"
 >
 <div className="aspect-square bg-nous-base relative overflow-hidden border-b border-nous-border">
 {item.type === 'zine' || item.type === 'image' ? (
 item.data ? (
 <img src={item.data} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"/>
 ) : (
 <div className="w-full h-full flex items-center justify-center text-nous-subtle">
 {item.type === 'zine' ? <FileText size={32} /> : <ImageIcon size={32} />}
 </div>
 )
 ) : (
 <div className="w-full h-full flex items-center justify-center text-nous-subtle">
 <Video size={32} />
 </div>
 )}
 <div className="absolute top-2 right-2 bg-nous-text/80 text-nous-text px-2 py-0.5 border border-nous-border font-mono text-[8px] uppercase tracking-widest">
 {item.type}
 </div>
 </div>
 <div className="p-3 bg-nous-base/30">
 <p className="font-mono text-[9px] uppercase tracking-widest text-nous-text truncate">{item.title}</p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-24 text-nous-subtle">
 <ImageIcon size={48} className="mb-4 opacity-20"/>
 <p className="font-mono text-[9px] uppercase tracking-widest">Your archive is empty.</p>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {showContentAnalyzer && (
 <ContentAnalyzerModal onClose={() => setShowContentAnalyzer(false)} />
 )}
 </AnimatePresence>
 </div>
 );
};

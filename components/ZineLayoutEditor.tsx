
// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZinePage, EditorElement, EditorElementStyle, ToneTag, Treatment, MaterialityConfig } from '../types';
import { MaterialityPanel } from './MaterialityPanel';
import { Type, Box, X, Check, Trash2, Plus, Image as ImageIcon, RotateCw, AlignLeft, AlignCenter, AlignRight, Italic, ChevronsUp, ChevronsDown, Bold, SlidersHorizontal, History, Maximize, Move, Layers, Type as FontIcon, ChevronUp, ChevronDown, Palette, Sparkles, Wand2, Info, Volume2, Loader2, AlertCircle, EyeOff, Crown, Link as LinkIcon, Radar, Fingerprint, Droplet, Hash, ExternalLink, Download, FileImage, FileText, Save, FolderOpen, Ratio, Crop, ScanLine } from 'lucide-react';
import { getAspectRatioForTone, generateAudio, generateSemioticSignals, analyzeMiseEnScene, checkAestheticViolation, applyTreatment } from '../services/geminiService';
import { fetchPocketItems } from '../services/firebase';
import { SemanticSteps } from './SemanticSteps';
import { Tooltip } from './Tooltip';
import { TitleLegend } from './TitleLegend';
import { useUser } from '../contexts/UserContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ZineLayoutEditorProps {
 page: ZinePage;
 tone: ToneTag;
 initialTitle?: string;
 onSave: (elements: EditorElement[], trace?: { timestamp: number; note: string }[], metadata?: any) => void;
 onCancel: () => void;
}

const FONT_FAMILIES = [
 { id: 'serif', label: 'Editorial Serif', css: 'Cormorant Garamond' },
 { id: 'sans', label: 'Space Grotesk', css: 'Space Grotesk' },
 { id: 'mono', label: 'Space Mono', css: 'Space Mono' },
 { id: 'brutalist', label: 'Brutalist', css: 'Anton' }
];

const COLORS = [
 { id: 'noir', hex: '#1C1917', label: 'Noir' },
 { id: 'white', hex: '#FFFFFF', label: 'Void' },
 { id: 'subtle', hex: '#A8A29E', label: 'Debris' },
 { id: 'signal', hex: '#78716c', label: 'Signal' },
 { id: 'caution', hex: '#F59E0B', label: 'Audit' },
 { id: 'error', hex: '#EF4444', label: 'Breach' }
];

const IMAGE_FILTERS = [
 { name: 'Raw', value: 'none', icon: '✦' },
 { name: 'Ghost', value: 'grayscale(100%) brightness(110%) contrast(90%)', icon: '👻' },
 { name: 'Archive', value: 'sepia(80%) contrast(80%) brightness(105%)', icon: '📜' },
 { name: 'Negative', value: 'invert(100%) contrast(120%)', icon: '🌗' },
 { name: 'Editorial', value: 'contrast(160%) brightness(80%) saturate(0%)', icon: '📸' },
 { name: 'Soft', value: 'blur(3px) brightness(1.1) grayscale(30%)', icon: '☁️' }
];

const initializeElements = (page: ZinePage, defaultFont: string): EditorElement[] => {
 if (page.customLayout?.elements && page.customLayout.elements.length > 0) {
 return page.customLayout.elements.map(el => ({ ...el, style: { ...el.style } }));
 }
 const els: EditorElement[] = [];
 const getId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
 
 if (page.pageType === 'thread_timeline' && page.threadData) {
 // Layout for thread timeline
 if (page.headline) {
 els.push({ id: getId('headline'), type: 'text', content: page.headline, style: { top: 5, left: 10, width: 80, zIndex: 10, fontSize: 2.2, fontFamily: defaultFont, color: 'inherit', textAlign: 'left', fontStyle: 'italic', fontWeight: '900', opacity: 1, rotation: 0, lineHeight: 1.1 } });
 }
 if (page.threadData.commentary) {
 els.push({ id: getId('commentary'), type: 'text', content: page.threadData.commentary, style: { top: 15, left: 10, width: 80, zIndex: 8, fontSize: 1.1, fontFamily: defaultFont, color: 'inherit', textAlign: 'left', fontStyle: 'normal', fontWeight: '400', opacity: 1, rotation: 0, lineHeight: 1.4 } });
 }
 
 // Layout artifacts in a grid/timeline
 const artifacts = page.threadData.artifacts || [];
 const maxArtifacts = Math.min(artifacts.length, 4);
 for (let i = 0; i < maxArtifacts; i++) {
 const art = artifacts[i];
 const topOffset = 35 + (i * 15);
 
 if (art.type === 'image' && art.media_url) {
 els.push({ id: getId(`art_img_${i}`), type: 'image', content: art.media_url, style: { top: topOffset, left: 10, width: 20, height: 12, zIndex: 5, opacity: 1, objectFit: 'cover', filter: 'none', rotation: 0 } });
 els.push({ id: getId(`art_txt_${i}`), type: 'text', content: art.content_preview || '', style: { top: topOffset, left: 35, width: 55, zIndex: 6, fontSize: 0.8, fontFamily: defaultFont, color: 'inherit', textAlign: 'left', fontStyle: 'normal', fontWeight: '400', opacity: 0.7, rotation: 0, lineHeight: 1.2 } });
 } else {
 els.push({ id: getId(`art_txt_${i}`), type: 'text', content: art.content_preview || art.content || '', style: { top: topOffset, left: 10, width: 80, zIndex: 6, fontSize: 0.9, fontFamily: defaultFont, color: 'inherit', textAlign: 'left', fontStyle: 'italic', fontWeight: '400', opacity: 0.8, rotation: 0, lineHeight: 1.3 } });
 }
 }
 return els;
 }

 if (page.originalMediaUrl) {
 els.push({ id: getId('img'), type: 'image', content: page.originalMediaUrl, negativePrompt: page.negativePrompt, style: { top: 10, left: 10, width: 80, height: 80, zIndex: 0, opacity: 1, objectFit: 'cover', filter: 'none', rotation: 0 } });
 }
 if (page.headline) {
 els.push({ id: getId('headline'), type: 'text', content: page.headline, style: { top: 15, left: 15, width: 70, zIndex: 10, fontSize: 3.0, fontFamily: defaultFont, color: 'inherit', textAlign: 'left', fontStyle: 'italic', fontWeight: '900', opacity: 1, rotation: 0, lineHeight: 1.0 } });
 }
 if (page.bodyCopy) {
 els.push({ id: getId('body'), type: 'text', content: page.bodyCopy, style: { top: 50, left: 15, width: 50, zIndex: 8, fontSize: 1.0, fontFamily: defaultFont, color: 'inherit', textAlign: 'left', fontStyle: 'normal', fontWeight: '400', opacity: 0.8, rotation: 0, lineHeight: 1.6 } });
 }
 return els;
};

export const ZineLayoutEditor: React.FC<ZineLayoutEditorProps> = ({ page, tone, initialTitle ="Untitled Manifest", onSave, onCancel }) => {
 const { profile, user } = useUser();
 const tailorDraft = profile?.tailorDraft;
 const defaultFontFamily = tailorDraft?.expressionEngine?.typographyIntent?.styleDescription || 'Inter';
 const [elements, setElements] = useState<EditorElement[]>(() => initializeElements(page, defaultFontFamily));
 const [zineTitle, setZineTitle] = useState(initialTitle);
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [trace, setTrace] = useState(() => (page.customLayout?.editTrace || []));
 const [activeTab, setActiveTab] = useState<'fragments' | 'style' | 'trace' | 'materiality'>('fragments');
 const [materialityConfig, setMaterialityConfig] = useState<MaterialityConfig>(() => {
 return profile?.tailorDraft?.materialityConfig || {
 paperStock: 'newsprint',
 typographyLineage: 'editorial-serif',
 negativeSpaceDensity: 5
 };
 });
 const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
 const [drawerOpen, setDrawerOpen] = useState(false);
 const [isGeneratingSignals, setIsGeneratingSignals] = useState(false);
 const [sovereignTreatments, setSovereignTreatments] = useState<Treatment[]>([]);
 const [suggestedThread, setSuggestedThread] = useState<any | null>(null);
 
 // Analysis State
 const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
 const [imageAnalysis, setImageAnalysis] = useState<{ directors_note: string, cultural_parallel: string } | null>(null);
 
 // Export State
 const [isExporting, setIsExporting] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [showExportMenu, setShowExportMenu] = useState(false);

 const containerRef = useRef<HTMLDivElement>(null);
 const imageUploadRef = useRef<HTMLInputElement>(null);
 const [isDragging, setIsDragging] = useState(false);
 const [isResizing, setIsResizing] = useState(false);
 const [isRotating, setIsRotating] = useState(false);
 const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
 const [initialStyle, setInitialStyle] = useState<EditorElementStyle | null>(null);
 const [ratioW, ratioH] = getAspectRatioForTone(tone).split(':').map(Number);

 useEffect(() => {
 setElements(prev => {
 if (!prev.some(el => el.content === 'The Signal Is The Message')) {
 return [...prev, {
 id: `signal_msg_${Date.now()}`,
 type: 'text',
 content: 'The Signal Is The Message',
 style: {
 top: 40,
 left: 10,
 width: 80,
 zIndex: 50,
 fontSize: 3.5,
 fontFamily: 'Anton',
 color: '#10B981',
 textAlign: 'center',
 fontWeight: '900',
 opacity: 0.9,
 rotation: -2,
 lineHeight: 1,
 backgroundColor: 'rgba(0,0,0,0.8)',
 padding: 24,
 mixBlendMode: 'normal'
 }
 }];
 }
 return prev;
 });
 }, []);

 useEffect(() => {
 document.body.style.overflow = 'hidden';
 return () => {
 document.body.style.overflow = '';
 };
 }, []);

 useEffect(() => {
 const handleResize = () => setIsMobile(window.innerWidth < 1024);
 window.addEventListener('resize', handleResize);
 const loadTreatments = async () => {
 if (!user) return;
 try {
 const items = await fetchPocketItems(user.uid);
 setSovereignTreatments(items.filter(i => i.type === 'treatment').map(i => i.content as Treatment));
 } catch (e) {}
 };
 loadTreatments();
 return () => window.removeEventListener('resize', handleResize);
 }, [user]);

 // Reset analysis when selection changes
 useEffect(() => {
 setImageAnalysis(null);
 setIsAnalyzingImage(false);
 
 // Simulate finding a thread when an image is selected
 if (selectedId) {
 const el = elements.find(e => e.id === selectedId);
 if (el && el.type === 'image' && Math.random() > 0.5) {
 setSuggestedThread({
 id: `thread_${Date.now()}`,
 narrative:"This artifact resonates with a deeper pattern in your archive.",
 artifacts: []
 });
 } else {
 setSuggestedThread(null);
 }
 } else {
 setSuggestedThread(null);
 }
 }, [selectedId, elements]);

 const addTrace = useCallback((note: string) => { setTrace(prev => [...prev, { timestamp: Date.now(), note }]); }, []);
 const handleCommit = async () => { 
 setIsSaving(true);
 const imgEl = elements.find(el => el.type === 'image'); 
 try {
 await onSave(elements, trace, { negativePrompt: imgEl?.negativePrompt, title: zineTitle, materialityConfig }); 
 } catch (e) {
 console.error("MIMI // Commit failed", e);
 } finally {
 setTimeout(() => setIsSaving(false), 1500);
 }
 };
 
 const handleGenerateSignals = async () => { 
 if (isGeneratingSignals) return; 
 setIsGeneratingSignals(true); 
 try { 
 const signals = await generateSemioticSignals(profile); 
 signals.forEach((sig, i) => addElement('signal', sig.text, sig.query, 60 + (i * 8), 10 + (i * 5))); 
 addTrace(`Manifested ${signals.length} high-fidelity semiotic markers.`); 
 } catch (e) {
 console.error("MIMI // Signal generation failed", e);
 } finally { setIsGeneratingSignals(false); } 
 };

 const handleAnalyzeImage = async () => {
 const el = elements.find(e => e.id === selectedId);
 if (!el || el.type !== 'image') return;
 
 setIsAnalyzingImage(true);
 setImageAnalysis(null);
 
 try {
 const src = el.content;
 let base64 = '';
 let mimeType = 'image/jpeg';
 
 if (src.startsWith('data:')) {
 const parts = src.split(',');
 base64 = parts[1];
 mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
 } else {
 // Assume it's a URL or invalid for now, skipping real analysis for non-data URIs 
 // (In production, would need to fetch blob and convert)
 console.warn("MIMI // Image Analysis: Remote URLs not yet supported for direct analysis in editor.");
 setIsAnalyzingImage(false);
 return;
 }

 const result = await analyzeMiseEnScene(base64, mimeType, profile);
 setImageAnalysis(result);
 addTrace(`Analyzed visual shard: ${result?.directors_note?.slice(0, 30)}...`);
 } catch (e) {
 console.error("MIMI // Analysis Failed", e);
 } finally {
 setIsAnalyzingImage(false);
 }
 };

 const handleSaveDraft = () => {
 const draftState = {
 elements,
 title: zineTitle,
 trace,
 timestamp: Date.now()
 };
 localStorage.setItem('mimi_layout_draft', JSON.stringify(draftState));
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Layout Draft Anchored.", icon: <Save size={14} /> } 
 }));
 };

 const handleLoadDraft = () => {
 const saved = localStorage.getItem('mimi_layout_draft');
 if (!saved) {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"No Draft Signal Found.", type: 'error' } 
 }));
 return;
 }
 try {
 const parsed = JSON.parse(saved);
 if (parsed.elements) setElements(parsed.elements);
 if (parsed.title) setZineTitle(parsed.title);
 if (parsed.trace) setTrace(parsed.trace);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Draft Restored.", icon: <FolderOpen size={14} /> } 
 }));
 } catch(e) {
 console.error(e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Draft Corrupted.", type: 'error' } 
 }));
 }
 };

 const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
 if (!containerRef.current) return;
 setIsExporting(true);
 setShowExportMenu(false);
 setSelectedId(null); // Deselect elements to hide handles

 try {
 await new Promise(r => setTimeout(r, 100)); // Render stability wait

 const canvas = await html2canvas(containerRef.current, {
 scale: 3, // High resolution export
 useCORS: true,
 allowTaint: true,
 backgroundColor: null,
 logging: false
 });

 const filename = `${(zineTitle || 'Mimi_Layout').replace(/\s+/g, '_')}_${Date.now()}`;

 if (format === 'pdf') {
 const orientation = canvas.width > canvas.height ? 'l' : 'p';
 const pdf = new jsPDF({
 orientation,
 unit: 'px',
 format: [canvas.width, canvas.height]
 });
 const imgData = canvas.toDataURL('image/jpeg', 1.0);
 pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
 pdf.save(`${filename}.pdf`);
 } else {
 const mime = format === 'png' ? 'image/png' : 'image/jpeg';
 const link = document.createElement('a');
 link.href = canvas.toDataURL(mime, 1.0);
 link.download = `${filename}.${format}`;
 link.click();
 }
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message: `Section Exported as ${format.toUpperCase()}.`, icon: <Download size={14} /> } 
 }));
 } catch (e) {
 console.error("Export Failed", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Export Failed.", type: 'error' } 
 }));
 } finally {
 setIsExporting(false);
 }
 };

 const handlePointerMove = useCallback((e) => {
 if ((!isDragging && !isResizing && !isRotating) || !selectedId || !initialStyle || !containerRef.current) return;
 const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
 const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
 const rect = containerRef.current.getBoundingClientRect();
 if (isDragging) {
 const dX = ((clientX - dragStart.x) / rect.width) * 100;
 const dY = ((clientY - dragStart.y) / rect.height) * 100;
 setElements(prev => prev.map(el => el.id === selectedId ? { ...el, style: { ...el.style, left: Math.max(-20, Math.min(100, initialStyle.left + dX)), top: Math.max(-20, Math.min(100, initialStyle.top + dY)) } } : el));
 } else if (isResizing) {
 const dX = ((clientX - dragStart.x) / rect.width) * 100;
 setElements(prev => prev.map(el => el.id === selectedId ? { ...el, style: { ...el.style, width: Math.max(5, Math.min(100 - el.style.left, initialStyle.width + dX)) } } : el));
 } else if (isRotating) {
 const centerX = rect.left + (initialStyle.left + initialStyle.width/2) * rect.width / 100;
 const centerY = rect.top + (initialStyle.top + (initialStyle.height || 0)/2) * rect.height / 100;
 const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
 setElements(prev => prev.map(el => el.id === selectedId ? { ...el, style: { ...el.style, rotation: angle + 90 } } : el));
 }
 }, [isDragging, isResizing, isRotating, selectedId, dragStart, initialStyle]);

 const handlePointerUp = useCallback(() => { setIsDragging(false); setIsResizing(false); setIsRotating(false); }, []);
 useEffect(() => { window.addEventListener('mousemove', handlePointerMove); window.addEventListener('mouseup', handlePointerUp); return () => { window.removeEventListener('mousemove', handlePointerMove); window.removeEventListener('mouseup', handlePointerUp); }; }, [handlePointerMove, handlePointerUp]);

 const addElement = async (type: string, content?: string, link?: string, initialTop?: number, initialLeft?: number) => {
 const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
 let newEl: any;
 if (type === 'signal') {
 newEl = { 
 id, type: 'text', content: content || 'SIG_RESONANCE', link: `https://www.google.com/search?q=${encodeURIComponent(link || content)}`,
 style: { top: initialTop || 30, left: initialLeft || 30, width: 30, zIndex: elements.length + 20, fontSize: 0.7, fontFamily: 'mono', color: '#10B981', opacity: 1, rotation: 0, lineHeight: 1.2, fontWeight: '900', letterSpacing: '0.1em' } 
 };
 } else {
 newEl = { id, type, content: content || (type === 'text' ? 'New Thought' : ''), style: { top: initialTop || 30, left: initialLeft || 30, width: type === 'text' ? 40 : 50, zIndex: elements.length + 10, fontSize: 1.4, fontFamily: 'serif', color: 'inherit', opacity: 1, rotation: 0, lineHeight: 1.2, objectFit: 'cover', filter: 'none', borderStyle: 'none', borderWidth: 0, borderColor: 'transparent', padding: 8 } };
 }
 setElements(prev => [...prev, newEl]); setSelectedId(id); addTrace(`Added ${type}.`);

 if (type === 'image' && content && content.startsWith('data:image')) {
 try {
 const mimeType = content.split(';')[0].split(':')[1];
 const base64 = content.split(',')[1];
 const violation = await checkAestheticViolation(base64, mimeType, profile, page.dna);
 if (violation?.isViolation) {
 setElements(prev => prev.map(el => el.id === id ? { ...el, aestheticViolation: violation } : el));
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { 
 message:"Brand Guardianship Protocol: Aesthetic Violation Detected", 
 icon: <AlertCircle size={14} className="text-red-500"/> 
 } 
 }));
 }
 } catch (e) {
 console.error("Failed to check aesthetic violation:", e);
 }
 }
 };

 const handleHarmonize = async (el: EditorElement) => {
 if (!el.content.startsWith('data:image')) return;
 
 setElements(prev => prev.map(e => e.id === el.id ? { ...e, harmonizing: true } : e));
 
 try {
 const treatment = sovereignTreatments[0] || { instruction: 'Make it look editorial, high contrast, film photography style.' };
 const mimeType = el.content.split(';')[0].split(':')[1];
 const base64 = el.content.split(',')[1];
 
 const harmonizedBase64 = await applyTreatment(base64, treatment.instruction, profile);
 
 if (harmonizedBase64) {
 const newContent = `data:${mimeType};base64,${harmonizedBase64}`;
 setElements(prev => prev.map(e => e.id === el.id ? { 
 ...e, 
 content: newContent, 
 harmonizing: false,
 aestheticViolation: { isViolation: false, reason: 'Harmonized' }
 } : e));
 addTrace(`Harmonized image using treatment: ${treatment.name || 'Default'}`);
 } else {
 throw new Error("Harmonization failed");
 }
 } catch (error) {
 console.error("Failed to harmonize:", error);
 setElements(prev => prev.map(e => e.id === el.id ? { ...e, harmonizing: false } : e));
 }
 };

 const updateStyle = (stylePatch: Partial<EditorElementStyle>) => { if (!selectedId) return; setElements(prev => prev.map(el => el.id === selectedId ? { ...el, style: { ...el.style, ...stylePatch } } : el)); };
 const updateImageAspectRatio = (ratioStr: string) => {
 if (!selectedId || !selectedElement || selectedElement.type !== 'image') return;
 const [w, h] = ratioStr.split(':').map(Number);
 const targetAR = w / h;
 const containerAR = ratioW / ratioH;
 
 // H% = W% * (ContainerAR / TargetAR)
 const currentW = selectedElement.style.width; // percent
 const newH = currentW * (containerAR / targetAR);
 
 updateStyle({ height: newH });
 };

 const selectedElement = elements.find(e => e.id === selectedId);

 const baseHex = tailorDraft?.expressionEngine?.chromaticRegistry?.baseNeutral || '#FFFFFF';
 const accentHex = tailorDraft?.expressionEngine?.chromaticRegistry?.accentSignal || '#000000';

 const fontUrl = `https://fonts.googleapis.com/css2?family=${defaultFontFamily.replace(/ /g, '+')}&display=swap`;

 const dynamicFontFamilies = [
 { id: 'tailor', label: `Tailor: ${defaultFontFamily}`, css: defaultFontFamily },
 ...FONT_FAMILIES.filter(f => f.css !== defaultFontFamily)
 ];

 return (
 <>
 <link href={fontUrl} rel="stylesheet"/>
 <div 
 className="fixed inset-0 z-[9999] w-screen h-screen bg-black overflow-hidden flex flex-col lg:flex-row transition-colors"
 style={{ 
 fontFamily: `'${defaultFontFamily}', sans-serif`,
 '--zine-base-color': baseHex,
 '--zine-accent-color': accentHex,
 } as React.CSSProperties}
 >
 <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center bg-black/50 backdrop-blur-md rounded-none px-4 py-2 md:px-6 md:py-3 opacity-0 hover:opacity-100 transition-opacity duration-300 border border-white/10">
 <div className="flex items-center gap-2 md:gap-6">
 <button onClick={onCancel} className="p-2 md:p-3 text-white/70 hover:text-red-500 rounded-none transition-all"><X size={18} /></button>
 <div className="h-4 md:h-6 w-px bg-white/20"/>
 <div className="flex flex-col group/title relative">
 <span className="font-sans text-[6px] md:text-[8px] uppercase tracking-widest text-white/50 font-black mb-0.5">Issue Manifest Title</span>
 <input 
 type="text"
 value={zineTitle} 
 onChange={(e) => setZineTitle(e.target.value)} 
 placeholder="Subject..."
 className="bg-transparent border-none p-0 text-xs md:text-xl italic tracking-tighter text-white focus:outline-none min-w-[120px] md:min-w-[240px]"
 style={{ fontFamily: `'${defaultFontFamily}', sans-serif` }}
 />
 <TitleLegend />
 </div>
 </div>
 
 <div className="flex items-center gap-3 md:gap-4">
 {/* DRAFT CONTROLS */}
 <div className="hidden md:flex items-center gap-1 border-r border-white/20 pr-3 mr-1">
 <button onClick={handleSaveDraft} className="p-2 text-white/70 hover:text-nous-text transition-colors"title="Save Draft">
 <Save size={16} />
 </button>
 <button onClick={handleLoadDraft} className="p-2 text-white/70 hover:text-indigo-500 transition-colors"title="Load Draft">
 <FolderOpen size={16} />
 </button>
 </div>

 <div className="relative">
 <button 
 onClick={() => setShowExportMenu(!showExportMenu)} 
 disabled={isExporting}
 className="px-4 py-1.5 md:py-3 border border-white/20 text-white/70 hover:text-nous-text font-sans text-[7px] md:text-[9px] uppercase tracking-widest font-black rounded-none flex items-center gap-2 transition-all hover:bg-white/10"
 >
 {isExporting ? <Loader2 size={12} className="animate-spin"/> : <Download size={12} />}
 <span className="hidden md:inline">Export</span>
 </button>
 {showExportMenu && (
 <div className="absolute top-full right-0 mt-2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-none flex flex-col w-40 z-50 overflow-hidden">
 <button onClick={() => handleExport('png')} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-left transition-colors text-white">
 <FileImage size={12} className="text-nous-subtle"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">PNG Asset</span>
 </button>
 <button onClick={() => handleExport('jpg')} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-left transition-colors text-white">
 <FileImage size={12} className="text-amber-500"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">JPG Asset</span>
 </button>
 <button onClick={() => handleExport('pdf')} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-left transition-colors border-t border-white/10 text-white">
 <FileText size={12} className="text-white/50"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">PDF Doc</span>
 </button>
 </div>
 )}
 </div>
 
 <button onClick={handleCommit} className={`px-4 md:px-8 py-1.5 md:py-3 ${isSaving ? 'bg-nous-base0 text-white' : 'bg-nous-base text-nous-text'} font-sans text-[7px] md:text-[10px] uppercase tracking-[0.3em] font-black rounded-none flex items-center gap-1.5 md:gap-3 shrink-0 hover:scale-105 active:scale-95 transition-all`}>
 {isSaving ? <Check size={12} /> : <Sparkles size={8} className="animate-pulse"/>}
 {isSaving ? 'Saved' : 'Commit'}
 </button> 
 </div>
 </div>
 <div className={`flex-1 flex items-center justify-center overflow-hidden relative transition-all ${isMobile && drawerOpen ? 'pb-[45vh]' : ''}`} onClick={() => setSelectedId(null)}>
 <div ref={containerRef} onClick={(e) => e.stopPropagation()} className="relative bg-white border border-nous-border transition-all duration-700"style={{ aspectRatio: `${ratioW}/${ratioH}`, maxHeight: '100vh', maxWidth: '100vw', width: 'auto', height: '100vh' }}>
 {elements.sort((a,b) => (a.style.zIndex || 0) - (b.style.zIndex || 0)).map(el => (
 <motion.div key={el.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: el.style.opacity, scale: 1 }} onMouseDown={(e) => { e.stopPropagation(); setSelectedId(el.id); setDragStart({x: e.clientX, y: e.clientY}); setIsDragging(true); setInitialStyle({...el.style}); if(isMobile) setDrawerOpen(true); }} className={`absolute select-none group/el ${selectedId === el.id ? 'ring-2 ring-stone-500 z-50' : ''} cursor-move`} style={{ top: `${el.style.top}%`, left: `${el.style.left}%`, width: `${el.style.width}%`, height: el.style.height ? `${el.style.height}%` : undefined, rotate: `${el.style.rotation}deg`, zIndex: el.style.zIndex }}>
 {el.type === 'image' && (
 <>
 <img src={el.content} className="w-full h-full object-cover pointer-events-none"style={{ filter: el.style.filter || 'none' }}/>
 {el.aestheticViolation?.isViolation && (
 <div className="absolute inset-0 border-2 border-red-500/50 pointer-events-none flex items-start justify-end p-2">
 <Tooltip content={el.aestheticViolation.reason}>
 <AlertCircle size={16} className="text-red-500 animate-pulse"/>
 </Tooltip>
 </div>
 )}
 {el.aestheticViolation?.isViolation && selectedId === el.id && (
 <motion.button 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 onClick={(e) => { e.stopPropagation(); handleHarmonize(el); }}
 disabled={el.harmonizing}
 className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-nous-base/90 text-white px-3 py-1.5 rounded-none text-[8px] uppercase tracking-widest font-black flex items-center gap-2 backdrop-blur-sm border border-nous-border hover:bg-nous-base transition-colors"
 >
 {el.harmonizing ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10} className="text-nous-subtle"/>}
 {el.harmonizing ? 'Refracting...' : 'Refract to Harmonize'}
 </motion.button>
 )}
 </>
 )}
 {el.type === 'text' && (
 el.link ? (
 <a href={el.link} target="_blank"rel="noopener noreferrer"className="block hover:opacity-70 transition-opacity">
 <div className="relative group/text">
 <div 
 className="leading-tight break-words transition-all"
 style={{ 
 fontSize: `${el.style.fontSize || 1.2}rem`, 
 fontFamily: (el.style.fontFamily === 'serif' || el.style.fontFamily === 'sans') ? `'${defaultFontFamily}', sans-serif` : el.style.fontFamily, 
 color: el.style.color || 'inherit', 
 textAlign: el.style.textAlign || 'left', 
 fontStyle: el.style.fontStyle, 
 fontWeight: el.style.fontWeight,
 borderStyle: el.style.borderStyle || 'none',
 borderWidth: `${el.style.borderWidth || 0}px`,
 borderColor: el.style.borderColor || 'transparent',
 borderRadius: `${el.style.borderRadius || 0}px`,
 padding: `${el.style.padding !== undefined ? el.style.padding : 8}px`,
 backgroundColor: el.style.backgroundColor || 'transparent',
 backgroundImage: el.style.backgroundImage,
 mixBlendMode: el.style.mixBlendMode as any
 }}
 >
 {el.content}
 </div>
 </div>
 </a>
 ) : (
 <div className="relative group/text">
 <div 
 className="leading-tight break-words transition-all"
 style={{ 
 fontSize: `${el.style.fontSize || 1.2}rem`, 
 fontFamily: (el.style.fontFamily === 'serif' || el.style.fontFamily === 'sans') ? `'${defaultFontFamily}', sans-serif` : el.style.fontFamily, 
 color: el.style.color || 'inherit', 
 textAlign: el.style.textAlign || 'left', 
 fontStyle: el.style.fontStyle, 
 fontWeight: el.style.fontWeight,
 borderStyle: el.style.borderStyle || 'none',
 borderWidth: `${el.style.borderWidth || 0}px`,
 borderColor: el.style.borderColor || 'transparent',
 borderRadius: `${el.style.borderRadius || 0}px`,
 padding: `${el.style.padding !== undefined ? el.style.padding : 8}px`,
 backgroundColor: el.style.backgroundColor || 'transparent',
 backgroundImage: el.style.backgroundImage,
 mixBlendMode: el.style.mixBlendMode as any
 }}
 >
 {el.content}
 </div>
 {el.link && (
 <a href={el.link} target="_blank"onClick={e => e.stopPropagation()} className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/text:opacity-100 transition-opacity bg-nous-text text-nous-base px-2 py-1 rounded-none flex items-center gap-1.5 whitespace-nowrap z-[100]">
 <ExternalLink size={8} /> <span className="font-sans text-[6px] uppercase tracking-widest font-black">Verify Resonance</span>
 </a>
 )}
 </div>
 )
 )}
 {selectedId === el.id && <div className="absolute inset-0 pointer-events-none"><div onMouseDown={(e) => { e.stopPropagation(); setDragStart({x: e.clientX, y: e.clientY}); setIsResizing(true); setInitialStyle({...el.style}); }} className="pointer-events-auto absolute -bottom-3 -right-3 w-6 h-6 bg-white rounded-none cursor-se-resize flex items-center justify-center border border-black/10 z-[60]"><Maximize size={12} /></div></div>}
 </motion.div>
 ))}
 </div>
 </div>
 <motion.div initial={false} animate={{ y: isMobile ? (drawerOpen ? 0 : '100%') : 0, x: isMobile ? 0 : (selectedId ? 0 : 480) }} className={`fixed bottom-0 left-0 right-0 lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:flex lg:w-[480px] bg-white/90 /90 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-nous-border/50 /10 flex-col pt-4 lg:pt-24 z-[2050] transition-all duration-500 ${isMobile ? 'h-[45vh] rounded-none overflow-hidden' : 'h-full'}`}>
 <div className="flex lg:hidden justify-center pb-2"onClick={() => setDrawerOpen(false)}><div className="w-12 h-1 bg-stone-200 rounded-none"/></div>
 <div className="flex border-b border-nous-border h-14 lg:h-20 shrink-0 px-4"> 
 {['fragments', 'style', 'trace', 'materiality'].map((tab) => (
 <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 flex flex-col items-center justify-center gap-1 font-sans text-[7px] lg:text-[9px] uppercase tracking-widest transition-all ${activeTab === tab ? 'text-nous-text  font-black' : 'text-nous-subtle hover:text-nous-text '}`}> 
 {tab === 'fragments' && <Plus size={16}/>}{tab === 'style' && <SlidersHorizontal size={16}/>}{tab === 'trace' && <History size={16}/>}{tab === 'materiality' && <Layers size={16}/>}<span className="font-black">{tab}</span>
 </button> 
 ))}
 </div>
 <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 lg:space-y-8 no-scrollbar pb-safe">
 {activeTab === 'fragments' && (
 <div className="grid grid-cols-4 gap-3 lg:gap-6 animate-fade-in"> 
 <button onClick={() => addElement('text', 'A new thought...')} className="flex flex-col items-center justify-center gap-2 aspect-square border border-stone-50 rounded-none bg-nous-base/50 /50 active:scale-95"><FontIcon size={18} className="text-nous-subtle"/><span className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] text-nous-subtle">Type</span></button> 
 <button onClick={() => addElement('box', '')} className="flex flex-col items-center justify-center gap-2 aspect-square border border-stone-50 rounded-none bg-nous-base/50 /50 active:scale-95"><Box size={18} className="text-nous-subtle"/><span className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] text-nous-subtle">Void</span></button> 
 <button onClick={() => imageUploadRef.current?.click()} className="flex flex-col items-center justify-center gap-2 aspect-square border border-stone-50 rounded-none bg-nous-base/50 /50 active:scale-95"><ImageIcon size={18} className="text-nous-subtle"/><span className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] text-nous-subtle">Image</span></button> 
 <button onClick={() => addElement('text', 'THREAD NOTE\n──────────────\nThis artifact echoes a recurring theme in your archive.')} className="flex flex-col items-center justify-center gap-2 aspect-square border border-stone-50 rounded-none bg-nous-base/50 /50 active:scale-95"><Sparkles size={18} className="text-nous-subtle"/><span className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] text-nous-subtle">Thread</span></button> 
 <button onClick={handleGenerateSignals} disabled={isGeneratingSignals} className="flex flex-col items-center justify-center gap-2 aspect-square border border-nous-border/20 rounded-none bg-nous-base0/5 active:scale-95 group">
 {isGeneratingSignals ? <Loader2 size={18} className="text-nous-subtle animate-spin"/> : <Radar size={18} className="text-nous-subtle group-hover:scale-110 transition-transform"/>}
 <span className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] text-nous-subtle">Scry</span>
 </button>
 </div>
 )}
 {activeTab === 'style' && selectedElement && (
 <div className="space-y-8 lg:space-y-10 animate-fade-in pb-12">
 {suggestedThread && selectedElement.type === 'image' && (
 <div className="bg-nous-base0/5 border border-nous-border/20 p-4 rounded-none space-y-3">
 <div className="flex items-center gap-2 text-nous-subtle">
 <Sparkles size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Thread Discovered</span>
 </div>
 <p className="font-serif text-sm text-nous-subtle">
 We found a thread connected to this page.
 </p>
 <button 
 onClick={() => {
 addElement('text', `THREAD NOTE\n──────────────\n${suggestedThread.narrative}`);
 setSuggestedThread(null);
 }}
 className="w-full py-2 bg-nous-base0 text-white rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-stone-600 transition-colors"
 >
 Add to this zine?
 </button>
 </div>
 )}
 <div className="flex justify-between items-center border-b pb-4"><div className="flex flex-col"><span className="font-sans text-[6px] uppercase tracking-[0.3em] text-nous-subtle font-black">Calibration</span><span className="font-serif italic text-xl lg:text-2xl uppercase">{selectedElement.type}</span></div><button onClick={() => { setElements(p => p.filter(e => e.id !== selectedId)); setSelectedId(null); if(isMobile) setDrawerOpen(false); }} className="p-2 text-red-500"><Trash2 size={16}/></button></div>
 {selectedElement.type === 'text' && (
 <section className="space-y-6 lg:space-y-8">
 <div className="space-y-3">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Content</span>
 <textarea 
 value={selectedElement.content} 
 onChange={(e) => {
 setElements(prev => prev.map(el => el.id === selectedId ? { ...el, content: e.target.value } : el));
 }}
 className="w-full bg-nous-base border border-nous-border p-3 font-serif italic text-sm focus:outline-none focus:border-nous-border dark:focus:border-nous-border rounded-none resize-none h-24"
 />
 </div>
 <div className="space-y-3"><span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Font Identity</span><div className="grid gap-1.5">{dynamicFontFamilies.map(f => <button key={f.id} onClick={() => updateStyle({ fontFamily: f.css })} className={`text-left p-3 lg:p-4 border rounded-none transition-all ${selectedElement.style.fontFamily === f.css ? 'bg-nous-text text-nous-base   border-transparent' : 'border-nous-border text-nous-subtle'}`} style={{ fontFamily: f.css }}>{f.label}</button>)}</div></div>
 <div className="space-y-3"><span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Scale Protocol ({selectedElement.style.fontSize}rem)</span><SemanticSteps steps={[{label: 'XS', value: 0.5}, {label: 'S', value: 1}, {label: 'M', value: 2}, {label: 'L', value: 4}, {label: 'XL', value: 8}]} value={selectedElement.style.fontSize || 1.2} onChange={val => updateStyle({ fontSize: val })} /></div>
 <div className="space-y-3"><span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Alignment Protocol</span><div className="flex gap-2"><button onClick={() => updateStyle({ textAlign: 'left' })} className={`flex-1 py-2.5 border rounded-none transition-all ${selectedElement.style.textAlign === 'left' ? 'bg-nous-text text-nous-base border-transparent' : 'border-nous-border text-nous-subtle'}`}><AlignLeft size={16} className="mx-auto"/></button><button onClick={() => updateStyle({ textAlign: 'center' })} className={`flex-1 py-2.5 border rounded-none transition-all ${selectedElement.style.textAlign === 'center' ? 'bg-nous-text text-nous-base border-transparent' : 'border-nous-border text-nous-subtle'}`}><AlignCenter size={16} className="mx-auto"/></button><button onClick={() => updateStyle({ textAlign: 'right' })} className={`flex-1 py-2.5 border rounded-none transition-all ${selectedElement.style.textAlign === 'right' ? 'bg-nous-text text-nous-base border-transparent' : 'border-nous-border text-nous-subtle'}`}><AlignRight size={16} className="mx-auto"/></button></div></div>
 <div className="space-y-3"><span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Chromatic Manifold</span><div className="grid grid-cols-6 gap-3">{COLORS.map(c => <button key={c.id} onClick={() => updateStyle({ color: c.hex })} className={`aspect-square rounded-none border-2 transition-all ${selectedElement.style.color === c.hex ? 'border-nous-border scale-110 ' : 'border-transparent'}`} style={{ backgroundColor: c.hex }} />)}</div></div>
 
 <div className="pt-6 border-t border-nous-border space-y-4">
 <div className="flex items-center gap-2 text-nous-subtle">
 <ScanLine size={12} />
 <span className="font-sans text-[7px] uppercase tracking-widest font-black">Boundary Logic</span>
 </div>
 <div className="flex gap-2">
 {['none', 'solid', 'dashed', 'dotted'].map(s => (
 <button 
 key={s} 
 onClick={() => updateStyle({ borderStyle: s as any })}
 className={`flex-1 py-2 border rounded-none font-sans text-[6px] uppercase font-black transition-all ${selectedElement.style.borderStyle === s ? 'bg-nous-text text-nous-base border-transparent' : 'border-nous-border text-nous-subtle'}`}
 >
 {s}
 </button>
 ))}
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-[7px] font-sans uppercase text-nous-subtle block mb-1">Weight</label>
 <SemanticSteps steps={[{label: '0', value: 0}, {label: '1', value: 1}, {label: '2', value: 2}, {label: '4', value: 4}, {label: '8', value: 8}]} value={selectedElement.style.borderWidth || 0} onChange={val => updateStyle({ borderWidth: val })} />
 </div>
 <div>
 <label className="text-[7px] font-sans uppercase text-nous-subtle block mb-1">Padding</label>
 <SemanticSteps steps={[{label: '0', value: 0}, {label: 'S', value: 8}, {label: 'M', value: 16}, {label: 'L', value: 32}]} value={selectedElement.style.padding || 8} onChange={val => updateStyle({ padding: val })} />
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex justify-between items-center"><span className="text-[7px] font-sans uppercase text-nous-subtle">Border Color</span><span className="text-[7px] font-sans uppercase text-nous-subtle">Fill</span></div>
 <div className="flex justify-between gap-4">
 <div className="flex gap-1.5 flex-wrap">
 <button onClick={() => updateStyle({ borderColor: 'transparent' })} className="w-5 h-5 rounded-none border border-nous-border flex items-center justify-center text-[6px] text-nous-subtle">Ø</button>
 {COLORS.map(c => (
 <button key={`b-${c.id}`} onClick={() => updateStyle({ borderColor: c.hex })} className="w-5 h-5 rounded-none border border-nous-border"style={{ backgroundColor: c.hex }} />
 ))}
 </div>
 <div className="w-px bg-stone-200"/>
 <div className="flex gap-1.5 flex-wrap justify-end">
 <button onClick={() => updateStyle({ backgroundColor: 'transparent' })} className="w-5 h-5 rounded-none border border-nous-border flex items-center justify-center text-[6px] text-nous-subtle">Ø</button>
 {COLORS.map(c => (
 <button key={`bg-${c.id}`} onClick={() => updateStyle({ backgroundColor: c.hex })} className="w-5 h-5 rounded-none border border-nous-border"style={{ backgroundColor: c.hex }} />
 ))}
 </div>
 </div>
 </div>
 </div>
 </section>
 )}
 {selectedElement.type === 'image' && (
 <section className="space-y-8 lg:space-y-10">
 <div className="space-y-3">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle flex items-center gap-2"><Ratio size={12} /> Aspect Ratio</span>
 <div className="grid grid-cols-4 gap-2">
 {['1:1', '3:4', '4:3', '16:9'].map(ratio => (
 <button 
 key={ratio} 
 onClick={() => updateImageAspectRatio(ratio)} 
 className="py-2 border border-nous-border rounded-none text-[8px] font-sans font-black hover:bg-nous-base transition-colors"
 >
 {ratio}
 </button>
 ))}
 </div>
 </div>
 <div className="space-y-3">
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle flex items-center gap-2">
 <Sparkles size={12} /> Insight
 </span>
 {!imageAnalysis ? (
 <button 
 onClick={handleAnalyzeImage} 
 disabled={isAnalyzingImage}
 className="w-full py-3 border border-nous-border/30 bg-nous-base0/5 text-nous-subtle rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-nous-base0/10 transition-all flex items-center justify-center gap-2"
 >
 {isAnalyzingImage ? <Loader2 size={12} className="animate-spin"/> : <Radar size={12} />}
 {isAnalyzingImage ?"Consulting Oracle...":"Analyze Semiotics"}
 </button>
 ) : (
 <div className="p-4 bg-nous-base rounded-none border border-nous-border space-y-3">
 <p className="font-serif italic text-sm text-nous-subtle leading-snug">"{imageAnalysis.directors_note}"</p>
 {imageAnalysis.cultural_parallel && (
 <div className="flex items-center gap-2 text-[9px] font-mono text-nous-subtle uppercase">
 <Info size={10} />
 <span>Ref: {imageAnalysis.cultural_parallel}</span>
 </div>
 )}
 <button 
 onClick={() => {
 const text = `${imageAnalysis.directors_note}\n\nRef: ${imageAnalysis.cultural_parallel || 'Unknown'}`;
 addElement('text', text, null, selectedElement.style.top + 5, selectedElement.style.left + 5);
 }}
 className="w-full py-2 bg-stone-200 dark:bg-stone-700 rounded-none font-sans text-[7px] uppercase tracking-widest font-black hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
 >
 Add as Note
 </button>
 </div>
 )}
 </div>
 <div className="space-y-3"><span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Optical Filters</span><div className="grid grid-cols-3 gap-2">{IMAGE_FILTERS.map(f => <button key={f.name} onClick={() => updateStyle({ filter: f.value })} className={`p-2.5 lg:p-3 border rounded-none transition-all text-center ${selectedElement.style.filter === f.value ? 'bg-nous-text text-nous-base   border-transparent' : 'border-nous-border text-nous-subtle'}`}><span className="text-[6px] lg:text-[8px] uppercase font-black block">{f.name}</span></button>)}</div></div>
 {sovereignTreatments.length > 0 && <div className="space-y-3"><span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle">Darkroom Logic Presets</span><div className="grid gap-2">{sovereignTreatments.map(t => <button key={t.id} onClick={() => updateStyle({ filter: t.instruction })} className="text-left p-3 bg-nous-base border border-nous-border rounded-none hover:border-nous-border transition-all flex justify-between items-center group"><span className="font-serif italic text-xs text-nous-subtle">{t.name}</span><Droplet size={10} className="text-nous-subtle opacity-0 group-hover:opacity-100"/></button>)}</div></div>}
 </section>
 )}
 </div>
 )}
 {activeTab === 'materiality' && (
 <MaterialityPanel config={materialityConfig} onChange={setMaterialityConfig} />
 )}
 {!selectedId && activeTab !== 'materiality' && (
 <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center"><Move size={32} strokeWidth={1} /><p className="font-serif italic text-lg mt-4">Select a fragment to calibrate.</p></div>
 )}
 </div>
 <input type="file"ref={imageUploadRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => addElement('image', event.target?.result as string); reader.readAsDataURL(file); } }} accept="image/*"className="hidden"/> 
 </motion.div>
 </div>
 </>
 );
};

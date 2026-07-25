
// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 X, Check, Save, Loader2, Type, Palette, 
 Layout, ChevronLeft, ChevronRight, Download, 
 Settings2, Wand2, Briefcase, Feather, Zap, 
 RefreshCw, MousePointer2, Edit3, Eye,
 ArrowRight, ArrowLeft, Plus, FolderOpen, Image as ImageIcon,
 Scroll, FileImage, FileText, Send, Sparkles, MessageSquare, Terminal, Users, UserPlus, Shield
} from 'lucide-react';
import { Proposal, ProposalSection, EditorElement, UserProfile, BrandKit, PocketItem, EditorElementStyle } from '../types';
import { saveProposalToRegistry, refineSectionContent } from '../services/proposalOrchestrator';
import { refineProposalSection, generateRefinementVariations } from '../services/geminiService';
import { SlideCanvas } from './SlideCanvas';
import { SemanticSteps } from './SemanticSteps';
import { useUser } from '../contexts/UserContext';
import { fetchPocketItems } from '../services/firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- CONFIG CONSTANTS ---
const TEMPLATES = [
 { label: 'Editorial', value: 'editorial' },
 { label: 'Presentation', value: 'presentation' },
 { label: 'Portfolio', value: 'portfolio' },
 { label: 'Bimbo Intellectual', value: 'bimbo-intellectual' }
];

const FONTS = [
 { label: 'Editorial Serif', value: 'Cormorant Garamond' },
 { label: 'Minimal Sans', value: 'Space Grotesk' },
 { label: 'Brutalist Mono', value: 'Space Mono' }
];

const COLORS = [
 { label: 'Noir', value: '#1C1917' },
 { label: 'Paper', value: '#FDFBF7' },
 { label: 'Concrete', value: '#A8A29E' },
 { label: 'Signal', value: '#78716c' },
 { label: 'Alert', value: '#EF4444' }
];

const REFINEMENT_MODES = [
 { id: 'Crystalize', icon: <Briefcase size={14} />, prompt:"Make this concise, strategic, and professional."},
 { id: 'Soften', icon: <Feather size={14} />, prompt:"Make this poetic, alluring, and editorial."},
 { id: 'Punch', icon: <Zap size={14} />, prompt:"Make this high-impact, short, and punchy."}
];

// --- EXPORT OVERLAY ---
const ProposalExportOverlay: React.FC<{ 
 onExport: (format: 'pdf' | 'png' | 'current_png' | 'current_jpg') => void; 
 onClose: () => void;
 activeSlideIndex: number;
}> = ({ onExport, onClose, activeSlideIndex }) => {
 const [isExporting, setIsExporting] = useState(false);

 const triggerExport = (format: 'pdf' | 'png' | 'current_png' | 'current_jpg') => {
 setIsExporting(true);
 onExport(format);
 };

 return (
 <div className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-none max-w-md w-full space-y-8 relative">
 <button onClick={onClose} className="absolute top-6 right-6 text-nous-subtle hover:text-red-500"><X size={20} /></button>
 <div className="space-y-2">
 <h3 className="font-serif text-3xl italic tracking-tighter">Manifest Artifact.</h3>
 <p className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Export High-Fidelity Output</p>
 </div>
 <div className="space-y-4">
 <button onClick={() => triggerExport('pdf')} disabled={isExporting} className="w-full py-4 border border-nous-border flex items-center justify-between px-6 hover:bg-nous-base transition-all group">
 <div className="flex items-center gap-4">
 <FileText size={18} className="text-nous-subtle group-hover:text-nous-text"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Full PDF Deck</span>
 </div>
 <ArrowRight size={14} className="text-nous-subtle group-hover:translate-x-1 transition-transform"/>
 </button>
 
 <div className="h-px bg-nous-base my-2"/>
 
 <button onClick={() => triggerExport('current_png')} disabled={isExporting} className="w-full py-4 border border-nous-border flex items-center justify-between px-6 hover:bg-nous-base transition-all group">
 <div className="flex items-center gap-4">
 <FileImage size={18} className="text-nous-subtle group-hover:text-amber-500"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Current Slide (High-Res PNG)</span>
 </div>
 <ArrowRight size={14} className="text-nous-subtle group-hover:translate-x-1 transition-transform"/>
 </button>

 <button onClick={() => triggerExport('current_jpg')} disabled={isExporting} className="w-full py-4 border border-nous-border flex items-center justify-between px-6 hover:bg-nous-base transition-all group">
 <div className="flex items-center gap-4">
 <ImageIcon size={18} className="text-nous-subtle group-hover:text-blue-500"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Current Slide (High-Res JPG)</span>
 </div>
 <ArrowRight size={14} className="text-nous-subtle group-hover:translate-x-1 transition-transform"/>
 </button>

 <button onClick={() => triggerExport('png')} disabled={isExporting} className="w-full py-4 border border-nous-border flex items-center justify-between px-6 hover:bg-nous-base transition-all group">
 <div className="flex items-center gap-4">
 <Feather size={18} className="text-nous-subtle group-hover:text-nous-subtle"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Cover Plate Only</span>
 </div>
 <ArrowRight size={14} className="text-nous-subtle group-hover:translate-x-1 transition-transform"/>
 </button>
 </div>
 {isExporting && <div className="text-center text-nous-subtle font-mono text-xs animate-pulse">Rendering High-Fidelity Plate...</div>}
 </motion.div>
 </div>
 );
};

interface ProposalWorkspaceProps {
 proposal: Proposal;
 onUpdateProposal: (updated: Proposal) => void;
 onClose: () => void;
}

export const ProposalWorkspace: React.FC<ProposalWorkspaceProps> = ({ proposal, onUpdateProposal, onClose }) => {
 const { profile, activePersona, user } = useUser();
 const scrollContainerRef = useRef<HTMLDivElement>(null);
 
 // -- WORKSPACE STATE --
 const [mode, setMode] = useState<'content' | 'design' | 'assets' | 'assistant' | 'collaborators'>('content');
 const [activeSlideIndex, setActiveSlideIndex] = useState(0);
 const [isSaving, setIsSaving] = useState(false);
 const [isRefining, setIsRefining] = useState<string | null>(null);
 const [showExportOverlay, setShowExportOverlay] = useState(false);
 
 // -- SELECTION STATE --
 const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
 const [aiVariations, setAiVariations] = useState<{ punchy: string, strategic: string, poetic: string } | null>(null);
 const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
 
 // -- ASSETS STATE --
 const [folderItems, setFolderItems] = useState<PocketItem[]>([]);
 const [loadingAssets, setLoadingAssets] = useState(false);

 // -- LAYOUT STATE --
 const [layoutConfig, setLayoutConfig] = useState(proposal.layout);
 
 // -- CUSTOM INPUTS --
 const [customFontInput, setCustomFontInput] = useState('');
 const [customColorInput, setCustomColorInput] = useState('#000000');
 const [customRefinePrompt, setCustomRefinePrompt] = useState('');

 // -- ASSISTANT STATE --
 const [assistantInput, setAssistantInput] = useState('');
 const [isAssistantThinking, setIsAssistantThinking] = useState(false);

 useEffect(() => {
 onUpdateProposal({ ...proposal, layout: layoutConfig });
 }, [layoutConfig]);

 useEffect(() => {
 const loadAssets = async () => {
 if (user?.uid) {
 setLoadingAssets(true);
 try {
 const allItems = await fetchPocketItems(user.uid);
 let items = [];
 
 if (proposal.sourceFolderId === 'manual_selection') {
 items = allItems.filter(i => proposal.sourceArtifactIds?.includes(i.id));
 } else if (proposal.sourceFolderId) {
 const folder = allItems.find(i => i.id === proposal.sourceFolderId);
 if (folder && folder.content.itemIds) {
 items = allItems.filter(i => folder.content.itemIds.includes(i.id));
 } else {
 items = allItems.filter(i => proposal.sourceArtifactIds?.includes(i.id));
 }
 }
 setFolderItems(items);
 } catch(e) { console.error(e); } finally { setLoadingAssets(false); }
 }
 };
 if (mode === 'assets') loadAssets();
 }, [mode, proposal.sourceFolderId, proposal.sourceArtifactIds, user]);

 useEffect(() => {
 const fetchVariations = async () => {
 const section = proposal.content.sections[activeSlideIndex];
 const element = section?.elements.find(e => e.id === selectedElementId && e.type === 'text');
 
 if (element && element.content) {
 setIsGeneratingVariations(true);
 try {
 const vars = await generateRefinementVariations(element.content, profile);
 setAiVariations(vars);
 } catch (e) {
 console.error("Variations failed", e);
 } finally {
 setIsGeneratingVariations(false);
 }
 } else {
 setAiVariations(null);
 }
 };

 if (selectedElementId) fetchVariations();
 else setAiVariations(null);
 }, [selectedElementId, activeSlideIndex, proposal.content.sections]);

 const handleScroll = () => {
 if (!scrollContainerRef.current) return;
 const isMobile = window.innerWidth < 768;
 
 if (isMobile) {
 const scrollTop = scrollContainerRef.current.scrollTop;
 const height = scrollContainerRef.current.clientHeight; 
 const index = Math.round(scrollTop / (height + 20)); 
 if (index !== activeSlideIndex && index < proposal.content.sections.length) {
 setActiveSlideIndex(index);
 }
 } else {
 const scrollLeft = scrollContainerRef.current.scrollLeft;
 const width = scrollContainerRef.current.clientWidth;
 const index = Math.round(scrollLeft / width);
 setActiveSlideIndex(index);
 }
 };

 const scrollToSlide = (index: number) => {
 if (!scrollContainerRef.current) return;
 const isMobile = window.innerWidth < 768;
 
 if (isMobile) {
 const slideEl = document.getElementById(`slide-container-${index}`);
 slideEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
 } else {
 const width = scrollContainerRef.current.clientWidth;
 scrollContainerRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
 }
 setActiveSlideIndex(index);
 };

 const handleSave = async () => {
 setIsSaving(true);
 try {
 const finalProposal = { ...proposal, layout: layoutConfig };
 await saveProposalToRegistry(finalProposal);
 setShowExportOverlay(true);
 } catch (e) {
 console.error(e);
 } finally {
 setIsSaving(false);
 }
 };

 const convertImagesToBase64 = async (element: HTMLElement) => {
 const images = Array.from(element.querySelectorAll('img'));
 const promises = images.map(async (img) => {
 if (img.src.startsWith('data:')) return;
 try {
 img.crossOrigin ="anonymous";
 const response = await fetch(img.src, { mode: 'cors', cache: 'force-cache' });
 const blob = await response.blob();
 await new Promise<void>((resolve, reject) => {
 const reader = new FileReader();
 reader.onloadend = () => {
 img.srcset ="";
 img.src = reader.result as string;
 resolve();
 };
 reader.onerror = reject;
 reader.readAsDataURL(blob);
 });
 } catch (e) {
 console.warn("MIMI // Proposal: Image conversion failed", e);
 }
 });
 await Promise.all(promises);
 };

 const handleProposalExport = async (format: 'pdf' | 'png' | 'current_png' | 'current_jpg') => {
 const stage = document.getElementById('proposal-export-stage');
 if (!stage) return;

 try {
 // Convert images to base64 before capture to prevent blank slides
 await convertImagesToBase64(stage);
 
 // Wait for the hidden container to re-render with base64 strings
 await new Promise(r => setTimeout(r, 1500)); 
 
 const slides = stage.querySelectorAll('.proposal-slide-export');
 
 if (format === 'pdf') {
 const doc = new jsPDF({
 orientation: 'l',
 unit: 'px',
 format: [1920, 1080],
 hotfixes: ['px_scaling']
 });

 for (let i = 0; i < slides.length; i++) {
 const slide = slides[i] as HTMLElement;
 const canvas = await html2canvas(slide, {
 scale: 1, 
 useCORS: true,
 logging: false,
 backgroundColor: null
 });
 
 const imgData = canvas.toDataURL('image/jpeg', 0.95);
 if (i > 0) doc.addPage();
 doc.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
 }
 doc.save(`${proposal.title.replace(/[^a-z0-9]/gi, '_')}_Deck.pdf`);
 } else if (format === 'png') {
 const slide = slides[0] as HTMLElement;
 const canvas = await html2canvas(slide, { scale: 1, useCORS: true });
 const link = document.createElement('a');
 link.download = `${proposal.title.replace(/[^a-z0-9]/gi, '_')}_Cover.png`;
 link.href = canvas.toDataURL('image/png');
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 } else if (format === 'current_png' || format === 'current_jpg') {
 const slide = slides[activeSlideIndex] as HTMLElement;
 // High-resolution scale: 3 (5760x3240)
 const canvas = await html2canvas(slide, { scale: 3, useCORS: true, logging: false });
 const link = document.createElement('a');
 const ext = format === 'current_png' ? 'png' : 'jpg';
 const mime = format === 'current_png' ? 'image/png' : 'image/jpeg';
 link.download = `${proposal.title.replace(/[^a-z0-9]/gi, '_')}_Slide_${activeSlideIndex + 1}.${ext}`;
 link.href = canvas.toDataURL(mime, 0.95);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 }
 
 setShowExportOverlay(false);
 onClose();
 } catch (e) {
 console.error("MIMI // Failed to export proposal:", e);
 }
 };

 const handleUpdateSectionElements = (sectionId: string, newElements: EditorElement[]) => {
 const updatedSections = proposal.content.sections.map(sec => 
 sec.id === sectionId ? { ...sec, elements: newElements } : sec
 );
 onUpdateProposal({ 
 ...proposal, 
 content: { ...proposal.content, sections: updatedSections } 
 });
 };

 const handleUpdateElementStyle = (sectionId: string, elementId: string, stylePatch: Partial<EditorElementStyle>) => {
 const section = proposal.content.sections.find(s => s.id === sectionId);
 if (!section) return;
 
 const updatedElements = section.elements.map(el => 
 el.id === elementId ? { ...el, style: { ...el.style, ...stylePatch } } : el
 );
 handleUpdateSectionElements(sectionId, updatedElements);
 };

 const handleRefineElement = async (sectionId: string, elementId: string, instruction: string) => {
 const section = proposal.content.sections.find(s => s.id === sectionId);
 if (!section) return;
 const element = section.elements.find(e => e.id === elementId);
 if (!element || element.type !== 'text') return;

 setIsRefining(elementId);
 try {
 const newText = await refineSectionContent(element.content, instruction, profile);
 const updatedElements = section.elements.map(e => 
 e.id === elementId ? { ...e, content: newText } : e
 );
 handleUpdateSectionElements(sectionId, updatedElements);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Text Refined.", icon: <Sparkles size={14} /> } 
 }));
 setCustomRefinePrompt('');
 } catch (e) {
 console.error("Refinement Failed", e);
 } finally {
 setIsRefining(null);
 }
 };

 const handleAssistantRefine = async () => {
 if (!assistantInput.trim() || isAssistantThinking) return;
 
 const activeSection = proposal.content.sections[activeSlideIndex];
 if (!activeSection) return;

 setIsAssistantThinking(true);
 try {
 const artifactContext = folderItems.map(i => i.content.prompt || i.content.name ||"Artifact").slice(0, 10);
 
 const refinedSection = await refineProposalSection(activeSection, assistantInput, {
 proposalTitle: proposal.title,
 proposalSummary: proposal.content.summary,
 artifacts: artifactContext,
 userProfile: profile
 });

 const updatedSections = proposal.content.sections.map(s => 
 s.id === activeSection.id ? refinedSection : s
 );
 
 onUpdateProposal({ 
 ...proposal, 
 content: { ...proposal.content, sections: updatedSections } 
 });
 
 setAssistantInput('');
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Section Logic Refined.", icon: <Sparkles size={14} /> } 
 }));
 } catch (e) {
 console.error("Assistant Failed", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Assistant Interrupted.", type: 'error' } 
 }));
 } finally {
 setIsAssistantThinking(false);
 }
 };

 const handleSyncTailor = () => {
 if (!activePersona?.tailorDraft) return;
 const draft = activePersona.tailorDraft;
 const primaryFont = draft.typographyIntent.styleDescription.includes('Serif') ? 'Cormorant Garamond' : 'Space Grotesk';
 const bg = draft.chromaticRegistry.baseNeutral || '#FDFBF7';
 const colors = draft.chromaticRegistry.primaryPalette.map(c => c.hex);

 setLayoutConfig(prev => ({
 ...prev,
 fontSet: [primaryFont, prev.fontSet[1]],
 backgroundStyle: bg,
 colorSet: colors.length > 0 ? colors : prev.colorSet
 }));

 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Synced with Aesthetic Core.", icon: <Settings2 size={14} /> } 
 }));
 };

 const handleAddPage = () => {
 const newSection: ProposalSection = {
 id: `slide_${Date.now()}`,
 title:"New Slide",
 body:"",
 elements: [],
 order: proposal.content.sections.length
 };
 onUpdateProposal({
 ...proposal,
 content: { ...proposal.content, sections: [...proposal.content.sections, newSection] }
 });
 setTimeout(() => scrollToSlide(proposal.content.sections.length), 100);
 };

 const handleDeletePage = () => {
 if (proposal.content.sections.length <= 1) return;
 const updatedSections = proposal.content.sections.filter((_, i) => i !== activeSlideIndex);
 onUpdateProposal({
 ...proposal,
 content: { ...proposal.content, sections: updatedSections } 
 });
 scrollToSlide(Math.max(0, activeSlideIndex - 1));
 };

 const handleAddText = () => {
 const activeSection = proposal.content.sections[activeSlideIndex];
 if (!activeSection) return;
 const newElement: EditorElement = {
 id: `el_${Date.now()}`,
 type: 'text',
 content:"New Text Block",
 style: {
 top: 50, left: 50, width: 30, zIndex: 20, fontSize: 1.2, fontFamily: layoutConfig.fontSet[0], color: '#000000', opacity: 1
 }
 };
 handleUpdateSectionElements(activeSection.id, [...activeSection.elements, newElement]);
 };

 const injectGoogleFont = (fontName: string) => {
 const linkId = `font-${fontName.replace(/\s+/g, '-')}`;
 if (!document.getElementById(linkId)) {
 const link = document.createElement('link');
 link.id = linkId;
 link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600&display=swap`;
 link.rel = 'stylesheet';
 document.head.appendChild(link);
 }
 setLayoutConfig(prev => ({ ...prev, fontSet: [fontName, prev.fontSet[1]] }));
 setCustomFontInput('');
 };

 const handleAddAssetToSlide = (item: PocketItem) => {
 const activeSection = proposal.content.sections[activeSlideIndex];
 if (!activeSection) return;
 const sourceName = item.content.prompt || item.content.name || item.content.title ||"Unknown Shard";
 let newElement: EditorElement;

 if (item.type === 'image') {
 newElement = {
 id: `img_${Date.now()}`,
 type: 'image',
 content: item.content.imageUrl,
 style: { top: 20, left: 20, width: 40, zIndex: 10, opacity: 1, objectFit: 'cover' },
 sourceRef: sourceName
 };
 } else {
 newElement = {
 id: `txt_${Date.now()}`,
 type: 'text',
 content: item.content.prompt || item.content.name ||"Text Fragment",
 style: { top: 20, left: 20, width: 30, zIndex: 10, fontSize: 1.2, fontFamily: 'inherit', color: 'inherit' },
 sourceRef: sourceName
 };
 }
 handleUpdateSectionElements(activeSection.id, [...activeSection.elements, newElement]);
 };

 const getSelectedTextElement = () => {
 if (!selectedElementId) return null;
 const section = proposal.content.sections[activeSlideIndex];
 return section?.elements.find(e => e.id === selectedElementId && e.type === 'text') || null;
 };

 const getSelectedImageElement = () => {
 if (!selectedElementId) return null;
 const section = proposal.content.sections[activeSlideIndex];
 return section?.elements.find(e => e.id === selectedElementId && e.type === 'image') || null;
 };

 const selectedTextElement = getSelectedTextElement();
 const selectedImageElement = getSelectedImageElement();

 return (
 <div className="fixed inset-0 z-[6000] bg dark:bg flex flex-col transition-colors duration-1000 overflow-hidden">
 
 {/* HIDDEN EXPORT STAGE (Always rendered but offscreen to ensure asset readiness) */}
 <div id="proposal-export-stage"style={{ position: 'fixed', left: '-10000px', top: 0, width: '1920px', height: '1080px', visibility: 'visible', zIndex: -1 }}>
 {proposal.content.sections.map(section => (
 <div key={section.id} className="proposal-slide-export"style={{ width: '1920px', height: '1080px', position: 'relative', overflow: 'hidden' }}>
 <SlideCanvas 
 id={section.id}
 elements={section.elements}
 isActive={false} // Disable interactivity for export
 onUpdate={() => {}}
 onSelect={() => {}}
 profile={profile}
 layoutConfig={layoutConfig} 
 />
 </div>
 ))}
 </div>

 <AnimatePresence>
 {showExportOverlay && <ProposalExportOverlay onExport={handleProposalExport} onClose={() => setShowExportOverlay(false)} activeSlideIndex={activeSlideIndex} />}
 </AnimatePresence>

 {/* 1. TOP NAVIGATION */}
 <nav className="h-16 border-b border-black/5 /5 bg-white/80 /80 backdrop-blur-xl flex justify-between items-center px-6 shrink-0 z-50">
 <div className="flex items-center gap-6">
 <button onClick={onClose} className="p-2 -ml-2 text-nous-subtle hover:text-red-500 transition-colors"><X size={20}/></button>
 <div className="hidden md:flex bg-nous-base p-1 rounded-none">
 <button onClick={() => setMode('content')} className={`px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'content' ? 'bg-white text-nous-text  ' : 'text-nous-subtle'}`}>
 <Edit3 size={12} /> Content
 </button>
 <button onClick={() => setMode('design')} className={`px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'design' ? 'bg-white text-nous-text text-nous-text ' : 'text-nous-subtle'}`}>
 <Palette size={12} /> Design
 </button>
 <button onClick={() => setMode('assets')} className={`px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'assets' ? 'bg-white text-nous-text text-nous-text ' : 'text-nous-subtle'}`}
 >
 <FolderOpen size={12} /> Folder
 </button>
 <button onClick={() => setMode('assistant')} className={`px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'assistant' ? 'bg-white text-nous-text text-nous-text ' : 'text-nous-subtle'}`}
 >
 <Sparkles size={12} /> Assistant
 </button>
 <button onClick={() => setMode('collaborators')} className={`px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'collaborators' ? 'bg-white text-nous-text text-nous-text ' : 'text-nous-subtle'}`}
 >
 <Users size={12} /> Team
 </button>
 </div>
 </div>

 <div className="flex items-center gap-4">
 <span className="font-serif italic text-sm text-nous-subtle hidden md:block">{proposal.title}</span>
 <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-nous-text text-nous-base rounded-none font-sans text-[9px] uppercase tracking-widest font-black flex items-center gap-2 active:scale-95 transition-all">
 {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12} />} Save
 </button>
 </div>
 </nav>

 <div className="flex-1 flex overflow-hidden relative">
 
 {/* 2. SIDEBARS */}
 <AnimatePresence initial={false} mode="wait">
 {mode === 'design' && (
 <motion.aside key="design-sidebar"initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-white border-r border-nous-border overflow-y-auto no-scrollbar shrink-0 z-40 hidden md:block">
 <div className="p-8 space-y-10 min-w-[320px]">
 <div className="p-6 bg-nous-base /50 rounded-none border border-nous-border space-y-4">
 <div className="flex items-center justify-between">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Aesthetic Core</span>
 <Settings2 size={14} className="text-nous-subtle"/>
 </div>
 <p className="font-serif italic text-xs text-nous-subtle leading-snug">Pull typographic and chromatic DNA from your active Tailor persona.</p>
 <button onClick={handleSyncTailor} className="w-full py-3 bg-white border border-nous-border rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:border-nous-border transition-colors flex items-center justify-center gap-2">
 <RefreshCw size={10} /> Sync Profile
 </button>
 </div>
 <section className="space-y-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle flex items-center gap-2"><Type size={12} /> Typography</span>
 <div className="space-y-2">
 {FONTS.map(font => (
 <button key={font.value} onClick={() => setLayoutConfig(p => ({ ...p, fontSet: [font.value, p.fontSet[1]] }))} className={`w-full text-left p-3 border rounded-none transition-all text-sm ${layoutConfig.fontSet[0] === font.value ? 'border-nous-text  bg-nous-base ' : 'border-nous-border text-nous-subtle'}`} style={{ fontFamily: font.value }}>{font.label}</button>
 ))}
 </div>
 <div className="flex gap-2">
 <input value={customFontInput} onChange={e => setCustomFontInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && injectGoogleFont(customFontInput)} placeholder="Google Font Name..."className="flex-1 bg-transparent border-b border-nous-border py-1 font-sans text-xs focus:outline-none"/>
 <button onClick={() => injectGoogleFont(customFontInput)} className="text-xs font-black uppercase tracking-widest text-nous-subtle hover:text-nous-text">Fetch</button>
 </div>
 </section>
 <section className="space-y-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle flex items-center gap-2"><Palette size={12} /> Palette</span>
 <div className="grid grid-cols-5 gap-2">
 {COLORS.map(color => (
 <button key={color.value} onClick={() => setLayoutConfig(p => ({ ...p, backgroundStyle: color.value }))} className={`aspect-square rounded-none border-2 transition-all ${layoutConfig.backgroundStyle === color.value ? 'border-nous-border scale-110' : 'border-transparent'}`} style={{ backgroundColor: color.value }} title={color.label} />
 ))}
 </div>
 <div className="flex items-center gap-2 mt-2">
 <input type="color"value={customColorInput} onChange={e => { setCustomColorInput(e.target.value); setLayoutConfig(p => ({ ...p, backgroundStyle: e.target.value })); }} className="w-8 h-8 rounded-none border-none p-0 cursor-pointer"/>
 <span className="font-mono text-[9px] text-nous-subtle">{customColorInput}</span>
 </div>
 </section>
 <section className="space-y-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle flex items-center gap-2"><Layout size={12} /> Tools</span>
 <button onClick={handleAddText} className="w-full py-3 border border-nous-border rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-nous-base transition-colors flex items-center justify-center gap-2">
 <Type size={10} /> Add Text Block
 </button>
 </section>
 </div>
 </motion.aside>
 )}

 {mode === 'assets' && (
 <motion.aside key="assets-sidebar"initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-nous-base border-r border-nous-border overflow-y-auto no-scrollbar shrink-0 z-40 hidden md:block">
 <div className="p-6 space-y-6 min-w-[320px]">
 <div className="flex items-center gap-2 text-nous-subtle mb-4 border-b border-nous-border pb-2"><FolderOpen size={14} /><span className="font-sans text-[9px] uppercase tracking-widest font-black">MATERIALS</span></div>
 {loadingAssets ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nous-subtle"/></div> : (
 <div className="space-y-4">
 {folderItems.map(item => (
 <button key={item.id} onClick={() => handleAddAssetToSlide(item)} className="w-full flex items-center gap-4 p-3 bg-white border border-nous-border rounded-none hover:border-nous-border transition-all group relative">
 <div className="w-12 h-12 bg-nous-base rounded-none overflow-hidden flex-shrink-0">
 {item.type === 'image' ? <img src={item.content.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform grayscale group-hover:grayscale-0"/> : <div className="w-full h-full flex items-center justify-center text-nous-subtle"><Type size={16} /></div>}
 </div>
 <div className="flex-1 text-left min-w-0">
 <p className="font-serif italic text-sm text-nous-subtle truncate">{item.content.prompt || item.content.name ||"Artifact"}</p>
 <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">{item.type}</span>
 </div>
 <div className="opacity-0 group-hover:opacity-100 text-nous-subtle transition-opacity"><Plus size={16} /></div>
 </button>
 ))}
 </div>
 )}
 {folderItems.length === 0 && !loadingAssets && <div className="text-center py-10 opacity-30"><FolderOpen size={32} className="mx-auto mb-2"/><p className="font-serif italic text-nous-subtle text-sm">No artifacts found in source folder.</p></div>}
 </div>
 </motion.aside>
 )}

 {mode === 'assistant' && (
 <motion.aside key="assistant-sidebar"initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-white border-r border-nous-border overflow-y-auto no-scrollbar shrink-0 z-40 hidden md:block">
 <div className="p-8 space-y-10 min-w-[320px]">
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Sparkles size={18} className="animate-pulse"/>
 <span className="font-sans text-[9px] uppercase tracking-[0.5em] font-black italic">Proposal Assistant</span>
 </div>
 <p className="font-serif italic text-sm text-nous-subtle leading-relaxed">
 Refine the current slide using natural language. The Assistant reads your proposal context, source folder, and profile.
 </p>
 </div>

 <div className="space-y-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Target: Slide {activeSlideIndex + 1}</span>
 <textarea 
 value={assistantInput}
 onChange={(e) => setAssistantInput(e.target.value)}
 placeholder="e.g. 'Make this more punchy' or 'Expand on the market gap'..."
 className="w-full bg-nous-base /50 border border-nous-border p-4 font-serif italic text-base text-nous-subtle focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-colors h-40 resize-none rounded-none"
 />
 <button 
 onClick={handleAssistantRefine}
 disabled={isAssistantThinking || !assistantInput.trim()}
 className="w-full py-4 bg-nous-text text-nous-base rounded-none font-sans text-[9px] uppercase tracking-widest font-black active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-stone-600"
 >
 {isAssistantThinking ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />}
 Refine Section
 </button>
 </div>

 <div className="p-6 bg-nous-base /50 rounded-none border border-nous-border space-y-3 opacity-60">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle flex items-center gap-2"><Terminal size={10} /> Active Context</span>
 <div className="text-[9px] font-mono text-nous-subtle space-y-1">
 <p>Source: {folderItems.length} Artifacts</p>
 <p>Profile: {activePersona?.name || 'Ghost'}</p>
 <p>Logic: {layoutConfig.template.toUpperCase()}</p>
 </div>
 </div>
 </div>
 </motion.aside>
 )}

 {mode === 'collaborators' && (
 <motion.aside key="collaborators-sidebar"initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-white border-r border-nous-border overflow-y-auto no-scrollbar shrink-0 z-40 hidden md:block">
 <div className="p-8 space-y-10 min-w-[320px]">
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Users size={18} />
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Workspace Access</span>
 </div>
 <p className="font-serif italic text-sm text-nous-subtle">Manage who can view and edit this proposal.</p>
 </div>
 
 <div className="space-y-6">
 <div className="space-y-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Current Members</span>
 <div className="flex items-center justify-between p-3 bg-nous-base border border-nous-border rounded-none">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-none bg-stone-200 flex items-center justify-center">
 <Shield size={14} className="text-nous-subtle"/>
 </div>
 <div>
 <p className="font-sans text-[10px] uppercase tracking-widest font-bold text-nous-text">@{profile?.handle || 'You'}</p>
 <p className="font-serif italic text-xs text-nous-subtle">Owner</p>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-4 pt-4 border-t border-nous-border">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Invite Collaborator</span>
 <div className="flex gap-2">
 <input 
 type="text"
 placeholder="@handle or email"
 className="flex-1 bg-nous-base border border-nous-border rounded-none px-3 py-2 font-mono text-xs focus:outline-none focus:border-nous-border"
 />
 <button className="p-2 bg-nous-base  text-nous-base rounded-none hover:bg-nous-base0 transition-colors">
 <UserPlus size={14} />
 </button>
 </div>
 </div>
 </div>
 </div>
 </motion.aside>
 )}
 </AnimatePresence>

 {/* 3. MAIN CANVAS SCROLL */}
 <div className="flex-1 relative flex flex-col overflow-hidden">
 <div 
 ref={scrollContainerRef}
 onScroll={handleScroll}
 className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-y-hidden md:overflow-x-auto snap-x snap-mandatory md:scroll-pl-12 no-scrollbar items-center bg-stone-200/50 pb-20 md:pb-0 pt-8 md:pt-0"
 >
 <div className="h-4 md:w-12 shrink-0"/> {/* Spacer */}
 
 {proposal.content.sections.map((section, idx) => (
 <div 
 id={`slide-container-${idx}`}
 key={section.id} 
 className="w-full md:w-[80vw] max-w-[1200px] h-auto md:h-full p-4 md:p-12 shrink-0 snap-center flex items-center justify-center mb-8 md:mb-0"
 >
 <div className="w-full aspect-[16/9] relative group">
 <SlideCanvas 
 id={section.id}
 elements={section.elements}
 isActive={idx === activeSlideIndex}
 onUpdate={(els) => handleUpdateSectionElements(section.id, els)}
 onSelect={() => setActiveSlideIndex(idx)}
 onElementSelect={setSelectedElementId}
 profile={profile}
 layoutConfig={layoutConfig} 
 />
 
 {/* SCOPED REFINEMENT PALETTE - TEXT */}
 <AnimatePresence>
 {mode === 'content' && idx === activeSlideIndex && selectedElementId && selectedTextElement && (
 <motion.div 
 initial={{ opacity: 0, x: 20 }} 
 animate={{ opacity: 1, x: 0 }} 
 exit={{ opacity: 0, x: 20 }}
 className="absolute -right-4 top-4 md:-right-16 md:top-0 z-50 flex flex-col"
 >
 <div className="bg-white border border-nous-border rounded-none p-4 w-72 max-h-[80vh] overflow-y-auto no-scrollbar space-y-6">
 <div className="flex justify-between items-center pb-2 border-b border-nous-border">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Text Inspector</span>
 <button onClick={() => setSelectedElementId(null)} className="text-nous-subtle hover:text-nous-subtle"><X size={12}/></button>
 </div>

 {/* AI VARIATIONS */}
 <div className="space-y-3">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle flex items-center gap-2"><Sparkles size={10} /> AI Refinements</span>
 {isGeneratingVariations ? (
 <div className="flex items-center gap-2 py-4 justify-center">
 <Loader2 size={14} className="animate-spin text-nous-subtle"/>
 <span className="font-mono text-[8px] text-nous-subtle 0 uppercase">Consulting Oracle...</span>
 </div>
 ) : aiVariations ? (
 <div className="space-y-2">
 {[
 { id: 'punchy', label: 'Punchy', content: aiVariations.punchy },
 { id: 'strategic', label: 'Strategic', content: aiVariations.strategic },
 { id: 'poetic', label: 'Poetic', content: aiVariations.poetic }
 ].map(v => (
 <button 
 key={v.id}
 onClick={() => {
 const updatedElements = section.elements.map(e => e.id === selectedTextElement.id ? { ...e, content: v.content } : e);
 handleUpdateSectionElements(section.id, updatedElements);
 }}
 className="w-full text-left p-2 bg-nous-base border border-nous-border rounded-none hover:border-nous-border transition-all group"
 >
 <span className="block font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle group-hover:text-nous-subtle mb-1">{v.label}</span>
 <p className="font-serif italic text-[10px] text-nous-subtle line-clamp-2">{v.content}</p>
 </button>
 ))}
 </div>
 ) : (
 <p className="font-serif italic text-[10px] text-nous-subtle 0 text-center">Select text to generate variations.</p>
 )}
 </div>

 {/* GEOMETRY */}
 <div className="space-y-4 pt-4 border-t border-nous-border">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Geometry</span>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">WIDTH (%)</label>
 <input type="number"value={selectedTextElement.style.width} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { width: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">SIZE (VW)</label>
 <input type="number"step="0.1"value={selectedTextElement.style.fontSize} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { fontSize: parseFloat(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">TOP (%)</label>
 <input type="number"value={selectedTextElement.style.top} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { top: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">LEFT (%)</label>
 <input type="number"value={selectedTextElement.style.left} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { left: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 </div>
 </div>

 {/* APPEARANCE */}
 <div className="space-y-4 pt-4 border-t border-nous-border">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Appearance</span>
 <div className="space-y-2">
 <label className="font-mono text-[7px] text-nous-subtle block">COLOR</label>
 <div className="flex items-center gap-2">
 <input type="color"value={selectedTextElement.style.color || '#000000'} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { color: e.target.value })} className="w-8 h-8 rounded-none border-none p-0 cursor-pointer"/>
 <input value={selectedTextElement.style.color || '#000000'} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { color: e.target.value })} className="flex-1 bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px] font-mono"/>
 </div>
 </div>
 <div className="space-y-2">
 <label className="font-mono text-[7px] text-nous-subtle block">FONT FAMILY</label>
 <select 
 value={selectedTextElement.style.fontFamily} 
 onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { fontFamily: e.target.value })}
 className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"
 >
 <option value="serif">Editorial Serif</option>
 <option value="sans">Minimal Sans</option>
 <option value="mono">Brutalist Mono</option>
 {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
 </select>
 </div>
 </div>

 {/* BORDER & RADIUS */}
 <div className="space-y-4 pt-4 border-t border-nous-border">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Border & Radius</span>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">WIDTH (PX)</label>
 <input type="number"value={selectedTextElement.style.borderWidth || 0} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { borderWidth: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">RADIUS (PX)</label>
 <input type="number"value={selectedTextElement.style.borderRadius || 0} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { borderRadius: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 </div>
 <div className="space-y-2">
 <label className="font-mono text-[7px] text-nous-subtle block">BORDER COLOR</label>
 <div className="flex items-center gap-2">
 <input type="color"value={selectedTextElement.style.borderColor || '#000000'} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { borderColor: e.target.value })} className="w-8 h-8 rounded-none border-none p-0 cursor-pointer"/>
 <input value={selectedTextElement.style.borderColor || '#000000'} onChange={e => handleUpdateElementStyle(section.id, selectedTextElement.id, { borderColor: e.target.value })} className="flex-1 bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px] font-mono"/>
 </div>
 </div>
 </div>

 <div className="pt-4 border-t border-nous-border">
 <button 
 onClick={() => {
 const updatedElements = section.elements.filter(e => e.id !== selectedTextElement.id);
 handleUpdateSectionElements(section.id, updatedElements);
 setSelectedElementId(null);
 }}
 className="w-full py-2 bg-red-500/10 text-red-500 rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-red-500 hover:text-nous-text transition-all"
 >
 Delete Element
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* SCOPED REFINEMENT PALETTE - IMAGE */}
 <AnimatePresence>
 {mode === 'content' && idx === activeSlideIndex && selectedElementId && selectedImageElement && (
 <motion.div 
 initial={{ opacity: 0, x: 20 }} 
 animate={{ opacity: 1, x: 0 }} 
 exit={{ opacity: 0, x: 20 }}
 className="absolute -right-4 top-4 md:-right-16 md:top-0 z-50 flex flex-col"
 >
 <div className="bg-white border border-nous-border rounded-none p-4 w-72 max-h-[80vh] overflow-y-auto no-scrollbar space-y-6">
 <div className="flex justify-between items-center pb-2 border-b border-nous-border">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Visual Calibration</span>
 <button onClick={() => setSelectedElementId(null)} className="text-nous-subtle hover:text-nous-subtle"><X size={12}/></button>
 </div>
 
 {/* GEOMETRY */}
 <div className="space-y-4">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Geometry</span>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">WIDTH (%)</label>
 <input type="number"value={selectedImageElement.style.width} onChange={e => handleUpdateElementStyle(section.id, selectedImageElement.id, { width: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">TOP (%)</label>
 <input type="number"value={selectedImageElement.style.top} onChange={e => handleUpdateElementStyle(section.id, selectedImageElement.id, { top: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">LEFT (%)</label>
 <input type="number"value={selectedImageElement.style.left} onChange={e => handleUpdateElementStyle(section.id, selectedImageElement.id, { left: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 <div className="space-y-1">
 <label className="font-mono text-[7px] text-nous-subtle">ROTATION (°)</label>
 <input type="number"value={selectedImageElement.style.rotation || 0} onChange={e => handleUpdateElementStyle(section.id, selectedImageElement.id, { rotation: parseInt(e.target.value) })} className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-[10px]"/>
 </div>
 </div>
 </div>

 {/* OPACITY */}
 <div className="space-y-2 pt-4 border-t border-nous-border">
 <div className="flex justify-between">
 <span className="font-mono text-[9px] text-nous-subtle">OPACITY</span>
 <span className="font-mono text-[9px] text-nous-subtle">{isNaN(Number(selectedImageElement.style.opacity)) ? 100 : Math.round((selectedImageElement.style.opacity !== undefined ? Number(selectedImageElement.style.opacity) : 1) * 100)}%</span>
 </div>
 <SemanticSteps 
 steps={[
 { label: '0%', value: 0 },
 { label: '25%', value: 0.25 },
 { label: '50%', value: 0.5 },
 { label: '75%', value: 0.75 },
 { label: '100%', value: 1 }
 ]}
 value={selectedImageElement.style.opacity !== undefined ? selectedImageElement.style.opacity : 1}
 onChange={(val) => handleUpdateElementStyle(section.id, selectedImageElement.id, { opacity: val })}
 />
 </div>

 {/* CORNER RADIUS */}
 <div className="space-y-2">
 <div className="flex justify-between">
 <span className="font-mono text-[9px] text-nous-subtle">RADIUS</span>
 <span className="font-mono text-[9px] text-nous-subtle">{selectedImageElement.style.borderRadius || 0}px</span>
 </div>
 <SemanticSteps 
 steps={[
 { label: 'Sharp', value: 0 },
 { label: 'Soft', value: 8 },
 { label: 'Round', value: 24 },
 { label: 'Pill', value: 100 }
 ]}
 value={selectedImageElement.style.borderRadius || 0}
 onChange={(val) => handleUpdateElementStyle(section.id, selectedImageElement.id, { borderRadius: val })}
 />
 </div>

 {/* FILTERS */}
 <div className="space-y-2">
 <span className="font-mono text-[9px] text-nous-subtle block">TREATMENT</span>
 <div className="grid grid-cols-3 gap-2">
 {[
 { label: 'RAW', val: 'none' },
 { label: 'B&W', val: 'grayscale(100%) contrast(1.1)' },
 { label: 'ARCHIVE', val: 'sepia(60%) contrast(0.9) brightness(1.1)' },
 { label: 'VOID', val: 'invert(100%)' },
 { label: 'SOFT', val: 'blur(4px) opacity(0.8)' },
 { label: 'HIGH', val: 'contrast(1.5) saturate(0)' }
 ].map(f => (
 <button 
 key={f.label}
 onClick={() => handleUpdateElementStyle(section.id, selectedImageElement.id, { filter: f.val })}
 className={`px-2 py-1.5 border rounded-none font-sans text-[7px] uppercase font-black transition-all ${selectedImageElement.style.filter === f.val ? 'bg-nous-text text-nous-base border-transparent' : 'border-nous-border text-nous-subtle hover:border-nous-border'}`}
 >
 {f.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 ))}
 
 <div className="h-4 md:w-12 shrink-0"/> {/* Spacer */}
 </div>

 {/* 4. CHAPTER NAVIGATION & PAGE TOOLS */}
 <div className="h-16 bg-white border-t border-nous-border flex items-center justify-between px-6 shrink-0 gap-4 fixed bottom-0 left-0 right-0 md:relative z-50">
 <button onClick={() => scrollToSlide(Math.max(0, activeSlideIndex - 1))} className="p-2 text-nous-subtle hover:text-nous-text hover:text-nous-text disabled:opacity-30"disabled={activeSlideIndex === 0}><ArrowLeft size={16}/></button>
 
 <div className="flex items-center gap-4">
 <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[40vw]">
 {proposal.content.sections.map((s, i) => (
 <button 
 key={s.id} 
 onClick={() => scrollToSlide(i)}
 className={`h-1.5 rounded-none transition-all ${i === activeSlideIndex ? 'w-8 bg-nous-text' : 'w-2 bg-stone-300 hover:bg-stone-400'}`} 
 />
 ))}
 </div>
 <div className="h-4 w-px bg-stone-200 hidden md:block"/>
 <button onClick={handleAddPage} className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-nous-base border border-nous-border rounded-none font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text hover:text-nous-text transition-all">
 <Plus size={10} /> Add Slide
 </button>
 {proposal.content.sections.length > 1 && (
 <button onClick={handleDeletePage} className="hidden md:block p-2 text-nous-subtle hover:text-red-500 transition-colors"title="Delete Slide">
 <X size={12} />
 </button>
 )}
 </div>

 <button onClick={() => scrollToSlide(Math.min(proposal.content.sections.length - 1, activeSlideIndex + 1))} className="p-2 text-nous-subtle hover:text-nous-text hover:text-nous-text disabled:opacity-30"disabled={activeSlideIndex === proposal.content.sections.length - 1}><ArrowRight size={16}/></button>
 </div>

 </div>
 </div>
 </div>
 );
};

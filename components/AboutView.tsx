
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 X, Sparkles, FolderOpen, ArrowRight, ArrowLeft, Loader2, 
 Briefcase, Layers, Target, CheckCircle2, 
 LayoutGrid, Archive, BrainCircuit, FileText, ScrollText, 
 Settings2, Download, Printer, Share2, Grid3X3, Palette
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { generateProposalFromFolder } from '../services/proposalOrchestrator';
import { ProposalWorkspace } from './ProposalWorkspace';
import { Proposal, PocketItem } from '../types';
import { fetchPocketItems, fetchUserProposals } from '../services/firebase';
import { compressImage } from '../services/geminiService';

const PROPOSAL_PRESETS = [
 { id: 'creative_brief', label: 'Creative Brief', desc: 'Campaign ideation, visual language, mood references.' },
 { id: 'market_analysis', label: 'Market Analysis', desc: 'Competitor breakdown, trend synthesis, gap analysis.' },
 { id: 'product_proposal', label: 'Product Proposal', desc: 'Problem statement, user archetypes, solution architecture.' },
 { id: 'campaign_strategy', label: 'Campaign Strategy', desc: 'Audience targeting, content pillars, rollout calendar.' },
 { id: 'portfolio_case', label: 'Portfolio Case Study', desc: 'Problem, approach, process documentation, results.' },
 { id: 'reflection', label: 'Reflection Report', desc: 'Project audit, pattern analysis, forward alignment.' }
];

type ProposalViewState = 'ENTRY' | 'BINDING' | 'ASSEMBLY' | 'REFINEMENT' | 'EXPORT';

const ProposalShell: React.FC<{ 
 title: string; 
 step: ProposalViewState; 
 onClose: () => void; 
 children: React.ReactNode; 
}> = ({ title, step, onClose, children }) => {
 return (
 <div className="fixed inset-0 z-[6000] bg dark:bg flex flex-col transition-colors duration-1000 overflow-hidden">
 {/* SHELL HEADER */}
 <header className="h-16 border-b border-black/5 /5 bg-white/80 /80 backdrop-blur-xl flex justify-between items-center px-6 shrink-0 z-50">
 <div className="flex items-center gap-6">
 <button onClick={onClose} className="p-2 -ml-2 text-nous-subtle hover:text-red-500 transition-colors">
 <X size={20}/>
 </button>
 <div className="hidden md:flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
 <span className={step === 'ENTRY' ? 'text-nous-text  font-black' : ''}>01 Entry</span>
 <span className="opacity-30">/</span>
 <span className={step === 'BINDING' ? 'text-nous-text text-nous-text font-black' : ''}>02 Binding</span>
 <span className="opacity-30">/</span>
 <span className={step === 'REFINEMENT' ? 'text-nous-text text-nous-text font-black' : ''}>03 Refinement</span>
 <span className="opacity-30">/</span>
 <span className={step === 'EXPORT' ? 'text-nous-text text-nous-text font-black' : ''}>04 Manifest</span>
 </div>
 </div>
 <span className="font-serif italic text-sm text-nous-subtle">{title}</span>
 </header>
 
 {/* SHELL BODY */}
 <div className="flex-1 overflow-hidden relative">
 {children}
 </div>
 </div>
 );
};

export const ProposalView: React.FC<{ folderData?: any; onClose?: () => void }> = ({ folderData, onClose }) => {
 const { user, profile } = useUser();
 const [viewState, setViewState] = useState<ProposalViewState>(folderData ? 'BINDING' : 'ENTRY');
 const [availableFolders, setAvailableFolders] = useState<PocketItem[]>([]);
 const [savedProposals, setSavedProposals] = useState<Proposal[]>([]);
 const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderData?.id || null);
 const [selectedPreset, setSelectedPreset] = useState('creative_brief');
 const [proposal, setProposal] = useState<Proposal | null>(null);
 const [loadingText, setLoadingText] = useState('');
 const [isUploading, setIsUploading] = useState(false);
 const fileInputRef = React.useRef<HTMLInputElement>(null);

 // Initial Load
 useEffect(() => {
 if (viewState === 'ENTRY' && user?.uid) {
 const loadData = async () => {
 try {
 const items = await fetchPocketItems(user.uid);
 setAvailableFolders(items.filter(i => i.type === 'moodboard'));
 const props = await fetchUserProposals(user.uid);
 setSavedProposals(props || []);
 } catch(e) { console.error(e); }
 };
 loadData();
 }
 }, [viewState, user]);

 useEffect(() => {
 if (viewState === 'BINDING' && folderData && !selectedFolderId) {
 setSelectedFolderId(folderData.id);
 }
 }, [viewState, folderData]);

 const handleClose = () => {
 if (onClose) onClose();
 else window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }));
 };

 const handleSelectFolder = (id: string) => {
 setSelectedFolderId(id);
 setViewState('BINDING');
 };

 const handleOpenProposal = (p: Proposal) => {
 setProposal(p);
 setViewState('REFINEMENT');
 };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || !user?.uid || !selectedFolderId) return;

 setIsUploading(true);
 try {
 for (let i = 0; i < files.length; i++) {
 const file = files[i];
 
 const base64 = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = (ev) => resolve(ev.target?.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });

 const compressed = await compressImage(base64);
 
 // Add to pocket as a visual shard
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'image', {
 imageUrl: compressed,
 name: file.name,
 source: 'Proposal Upload',
 timestamp: Date.now()
 });
 }
 
 // Refresh available folders/items
 const items = await fetchPocketItems(user.uid);
 setAvailableFolders(items.filter(i => i.type === 'moodboard'));
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message: `${files.length} Shards Bound.`, icon: <Plus size={14} /> } 
 }));
 } catch (err) {
 console.error("Upload failed", err);
 } finally {
 setIsUploading(false);
 }
 };
 const handleStartAssembly = async () => {
 const hasSource = selectedFolderId || (folderData && folderData.items && folderData.items.length > 0);
 if (!hasSource || !user?.uid) { console.warn("Proposal: No source data available."); return; }
 
 setViewState('ASSEMBLY');
 setLoadingText('Accessing Folder Registry...');
 
 try {
 await new Promise(r => setTimeout(r, 800));
 setLoadingText('Auditing Artifacts...');
 await new Promise(r => setTimeout(r, 800));
 setLoadingText('Consulting Oracle...');

 const newProposal = await generateProposalFromFolder({
 userId: user.uid,
 folderId: selectedFolderId || undefined,
 sourceItems: folderData?.items || undefined,
 folderName: folderData?.name || undefined,
 notes: folderData?.notes || undefined,
 selectedPreset,
 selectedModules: [],
 profile
 });

 setProposal(newProposal);
 setViewState('REFINEMENT');
 } catch (e) {
 console.error("Assembly Failed:", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Strategy Assembly Failed.", type: 'error' } }));
 setViewState('ENTRY');
 }
 };

 return (
 <>
 {/* REFINEMENT LAYER IS FULL SCREEN AND HANDLES ITS OWN UI */}
 {viewState === 'REFINEMENT' && proposal ? (
 <ProposalWorkspace 
 proposal={proposal} 
 onUpdateProposal={setProposal} 
 onClose={handleClose} 
 />
 ) : (
 <ProposalShell 
 title={viewState === 'ENTRY' ? 'Proposal Registry' : viewState === 'BINDING' ? 'Material Binding' : 'System Processing'}
 step={viewState}
 onClose={handleClose}
 >
 <AnimatePresence mode="wait">
 
 {/* STATE: ASSEMBLY (LOADING) */}
 {viewState === 'ASSEMBLY' && (
 <motion.div 
 key="assembly"
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="absolute inset-0 z-[7000] bg-nous-base flex flex-col items-center justify-center gap-12"
 >
 <div className="relative">
 <div className="absolute inset-0 bg-nous-base0/20 blur-xl rounded-none animate-pulse"/>
 <BrainCircuit size={64} className="text-white relative z-10 animate-pulse"/>
 </div>
 <div className="space-y-4 text-center">
 <h3 className="font-serif text-3xl italic text-white tracking-tighter">Assisted Assembly.</h3>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] font-black text-nous-subtle animate-pulse">{loadingText}</p>
 </div>
 </motion.div>
 )}

 {/* STATE: BINDING (CONFIG) */}
 {viewState === 'BINDING' && (
 <motion.div 
 key="binding"
 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
 className="flex-1 h-full overflow-y-auto no-scrollbar p-6 md:p-12 flex flex-col items-center justify-center relative"
 >
 <button onClick={() => setViewState('ENTRY')} className="absolute top-8 left-8 p-3 text-nous-subtle hover:text-nous-subtle hover:text-nous-text hidden md:block">
 <ArrowLeft size={20}/>
 </button>
 
 <div className="w-full max-w-5xl bg-white border border-nous-border rounded-none p-8 md:p-16 space-y-12">
 <div className="space-y-4 text-center">
 <div className="flex items-center justify-center gap-3 text-nous-subtle">
 <Layers size={20} />
 <span className="font-sans text-[9px] uppercase tracking-[0.5em] font-black italic">Material Binding</span>
 </div>
 <h2 className="font-serif text-4xl md:text-5xl italic tracking-tighter text-nous-text text-nous-text">Configure Output.</h2>
 </div>
 
 <div className="grid md:grid-cols-2 gap-12">
 <div className="space-y-6">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle border-b border-nous-border pb-2 block">Strategic Logic</span>
 <div className="space-y-3">
 {PROPOSAL_PRESETS.map(p => (
 <button key={p.id} onClick={() => setSelectedPreset(p.id)} className={`w-full text-left p-4 rounded-none border transition-all ${selectedPreset === p.id ? 'bg-nous-text text-nous-base border-transparent ' : 'bg-transparent border-nous-border text-nous-subtle hover:border-nous-border'}`}>
 <div className="flex justify-between items-center mb-1"><span className="font-serif italic text-lg leading-none">{p.label}</span>{selectedPreset === p.id && <CheckCircle2 size={14} />}</div>
 <p className="font-sans text-[7px] uppercase tracking-wide opacity-70">{p.desc}</p>
 </button>
 ))}
 </div>
 </div>
 <div className="flex flex-col justify-between space-y-8">
 <div className="p-8 bg-nous-base /40 border border-nous-border rounded-none space-y-6">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Target Source</span>
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-stone-200 rounded-none flex items-center justify-center text-nous-subtle"><FolderOpen size={20} /></div>
 <div>
 <p className="font-serif italic text-xl text-nous-text text-nous-text line-clamp-2">{folderData?.name || availableFolders.find(f => f.id === selectedFolderId)?.content.name || 'Selected Folder'}</p>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">Source Locked</p>
 </div>
 </div>

 {/* FILE UPLOAD AREA */}
 <div 
 className="mt-4 border-2 border-dashed border-nous-border rounded-none p-6 text-center hover:border-nous-border transition-all cursor-pointer group bg-white/50 /20"
 onClick={() => fileInputRef.current?.click()}
 onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
 onDrop={async (e) => {
 e.preventDefault();
 e.stopPropagation();
 const files = e.dataTransfer.files;
 if (files && files.length > 0) {
 const event = { target: { files } } as any;
 handleFileUpload(event);
 }
 }}
 >
 <input type="file"ref={fileInputRef} onChange={handleFileUpload} className="hidden"multiple accept="image/*"/>
 {isUploading ? (
 <Loader2 size={20} className="animate-spin text-nous-subtle mx-auto"/>
 ) : (
 <div className="space-y-2">
 <Upload size={16} className="mx-auto text-nous-subtle group-hover:text-nous-text transition-colors"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle group-hover:text-nous-text">Inject New Materials</span>
 </div>
 )}
 </div>
 </div>
 <button onClick={handleStartAssembly} className="w-full py-6 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-[0.5em] font-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
 <Sparkles size={16} /> Execute Assembly
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 )}

 {/* STATE: ENTRY (DASHBOARD) */}
 {viewState === 'ENTRY' && (
 <motion.div 
 key="entry"
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="flex-1 h-full overflow-y-auto no-scrollbar p-6 md:p-12 relative"
 >
 <div className="text-center space-y-6 mb-16 pt-12">
 <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-none border border-nous-border/20 bg-nous-base0/5 text-nous-subtle">
 <Briefcase size={12} />
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black">Strategic Suite</span>
 </div>
 <h1 className="font-serif text-6xl md:text-8xl italic tracking-tighter text-nous-text text-nous-text leading-none">The Proposal.</h1>
 <p className="font-serif italic text-xl md:text-2xl text-nous-subtle leading-relaxed max-w-xl mx-auto">
 Transmute your archival debris into defensible strategic artifacts.
 </p>
 </div>

 <div className="w-full max-w-6xl mx-auto space-y-16 pb-20">
 {/* FOLDER SELECTION */}
 <section>
 <div className="flex items-center gap-4 mb-8">
 <FolderOpen size={16} className="text-nous-subtle"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Source Selection</span>
 <div className="h-px flex-1 bg-nous-base"/>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {availableFolders.map(folder => (
 <button key={folder.id} onClick={() => handleSelectFolder(folder.id)} className="group p-8 bg-white border border-nous-border rounded-none hover:border-nous-border hover: transition-all text-left flex flex-col gap-6">
 <div className="flex justify-between items-start"><FolderOpen size={24} className="text-nous-subtle group-hover:text-nous-subtle transition-colors"/><ArrowRight size={16} className="text-nous-subtle opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all"/></div>
 <div><h4 className="font-serif italic text-2xl text-nous-text text-nous-text line-clamp-1">{folder.content.name}</h4><span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">{folder.content.itemIds?.length || 0} Artifacts</span></div>
 </button>
 ))}
 {availableFolders.length === 0 && <div className="col-span-full py-12 text-center opacity-30 border-2 border-dashed border-nous-border rounded-none"><Archive size={48} className="mx-auto mb-4"/><p className="font-serif italic text-2xl">No Stacks Found.</p></div>}
 </div>
 </section>

 {/* SAVED PROPOSALS (REGISTRY) */}
 {savedProposals.length > 0 && (
 <section>
 <div className="flex items-center gap-4 mb-8">
 <ScrollText size={16} className="text-nous-subtle"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">Proposal Registry</span>
 <div className="h-px flex-1 bg-nous-base"/>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {savedProposals.map(p => (
 <button key={p.id} onClick={() => handleOpenProposal(p)} className="text-left p-6 bg-nous-base /40 border border-nous-border rounded-none hover:border-nous-border transition-all group">
 <div className="flex justify-between items-start mb-4">
 <div className="p-2 bg-white rounded-none text-nous-subtle group-hover:text-nous-subtle"><FileText size={14} /></div>
 <span className="font-mono text-[8px] text-nous-subtle">{new Date(p.updatedAt).toLocaleDateString()}</span>
 </div>
 <h4 className="font-serif italic text-lg text-nous-text text-nous-text line-clamp-2 leading-tight">{p.title}</h4>
 <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle mt-2 block">{p.content.sections.length} Slides</span>
 </button>
 ))}
 </div>
 </section>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </ProposalShell>
 )}
 </>
 );
};

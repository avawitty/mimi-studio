import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Copy, Check, ShoppingBag, ExternalLink, Upload, X, Link as LinkIcon, Scale, FolderPlus, Plus, Trash2, LayoutGrid, MoreVertical, Filter, SortAsc, Image as ImageIcon, Scissors } from 'lucide-react';
import { procureWithArtifacts, compareItemsFiscalAudit, auditThimbleBoard, generateZineImage, analyzePinterestBoard } from '../services/geminiService';
import { TryOnTool } from './TryOnTool';
import { SessionInsightsWidget } from './SessionInsightsWidget';
import { useUser } from '../contexts/UserContext';
import { MediaFile, ThimbleBoard, ThimbleItem } from '../types';
import { handleFirestoreError, logFirestoreError, OperationType, saveTask } from '../services/firebaseUtils';
import { db } from '../services/firebaseInit';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

interface SourcingTarget {
 targetArchetype: string;
 referenceImageUrl?: string;
 searchableInterpretations?: string[];
 keywordBoolean: string;
 emergingDesigner: string;
 rationale: string;
}

interface FiscalAuditResult {
 item1Analysis: string;
 item2Analysis: string;
 verdict: string;
 rationale: string;
 searchDirectives: string[];
 searchBooleans: string[];
}

interface BoardAuditResult {
 boardAnalysis: string;
 redundancies: string;
 verdict: string;
 rationale: string;
}

export const ThimbleDashboard = () => {
 const { profile, user } = useUser();
 const [activeTab, setActiveTab] = useState<'sourcing' | 'boards' | 'audit' | 'try-on'>('sourcing');
 
 const triggerAlert = (type: 'error' | 'announcement' | 'success', message: string) => {
  window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
   detail: { type, message }
  }));
 };

 // Sourcing State
 const [budget, setBudget] = useState('');
 const [objective, setObjective] = useState('');
 const [targets, setTargets] = useState<SourcingTarget[]>([]);
 const [expandedTargetIndex, setExpandedTargetIndex] = useState<number | null>(null);
 const [selectedBoardIdForTarget, setSelectedBoardIdForTarget] = useState<string>('');
 const [addedBoardName, setAddedBoardName] = useState<string | null>(null);
 const [isPushSuccess, setIsPushSuccess] = useState(false);
 const [isProcuring, setIsProcuring] = useState(false);
 const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
 const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
 const [isDragging, setIsDragging] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [linkInput, setLinkInput] = useState('');

 // Audit State
 const [item1, setItem1] = useState('');
 const [item2, setItem2] = useState('');
 const [item1Images, setItem1Images] = useState<string[]>([]);
 const [item2Images, setItem2Images] = useState<string[]>([]);
 const [auditBudget, setAuditBudget] = useState('');
 const [isAuditing, setIsAuditing] = useState(false);
 const [auditResult, setAuditResult] = useState<FiscalAuditResult | null>(null);
 
 // Pinterest State
 const [pinterestUrl, setPinterestUrl] = useState('');
 const [isAnalyzingPinterest, setIsAnalyzingPinterest] = useState(false);
 const [pinterestResult, setPinterestResult] = useState<any | null>(null);
 const [pinterestPins, setPinterestPins] = useState<any[]>([]);

 // Boards State
 const [boards, setBoards] = useState<ThimbleBoard[]>([]);
 const [selectedBoard, setSelectedBoard] = useState<ThimbleBoard | null>(null);
 const [boardItems, setBoardItems] = useState<ThimbleItem[]>([]);
 const [newBoardTitle, setNewBoardTitle] = useState('');
 const [newItemUrl, setNewItemUrl] = useState('');
 const [newItemTitle, setNewItemTitle] = useState('');
 const [newItemPrice, setNewItemPrice] = useState('');
 const [isAuditingBoard, setIsAuditingBoard] = useState(false);
 const [boardAuditResult, setBoardAuditResult] = useState<BoardAuditResult | null>(null);

 useEffect(() => {
 const handleNav = (e: any) => {
 if (e.detail === 'thimble' && e.detail_id) {
 const board = boards.find(b => b.id === e.detail_id);
 if (board) {
 setSelectedBoard(board);
 setActiveTab('boards');
 }
 }
 };
 window.addEventListener('mimi:change_view', handleNav);
 return () => window.removeEventListener('mimi:change_view', handleNav);
 }, [boards]);

 useEffect(() => {
 if (!user?.uid) return;
 const q = query(collection(db, 'thimbleBoards'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
 const unsubscribe = onSnapshot(q, (snapshot) => {
 const b = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThimbleBoard));
 setBoards(b);
 }, (error) => {
 logFirestoreError(error, OperationType.LIST, 'thimbleBoards');
 });
 return () => unsubscribe();
 }, [user?.uid]);

 useEffect(() => {
 if (!selectedBoard || !user?.uid) {
 setBoardItems([]);
 setBoardAuditResult(null);
 return;
 }
 const q = query(collection(db, 'thimbleItems'), where('boardId', '==', selectedBoard.id), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
 const unsubscribe = onSnapshot(q, (snapshot) => {
 const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThimbleItem));
 setBoardItems(items);
 }, (error) => {
 logFirestoreError(error, OperationType.LIST, 'thimbleItems');
 });
 return () => unsubscribe();
 }, [selectedBoard, user?.uid]);

 const handleCreateBoard = async () => {
 if (!newBoardTitle.trim() || !user?.uid) return;
 try {
 await addDoc(collection(db, 'thimbleBoards'), {
 userId: user.uid,
 title: newBoardTitle.trim(),
 createdAt: serverTimestamp()
 });
 setNewBoardTitle('');
 } catch (error) {
 handleFirestoreError(error, OperationType.CREATE, 'thimbleBoards');
 }
 };

 const handleDeleteBoard = async (boardId: string) => {
 try {
 await deleteDoc(doc(db, 'thimbleBoards', boardId));
 if (selectedBoard?.id === boardId) setSelectedBoard(null);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, `thimbleBoards/${boardId}`);
 }
 };

 const handleAddItem = async () => {
 if (!newItemUrl.trim() || !selectedBoard || !user?.uid) return;
 try {
 let fetchedImageUrl = '';
 try {
 const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(newItemUrl.trim())}`);
 const data = await res.json();
 if (data.status === 'success' && data.data?.image?.url) {
 fetchedImageUrl = data.data.image.url;
 }
 } catch (e) {
 console.error("Failed to fetch link thumbnail", e);
 }

 await addDoc(collection(db, 'thimbleItems'), {
 boardId: selectedBoard.id,
 userId: user.uid,
 url: newItemUrl.trim(),
 title: newItemTitle.trim() || 'Untitled Artifact',
 price: newItemPrice.trim() || 'Unknown',
 imageUrl: fetchedImageUrl,
 createdAt: serverTimestamp()
 });
 setNewItemUrl('');
 setNewItemTitle('');
 setNewItemPrice('');
 } catch (error) {
 handleFirestoreError(error, OperationType.CREATE, 'thimbleItems');
 }
 };

 const handleDeleteItem = async (itemId: string) => {
 try {
 await deleteDoc(doc(db, 'thimbleItems', itemId));
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, `thimbleItems/${itemId}`);
 }
 };

 const handleAuditBoard = async () => {
 if (!selectedBoard || boardItems.length === 0) return;
 setIsAuditingBoard(true);
 try {
 const result = await auditThimbleBoard(
 profile?.tasteProfile ||"Unknown Taste",
 selectedBoard.title,
 boardItems.map(i => ({ url: i.url, title: i.title, price: i.price, notes: i.notes }))
 );
 setBoardAuditResult(result);
 triggerAlert('success', 'Board audit completed successfully.');
 } catch (error) {
 console.error("Board audit failed:", error);
 triggerAlert('error', 'Failed to audit board. Please try again.');
 } finally {
 setIsAuditingBoard(false);
 }
 };

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList } }) => {
 if (e.target.files && e.target.files.length > 0) {
 const files = Array.from(e.target.files);
 try {
 const newMedia = await Promise.all(files.map(async (f) => {
 if (f.type.startsWith('image/')) {
 const { compressImage } = await import('../services/imageUtils');
 const dataUrl = await compressImage(f, 800, 800, 0.7);
 return {
 type: 'image' as const,
 data: dataUrl.split(',')[1],
 url: dataUrl,
 mimeType: 'image/jpeg',
 name: f.name
 };
 } else {
 return new Promise<MediaFile>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = (ev) => {
 resolve({
 type: f.type.startsWith('image/') ? 'image' : 'video',
 data: (ev.target?.result as string).split(',')[1],
 url: ev.target?.result as string,
 mimeType: f.type,
 name: f.name
 });
 };
 reader.onerror = reject;
 reader.readAsDataURL(f);
 });
 }
 }));
 setMediaFiles(prev => [...prev, ...newMedia]);
 } catch (error) {
 console.error("Error reading files:", error);
 triggerAlert('error', 'Failed to process files. Please try again.');
 }
 }
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(false);
 if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
 handleFileChange({ target: { files: e.dataTransfer.files } } as any);
 } else {
 const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
 if (url) {
 setMediaFiles(prev => [...prev, { type: 'link' as any, url, data: '', mimeType: 'text/plain', name: url } as MediaFile]);
 }
 }
 };

 const removeMedia = (index: number) => {
 setMediaFiles(prev => prev.filter((_, i) => i !== index));
 };

 const handleAddLink = async () => {
 if (linkInput.trim()) {
 const url = linkInput.trim();
 setLinkInput('');
 
 let fetchedImageUrl = '';
 try {
 const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
 const data = await res.json();
 if (data.status === 'success' && data.data?.image?.url) {
 fetchedImageUrl = data.data.image.url;
 }
 } catch (e) {
 console.error("Failed to fetch link thumbnail", e);
 }

 setMediaFiles(prev => [...prev, { type: 'link' as any, url, data: fetchedImageUrl, mimeType: 'text/plain', name: url } as MediaFile]);
 }
 };

 const handleProcure = async () => {
 if (!budget.trim() && mediaFiles.length === 0) return;
 setIsProcuring(true);
 try {
 const results = await procureWithArtifacts(
 profile?.tasteProfile ||"Unknown Taste", 
 budget, 
 objective,
 mediaFiles
 );
 setTargets(results);
 triggerAlert('success', 'Procurement targets generated successfully.');
 } catch (error) {
 console.error("Procurement failed:", error);
 triggerAlert('error', 'Failed to generate procurement targets.');
 } finally {
 setIsProcuring(false);
 }
 };

 const handleAudit = async () => {
 if (!item1.trim() || !item2.trim()) return;
 setIsAuditing(true);
 try {
 const result = await compareItemsFiscalAudit(
 profile?.tasteProfile ||"Unknown Taste",
 item1,
 item1Images,
 item2,
 item2Images,
 auditBudget
 );
 setAuditResult(result);
 triggerAlert('success', 'Fiscal audit completed successfully.');
 } catch (error) {
 console.error("Audit failed:", error);
 triggerAlert('error', 'Failed to complete fiscal audit.');
 } finally {
 setIsAuditing(false);
 }
 };

 const handlePinterestAnalysis = async () => {
 if (!pinterestUrl.trim()) return;
 setIsAnalyzingPinterest(true);
 setPinterestResult(null);
 setPinterestPins([]);
 
 try {
 const res = await fetch(`/api/pinterest?url=${encodeURIComponent(pinterestUrl.trim())}`);
 const data = await res.json();
 
 if (data.pins && data.pins.length > 0) {
 setPinterestPins(data.pins);
 const result = await analyzePinterestBoard(
 profile?.tasteProfile || "Unknown Taste",
 pinterestUrl.trim(),
 data.pins
 );
 setPinterestResult(result);
 triggerAlert('success', 'Pinterest board analyzed successfully.');
 } else {
 triggerAlert('error', 'No pins found on this board. Ensure it is a public board.');
 }
 } catch (error) {
 console.error("Pinterest analysis failed:", error);
 triggerAlert('error', 'Failed to analyze Pinterest board.');
 } finally {
 setIsAnalyzingPinterest(false);
 }
 };

 const copyToClipboard = (text: string, index: number) => {
 navigator.clipboard.writeText(text).catch(e => console.error("MIMI // Clipboard error", e));
 setCopiedIndex(index);
 setTimeout(() => setCopiedIndex(null), 2000);
 };

 const openSearch = (query: string, platform: string = 'ebay') => {
 let url = '';
 const encodedQuery = encodeURIComponent(query);
 switch (platform) {
 case 'ebay':
 url = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`;
 break;
 case 'grailed':
 url = `https://www.grailed.com/shop?query=${encodedQuery}`;
 break;
 case 'ssense':
 url = `https://www.ssense.com/en-us/men?q=${encodedQuery}`;
 break;
 case 'crossroads':
 url = `https://crossroadstrading.com/?s=${encodedQuery}`;
 break;
 case 'therealreal':
 url = `https://www.therealreal.com/shop?keywords=${encodedQuery}`;
 break;
 case 'vestiaire':
 url = `https://us.vestiairecollective.com/search/?q=${encodedQuery}`;
 break;
 case 'depop':
 url = `https://www.depop.com/search/?q=${encodedQuery}`;
 break;
 default:
 url = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`;
 }
 window.open(url, '_blank');
 };

 const saveToPocket = async (target: SourcingTarget) => {
 if (!user?.uid) return;
 try {
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'text', {
 content: `Sourcing Target: ${target.targetArchetype}\nCanonical Reference: ${target.referenceImageUrl || 'N/A'}\nSearchable Interpretations: ${target.searchableInterpretations?.join(', ') || 'N/A'}\nQuery: ${target.keywordBoolean}\nDesigners: ${target.emergingDesigner}\nRationale: ${target.rationale}`,
 title: target.targetArchetype,
 timestamp: Date.now(),
 origin: 'The Thimble'
 });
 } catch (e) {
 console.error("Failed to save target", e);
 }
 };

 const saveAuditToPocket = async () => {
 if (!user?.uid || !auditResult) return;
 try {
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'text', {
 content: `Fiscal Audit Verdict: ${auditResult.verdict}\n\nItem 1 Analysis: ${auditResult.item1Analysis}\n\nItem 2 Analysis: ${auditResult.item2Analysis}\n\nRationale: ${auditResult.rationale}${auditResult.searchDirectives ? `\n\nSearch Directives:\n${auditResult.searchDirectives.join('\n')}` : ''}${auditResult.searchBooleans ? `\n\nSearch Booleans:\n${auditResult.searchBooleans.join('\n')}` : ''}`,
 title: `Fiscal Audit: ${auditResult.verdict}`,
 timestamp: Date.now(),
 origin: 'The Thimble'
 });
 } catch (e) {
 console.error("Failed to save audit", e);
 }
 };

 return (
 <div className="min-h-full flex flex-col md:flex-row bg-nous-base text-nous-text font-sans"style={{ backgroundImage: 'radial-gradient(#D1CFCA 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}>
 
 {/* Sidebar Navigation */}
 <aside className="w-full md:w-64 border-r border-nous-border flex flex-col h-full sticky top-0 bg-nous-base/80 /80 backdrop-blur-sm z-10">
 <div className="p-8 border-b border-nous-border flex flex-col gap-4">
 <div className="flex items-center gap-3">
 <div className="relative w-8 h-8 flex items-center justify-center bg-transparent border border-nous-border group-hover:bg-nous-base transition-colors">
 <ShoppingBag className="w-4 h-4 text-nous-text opacity-80" strokeWidth={1.5} />
 <div className="absolute -bottom-1 -right-1 bg-white border border-nous-border p-0.5">
 <Scissors className="w-3 h-3 text-nous-text" strokeWidth={2} />
 </div>
 </div>
 <h1 className="font-serif italic text-xl">The Thimble</h1>
 </div>
 <div className="text-[9px] uppercase tracking-[0.2em] font-medium opacity-60">System Active: {new Date().toLocaleDateString()}</div>
 </div>
 
 <nav className="flex-grow p-4 space-y-2">
 <button 
 onClick={() => setActiveTab('sourcing')}
 className={`w-full flex items-center gap-3 px-4 py-3 border text-[10px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'sourcing' ? 'bg-white border-nous-border opacity-100' : 'bg-transparent border-transparent hover:border-nous-border opacity-60 hover:opacity-100 hover:bg-white/50 /50'}`}
 >
 <Search size={16} /> Sourcing
 </button>
 <button 
 onClick={() => setActiveTab('boards')}
 className={`w-full flex items-center gap-3 px-4 py-3 border text-[10px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'boards' ? 'bg-white border-nous-border opacity-100' : 'bg-transparent border-transparent hover:border-nous-border opacity-60 hover:opacity-100 hover:bg-white/50 /50'}`}
 >
 <LayoutGrid size={16} /> Boards
 </button>
 <button 
 onClick={() => setActiveTab('audit')}
 className={`w-full flex items-center gap-3 px-4 py-3 border text-[10px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'audit' ? 'bg-white border-nous-border opacity-100' : 'bg-transparent border-transparent hover:border-nous-border opacity-60 hover:opacity-100 hover:bg-white/50 /50'}`}
 >
 <Scale size={16} /> Fiscal Audit
 </button>
 <button 
 onClick={() => setActiveTab('try-on')}
 className={`w-full flex items-center gap-3 px-4 py-3 border text-[10px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'try-on' ? 'bg-white border-nous-border opacity-100' : 'bg-transparent border-transparent hover:border-nous-border opacity-60 hover:opacity-100 hover:bg-white/50 /50'}`}
 >
 <ShoppingBag size={16} /> Try On
 </button>
 </nav>

 {activeTab === 'boards' && (
 <div className="p-4 border-t border-nous-border">
 <div className="text-[9px] uppercase tracking-widest opacity-40 mb-3">Your Boards</div>
 <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
 {boards.map(b => (
 <div key={b.id} className="flex items-center justify-between group">
 <button 
 onClick={() => setSelectedBoard(b)}
 className={`flex-grow text-left px-3 py-2 text-[10px] uppercase tracking-widest truncate transition-colors ${selectedBoard?.id === b.id ? 'bg-white border border-nous-border font-bold' : 'hover:bg-white/50 /50 opacity-70 hover:opacity-100'}`}
 >
 {b.title}
 </button>
 <button onClick={() => handleDeleteBoard(b.id)} className="p-2 opacity-0 group-hover:opacity-100 text-nous-subtle hover:text-red-800 transition-opacity">
 <Trash2 size={12} />
 </button>
 </div>
 ))}
 </div>
 <div className="mt-4 flex gap-2">
 <input 
 type="text"
 value={newBoardTitle} 
 onChange={e => setNewBoardTitle(e.target.value)}
 placeholder="NEW BOARD..."
 className="flex-grow bg-white/50 /50 border border-nous-border px-3 py-2 text-[10px] uppercase tracking-widest focus:ring-0 focus:border-nous-border outline-none"
 />
 <button onClick={handleCreateBoard} className="bg-nous-base text-nous-text px-3 py-2 hover:bg-nous-base dark:hover:bg-white transition-colors">
 <Plus size={14} />
 </button>
 </div>
 </div>
 )}

 <div className="p-8 border-t border-nous-border">
 <div className="text-[9px] uppercase tracking-widest opacity-40">
 Procurement & Sourcing Engine <br/>
 v.4.0.1
 </div>
 </div>
 </aside>

 {/* Main Content Area */}
 <main className="flex-grow p-6 md:p-12 overflow-x-hidden relative">
 <header className="mb-12 flex justify-between items-end border-b border-nous-border pb-8">
 <div>
 <h2 className="font-serif italic text-4xl md:text-5xl leading-tight">
 {activeTab === 'sourcing' && <>Procurement & Sourcing <br/>Executive Control Panel</>}
 {activeTab === 'boards' && <>Archival Worksheet <br/>{selectedBoard ? selectedBoard.title : 'Board Overview'}</>}
 {activeTab === 'audit' && <>Fiscal Audit <br/>Comparative Analysis</>}
{activeTab === 'try-on' && <>AI Try-On <br/>Strategic Conceptualization</>}
 </h2>
 </div>
 <div className="text-right hidden md:block">
 <div className="text-[10px] tracking-widest uppercase font-semibold">Operational Status</div>
 <div className="text-[10px] tracking-widest uppercase text-green-700">Nominal // Ready</div>
 </div>
 </header>

 {activeTab === 'sourcing' && (
 <div className="space-y-12">
 <SessionInsightsWidget />
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
 <section className="lg:col-span-5 space-y-10">
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h3 className="font-serif italic text-2xl">Visual Context</h3>
 <span className="text-[9px] uppercase tracking-tighter opacity-50 font-sans">Required Input</span>
 </div>
 
 <div className="space-y-2">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Upload Images</label>
 <div 
 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 className={`border-2 border-dashed border-nous-border p-8 text-center transition-colors cursor-pointer group ${isDragging ? 'bg-white/60 /60 border-nous-border ' : 'bg-white/30 /30 hover:bg-white/50 /50'}`}
 >
 <Upload className="mx-auto text-nous-subtle mb-2 group-hover:scale-110 transition-transform"size={24} />
 <p className="text-[11px] font-sans opacity-60">Tap to select or drop files here</p>
 <input type="file"ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*"className="hidden"/>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Paste a link</label>
 <div className="flex gap-2">
 <input 
 className="flex-grow bg-white/50 /50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans"
 placeholder="e.g., eBay, Grailed"
 value={linkInput}
 onChange={e => setLinkInput(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleAddLink()}
 type="text"
 />
 <button onClick={handleAddLink} className="bg-nous-base text-nous-text px-6 py-2 text-[10px] uppercase tracking-widest hover:bg-nous-base dark:hover:bg-white transition-colors">Add</button>
 </div>
 </div>

 {mediaFiles.length > 0 && (
 <div className="flex flex-wrap gap-2 mt-4">
 {mediaFiles.map((file, idx) => (
 <div key={idx} className="relative group w-16 h-16 border border-nous-border overflow-hidden bg-white">
 {file.type === 'image' ? (
 <img src={`data:${file.mimeType};base64,${file.data}`} alt="upload"className="w-full h-full object-cover grayscale opacity-80"/>
 ) : file.type === 'link' && file.data ? (
 <img src={file.data} alt="link thumbnail"className="w-full h-full object-cover grayscale opacity-80"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-nous-base/50 /50">
 <LinkIcon size={16} className="text-nous-subtle"/>
 </div>
 )}
 <button onClick={(e) => { e.stopPropagation(); removeMedia(idx); }} className="absolute top-1 right-1 bg-white/90 /90 p-0.5 rounded-none opacity-0 group-hover:opacity-100 transition-opacity">
 <X size={12} className="text-nous-text"/>
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="space-y-6 pt-6 border-t border-nous-border">
 <div className="space-y-2">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Pinterest Board Analysis</label>
 <div className="flex gap-2">
 <input 
 className="flex-grow bg-white/50 /50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans italic"
 placeholder="PASTE PINTEREST BOARD URL..."
 value={pinterestUrl}
 onChange={e => setPinterestUrl(e.target.value)}
 type="text"
 />
 <button 
  onClick={handlePinterestAnalysis} 
  disabled={isAnalyzingPinterest || !pinterestUrl.trim()}
  className="bg-nous-base text-nous-text px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-nous-base dark:hover:bg-white transition-colors disabled:opacity-50"
 >
  {isAnalyzingPinterest ? <Loader2 className="animate-spin" size={14} /> : 'ANALYZE'}
 </button>
 </div>
 </div>

 {pinterestResult && (
  <motion.div 
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  className="bg-white/60 p-4 border border-nous-border space-y-4 overflow-hidden"
  >
  <div className="flex justify-between items-center border-b border-nous-border pb-2">
  <h4 className="font-serif italic text-lg">{pinterestResult.coreArchetype}</h4>
  <span className="text-[10px] font-mono opacity-60">Alignment: {pinterestResult.alignmentScore}%</span>
  </div>
  <p className="text-xs italic opacity-80">{pinterestResult.boardAnalysis}</p>
  <div className="space-y-2">
  <div className="text-[9px] uppercase tracking-widest font-bold opacity-50">Sourcing Strategy</div>
  <ul className="list-disc pl-4 space-y-1">
  {pinterestResult.sourcingStrategy?.map((s: string, i: number) => (
  <li key={i} className="text-[10px]">{s}</li>
  ))}
  </ul>
  </div>
  <div className="flex flex-wrap gap-2">
  {pinterestPins.slice(0, 5).map((pin, i) => (
  <img key={i} src={pin.src} alt={pin.alt} className="w-10 h-10 object-cover border border-nous-border grayscale hover:grayscale-0 transition-all" />
  ))}
  </div>
  </motion.div>
 )}

 <div className="space-y-2">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Sourcing Objective</label>
 <input 
 className="w-full bg-white/50 /50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans italic"
 placeholder="e.g., Winter capsule, Wedding guest"
 value={objective}
 onChange={e => setObjective(e.target.value)}
 type="text"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Fiscal Constraints</label>
 <input 
 className="w-full bg-white/50 /50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans"
 placeholder="e.g., $50-$150, Uncapped"
 value={budget}
 onChange={e => setBudget(e.target.value)}
 type="text"
 />
 </div>
 <button 
 onClick={handleProcure}
 disabled={isProcuring || (!budget.trim() && mediaFiles.length === 0)}
 className="w-full py-4 bg-nous-base text-nous-text text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-nous-base dark:hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isProcuring ? <Loader2 className="animate-spin"size={16} /> : <Search size={16} />}
 {isProcuring ? 'ANALYZING...' : 'INITIALIZE SOURCING'}
 </button>
 </div>
 </section>

 <section className="lg:col-span-7 space-y-6">
 <div className="flex justify-between items-center">
 <h3 className="font-serif italic text-2xl">Procurement Targets</h3>
 <div className="flex items-center gap-4">
 <span className="text-[9px] uppercase tracking-widest font-sans px-2 py-1 border border-nous-border bg-white">
 {targets.length > 0 ? `${targets.length} TARGETS` : 'AWAITING INPUT'}
 </span>
 <div className="flex gap-2">
 <button className="p-1 hover:bg-white transition-colors border border-transparent hover:border-nous-border"><Filter size={16} /></button>
 <button className="p-1 hover:bg-white transition-colors border border-transparent hover:border-nous-border"><SortAsc size={16} /></button>
 </div>
 </div>
 </div>

 {targets.length > 0 ? (
 <div className="border border-nous-border bg-white/40 /40 overflow-hidden">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-nous-border text-[9px] uppercase tracking-widest font-bold bg-white/50 /50">
 <th className="px-4 py-3">Archetype</th>
 <th className="px-4 py-3">Query Boolean</th>
 <th className="px-4 py-3">Designers</th>
 <th className="px-4 py-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-200/50 dark:divide-stone-800/50 text-xs">
 {targets.map((target, idx) => (
 <React.Fragment key={idx}>
 <tr className="hover:bg-white/60 /60 transition-colors group cursor-pointer"onClick={() => setExpandedTargetIndex(expandedTargetIndex === idx ? null : idx)}>
 <td className="px-4 py-4">
 <div className="font-serif italic text-sm">{target.targetArchetype}</div>
 <div className="text-[9px] uppercase opacity-40 font-sans mt-0.5 max-w-xs truncate"title={target.rationale}>{target.rationale}</div>
 </td>
 <td className="px-4 py-4 font-mono text-[10px] opacity-80">
 <div className="flex items-center gap-2">
 <span className="truncate max-w-[150px]">{target.keywordBoolean}</span>
 <button onClick={(e) => { e.stopPropagation(); copyToClipboard(target.keywordBoolean, idx); }} className="text-nous-subtle hover:text-nous-text">
 {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
 </button>
 </div>
 </td>
 <td className="px-4 py-4 text-[10px] uppercase opacity-70">
 {target.emergingDesigner}
 </td>
 <td className="px-4 py-4 text-right">
 <div className="flex justify-end gap-2 opacity-50 xl:opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={(e) => { e.stopPropagation(); saveToPocket(target); }} className="p-1.5 border border-nous-border bg-white hover:bg-nous-base hover:text-nous-text transition-colors"title="Save to Pocket">
 <ShoppingBag size={14} />
 </button>
 </div>
 </td>
 </tr>
 {expandedTargetIndex === idx && (
 <tr className="bg-white/30 border-t border-nous-border/50">
 <td colSpan={4} className="px-4 py-6">
 <div className="space-y-6">
 
 {target.referenceImageUrl && (
 <div className="flex flex-col gap-2">
 <h4 className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Canonical Reference</h4>
 <img src={target.referenceImageUrl} alt={target.targetArchetype} className="w-32 h-32 object-cover border border-nous-border"referrerPolicy="no-referrer"/>
 </div>
 )}

 {target.searchableInterpretations && target.searchableInterpretations.length > 0 && (
 <div>
 <h4 className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70 mb-2">Searchable Interpretations</h4>
 <ul className="list-disc list-inside text-xs font-serif italic space-y-1 opacity-80">
 {target.searchableInterpretations.map((interpretation, i) => (
 <li key={i}>{interpretation}</li>
 ))}
 </ul>
 </div>
 )}

 <div>
 <h4 className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70 mb-2">Search Platforms</h4>
 <div className="flex flex-wrap gap-2 mb-4">
 {['ebay', 'grailed', 'ssense', 'crossroads', 'therealreal', 'vestiaire', 'depop'].map(platform => (
 <button 
 key={platform}
 onClick={() => openSearch(target.keywordBoolean, platform)}
 className="px-3 py-1.5 border border-nous-border bg-white hover:bg-nous-base hover:text-nous-text transition-colors text-[10px] uppercase tracking-wider flex items-center gap-2"
 >
 {platform} <ExternalLink size={10} />
 </button>
 ))}
 </div>
 <div className="flex items-center gap-2 bg-white/50 border border-nous-border px-3 py-2">
 <input 
 type="text"
 readOnly 
 value={target.keywordBoolean} 
 className="font-mono text-[10px] opacity-80 flex-grow bg-transparent border-none focus:ring-0 outline-none w-full"
 onClick={(e) => (e.target as HTMLInputElement).select()}
 />
 <button onClick={(e) => { e.stopPropagation(); copyToClipboard(target.keywordBoolean, idx); }} className="text-nous-subtle hover:text-nous-text p-1 flex-shrink-0">
 {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
 </button>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h4 className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70 mb-2">Save Target Archetype</h4>
 <div className="flex items-center gap-2">
 <select 
 className="bg-white border border-nous-border px-3 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans flex-grow"
 value={selectedBoardIdForTarget}
 onChange={(e) => setSelectedBoardIdForTarget(e.target.value)}
 >
 <option value=""disabled>Select Board...</option>
 {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
 </select>
 <button 
 disabled={!selectedBoardIdForTarget || !user?.uid}
 onClick={() => {
 if (selectedBoardIdForTarget && user?.uid) {
 const newItem = {
 boardId: selectedBoardIdForTarget,
 userId: user.uid,
 url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(target.keywordBoolean || '')}`,
 title: target.targetArchetype || 'Untitled',
 price: 'Target',
 imageUrl: target.referenceImageUrl || '',
 createdAt: serverTimestamp()
 };
 addDoc(collection(db, 'thimbleItems'), newItem).then(() => {
 const boardName = boards.find(b => b.id === selectedBoardIdForTarget)?.title || 'Board';
 setAddedBoardName(boardName);
 setTimeout(() => {
 setAddedBoardName(null);
 setSelectedBoardIdForTarget('');
 }, 2000);
 }).catch(err => {
 console.error("Error adding to board:", err);
 });
 }
 }}
 className="bg-nous-base text-nous-text px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-nous-base dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {addedBoardName ? `Added to ${addedBoardName}!` : (selectedBoardIdForTarget ? `Add to ${boards.find(b => b.id === selectedBoardIdForTarget)?.title || 'Board'}` : 'Add to Board')}
 </button>
 </div>
 </div>

 {/* Right side of the 2-col grid: Procured Link Drop */}
 <div>
 <h4 className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70 mb-2">Acquired Item Drop</h4>
 <div className="flex items-center gap-2">
 <input 
 type="text"
 placeholder="PASTE ACQUIRED URL..."
 className="bg-white border border-nous-border px-3 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans flex-grow"
 onKeyDown={(e) => {
   if (e.key === 'Enter' && selectedBoardIdForTarget && user?.uid) {
     const val = (e.target as HTMLInputElement).value;
     if (!val) return;
     const newItem = {
       boardId: selectedBoardIdForTarget,
       userId: user.uid,
       url: val,
       title: target.targetArchetype || 'Acquired Item',
       price: 'TBD',
       imageUrl: target.referenceImageUrl || '',
       createdAt: serverTimestamp()
     };
     addDoc(collection(db, 'thimbleItems'), newItem).then(() => {
       const boardName = boards.find(b => b.id === selectedBoardIdForTarget)?.title || 'Board';
       setAddedBoardName(`Dropped in ${boardName}!`);
       (e.target as HTMLInputElement).value = '';
       setTimeout(() => {
         setAddedBoardName(null);
       }, 3000);
     });
   }
 }}
 />
 </div>
 <div className="text-[9px] uppercase tracking-widest opacity-50 mt-2">
 Select a board first, then press Enter to instantly drop link data.
 </div>
 </div>

 </div>
 </div>
 </td>
 </tr>
 )}
 </React.Fragment>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="p-12 border border-nous-border bg-nous-base/40 /40 flex flex-col items-center justify-center text-center">
 <div className="text-[10px] uppercase tracking-widest font-semibold mb-3 font-sans">System Intelligence Note</div>
 <p className="font-serif italic text-sm leading-relaxed opacity-80 max-w-md">
 Provide visual artifacts, a sourcing objective, and fiscal constraints to generate highly specific procurement targets. The engine will cross-reference archival patterns with current market availability.
 </p>
 </div>
 )}
 </section>
 </div>
 </div>
 )}

 {activeTab === 'boards' && (
 selectedBoard ? (
 <div className="space-y-12">
 <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <div className="md:col-span-2 flex flex-col">
 <div className="flex justify-between items-baseline mb-4">
 <h2 className="font-serif italic text-2xl">Acquisition Intake</h2>
 <span className="text-[10px] uppercase tracking-widest opacity-60">Fig. 01 // Input Terminal</span>
 </div>
 <div className="flex-grow border border-nous-border p-6 bg-white/20 flex flex-col gap-4">
 <div className="grid grid-cols-2 gap-4">
 <input 
 type="text"
 id="rawItemTitle"
 defaultValue={newItemTitle} 
 onChange={e => setNewItemTitle(e.target.value)}
 placeholder="Artifact Title & Designer"
 className="bg-white/50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans"
 />
 <input 
 type="text"
 id="rawItemPrice"
 defaultValue={newItemPrice} 
 onChange={e => setNewItemPrice(e.target.value)}
 placeholder="Price / Value"
 className="bg-white/50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <input 
 type="text"
 id="rawItemMaterial"
 placeholder="Material & Cut Explanation..."
 className="bg-white/50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans"
 />
 <div className="flex gap-2">
 <input 
 type="url"
 id="rawItemUrl"
 defaultValue={newItemUrl} 
 onChange={e => setNewItemUrl(e.target.value)}
 placeholder="Link Drop (URL)"
 className="flex-grow bg-white/50 border border-nous-border px-4 py-2 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans"
 />
 <button 
 onClick={(e) => {
 const title = (document.getElementById('rawItemTitle') as HTMLInputElement).value;
 const price = (document.getElementById('rawItemPrice') as HTMLInputElement).value;
 const material = (document.getElementById('rawItemMaterial') as HTMLInputElement).value;
 const url = (document.getElementById('rawItemUrl') as HTMLInputElement).value;
 setNewItemTitle(title);
 setNewItemPrice(price);
 setNewItemUrl(url);
 if (!url.trim() || !selectedBoard || !user?.uid) return;
 fetch(`https://api.microlink.io?url=${encodeURIComponent(url.trim())}`)
 .then(res => res.json())
 .then(data => {
 let imageUrl = '';
 if (data.status === 'success' && data.data?.image?.url) {
 imageUrl = data.data.image.url;
 }
 addDoc(collection(db, 'thimbleItems'), {
 boardId: selectedBoard.id,
 userId: user.uid,
 url: url.trim(),
 title: title.trim() || 'Untitled Artifact',
 price: price.trim() || 'Unknown',
 notes: material.trim() ? `Materials & Cut: ${material.trim()}` : '',
 imageUrl: imageUrl,
 createdAt: serverTimestamp()
 });
 })
 .catch(() => {
 addDoc(collection(db, 'thimbleItems'), {
 boardId: selectedBoard.id,
 userId: user.uid,
 url: url.trim(),
 title: title.trim() || 'Untitled Artifact',
 price: price.trim() || 'Unknown',
 notes: material.trim() ? `Materials & Cut: ${material.trim()}` : '',
 imageUrl: '',
 createdAt: serverTimestamp()
 });
 })
 .finally(() => {
 (document.getElementById('rawItemTitle') as HTMLInputElement).value = '';
 (document.getElementById('rawItemPrice') as HTMLInputElement).value = '';
 (document.getElementById('rawItemMaterial') as HTMLInputElement).value = '';
 (document.getElementById('rawItemUrl') as HTMLInputElement).value = '';
 setNewItemTitle('');
 setNewItemPrice('');
 setNewItemUrl('');
 });
 }} 
 className="bg-nous-base text-nous-text px-6 py-2 text-[10px] uppercase tracking-widest hover:bg-nous-base dark:hover:bg-white transition-colors"
 >
 Add
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="flex flex-col">
 <div className="flex justify-between items-baseline mb-4">
 <h2 className="font-serif italic text-2xl">Curator Stats</h2>
 </div>
 <div className="border border-nous-border p-6 flex-grow space-y-6 bg-white/20 /20">
 <div className="space-y-1">
 <div className="flex justify-between text-[9px] uppercase tracking-widest">
 <span>Artifact Count</span>
 <span>{boardItems.length}</span>
 </div>
 <div className="h-px bg-stone-200 w-full">
 <div className="h-full bg-nous-base"style={{ width: `${Math.min(boardItems.length * 10, 100)}%` }}></div>
 </div>
 </div>
 
 <div className="pt-6 border-t border-nous-border space-y-3">
 <button 
 onClick={handleAuditBoard}
 disabled={isAuditingBoard || boardItems.length === 0}
 className="w-full py-3 border border-nous-border text-nous-text text-[10px] uppercase tracking-widest hover:bg-nous-base hover:text-nous-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {isAuditingBoard ? <Loader2 className="animate-spin"size={14} /> : <Scale size={14} />}
 {isAuditingBoard ? 'Auditing...' : 'Run Board Audit'}
 </button>
 <button 
 onClick={async () => {
 if (!user?.uid || !selectedBoard) return;
 try {
 await saveTask(user.uid, {
 id: Date.now().toString(),
 text: `Audit Board: ${selectedBoard.title}`,
 completed: false,
 createdAt: Date.now(),
 platform: 'The Thimble',
 linkedContext: {
 type: 'thimble',
 id: selectedBoard.id
 }
 });
 setIsPushSuccess(true);
 setTimeout(() => setIsPushSuccess(false), 2000);
 } catch (e) {
 console.error('Error pushing task:', e);
 }
 }}
 className="w-full py-3 border border-nous-border text-nous-text text-[10px] uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-2"
 >
 {isPushSuccess ? <><Check size={14} /> Pushed!</> : <><Plus size={14} /> Push to Action Board</>}
 </button>
 </div>

 {boardAuditResult && (
 <div className="bg-white p-4 border border-nous-border rotate-1 mt-4">
 <span className="text-[8px] uppercase tracking-widest opacity-60 block mb-2">Audit_Note</span>
 <p className="font-serif italic text-sm leading-snug">"{boardAuditResult.verdict}"</p>
 </div>
 )}
 </div>
 </div>
 </section>

 <section 
 onDragOver={(e) => e.preventDefault()}
 onDrop={async (e) => {
 e.preventDefault();
 if (!selectedBoard || !user?.uid) return;
 const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
 if (url && url.startsWith('http')) {
 let imageUrl = '';
 try {
 const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
 const data = await res.json();
 if (data.status === 'success' && data.data?.image?.url) {
 imageUrl = data.data.image.url;
 }
 } catch (err) {}
 addDoc(collection(db, 'thimbleItems'), {
 boardId: selectedBoard.id,
 userId: user.uid,
 url,
 title: 'Dropped Link',
 price: 'TBD',
 notes: '',
 imageUrl,
 createdAt: serverTimestamp()
 });
 } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
 const file = e.dataTransfer.files[0];
 if (file.type.startsWith('image/')) {
 const { compressImage } = await import('../services/imageUtils');
 const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
 const { storage } = await import('../services/firebaseInit');
 const dataUrl = await compressImage(file, 800, 800, 0.7);
 const storageRef = ref(storage, `users/${user.uid}/thimble/drop_${Date.now()}.jpg`);
 await uploadString(storageRef, dataUrl, 'data_url');
 const finalUrl = await getDownloadURL(storageRef);
 addDoc(collection(db, 'thimbleItems'), {
 boardId: selectedBoard.id,
 userId: user.uid,
 url: '#',
 title: file.name,
 price: 'TBD',
 notes: '',
 imageUrl: finalUrl,
 createdAt: serverTimestamp()
 });
 }
 }
 }}
 className="transition-colors hover:bg-white/10 p-2 -mx-2 rounded"
 >
 <div className="flex justify-between items-end border-b border-nous-border pb-4 mb-4">
 <h2 className="font-serif italic text-3xl">Pending Acquisitions</h2>
 <div className="flex gap-4 items-center">
 <span className="text-[10px] uppercase tracking-widest opacity-60">Drop Links/Images Here</span>
 <div className="flex gap-1 justify-center items-center w-6 h-6 border border-nous-border border-dashed">
   <Upload size={10} className="opacity-50" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {boardItems.map((item, idx) => (
 <article key={item.id} className="space-y-4 group">
 <div className="aspect-[3/4] border border-nous-border overflow-hidden bg-white relative flex flex-col">
 <div className="absolute top-4 left-4 bg-white/90 px-2 py-1 text-[10px] uppercase tracking-widest border border-nous-border z-10">
 REF: 00{idx + 1}
 </div>
 <button onClick={() => handleDeleteItem(item.id)} className="absolute top-4 right-4 bg-white/90 p-1.5 border border-nous-border z-10 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-800">
 <Trash2 size={12} />
 </button>
 
 <div className="flex-grow flex flex-col p-6 bg-nous-base/30 relative">
 {item.imageUrl && (
 <div className="w-full h-56 mb-4 overflow-hidden border border-nous-border relative z-10">
 <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover"referrerPolicy="no-referrer"/>
 </div>
 )}
 <div className="text-left space-y-2 relative z-10 w-full flex-grow flex flex-col">
 <h3 className="font-serif text-xl italic tracking-tight">{item.title}</h3>
 <div className="text-[10px] uppercase tracking-widest opacity-60">PRICE: {item.price}</div>
 {item.notes && (
   <p className="text-xs font-sans opacity-80 mt-2 line-clamp-3 leading-relaxed border-l-2 border-nous-border pl-2">
     {item.notes}
   </p>
 )}
 </div>
 </div>
 
 <div className="p-4 border-t border-nous-border bg-white flex justify-between items-center">
 <a href={item.url} target="_blank"rel="noopener noreferrer"className="text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
 <ExternalLink size={12} /> View Source
 </a>
 </div>
 </div>
 </article>
 ))}
 {boardItems.length === 0 && (
 <div className="col-span-3 py-24 text-center border border-dashed border-nous-border bg-white/20">
 <p className="font-serif italic text-xl opacity-60">No artifacts acquired yet. Drag & drop here.</p>
 </div>
 )}
 </div>
 </section>
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center text-nous-text space-y-6 max-w-md mx-auto text-center py-24">
 <div className="w-24 h-24 rounded-none border border-nous-border flex items-center justify-center bg-white/30 /30">
 <FolderPlus className="w-10 h-10 opacity-50"/>
 </div>
 <div className="space-y-2">
 <h3 className="font-serif italic text-2xl">Select a Board</h3>
 <p className="text-sm leading-relaxed opacity-60">Choose a sourcing board from the sidebar to view its artifacts and run a comprehensive fiscal audit.</p>
 </div>
 </div>
 )
 )}

 {activeTab === 'try-on' && (
 <TryOnTool />
 )}
 {activeTab === 'audit' && (
 <div className="max-w-3xl mx-auto space-y-12">
 <div className="space-y-6">
 <div className="flex justify-between items-center border-b border-nous-border pb-4">
 <h3 className="font-serif italic text-2xl">Fiscal Audit Input</h3>
 <span className="text-[9px] uppercase tracking-tighter opacity-50 font-sans">Comparative Analysis</span>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Artifact 01 (Link Drop)</label>
 <div className="space-y-2" onChange={(e) => {
   const target = e.currentTarget;
   const u = (target.querySelector('.i1-url') as HTMLInputElement).value;
   const t = (target.querySelector('.i1-title') as HTMLInputElement).value;
   const p = (target.querySelector('.i1-price') as HTMLInputElement).value;
   const m = (target.querySelector('.i1-material') as HTMLInputElement).value;
   setItem1(`Link: ${u}\nTitle/Designer: ${t}\nPrice: ${p}\nMaterials & Cut: ${m}`);
 }}>
   <input type="url" placeholder="Paste Link Drop (URL)..." className="i1-url w-full bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
   <input type="text" placeholder="Title & Designer" className="i1-title w-full bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
   <div className="flex gap-2">
     <input type="text" placeholder="Price/Value" className="i1-price w-1/3 bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
     <input type="text" placeholder="Materials & Cut..." className="i1-material flex-grow bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
   </div>
 </div>
 <div className="flex flex-wrap gap-2 pt-2 border-t border-nous-border">
  <label className="cursor-pointer p-2 border border-nous-border bg-white hover:bg-nous-base transition-colors flex items-center justify-center">
  <Upload size={14} className="mr-2 opacity-50" /> <span className="text-[9px] uppercase tracking-widest">Add Images</span>
  <input 
  type="file"
  accept="image/*"
  multiple
  onChange={async (e) => {
  const files = Array.from(e.target.files || []);
  const { compressImage } = await import('../services/imageUtils');
  const newImages = await Promise.all(files.map(f => compressImage(f, 800, 800, 0.7)));
  setItem1Images(prev => [...prev, ...newImages]);
  }}
  className="hidden"
  />
  </label>
  {item1Images.map((img, idx) => (
  <div key={idx} className="relative w-12 h-12 border border-nous-border group">
  <img src={img} alt={`Item 1 - ${idx}`} className="w-full h-full object-cover" />
  <button 
  onClick={() => setItem1Images(prev => prev.filter((_, i) => i !== idx))}
  className="absolute top-0 right-0 bg-white/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
  >
  <X size={10} />
  </button>
  </div>
  ))}
 </div>
 </div>
 <div className="space-y-4">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Artifact 02 (Link Drop)</label>
 <div className="space-y-2" onChange={(e) => {
   const target = e.currentTarget;
   const u = (target.querySelector('.i2-url') as HTMLInputElement).value;
   const t = (target.querySelector('.i2-title') as HTMLInputElement).value;
   const p = (target.querySelector('.i2-price') as HTMLInputElement).value;
   const m = (target.querySelector('.i2-material') as HTMLInputElement).value;
   setItem2(`Link: ${u}\nTitle/Designer: ${t}\nPrice: ${p}\nMaterials & Cut: ${m}`);
 }}>
   <input type="url" placeholder="Paste Link Drop (URL)..." className="i2-url w-full bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
   <input type="text" placeholder="Title & Designer" className="i2-title w-full bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
   <div className="flex gap-2">
     <input type="text" placeholder="Price/Value" className="i2-price w-1/3 bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
     <input type="text" placeholder="Materials & Cut..." className="i2-material flex-grow bg-white border border-nous-border px-3 py-2 text-xs outline-none focus:border-black" />
   </div>
 </div>
 <div className="flex flex-wrap gap-2 pt-2 border-t border-nous-border">
  <label className="cursor-pointer p-2 border border-nous-border bg-white hover:bg-nous-base transition-colors flex items-center justify-center">
  <Upload size={14} className="mr-2 opacity-50" /> <span className="text-[9px] uppercase tracking-widest">Add Images</span>
  <input 
  type="file"
  accept="image/*"
  multiple
  onChange={async (e) => {
  const files = Array.from(e.target.files || []);
  const { compressImage } = await import('../services/imageUtils');
  const newImages = await Promise.all(files.map(f => compressImage(f, 800, 800, 0.7)));
  setItem2Images(prev => [...prev, ...newImages]);
  }}
  className="hidden"
  />
  </label>
  {item2Images.map((img, idx) => (
  <div key={idx} className="relative w-12 h-12 border border-nous-border group">
  <img src={img} alt={`Item 2 - ${idx}`} className="w-full h-full object-cover" />
  <button 
  onClick={() => setItem2Images(prev => prev.filter((_, i) => i !== idx))}
  className="absolute top-0 right-0 bg-white/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
  >
  <X size={10} />
  </button>
  </div>
  ))}
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] uppercase tracking-widest font-semibold font-sans opacity-70">Fiscal Constraint</label>
 <input 
 className="w-full bg-white/50 /50 border border-nous-border px-4 py-3 text-xs focus:ring-0 focus:border-nous-border outline-none font-sans"
 placeholder="e.g., $500 total budget"
 value={auditBudget}
 onChange={e => setAuditBudget(e.target.value)}
 type="text"
 />
 </div>

 <button 
 onClick={handleAudit}
 disabled={isAuditing || !item1.trim() || !item2.trim()}
 className="w-full py-4 bg-nous-base text-nous-text text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-nous-base dark:hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isAuditing ? <Loader2 className="animate-spin"size={16} /> : <Scale size={16} />}
 {isAuditing ? 'AUDITING...' : 'EXECUTE FISCAL AUDIT'}
 </button>
 </div>

 {auditResult && (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="border border-nous-border bg-white/40 /40 p-8 space-y-8"
 >
 <div className="text-center space-y-2 pb-6 border-b border-nous-border">
 <div className="text-[10px] uppercase tracking-widest opacity-60 font-mono">Definitive Recommendation</div>
 <h3 className="font-serif italic text-3xl">{auditResult.verdict}</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-3">
 <div className="text-[10px] uppercase tracking-widest opacity-60 font-mono border-b border-nous-border pb-2">Item 1 Analysis</div>
 <p className="text-sm leading-relaxed opacity-90">{auditResult.item1Analysis}</p>
 </div>
 <div className="space-y-3">
 <div className="text-[10px] uppercase tracking-widest opacity-60 font-mono border-b border-nous-border pb-2">Item 2 Analysis</div>
 <p className="text-sm leading-relaxed opacity-90">{auditResult.item2Analysis}</p>
 </div>
 </div>

 <div className="space-y-3 bg-white/60 /60 p-6 border border-nous-border">
 <div className="text-[10px] uppercase tracking-widest opacity-60 font-mono">Rationale</div>
 <p className="text-sm leading-relaxed opacity-90">{auditResult.rationale}</p>
 </div>

 {auditResult.searchDirectives && auditResult.searchDirectives.length > 0 && (
 <div className="space-y-3 bg-white/60 /60 p-6 border border-nous-border">
 <div className="text-[10px] uppercase tracking-widest opacity-60 font-mono">Search Directives</div>
 <ul className="list-disc pl-4 space-y-2">
 {auditResult.searchDirectives.map((directive, i) => (
 <li key={i} className="text-sm leading-relaxed opacity-90">{directive}</li>
 ))}
 </ul>
 </div>
 )}

 {auditResult.searchBooleans && auditResult.searchBooleans.length > 0 && (
 <div className="space-y-3 bg-white/60 /60 p-6 border border-nous-border">
 <div className="text-[10px] uppercase tracking-widest opacity-60 font-mono">Search Booleans</div>
 <div className="flex flex-wrap gap-2">
 {auditResult.searchBooleans.map((boolean, i) => (
 <div key={i} className="flex items-center gap-2 bg-stone-200/20 /20 px-3 py-1.5 border border-nous-border">
 <span className="font-mono text-[11px] font-medium">{boolean}</span>
 <button 
 onClick={() => copyToClipboard(boolean, i + 1000)}
 className="opacity-50 hover:opacity-100 transition-opacity"
 >
 {copiedIndex === i + 1000 ? <Check size={12} className="text-green-600"/> : <Copy size={12} />}
 </button>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="pt-4 border-t border-nous-border flex justify-end">
 <button 
 onClick={saveAuditToPocket}
 className="text-[10px] uppercase tracking-widest font-mono opacity-60 hover:opacity-100 transition-colors flex items-center gap-2"
 >
 Save to Pocket
 </button>
 </div>
 </motion.div>
 )}
 </div>
 )}

 </main>
 </div>
 );
};

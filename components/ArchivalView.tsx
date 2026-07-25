
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Shelf } from './Shelf';
import { Pocket } from './Pocket';
import { ArchiveListView } from './ArchiveListView';
import { ZineMetadata, PocketItem } from '../types';
import { ObsidianLedgerGraph } from './ObsidianLedgerGraph';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Upload, ImageIcon, FileText, X, Loader2, Search, ArrowRight, Check } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { useUser } from '../contexts/UserContext';
import { fetchUserZines, fetchPocketItems } from '../services/firebase';
import { compressImage } from '../services/geminiService';
import { getLocalPocket } from '../services/localArchive';
import { fetchCommunityZines, createNotification } from '../services/firebaseUtils';

import { ZineFolders } from './ZineFolders';
import { GoogleDriveBackupModal } from './GoogleDriveBackupModal';

const InjectShardModal: React.FC<{ onClose: () => void, onInjected: () => void }> = ({ onClose, onInjected }) => {
 const { user, profile } = useUser();
 const [mode, setMode] = useState<'upload' | 'authored' | 'url'>('upload');
 const [authoredZines, setAuthoredZines] = useState<ZineMetadata[]>([]);
 const [selectedZine, setSelectedZine] = useState<ZineMetadata | null>(null);
 const [loading, setLoading] = useState(false);
 const [urlInput, setUrlInput] = useState('');
 const fileInputRef = React.useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (mode === 'authored' && user?.uid) {
 setLoading(true);
 fetchUserZines(user.uid).then(zines => {
 setAuthoredZines(zines);
 setLoading(false);
 }).catch(e => {
 console.error("MIMI // Failed to fetch user zines", e);
 setLoading(false);
 });
 }
 }, [mode, user]);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;
 setLoading(true);
 try {
 for (const file of Array.from(files)) {
 const reader = new FileReader();
 const base64 = await new Promise((resolve, reject) => {
 reader.onload = async (ev) => {
 const raw = ev.target?.result as string;
 const compressed = await compressImage(raw);
 resolve(compressed);
 };
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
 const type = file.type.startsWith('audio') ? 'voicenote' : 'image';
 
 let finalUrl = base64;
 if (user?.uid) {
 try {
 const { archiveManager } = await import('../services/archiveManager');
 const path = `pocket_images/${user.uid}_${Date.now()}_${file.name}`;
 finalUrl = await archiveManager.uploadMedia(user.uid, base64, path);
 } catch (e) {
 console.warn("Failed to upload injected shard to storage", e);
 }
 }

 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user?.uid || 'ghost', type, {
 imageUrl: type === 'image' ? finalUrl : undefined,
 audioUrl: type === 'voicenote' ? finalUrl : undefined,
 prompt: file.name,
 timestamp: Date.now(),
 origin: 'Archive_Injection'
 });
 }
 if (user?.uid) {
 await createNotification(user.uid, 'Registry Update', 'New shards injected into the archive.', 'success');
 }
 onInjected();
 onClose();
 } catch (err) { console.error(err); } finally { setLoading(false); }
 };

 const handleInjectFromZine = async (imageUrl: string, title: string) => {
 if (!user?.uid) return;
 setLoading(true);
 try {
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'image', {
 imageUrl,
 prompt: `Extracted from: ${title}`,
 timestamp: Date.now(),
 origin: 'Zine_Extraction'
 });
 await createNotification(user.uid, 'Registry Update', `Shard injected from zine: ${title}`, 'success');
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Shard Injected from Zine.", icon: <Check size={14} /> } }));
 onInjected();
 } catch (e) { console.error(e); } finally { setLoading(false); }
 };

 const handleUrlInject = async () => {
 if (!urlInput.trim() || !user?.uid) return;
 setLoading(true);
 try {
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'image', {
 imageUrl: urlInput,
 prompt:"External Injection",
 timestamp: Date.now(),
 origin: 'URL_Injection'
 });
 await createNotification(user.uid, 'Registry Update', 'New shard injected from URL.', 'success');
 onInjected();
 onClose();
 } catch (e) { console.error(e); } finally { setLoading(false); }
 };

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] bg-nous-base/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8">
 <div className="w-full max-w-4xl bg-white rounded-none flex flex-col max-h-[90vh] overflow-hidden border border-nous-border">
 <header className="p-6 border-b border-nous-border flex justify-between items-center shrink-0">
 <div className="space-y-1">
 <h3 className="font-serif text-2xl italic text-nous-text ">Inject Shard.</h3>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">Material Ingestion Protocol</p>
 </div>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-red-500 transition-colors"><X size={24} /></button>
 </header>

 <div className="flex border-b border-nous-border shrink-0">
 <button onClick={() => { setMode('upload'); setSelectedZine(null); }} className={`flex-1 py-4 font-sans text-[9px] uppercase tracking-widest font-black transition-all ${mode === 'upload' ? 'bg-nous-base text-nous-subtle border-b-2 border-nous-border' : 'text-nous-subtle hover:text-nous-subtle'}`}>Upload File</button>
 <button onClick={() => setMode('authored')} className={`flex-1 py-4 font-sans text-[9px] uppercase tracking-widest font-black transition-all ${mode === 'authored' ? 'bg-nous-base text-nous-subtle border-b-2 border-nous-border' : 'text-nous-subtle hover:text-nous-subtle'}`}>From Authored</button>
 <button onClick={() => { setMode('url'); setSelectedZine(null); }} className={`flex-1 py-4 font-sans text-[9px] uppercase tracking-widest font-black transition-all ${mode === 'url' ? 'bg-nous-base text-nous-subtle border-b-2 border-nous-border' : 'text-nous-subtle hover:text-nous-subtle'}`}>URL Injection</button>
 </div>

 <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
 {mode === 'upload' && (
 <div 
 onClick={() => fileInputRef.current?.click()}
 onDragOver={(e) => e.preventDefault()}
 onDrop={(e) => {
 e.preventDefault();
 if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
 handleFileUpload({ target: { files: e.dataTransfer.files } } as any);
 } else {
 const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
 if (url) {
 setMode('url');
 setUrlInput(url);
 }
 }
 }}
 className="h-64 border-2 border-dashed border-nous-border rounded-none flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-nous-border hover:bg-nous-base0/5 transition-all group"
 >
 <input type="file"ref={fileInputRef} onChange={handleFileUpload} className="hidden"multiple accept="image/*,audio/*"/>
 <Upload size={32} className="text-nous-subtle group-hover:text-nous-text transition-colors"/>
 <div className="text-center">
 <p className="font-serif italic text-xl text-nous-subtle">Drop shards here.</p>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mt-2">Images or Audio (max 10MB)</p>
 </div>
 </div>
 )}

 {mode === 'authored' && !selectedZine && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {authoredZines.map(zine => (
 <button key={zine.id} onClick={() => setSelectedZine(zine)} className="p-4 bg-nous-base /50 border border-nous-border rounded-none hover:border-nous-border transition-all text-left flex gap-4 group">
 <div className="w-16 h-16 bg-stone-200 shrink-0 overflow-hidden rounded-none">
 {(zine.coverImageUrl || zine.content?.hero_image_url) && <img src={zine.coverImageUrl || zine.content?.hero_image_url} className="w-full h-full object-cover sm:object-contain grayscale group-hover:grayscale-0 p-1"/>}
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="font-serif italic text-lg text-nous-text text-nous-text line-clamp-1">{zine.content?.headlines?.[0] || zine.title}</h4>
 <p className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">{new Date(zine.timestamp).toLocaleDateString()}</p>
 </div>
 <ArrowRight size={16} className="text-nous-subtle self-center"/>
 </button>
 ))}
 {loading && <div className="col-span-full py-12 px-8"><LoadingSkeleton lines={6} /></div>}
 </div>
 )}

 {mode === 'authored' && selectedZine && (
 <div className="space-y-8">
 <button onClick={() => setSelectedZine(null)} className="flex items-center gap-2 text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors">
 <ArrowRight size={14} className="rotate-180"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Back to Registry</span>
 </button>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
 {/* Extract images from zine content */}
 {[
 selectedZine.coverImageUrl,
 selectedZine.content?.hero_image_url,
 ...(selectedZine.content?.pages?.map(p => p.imageUrl) || []),
 ...(selectedZine.content?.visual_shards?.map(s => s.imageUrl) || [])
 ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((url, i) => (
 <div key={i} className="group relative aspect-square bg-nous-base rounded-none overflow-hidden border border-nous-border">
 <img src={url} className="w-full h-full object-cover sm:object-contain p-1 grayscale group-hover:grayscale-0 transition-all"/>
 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
 <button 
 onClick={() => handleInjectFromZine(url, selectedZine.title)}
 className="w-full py-2 bg-nous-base0 text-white font-sans text-[8px] uppercase tracking-widest font-black rounded-none hover:scale-105 active:scale-95 transition-all"
 >
 Inject Shard
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {mode === 'url' && (
 <div className="space-y-6">
 <div className="space-y-2">
 <label className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">External Image URL</label>
 <input 
 type="text"
 value={urlInput} 
 onChange={e => setUrlInput(e.target.value)}
 placeholder="https://..."
 className="w-full p-4 bg-nous-base border border-nous-border rounded-none font-mono text-xs focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-all"
 />
 </div>
 <button 
 onClick={handleUrlInject}
 disabled={!urlInput.trim() || loading}
 className="w-full py-4 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-[0.4em] font-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
 >
 {loading ? <Loader2 size={16} className="animate-spin mx-auto"/> :"Execute Injection"}
 </button>
 </div>
 )}
 </div>

 {loading && mode !== 'authored' && (
 <div className="absolute inset-0 bg-white/50 /50 backdrop-blur-sm flex items-center justify-center z-50">
 <Loader2 size={48} className="animate-spin text-nous-subtle"/>
 </div>
 )}
 </div>
 </motion.div>
 );
};

export const ArchivalView: React.FC<ArchivalViewProps> = ({ onSelectZine }) => {
 const [activeTab, setActiveTab] = useState<'issues' | 'folders' | 'pocket' | 'list' | 'ledger'>('issues');
 const [showInjectModal, setShowInjectModal] = useState(false);
 const [showBackupModal, setShowBackupModal] = useState(false);
 const [items, setItems] = useState<PocketItem[]>([]);
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const { user } = useUser();

 const loadData = async () => {
 const localPocket = await getLocalPocket() || [];
 const cloudPocket = user && !user.isAnonymous ? await fetchPocketItems(user.uid) || [] : [];
 const registry = new Map<string, PocketItem>();
 localPocket.forEach(item => { if (item && item.id) registry.set(item.id, item); });
 cloudPocket.forEach(item => { if (item && item.id) registry.set(item.id, item); });
 setItems(Array.from(registry.values()));

 const zines = await fetchCommunityZines(100);
 setZines(zines || []);
 };

 useEffect(() => {
 loadData();
 }, [user]);

 // Listen for navigation requests to specific tabs
 useEffect(() => {
 const handleNav = (e: any) => {
 if (e.detail === 'archival' && e.detail_data?.focusId) {
 setActiveTab('pocket');
 }
 };
 window.addEventListener('mimi:change_view', handleNav);
 return () => window.removeEventListener('mimi:change_view', handleNav);
 }, []);

 return (
 <div className="w-full pt-32 md:pt-48 animate-fade-in transition-all duration-1000">
 
 <div className="px-6 md:px-24 mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-nous-border pb-16">
 <div className="space-y-4">
 <h2 className="font-[Cormorant] font-light text-7xl md:text-9xl italic text-nous-text text-nous-text tracking-tighter luminescent-text leading-none">The Archive.</h2>
 <p className="font-sans text-[10px] uppercase tracking-[1em] text-nous-subtle font-black">
 {activeTab === 'issues' ? 'Manifestations of Form' : activeTab === 'folders' ? 'Curated Directories' : activeTab === 'pocket' ? 'Curated Physical Debris' : 'List View'}
 </p>
 </div>

 <div className="flex gap-16 items-end">
 <button 
 onClick={() => setShowBackupModal(true)}
 className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-none font-sans text-[9px] uppercase tracking-widest font-black hover:bg-emerald-500/20 hover:text-emerald-500 transition-all mb-1 animate-pulse"
 >
 <Upload size={14} /> Cloud Backup
 </button>
 <button 
 onClick={() => setShowInjectModal(true)}
 className="flex items-center gap-2 px-6 py-2 bg-nous-base0/10 text-nous-subtle border border-nous-border/20 rounded-none font-sans text-[9px] uppercase tracking-widest font-black hover:bg-nous-base0 hover:text-nous-text transition-all mb-1"
 >
 <Plus size={14} /> Inject Shard
 </button>
  <div className="flex gap-16 flex-wrap md:flex-nowrap">
 <button 
 onClick={() => setActiveTab('issues')}
 className={`font-sans text-[12px] uppercase tracking-[0.6em] pb-3 transition-all font-black border-b-2 ${activeTab === 'issues' ? 'text-nous-text text-nous-text border-nous-text ' : 'text-nous-subtle border-transparent hover:text-nous-text '}`}
 >
 Authored
 </button>
 <button 
 onClick={() => setActiveTab('folders')}
 className={`font-sans text-[12px] uppercase tracking-[0.6em] pb-3 transition-all font-black border-b-2 ${activeTab === 'folders' ? 'text-nous-text text-nous-text border-nous-text ' : 'text-nous-subtle border-transparent hover:text-nous-subtle'}`}
 >
 Folders
 </button>
 <button 
 onClick={() => setActiveTab('pocket')}
 className={`font-sans text-[12px] uppercase tracking-[0.6em] pb-3 transition-all font-black border-b-2 ${activeTab === 'pocket' ? 'text-nous-text text-nous-text border-nous-text ' : 'text-nous-subtle border-transparent hover:text-nous-subtle'}`}
 >
 Curated
 </button>
 <button 
 onClick={() => setActiveTab('list')}
 className={`font-sans text-[12px] uppercase tracking-[0.6em] pb-3 transition-all font-black border-b-2 ${activeTab === 'list' ? 'text-nous-text text-nous-text border-nous-text ' : 'text-nous-subtle border-transparent hover:text-nous-subtle'}`}
 >
 List
 </button>
 <button 
 onClick={() => setActiveTab('ledger')}
 className={`font-sans text-[12px] uppercase tracking-[0.6em] pb-3 transition-all font-black border-b-2 ${activeTab === 'ledger' ? 'text-nous-text text-nous-text border-nous-text ' : 'text-nous-subtle border-transparent hover:text-nous-subtle'}`}
 >
 Ledger
 </button>
 </div>
 </div>
 </div>

 <AnimatePresence>
 {showInjectModal && <InjectShardModal onClose={() => setShowInjectModal(false)} onInjected={() => {
 window.dispatchEvent(new CustomEvent('mimi:pocket_updated'));
 loadData();
 }} />}
 {showBackupModal && <GoogleDriveBackupModal onClose={() => setShowBackupModal(false)} zinesList={zines} pocketItemsList={items} />}
 </AnimatePresence>

 <div className="w-full min-h-[70vh]">
 <AnimatePresence mode="wait">
 {activeTab === 'issues' ? (
 <motion.div key="issues"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8 }}>
 <Shelf variant="personal"onSelectZine={onSelectZine} />
 </motion.div>
 ) : activeTab === 'folders' ? (
 <motion.div key="folders"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8 }}>
 <ZineFolders onSelectZine={onSelectZine} />
 </motion.div>
 ) : activeTab === 'pocket' ? (
 <motion.div key="pocket"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8 }}>
 <Pocket onSelectZine={onSelectZine} />
 </motion.div>
 ) : activeTab === 'ledger' ? (
 <motion.div key="ledger"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8 }}>
 <ObsidianLedgerGraph />
 </motion.div>
 ) : (
 <motion.div key="list"initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <ArchiveListView items={items} zines={zines} onDelete={loadData} />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 );
};

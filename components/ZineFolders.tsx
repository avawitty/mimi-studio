import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, Plus, Trash2, Edit2, X, Check, Loader2, Search } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { useUser } from '../contexts/UserContext';
import { hasAccess } from '../constants';
import { fetchZineFolders, createZineFolder, updateZineFolder, deleteZineFolder, moveZineToFolder, subscribeToUserZines } from '../services/firebaseUtils';
import { getLocalZines } from '../services/localArchive';
import { ZineFolder, ZineMetadata } from '../types';
import { ZineCard } from './ZineCard';

interface ZineFoldersProps {
 onSelectZine: (zine: ZineMetadata) => void;
}

export const ZineFolders: React.FC<ZineFoldersProps> = ({ onSelectZine }) => {
 const { user, profile } = useUser();
 const [folders, setFolders] = useState<ZineFolder[]>([]);
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeFolder, setActiveFolder] = useState<string | null>(null);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 
 // Modal states
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');
 const [editingFolder, setEditingFolder] = useState<ZineFolder | null>(null);

 useEffect(() => {
 let unsubscribe = () => {};

 const loadData = async () => {
 if (!user || user.isAnonymous) {
 setLoading(false);
 return;
 }

 try {
 const fetchedFolders = await fetchZineFolders(user.uid);
 setFolders(fetchedFolders);

 // Load local zines first
 const local = await getLocalZines() || [];
 
 // Subscribe to cloud zines
 unsubscribe = subscribeToUserZines(user.uid, (cloudData) => {
 const registry = new Map<string, ZineMetadata>();
 cloudData.forEach(z => { if (z && z.id) registry.set(z.id, z); });
 local.forEach(z => { if (z && z.id && !registry.has(z.id)) registry.set(z.id, z); });
 
 const merged = Array.from(registry.values())
 .filter(z => z && z.id)
 .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
 
 setZines(merged);
 setLoading(false);
 });
 } catch (e) {
 console.error("Error loading folders data:", e);
 setLoading(false);
 }
 };

 loadData();
 return () => unsubscribe();
 }, [user]);

 const handleCreateFolder = async () => {
 if (!user || !newFolderName.trim()) return;
 
 if (!hasAccess(profile?.plan, 'pro') && folders.length >= 1) {
 window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'));
 return;
 }
 
 try {
 const folderId = await createZineFolder(user.uid, newFolderName.trim());
 if (folderId) {
 setFolders([...folders, { id: folderId, userId: user.uid, name: newFolderName.trim(), createdAt: Date.now() }]);
 setNewFolderName('');
 setShowCreateModal(false);
 }
 } catch (e) {
 console.error("MIMI // Failed to create folder:", e);
 }
 };

 const handleUpdateFolder = async () => {
 if (!editingFolder || !newFolderName.trim()) return;
 
 try {
 const success = await updateZineFolder(editingFolder.id, newFolderName.trim());
 if (success) {
 setFolders(folders.map(f => f.id === editingFolder.id ? { ...f, name: newFolderName.trim() } : f));
 setEditingFolder(null);
 setNewFolderName('');
 }
 } catch (e) {
 console.error("MIMI // Failed to update folder:", e);
 }
 };

 const handleDeleteFolder = async (folderId: string) => {
 if (window.confirm("Are you sure you want to delete this folder? Zines inside will be moved to Quick Stash.")) {
 try {
 const success = await deleteZineFolder(folderId);
 if (success) {
 setFolders(folders.filter(f => f.id !== folderId));
 if (activeFolder === folderId) setActiveFolder(null);
 
 // Update local state for zines in this folder
 setZines(zines.map(z => z.folderId === folderId ? { ...z, folderId: undefined } : z));
 }
 } catch (e) {
 console.error("MIMI // Failed to delete folder:", e);
 }
 }
 };

 const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
 e.preventDefault();
 const zineId = e.dataTransfer.getData('text/plain');
 if (!zineId) return;

 // Optimistic update
 setZines(zines.map(z => z.id === zineId ? { ...z, folderId: targetFolderId || undefined } : z));
 
 // Server update
 try {
 await moveZineToFolder(zineId, targetFolderId);
 } catch (err) {
 console.error("MIMI // Failed to move zine:", err);
 }
 };

 const handleDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 };

 const handleDragStart = (e: React.DragEvent, zineId: string) => {
 e.dataTransfer.setData('text/plain', zineId);
 };

 if (loading) {
 return (
 <div className="w-full h-64 flex items-center justify-center">
 <LoadingSkeleton lines={4} className="w-full max-w-sm"/>
 </div>
 );
 }

 const displayedZines = activeFolder === null 
 ? zines.filter(z => !z.folderId) // Quick Stash (no folder)
 : zines.filter(z => z.folderId === activeFolder);

 return (
 <div className="w-full flex flex-col md:flex-row gap-8">
 {/* Sidebar: Folders List */}
 <div className="w-full md:w-64 shrink-0 space-y-4">
 <div className="flex items-center justify-between mb-6">
 <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] text-nous-subtle font-black">Directories</h3>
 <button 
 onClick={() => { setShowCreateModal(true); setNewFolderName(''); }}
 className="p-1.5 bg-nous-base rounded-none hover:bg-nous-base0 hover:text-nous-text transition-colors"
 >
 <Plus size={14} />
 </button>
 </div>

 <div className="space-y-2">
 {/* Quick Stash (Uncategorized) */}
 <div 
 onClick={() => setActiveFolder(null)}
 onDragOver={handleDragOver}
 onDrop={(e) => handleDrop(e, null)}
 className={`p-3 rounded-none flex items-center gap-3 cursor-pointer transition-all ${activeFolder === null ? 'bg-nous-text text-nous-base ' : 'bg-nous-base /50 text-nous-subtle hover:bg-nous-base '}`}
 >
 <Folder size={16} className={activeFolder === null ? 'text-nous-base' : 'text-nous-subtle'} />
 <span className="font-sans text-xs font-medium flex-1">Quick Stash</span>
 <span className="text-[10px] opacity-50">{zines.filter(z => !z.folderId).length}</span>
 </div>

 {/* User Folders */}
 {folders.map(folder => (
 <div 
 key={folder.id}
 onClick={() => setActiveFolder(folder.id)}
 onDragOver={handleDragOver}
 onDrop={(e) => handleDrop(e, folder.id)}
 className={`group p-3 rounded-none flex items-center gap-3 cursor-pointer transition-all ${activeFolder === folder.id ? 'bg-nous-text text-nous-base ' : 'bg-nous-base /50 text-nous-subtle hover:bg-nous-base '}`}
 >
 <Folder size={16} className={activeFolder === folder.id ? 'text-nous-base' : 'text-nous-subtle'} />
 <span className="font-sans text-xs font-medium flex-1 truncate">{folder.name}</span>
 <span className="text-[10px] opacity-50 group-hover:hidden">{zines.filter(z => z.folderId === folder.id).length}</span>
 
 {/* Folder Actions */}
 <div className="hidden group-hover:flex items-center gap-1">
 <button 
 onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setNewFolderName(folder.name); }}
 className="p-1 hover:text-nous-text transition-colors"
 >
 <Edit2 size={12} />
 </button>
 <button 
 onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
 className="p-1 hover:text-red-500 transition-colors"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Main Content: Zines Grid */}
 <div className="flex-1 min-w-0">
 <div className="mb-8 border-b border-nous-border pb-4">
 <h2 className="font-serif italic text-3xl text-nous-text ">
 {activeFolder === null ? 'Quick Stash' : folders.find(f => f.id === activeFolder)?.name || 'Folder'}
 </h2>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mt-2">
 {displayedZines.length} {displayedZines.length === 1 ? 'Manifestation' : 'Manifestations'}
 </p>
 </div>

 {displayedZines.length === 0 ? (
 <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-nous-border rounded-none">
 <Folder size={32} className="text-nous-subtle mb-4"/>
 <p className="font-serif italic text-xl text-nous-subtle">Empty Directory</p>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mt-2">Drag and drop zines here</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
 <AnimatePresence>
 {displayedZines.map((zine, index) => (
 <motion.div
 key={zine.id}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 transition={{ delay: index * 0.05 }}
 draggable
 onDragStart={(e) => handleDragStart(e as any, zine.id)}
 className="cursor-grab active:cursor-grabbing"
 >
 <ZineCard zine={zine} onClick={() => onSelectZine(zine)} />
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 )}
 </div>

 {/* Create/Edit Folder Modal */}
 <AnimatePresence>
 {(showCreateModal || editingFolder) && (
 <motion.div 
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[10000] bg-nous-base/80 backdrop-blur-sm flex items-center justify-center p-4"
 >
 <div className="bg-white w-full max-w-md p-6 rounded-none border border-nous-border">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-serif italic text-2xl text-nous-text text-nous-text">
 {editingFolder ? 'Rename Directory' : 'New Directory'}
 </h3>
 <button 
 onClick={() => { setShowCreateModal(false); setEditingFolder(null); }}
 className="text-nous-subtle hover:text-red-500 transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 
 <div className="space-y-4">
 <div>
 <label className="block font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle mb-2">Directory Name</label>
 <input 
 type="text"
 value={newFolderName}
 onChange={(e) => setNewFolderName(e.target.value)}
 placeholder="e.g., Spring Collection, Brutalist References..."
 className="w-full p-3 bg-nous-base border border-nous-border rounded-none font-sans text-sm focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-colors"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 editingFolder ? handleUpdateFolder() : handleCreateFolder();
 }
 }}
 />
 </div>
 
 <button 
 onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
 disabled={!newFolderName.trim()}
 className="w-full py-3 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-[0.2em] font-black hover:bg-nous-base0 hover:text-nous-text transition-all disabled:opacity-50"
 >
 {editingFolder ? 'Save Changes' : 'Create Directory'}
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};


// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Shelf } from './Shelf';
import { Pocket } from './Pocket';
import { ZineMetadata } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ArchiveViewProps {
 onSelectZine: (zine: ZineMetadata) => void;
}

import React, { useState, useEffect } from 'react';
import { Shelf } from './Shelf';
import { Pocket } from './Pocket';
import { ArchiveListView } from './ArchiveListView';
import { ZineMetadata, PocketItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, List } from 'lucide-react';
import { fetchPocketItems } from '../services/firebase';
import { getLocalPocket } from '../services/localArchive';
import { fetchCommunityZines } from '../services/firebaseUtils';
import { useUser } from '../contexts/UserContext';

interface ArchiveViewProps {
 onSelectZine: (zine: ZineMetadata) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ onSelectZine }) => {
 const [activeTab, setActiveTab] = useState<'issues' | 'pocket' | 'list'>('pocket');
 const [items, setItems] = useState<PocketItem[]>([]);
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const { user } = useUser();

 const loadData = async () => {
 try {
 const localPocket = await getLocalPocket() || [];
 const cloudPocket = user && !user.isAnonymous ? await fetchPocketItems(user.uid) || [] : [];
 const registry = new Map<string, PocketItem>();
 localPocket.forEach(item => { if (item && item.id) registry.set(item.id, item); });
 cloudPocket.forEach(item => { if (item && item.id) registry.set(item.id, item); });
 setItems(Array.from(registry.values()));

 const zines = await fetchCommunityZines(100);
 setZines(zines || []);
 } catch (e) {
 console.error("MIMI // Failed to load archive data", e);
 }
 };

 useEffect(() => {
 loadData();
 }, [user]);

 return (
 <div className="w-full pt-32 md:pt-48 animate-fade-in transition-all duration-1000">
 
 <div className="px-12 md:px-24 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-nous-border pb-8">
 <div className="space-y-2">
 <h2 className="font-serif text-5xl italic text-nous-text dark:text-nous-dark-text tracking-tighter luminescent-text">The Archive.</h2>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">
 AUTHORED REFRACTIONS
 </p>
 </div>

 <div className="flex gap-16 items-end">
 <div className="flex gap-8">
 <button 
 onClick={() => setActiveTab('issues')}
 className={`font-sans text-[10px] uppercase tracking-[0.2em] pb-3 transition-all font-black border-b border-transparent ${activeTab === 'issues' ? 'text-nous-text border-nous-text' : 'text-nous-subtle hover:text-nous-text'}`}
 >
 MY ISSUES
 </button>
 <button 
 onClick={() => setActiveTab('pocket')}
 className={`font-sans text-[10px] uppercase tracking-[0.2em] pb-3 transition-all font-black border-b border-transparent ${activeTab === 'pocket' ? 'text-nous-text border-nous-text' : 'text-nous-subtle hover:text-nous-text'}`}
 >
 THE POCKET
 </button>
 </div>
 </div>
 </div>

 <div className="w-full min-h-[70vh]">
 <AnimatePresence mode="wait">
 {activeTab === 'list' ? (
 <motion.div key="list"initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <ArchiveListView items={items} zines={zines} onDelete={loadData} />
 </motion.div>
 ) : activeTab === 'issues' ? (
 <motion.div key="issues"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8 }}>
 <Shelf variant="personal"onSelectZine={onSelectZine} />
 </motion.div>
 ) : (
 <motion.div key="pocket"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8 }}>
 <Pocket onSelectZine={onSelectZine} />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 );
};

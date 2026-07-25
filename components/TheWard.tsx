import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Bell, Radar, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TasteGraph } from './TasteGraph';
import { useUser } from '../contexts/UserContext';
import { getTasteGraph } from '../services/tasteGraphService';
import { TasteGraphNode, Notification, ZineMetadata } from '../types';
import { subscribeToNotifications } from '../services/notificationService';
import { subscribeToUserZines } from '../services/firebaseUtils';

const DriftMonitor: React.FC<{ zines: ZineMetadata[] }> = ({ zines }) => {
 const { user, profile } = useUser();
 
 const driftAnalysis = useMemo(() => {
 if (zines.length === 0) return null;
 
 const recentZines = [...zines].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
 
 let coreTags: string[] = [];
 if (profile?.tailorDraft?.positioningCore?.aestheticCore?.tags) {
 coreTags = profile.tailorDraft.positioningCore.aestheticCore.tags;
 } else if (profile?.tasteProfile?.aestheticSignature?.motifs) {
 coreTags = profile.tasteProfile.aestheticSignature.motifs;
 }

 if (coreTags.length === 0) return null;

 let overlapCount = 0;
 let totalTags = 0;

 recentZines.forEach(zine => {
 if (zine.tags && zine.tags.length > 0) {
 zine.tags.forEach(tag => {
 totalTags++;
 if (coreTags.some(core => core.toLowerCase() === tag.toLowerCase())) {
 overlapCount++;
 }
 });
 }
 });

 if (totalTags === 0) return { driftPercentage: 0, isSignificant: false };

 const driftPercentage = Math.round(100 - ((overlapCount / totalTags) * 100));
 // Lowered threshold to 30% for visibility
 const isSignificant = driftPercentage > 30;

 return { driftPercentage, isSignificant };
 }, [zines, user]);

 if (!driftAnalysis || !driftAnalysis.isSignificant) return null;

 return (
 <motion.div 
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mb-8 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-none flex items-start gap-4"
 >
 <div className="mt-1 text-red-500">
 <AlertTriangle size={20} />
 </div>
 <div className="flex-1 space-y-2">
 <h3 className="font-sans text-[10px] uppercase tracking-widest font-bold text-red-700 dark:text-red-400">
 Aesthetic Drift Detected ({driftAnalysis.driftPercentage}% Variance)
 </h3>
 <p className="font-serif text-sm text-red-600 dark:text-red-300 leading-relaxed">
 Your recent outputs are diverging significantly from your core aesthetic signature. 
 The system detects a shift away from your established anchors.
 </p>
 <div className="flex gap-4 pt-2">
 <button 
 onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'tailor' }))}
 className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-widest font-bold text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
 >
 Recalibrate Persona <ArrowRight size={12} />
 </button>
 <button 
 onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'scry' }))}
 className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-widest font-bold text-nous-subtle hover:text-nous-subtle transition-colors"
 >
 Explore New Direction <ArrowRight size={12} />
 </button>
 </div>
 </div>
 </motion.div>
 );
};

export const TheWard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
 const { user } = useUser();
 const [activeTab, setActiveTab] = useState<'graph' | 'notifications'>('graph');
 const [nodes, setNodes] = useState<TasteGraphNode[]>([]);
 const [notifications, setNotifications] = useState<Notification[]>([]);
 const [zines, setZines] = useState<ZineMetadata[]>([]);

 useEffect(() => {
 if (user && !user.isAnonymous && !user.uid.startsWith('local_ghost_') && user.uid !== 'ghost') {
 getTasteGraph(user.uid).then(graph => setNodes(graph.nodes)).catch(e => console.error("MIMI // Failed to load taste graph", e));
 const unsubscribeNotifs = subscribeToNotifications(user.uid, setNotifications);
 const unsubscribeZines = subscribeToUserZines(user.uid, setZines);
 return () => {
 unsubscribeNotifs();
 unsubscribeZines();
 };
 } else {
 setNodes([{ id: 'local_node_1', label: 'Local Resonance', type: 'concept', weight: 1 }]);
 setNotifications([]);
 setZines([]);
 }
 }, [user]);

 const navigateToScry = (label: string) => {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'scry' }));
 setTimeout(() => {
 window.dispatchEvent(new CustomEvent('mimi:scry_search', { detail: label }));
 }, 100);
 };

  return (
 <div className="w-full h-full min-h-0 overflow-y-auto bg-[#FAF8F5] dark:bg-[#080808] text-stone-900 dark:text-stone-100 p-6 md:p-10 pb-32">
  <div className="max-w-7xl mx-auto space-y-8">
  <div className="flex justify-between items-end border-b border-stone-200 dark:border-stone-850 pb-6">
  <div className="space-y-1">
  <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 font-extrabold">
    SOVEREIGN AESTHETICS // THE WARD
  </span>
  <h2 className="font-serif text-4xl md:text-5xl italic tracking-tight font-light text-stone-900 dark:text-stone-50">The Ward</h2>
  <p className="font-sans text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400">Aesthetic Interrogation & Variance Monitoring</p>
  </div>
  <button onClick={onClose} className="p-2 border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
  <X size={18} />
  </button>
  </div>

 <DriftMonitor zines={zines} />

 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden">
 {/* Left: Graph */}
 <div className="overflow-y-auto space-y-8">
 <TasteGraph />
 </div>

 {/* Right: Points & Feed */}
 <div className="bg-nous-base border border-nous-border rounded-none p-8 space-y-6 flex flex-col">
 <div className="flex gap-4">
 <button onClick={() => setActiveTab('graph')} className={`font-sans text-[10px] uppercase tracking-widest font-black ${activeTab === 'graph' ? 'text-nous-subtle 0' : 'text-nous-subtle'}`}>Graph Points</button>
 <button onClick={() => setActiveTab('notifications')} className={`font-sans text-[10px] uppercase tracking-widest font-black ${activeTab === 'notifications' ? 'text-nous-subtle 0' : 'text-nous-subtle'}`}>Feed</button>
 </div>
 
 <div className="flex-1 overflow-y-auto">
 {activeTab === 'graph' ? (
 <div className="space-y-2">
 {nodes.map(node => (
 <button key={node.id} onClick={() => navigateToScry(node.label)} className="w-full p-4 bg-white border border-nous-border rounded-none text-left hover:border-nous-border transition-colors">
 <p className="font-sans text-xs text-nous-text">{node.label}</p>
 <p className="font-mono text-[9px] text-nous-subtle uppercase">{node.type}</p>
 </button>
 ))}
 </div>
 ) : (
 <div className="space-y-2">
 {notifications.map(n => (
 <div key={n.id} className="p-4 bg-white border border-nous-border rounded-none">
 <p className="font-sans text-xs text-nous-text">{n.message}</p>
 <p className="font-mono text-[9px] text-nous-subtle uppercase">{new Date(n.timestamp).toLocaleString()}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

import React, { useState, useEffect } from 'react';
import { Fingerprint, Network, BookOpen, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { db, auth } from '../services/firebaseInit';
import { collection, getDocs, query, limit, orderBy, where } from 'firebase/firestore';
import { getTasteGraph } from '../services/tasteGraphService';
import { AestheticSignature, TasteGraphNode, TasteGraphEdge } from '../types';
import { generateSignatureImage } from '../services/geminiService';

export const ZineInspoCarousel: React.FC = () => {
 const { user, profile, loading } = useUser();
 const [activeView, setActiveView] = useState(0);
 
 const [signature, setSignature] = useState<AestheticSignature | null>(null);
 const [signatureImage, setSignatureImage] = useState<string | null>(null);
 const [isGeneratingImage, setIsGeneratingImage] = useState(false);
 const [graphNodes, setGraphNodes] = useState<TasteGraphNode[]>([]);
 const [latestThread, setLatestThread] = useState<any>(null);

 useEffect(() => {
 if (profile?.tasteProfile?.aestheticSignature) {
 setSignature(profile.tasteProfile.aestheticSignature);
 }
 }, [profile]);

 useEffect(() => {
 if (signature && !signatureImage && !isGeneratingImage) {
 setIsGeneratingImage(true);
 generateSignatureImage(signature)
 .then(setSignatureImage)
 .catch(e => console.error("MIMI // Failed to generate signature image", e))
 .finally(() => setIsGeneratingImage(false));
 }
 }, [signature, signatureImage, isGeneratingImage]);

 useEffect(() => {
 if (loading || !user?.uid || user.uid.startsWith('local_ghost_') || user.uid === 'ghost') return;
 
 // Ensure we have a valid Firebase auth session before querying
 if (!auth.currentUser) return;

 // Fetch Taste Graph
 getTasteGraph(user.uid).then(graph => {
 if (graph && graph.nodes) {
 setGraphNodes(graph.nodes);
 }
 }).catch(e => console.error("Failed to load taste graph for carousel", e));

 // Fetch latest Narrative Thread
 const fetchThread = async () => {
 try {
 const threadsCol = collection(db, 'narrative_threads');
 const q = query(threadsCol, where('userId', '==', user.uid), limit(1));
 const snapshot = await getDocs(q);
 if (!snapshot.empty) {
 setLatestThread(snapshot.docs[0].data());
 }
 } catch (e) {
 console.error("Failed to load threads for carousel", e);
 }
 };
 fetchThread();
 }, [user, loading]);

 const nextView = () => setActiveView((prev) => (prev + 1) % 3);
 const prevView = () => setActiveView((prev) => (prev - 1 + 3) % 3);

 const renderSignatureCard = () => (
 <div className="bg-nous-base /50 p-6 border border-nous-border rounded-none text-nous-text font-serif h-80 flex flex-col justify-between cursor-pointer hover:border-nous-border transition-colors"onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'signature' }))}>
 <div className="flex justify-between items-start">
 <h3 className="italic text-lg">Aesthetic Signature</h3>
 <Fingerprint size={16} className="text-nous-subtle"/>
 </div>
 {signature ? (
 <div className="space-y-4 flex flex-col h-full">
 <div className="w-full h-24 bg-stone-200 rounded-none overflow-hidden flex items-center justify-center">
 {isGeneratingImage ? (
 <Loader2 className="animate-spin text-nous-subtle"size={24} />
 ) : signatureImage ? (
 <img src={signatureImage} alt="Aesthetic Signature"className="w-full h-full object-cover"referrerPolicy="no-referrer"/>
 ) : (
 <p className="text-nous-subtle text-xs italic">Image generation failed</p>
 )}
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Primary Axis</p>
 <p className="italic text-nous-subtle text-xs truncate">{signature.primaryAxis}</p>
 </div>
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Secondary Axis</p>
 <p className="italic text-indigo-600 dark:text-indigo-400 text-xs truncate">{signature.secondaryAxis}</p>
 </div>
 </div>
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Core Trait</p>
 <p className="italic text-nous-subtle text-xs">{signature.coreTrait || 'Evolving'}</p>
 </div>
 </div>
 ) : (
 <div className="flex-1 flex items-center justify-center text-nous-subtle text-xs italic">
 No signature generated yet.
 </div>
 )}
 </div>
 );

 const renderTasteGraphCard = () => (
 <div className="bg-nous-base /50 p-6 border border-nous-border rounded-none text-nous-text font-serif h-80 relative overflow-hidden flex flex-col cursor-pointer hover:border-nous-border transition-colors"onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'taste-graph' }))}>
 <div className="flex justify-between items-start z-10 relative">
 <h3 className="italic text-lg">Taste Graph</h3>
 <Network size={16} className="text-nous-subtle"/>
 </div>
 
 <div className="absolute inset-0 opacity-40 pointer-events-none flex items-center justify-center">
 <div className="absolute w-2 h-2 bg-nous-base0 rounded-none top-1/4 left-1/4"></div>
 <div className="absolute text-[8px] font-mono text-nous-subtle top-1/4 left-1/4 ml-3 mt-0.5">Texture</div>
 
 <div className="absolute w-3 h-3 bg-indigo-500 rounded-none top-1/2 left-1/2"></div>
 <div className="absolute text-[8px] font-mono text-nous-subtle top-1/2 left-1/2 ml-4 mt-1">Brutalism</div>
 
 <div className="absolute w-2 h-2 bg-amber-500 rounded-none bottom-1/3 right-1/4"></div>
 <div className="absolute text-[8px] font-mono text-nous-subtle bottom-1/3 right-1/4 ml-3 mt-0.5">90s Web</div>

 <svg className="absolute inset-0 w-full h-full">
 <line x1="25%"y1="25%"x2="50%"y2="50%"stroke="currentColor"className="text-nous-subtle"strokeWidth="1"/>
 <line x1="50%"y1="50%"x2="75%"y2="66%"stroke="currentColor"className="text-nous-subtle"strokeWidth="1"/>
 </svg>
 </div>

 <div className="mt-auto z-10 relative">
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle">Nodes & Edges</p>
 <p className="italic text-nous-subtle text-xs mt-1">
 {graphNodes.length > 0 ? `${graphNodes.length} nodes mapped in your network` : 'Mapping your semantic network'}
 </p>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mt-2">Active Connections</p>
 <p className="italic text-nous-subtle text-xs mt-1">
 {graphNodes.length > 2 ? 'High density' : 'Building connections'}
 </p>
 </div>
 </div>
 );

 const renderNarrativeThreadsCard = () => (
 <div className="bg-nous-base /50 p-6 border border-nous-border rounded-none text-nous-text font-serif h-80 flex flex-col justify-between cursor-pointer hover:border-nous-border transition-colors"onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'narrative-threads' }))}>
 <div className="flex justify-between items-start">
 <h3 className="italic text-lg">Narrative Threads</h3>
 <BookOpen size={16} className="text-nous-subtle"/>
 </div>
 <div className="space-y-3 mt-4 overflow-hidden flex-1">
 {latestThread ? (
 <div className="border-l border-nous-border pl-3">
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mb-1">{latestThread.title || 'Latest Thread'}</p>
 <p className="italic text-nous-subtle text-xs line-clamp-3">{latestThread.narrative}</p>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mt-2">Status</p>
 <p className="italic text-nous-subtle text-xs">{latestThread.status || 'Active'}</p>
 </div>
 ) : (
 <>
 <div className="border-l border-nous-border pl-3">
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Thread 01</p>
 <p className="italic text-nous-subtle text-xs line-clamp-1">The decay of digital memory</p>
 </div>
 <div className="border-l border-nous-border pl-3">
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle mb-1">Thread 02</p>
 <p className="italic text-nous-subtle text-xs line-clamp-1">Tactile interfaces in modernism</p>
 </div>
 </>
 )}
 </div>
 </div>
 );

 const cards = [
 { id: 'signature', component: renderSignatureCard() },
 { id: 'taste-graph', component: renderTasteGraphCard() },
 { id: 'narrative-threads', component: renderNarrativeThreadsCard() }
 ];

 return (
 <div className="w-full max-w-md relative">
 <div className="flex items-center justify-between mb-4">
 <div className="font-sans text-[9px] uppercase tracking-[0.3em] text-nous-subtle font-bold">ZINE INSPO</div>
 <div className="flex gap-2">
 <button onClick={prevView} className="p-1 text-nous-subtle hover:text-nous-text transition-colors">
 <ChevronLeft size={14} />
 </button>
 <button onClick={nextView} className="p-1 text-nous-subtle hover:text-nous-text transition-colors">
 <ChevronRight size={14} />
 </button>
 </div>
 </div>

 <div className="relative h-80 w-full overflow-hidden">
 <AnimatePresence mode="wait">
 <motion.div
 key={activeView}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.3, ease:"easeInOut"}}
 className="absolute inset-0"
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.2}
 onDragEnd={(e, { offset, velocity }) => {
 const swipe = Math.abs(offset.x) * velocity.x;
 if (swipe < -100) {
 nextView();
 } else if (swipe > 100) {
 prevView();
 }
 }}
 >
 {cards[activeView].component}
 </motion.div>
 </AnimatePresence>
 </div>
 
 {/* Dots */}
 <div className="flex justify-center gap-2 mt-4">
 {cards.map((_, idx) => (
 <button
 key={idx}
 onClick={() => setActiveView(idx)}
 className={`w-1.5 h-1.5 rounded-none transition-colors ${activeView === idx ? 'bg-nous-base dark:bg-stone-200' : 'bg-stone-300 dark:bg-stone-700'}`}
 />
 ))}
 </div>
 </div>
 );
};

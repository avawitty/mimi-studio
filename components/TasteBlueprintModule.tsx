import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Link as LinkIcon, Activity, CheckCircle, AlertTriangle, ArrowRight, Loader2, Layers, Wind, Target } from 'lucide-react';
import { fetchPocketItems } from '../services/firebase';
import { useUser } from '../contexts/UserContext';
import { analyzeTasteLanguage, analyzeArtifact, generateAestheticManifest, embedTasteSignal } from '../services/tasteEngine';
import { PocketItem, TasteReflection } from '../types';
import { motion, AnimatePresence } from 'motion/react';

import { EntropyDensityMatrix } from './EntropyDensityMatrix';

export const TasteBlueprintModule: React.FC = () => {
 const [input, setInput] = useState('');
 const [recentItems, setRecentItems] = useState<PocketItem[]>([]);
 const [tasteLanguage, setTasteLanguage] = useState<string[]>([]);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [reflection, setReflection] = useState<TasteReflection | null>(null);
 const { user, profile, activePersonaId, personas } = useUser();

 const activePersona = personas.find(p => p.id === activePersonaId);
 const draft = activePersona?.tailorDraft || profile?.tailorDraft;

 useEffect(() => {
 if (user) {
 fetchPocketItems(user.uid).then(items => {
 setRecentItems(items.slice(0, 10));
 }).catch(e => console.error("MIMI // Failed to fetch pocket items", e));
 }
 }, [user]);

 useEffect(() => {
 if (recentItems.length > 0 && profile) {
 analyzeTasteLanguage(recentItems, profile).then(setTasteLanguage).catch(e => console.error("MIMI // Failed to analyze taste language", e));
 }
 }, [recentItems, profile]);

 const handleIngest = async () => {
 if (!input.trim() || !user || !draft) return;
 
 setIsAnalyzing(true);
 setReflection(null);

 try {
 // 1. Generate Aesthetic Manifest & Embedding
 const { manifest, title, url, thumbnail } = await generateAestheticManifest(input);
 const embedding = await embedTasteSignal(manifest);

 // 2. Save to Pocket with embedding and metadata
 const { archiveManager } = await import('../services/archiveManager');
 await archiveManager.saveToPocket(user.uid, 'text', { 
 content: input, 
 notes:"Ingested via Thimble", 
 manifest,
 title,
 url,
 thumbnail
 }, undefined, embedding);
 
 // 3. Analyze against Taste DNA
 const result = await analyzeArtifact(manifest, draft);
 if (result) {
 setReflection(result);
 }

 // 4. Refresh items
 const items = await fetchPocketItems(user.uid);
 setRecentItems(items.slice(0, 10));
 } catch (e) {
 console.error(e);
 } finally {
 setIsAnalyzing(false);
 setInput('');
 }
 };

 return (
 <div className="space-y-6 mb-8">
 <div className="grid grid-cols-1 gap-6">
 {/* Input Assembly / Taste Signals */}
 <div className="bg-nous-base p-6 relative overflow-hidden border border-nous-border">
 {/* Tech Markers */}
 <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-nous-border"/>
 <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-nous-border"/>
 <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-nous-border"/>
 <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-nous-border"/>

 <div className="border-b border-dashed border-nous-border pb-2 mb-6">
 <h2 className="font-sans text-[7px] uppercase tracking-[0.3em] font-black text-nous-subtle flex items-center gap-2">
 <Activity size={10} /> Taste Signals
 </h2>
 </div>
 
 <p className="text-sm text-nous-subtle mb-4 font-serif italic">
 Drop a link, image, or thought. Mimi will analyze how it aligns with your Taste DNA.
 </p>
 <div className="relative">
 <textarea
 className="w-full p-4 pl-10 border border-nous-border mb-4 focus:ring-1 focus:ring-stone-400 outline-none bg-nous-base /50 min-h-[100px] text-sm font-mono placeholder:font-sans placeholder:italic"
 placeholder="e.g., https://shop.com/jil-sander-wool-coat"
 value={input}
 onChange={(e) => setInput(e.target.value)}
 />
 <LinkIcon size={14} className="absolute top-5 left-4 text-nous-subtle"/>
 </div>
 <button 
 onClick={handleIngest}
 disabled={isAnalyzing || !input.trim()}
 className="bg-nous-base  text-white px-6 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-stone-700 transition disabled:opacity-50 flex items-center gap-2"
 >
 {isAnalyzing ? <><Loader2 size={12} className="animate-spin"/> Analyzing Signal...</> : 'Analyze Artifact'}
 </button>
 </div>

 {/* Current Language */}
 <div className="bg-nous-base p-6 relative overflow-hidden border border-nous-border">
 {/* Tech Markers */}
 <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-nous-border"/>
 <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-nous-border"/>
 <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-nous-border"/>
 <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-nous-border"/>

 <div className="border-b border-dashed border-nous-border pb-2 mb-6">
 <h2 className="font-sans text-[7px] uppercase tracking-[0.3em] font-black text-nous-subtle flex items-center gap-2">
 <BookOpen size={10} /> Language of Taste
 </h2>
 </div>

 <div className="space-y-4 relative z-10">
 <p className="text-sm text-nous-subtle font-serif italic">Your taste is currently manifesting as:</p>
 <div className="flex flex-wrap gap-2">
 {tasteLanguage.length > 0 ? tasteLanguage.map(tag => (
 <span key={tag} className="px-2 py-1 bg-nous-base text-nous-text text-[9px] uppercase tracking-widest font-bold border border-nous-border">{tag}</span>
 )) : <span className="text-nous-subtle text-[10px] font-mono flex items-center gap-2"><Loader2 size={10} className="animate-spin"/> Synthesizing...</span>}
 </div>
 </div>
 </div>
 </div>

 {/* Taste Reflection Card */}
 <AnimatePresence>
 {reflection && (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-nous-base border border-nous-border p-6 relative"
 >
 {/* Tech Markers */}
 <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-nous-border"/>
 <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-nous-border"/>
 <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-nous-border"/>
 <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-nous-border"/>

 <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-nous-border">
 <h3 className="font-serif italic text-2xl text-nous-text">Taste Reflection</h3>
 <div className="flex items-center gap-3">
 <span className="text-[7px] font-sans uppercase tracking-[0.3em] font-black text-nous-subtle">Alignment</span>
 <div className="flex items-center gap-2">
 <div className="w-24 h-1 bg-nous-base overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${reflection.alignmentScore}%` }}
 transition={{ duration: 1, ease:"easeOut"}}
 className={`h-full ${reflection.alignmentScore > 75 ? 'bg-nous-base0' : reflection.alignmentScore > 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
 />
 </div>
 <span className="font-mono text-xs font-bold text-nous-text">{reflection.alignmentScore}%</span>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-8">
 {/* Analysis */}
 <div className="space-y-6">
 <div>
 <h4 className="text-[7px] font-sans uppercase tracking-[0.3em] font-black text-nous-subtle mb-3">Why it fits</h4>
 <ul className="space-y-2">
 {reflection.analysis.pros.map((pro, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-nous-subtle font-serif">
 <CheckCircle size={14} className="text-nous-subtle mt-0.5 shrink-0"/>
 <span>{pro}</span>
 </li>
 ))}
 </ul>
 </div>
 
 {reflection.analysis.cons?.length > 0 && (
 <div>
 <h4 className="text-[7px] font-sans uppercase tracking-[0.3em] font-black text-nous-subtle mb-3">Divergence</h4>
 <ul className="space-y-2">
 {reflection.analysis.cons.map((con, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-nous-subtle font-serif">
 <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0"/>
 <span>{con}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 <div>
 <h4 className="text-[7px] font-sans uppercase tracking-[0.3em] font-black text-nous-subtle mb-2">Prediction</h4>
 <p className="text-sm font-serif italic text-nous-subtle bg-nous-base /50 p-4 border border-nous-border">
 {reflection.prediction}
 </p>
 </div>
 </div>

 {/* Evolution & Signals */}
 <div className="space-y-6">
 <div className="bg-nous-base dark:bg border border-nous-border p-5">
 <h4 className="text-[7px] font-sans uppercase tracking-[0.3em] font-black text-nous-subtle mb-4 flex items-center gap-2">
 <Activity size={10} /> Taste Evolution
 </h4>
 <div className="space-y-4">
 <div>
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-1">Reinforces</span>
 <p className="text-sm font-serif text-nous-text">{reflection.evolution.reinforces}</p>
 </div>
 <div>
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-1">Introduces</span>
 <p className="text-sm font-serif text-nous-subtle">{reflection.evolution.introduces}</p>
 </div>
 <div className="pt-3 border-t border-dashed border-nous-border">
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-1">Trajectory</span>
 <p className="text-sm font-serif italic text-nous-subtle flex items-center gap-2">
 <ArrowRight size={12} className="text-nous-subtle"/> {reflection.evolution.trajectory}
 </p>
 </div>
 </div>
 </div>

 <div>
 <h4 className="text-[7px] font-sans uppercase tracking-[0.3em] font-black text-nous-subtle mb-3">Extracted Signals</h4>
 <div className="flex flex-wrap gap-2">
 {reflection.extractedSignals.brand && <span className="px-2 py-1 bg-nous-base text-[9px] uppercase tracking-widest font-bold border border-nous-border">Brand: {reflection.extractedSignals.brand}</span>}
 {reflection.extractedSignals.silhouette && <span className="px-2 py-1 bg-nous-base text-[9px] uppercase tracking-widest font-bold border border-nous-border">Shape: {reflection.extractedSignals.silhouette}</span>}
 {reflection.extractedSignals.material && <span className="px-2 py-1 bg-nous-base text-[9px] uppercase tracking-widest font-bold border border-nous-border">Material: {reflection.extractedSignals.material}</span>}
 {reflection.extractedSignals.tags.map(tag => (
 <span key={tag} className="px-2 py-1 bg-transparent border border-nous-border text-[9px] uppercase tracking-widest font-bold text-nous-subtle">#{tag}</span>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Density & Entropy Metrics */}
 {reflection.metrics && (
 <div className="mt-8 pt-8 border-t border-dashed border-nous-border">
 <h4 className="text-[7px] font-sans uppercase tracking-[0.3em] font-black text-nous-subtle mb-6 flex items-center gap-2">
 <Activity size={10} /> Aesthetic Field Vectors
 </h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
 <div className="flex justify-center items-center">
 <EntropyDensityMatrix 
 initialDensity={reflection.metrics.density.score}
 initialEntropy={reflection.metrics.entropy.score}
 userDensity={draft?.positioningCore?.aestheticCore?.density}
 userEntropy={draft?.positioningCore?.aestheticCore?.entropy}
 onCalibrate={(d, e) => {
 console.log("Calibrated:", d, e);
 // In a real app, this would save to Firebase to train the user's model
 }}
 />
 </div>

 <div className="space-y-6">
 <div className="bg-nous-base dark:bg border border-nous-border p-5 relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-10">
 <Layers size={48} />
 </div>
 <div className="space-y-3 relative z-10">
 <span className="text-[9px] font-sans uppercase tracking-[0.3em] font-black text-nous-text block mb-2">Density Analysis</span>
 <div>
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-1">Detected Signals</span>
 <p className="text-xs font-serif text-nous-subtle">{reflection.metrics.density.signals}</p>
 </div>
 <div>
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-1">Reasoning</span>
 <p className="text-xs font-serif italic text-nous-subtle">{reflection.metrics.density.reasoning}</p>
 </div>
 </div>
 </div>

 <div className="bg-nous-base dark:bg border border-nous-border p-5 relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-10">
 <Wind size={48} />
 </div>
 <div className="space-y-3 relative z-10">
 <span className="text-[9px] font-sans uppercase tracking-[0.3em] font-black text-nous-text block mb-2">Entropy Analysis</span>
 <div>
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-1">Detected Signals</span>
 <p className="text-xs font-serif text-nous-subtle">{reflection.metrics.entropy.signals}</p>
 </div>
 <div>
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-1">Reasoning</span>
 <p className="text-xs font-serif italic text-nous-subtle">{reflection.metrics.entropy.reasoning}</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Attraction Analysis */}
 <div className="bg-nous-base /50 border border-nous-border p-5">
 <span className="text-[7px] text-nous-subtle font-sans font-black uppercase tracking-[0.3em] block mb-2 flex items-center gap-2">
 <Target size={10} /> Attraction Analysis
 </span>
 <p className="text-sm font-serif text-nous-text leading-relaxed">
 {reflection.metrics.attractionAnalysis}
 </p>
 </div>
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

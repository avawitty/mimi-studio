
// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, FlaskConical, Droplet, ArrowRight, Save, Wand2, Info, ChevronRight, Binary, Beaker, Layers, Zap, Palette, Sun, Eye, Sliders, Check, Settings2, Sparkles } from 'lucide-react';
import { Treatment } from '../types';

interface TreatmentPanelProps {
 treatments: Treatment[];
 onApply: (treatment: Treatment) => void;
 onClose: () => void;
 onSaveNew: (treatment: Omit<Treatment, 'id' | 'createdAt' | 'userId'>) => void;
}

const PRESET_SUGGESTIONS = [
 { name:"Scotopic Grain", instr:"Apply heavy 35mm film grain, deepen shadows, and reduce overall saturation to create a moody, nocturnal feel."},
 { name:"Ethereal Bloom", instr:"Add a soft highlight bloom effect, raise the white point, and introduce a subtle warm amber tint to the midtones."},
 { name:"Brutalist Steel", instr:"High contrast, crushed blacks, and a cold blue/silver color grade. Emphasize metallic textures and sharp lines."},
 { name:"Vintage Blush", instr:"Muted pastels, soft focus edges, and a slight pink/rose overlay with visible paper texture."}
];

export const TreatmentPanel: React.FC<TreatmentPanelProps> = ({ treatments, onApply, onClose, onSaveNew }) => {
 const [mode, setMode] = useState<'list' | 'create'>('list');
 const [newName, setNewName] = useState('');
 const [newInstruction, setNewInstruction] = useState('');
 const [newVariance, setNewVariance] = useState<'interpretive' | 'anchored'>('interpretive');
 const [isMixedMedia, setIsMixedMedia] = useState(false);

 const handleCreate = () => {
 if (!newName.trim() || !newInstruction.trim()) return;
 onSaveNew({
 name: newName,
 instruction: newInstruction,
 variance: newVariance,
 isMixedMedia
 });
 setNewName('');
 setNewInstruction('');
 setIsMixedMedia(false);
 setMode('list');
 };

 const useSuggestion = (s: typeof PRESET_SUGGESTIONS[0]) => {
 setNewName(s.name);
 setNewInstruction(s.instr);
 };

 return (
 <motion.div 
 initial={{ x: '100%' }} 
 animate={{ x: 0 }} 
 exit={{ x: '100%' }}
 className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-nous-base z-[5500] flex flex-col border-l border-nous-border"
 >
 <header className="h-24 border-b border-nous-border px-8 flex justify-between items-center bg-black/40 backdrop-blur-xl z-10 shrink-0">
 <div className="flex items-center gap-4">
 <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
 <Beaker size={20} className="animate-pulse"/>
 </div>
 <div className="flex flex-col">
 <span className="font-sans text-[10px] uppercase tracking-[0.4em] font-black text-nous-subtle">Aesthetic Presets</span>
 <span className="font-mono text-[7px] text-nous-subtle uppercase tracking-widest">Registry_Darkroom_v2</span>
 </div>
 </div>
 <button onClick={onClose} className="p-3 text-nous-subtle hover:text-nous-text transition-all bg-white/5 border border-white/10"><X size={20}/></button>
 </header>

 <div className="flex-1 overflow-y-auto no-scrollbar p-8">
 <AnimatePresence mode="wait">
 {mode === 'list' ? (
 <motion.div key="list"initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 pb-20">
 <div className="space-y-4">
 <h2 className="font-header text-4xl italic tracking-tighter leading-tight text-white">The Vault.</h2>
 <p className="font-serif italic text-lg text-nous-subtle">Apply saved visual directives to your current selection. Chaining instructions over existing shards creates layered complexity.</p>
 </div>

 <div className="space-y-6">
 {treatments.length === 0 ? (
 <div className="py-24 text-center border border-dashed border-nous-border bg-white/2 space-y-6">
 <div className="w-16 h-16 bg-nous-base border border-nous-border flex items-center justify-center mx-auto text-nous-subtle">
 <Zap size={32} strokeWidth={1} />
 </div>
 <div className="space-y-2">
 <p className="font-serif italic text-2xl text-nous-subtle">“No Logic Shards Bound.”</p>
 <p className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">Manifest a preset to begin batching.</p>
 </div>
 </div>
 ) : (
 <div className="grid gap-4">
 {treatments.map(t => (
 <button 
 key={t.id} 
 onClick={() => onApply(t)}
 className="w-full text-left p-8 bg-nous-base/40 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform duration-700">
 <Palette size={80} />
 </div>
 <div className="flex justify-between items-start mb-6 relative z-10">
 <div className="flex items-center gap-3">
 <div className={`w-2 h-2 ${t.variance === 'anchored' ? 'bg-amber-500' : 'bg-nous-base0'} animate-pulse`} />
 <span className="font-sans text-[8px] uppercase tracking-[0.3em] font-black text-nous-subtle">Ref: {t.variance?.toUpperCase()}</span>
 </div>
 <div className="p-2 bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
 <ArrowRight size={14} className="text-white"/>
 </div>
 </div>
 <h4 className="font-header text-3xl italic tracking-tighter text-white mb-4 relative z-10">{t.name}</h4>
 <div className="p-5 bg-black/40 border border-white/5 relative z-10">
 <div className="flex items-center gap-2 mb-3">
 <Sliders size={10} className="text-nous-subtle"/>
 <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">Pixel Logic</span>
 </div>
 <p className="font-serif italic text-base text-nous-subtle leading-relaxed line-clamp-3">"{t.instruction}"</p>
 </div>
 </button>
 ))}
 </div>
 )}
 
 <button 
 onClick={() => setMode('create')}
 className="w-full py-10 border border-dashed border-nous-border text-nous-subtle hover:text-nous-text hover:border-indigo-500 transition-all flex flex-col items-center justify-center gap-4 bg-white/2 hover:bg-indigo-500/5 group"
 >
 <div className="p-4 bg-nous-base border border-nous-border group-hover:scale-110 transition-transform">
 <Plus size={32} strokeWidth={1} />
 </div>
 <span className="font-sans text-[10px] uppercase tracking-[0.5em] font-black">Manifest New Preset</span>
 </button>
 </div>
 </motion.div>
 ) : (
 <motion.div key="create"initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
 <button onClick={() => setMode('list')} className="flex items-center gap-4 text-nous-subtle mb-8 hover:text-nous-text transition-colors group">
 <ArrowRight size={16} className="rotate-180 group-hover:-translate-x-1 transition-transform"/>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Back to Vault</span>
 </button>

 <div className="space-y-4">
 <h2 className="font-header text-5xl italic tracking-tighter text-white">Logic Refinement.</h2>
 <p className="font-serif italic text-lg text-nous-subtle leading-snug">Design an aesthetic mandate to be stored and applied as a high-fidelity preset.</p>
 </div>

 <div className="space-y-12">
 <div className="space-y-3">
 <label htmlFor="presetName"className="font-sans text-[9px] uppercase tracking-[0.4em] font-black text-nous-subtle">Preset Identity</label>
 <input 
 id="presetName"
 name="presetName"
 type="text"
 value={newName} 
 onChange={e => setNewName(e.target.value)}
 placeholder="e.g. 1999 Fashion Flash"
 className="w-full bg-transparent border-b border-nous-border py-4 font-header italic text-3xl focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-nous-subtle text-white"
 />
 </div>

 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <label htmlFor="presetInstruction"className="font-sans text-[9px] uppercase tracking-[0.4em] font-black text-nous-subtle">Visual Mandate</label>
 <div className="flex items-center gap-2">
 <Sparkles size={12} className="text-nous-subtle"/>
 <span className="font-sans text-[7px] uppercase tracking-widest font-black text-nous-subtle italic">Mimi Suggestions</span>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 {PRESET_SUGGESTIONS.map(s => (
 <button 
 key={s.name} 
 onClick={() => useSuggestion(s)}
 className="text-left p-4 bg-white/5 border border-white/5 hover:border-white/20 transition-all group"
 >
 <span className="font-header italic text-sm text-nous-subtle group-hover:text-nous-text block mb-1">{s.name}</span>
 <div className="h-1 w-8 bg-nous-base group-hover:bg-indigo-50 transition-all"/>
 </button>
 ))}
 </div>
 <textarea 
 id="presetInstruction"
 name="presetInstruction"
 value={newInstruction}
 onChange={e => setNewInstruction(e.target.value)}
 placeholder="Define the bloom, grain, shadows, and hue shifts..."
 className="w-full bg-nous-base/50 border border-nous-border p-8 font-serif italic text-xl focus:outline-none focus:border-indigo-500 h-56 resize-none leading-relaxed text-nous-subtle"
 />
 </div>

 <div className="space-y-4">
 <div className="flex items-center gap-3 mb-2">
 <Settings2 size={12} className="text-nous-subtle"/>
 <label className="font-sans text-[9px] uppercase tracking-[0.4em] font-black text-nous-subtle">Development Protocol</label>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <button onClick={() => setNewVariance('interpretive')} className={`py-6 px-6 border font-sans text-[10px] uppercase tracking-widest font-black transition-all flex flex-col items-center gap-2 ${newVariance === 'interpretive' ? 'bg-nous-base text-nous-text border-white' : 'border-nous-border text-nous-subtle hover:border-nous-border'}`}>
 <Wand2 size={16} />
 Interpretive
 </button>
 <button onClick={() => setNewVariance('anchored')} className={`py-6 px-6 border font-sans text-[10px] uppercase tracking-widest font-black transition-all flex flex-col items-center gap-2 ${newVariance === 'anchored' ? 'bg-nous-base text-nous-text border-white' : 'border-nous-border text-nous-subtle hover:border-nous-border'}`}>
 <Anchor size={16} />
 Anchored
 </button>
 </div>
 </div>
 </div>

 <div className="p-8 bg-nous-base0/5 border border-nous-border/10 space-y-4">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Info size={18} />
 <span className="font-sans text-[9px] uppercase tracking-widest font-black">Archival Strategy</span>
 </div>
 <p className="font-serif italic text-sm text-nous-text/60 leading-relaxed text-balance">
 Presets are not just filters; they are the semantic rules of your brand. Once saved, they can be applied to any batch of shards in your Darkroom.
 </p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 <AnimatePresence>
 {mode === 'create' && (
 <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="p-8 border-t border-nous-border bg-nous-base z-20 shrink-0">
 <button 
 onClick={handleCreate}
 disabled={!newName.trim() || !newInstruction.trim()}
 className="w-full py-8 bg-indigo-600 text-white font-sans text-xs tracking-[0.5em] uppercase font-black active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30 hover:bg-indigo-500"
 >
 <Check size={20} /> Anchor to Registry
 </button>
 </motion.div>
 )}
 </AnimatePresence>

 <footer className="h-24 border-t border-nous-border px-10 flex items-center justify-center bg-black/40 shrink-0">
 <p className="font-serif italic text-xs text-nous-subtle text-center">“Consistency is the highest form of visual intelligence.”</p>
 </footer>
 </motion.div>
 );
};

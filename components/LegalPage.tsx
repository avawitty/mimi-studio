
// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cpu, Zap, Scale, ShieldCheck, Database, Fingerprint, HeartHandshake, Radio } from 'lucide-react';

interface StructuralPageProps {
 type: 'identity' | 'capabilities' | 'protocol' | 'sovereignty';
 onClose: () => void;
}

const CONTENT = {
 identity: {
 title: 'Identity',
 subtitle: 'Aesthetic Intelligence',
 icon: <Cpu size={14} />,
 body: (
 <div className="space-y-8 font-serif italic text-lg text-nous-subtle leading-relaxed text-balance">
 <div className="space-y-2 mb-10">
 <p className="text-nous-text  font-black text-2xl md:text-3xl leading-tight">
 Mimi: A nod to **Memetics** and the **Art of Self**.
 </p>
 <p className="font-sans text-[8px] uppercase tracking-[0.5em] font-black text-nous-subtle">
 Etymology: Mimema (Greek) — that which is imitated.
 </p>
 </div>
 <p>
 Mimi is a structural interface for the study of information patterns. She treats the self as an editorial manifest, where"memes"are the constituent shards of a sovereign identity.
 </p>
 <p>
 She follows the **Sovereign Sequence**: *I before E, except after C.* 
 <br/><br/>
 <span className="text-nous-text text-nous-text font-bold">Identity</span> before <span className="text-nous-text text-nous-text font-bold">Expression</span>, except after <span className="text-nous-text text-nous-text font-bold">Curation</span>. Without Curation, the Expression is mere noise.
 </p>
 </div>
 )
 },
 capabilities: {
 title: 'Capabilities',
 subtitle: 'Functional Output',
 icon: <Zap size={14} />,
 body: (
 <div className="space-y-6">
 <ul className="space-y-6 font-serif italic text-base text-nous-subtle">
 <li className="flex gap-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle pt-1">01</span>
 <span><strong className="text-nous-text text-nous-text">The Memetic Engine:</strong> Transmutes raw debris into units of cultural transmission (Zines).</span>
 </li>
 <li className="flex gap-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle pt-1">02</span>
 <span><strong className="text-nous-text text-nous-text">Meme Appreciation:</strong> Audits fragments for latent architectural intent.</span>
 </li>
 <li className="flex gap-4">
 <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle pt-1">03</span>
 <span><strong className="text-nous-text text-nous-text">The Art of Self:</strong> Refines personal brand language into a defensible conceptual form.</span>
 </li>
 </ul>
 </div>
 )
 },
 protocol: {
 title: 'The Protocol',
 subtitle: 'Terms of Performance',
 icon: <Scale size={14} />,
 body: (
 <div className="space-y-8 font-serif italic text-lg text-nous-subtle leading-relaxed text-balance">
 <p>
 <strong>1. Taste is Intentional.</strong> Mimi assumes all inputs are deliberate choices in a living brand language.
 </p>
 <p>
 <strong>2. The No-Slop Promise.</strong> We will not train on your shit. Your refractions belong to you. We do not extract data for pedestrian LLM training models.
 </p>
 <p>
 <strong>3. No Trauma Dumping.</strong> Mimi is a creative partner, not a therapist... <span className="text-nous-subtle italic">unless</span> your aesthetic frequency is literally being crushed by the simulation. In that case, descend to the Clearing.
 </p>
 <div className="pt-4">
 <button onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'clearing' }))} className="flex items-center gap-3 text-nous-subtle font-sans text-[9px] uppercase tracking-widest font-black hover:opacity-70 transition-all">
 <HeartHandshake size={14} /> Enter Secret Clearing
 </button>
 </div>
 </div>
 )
 },
 sovereignty: {
 title: 'Sovereignty',
 subtitle: 'Data & Privacy',
 icon: <Database size={14} />,
 body: (
 <div className="space-y-8 font-serif italic text-lg text-nous-subtle leading-relaxed text-balance">
 <div className="p-6 bg-nous-base/50 /10 border border-nous-border /20 rounded-none">
 <p className="text-nous-subtle font-bold mb-2">Local-First Archive</p>
 <p className="text-sm">Your refractions stay on your device unless anchored to the cloud.</p>
 </div>
 <p>
 Mimi uses a"Sovereign Memory"protocol. Anonymous users exist only in -memory. Anchored users (Swans) sync to the Cloud Registry.
 </p>
 </div>
 )
 }
};

export const StructuralPage: React.FC<StructuralPageProps> = ({ type: initialType, onClose }) => {
 const [activeTab, setActiveTab] = useState(initialType);
 const content = CONTENT[activeTab];

 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[9000] flex items-center justify-center p-6 bg-nous-base/95 /98 backdrop-blur-3xl"
 >
 <div className="relative w-full max-w-2xl h-[80vh] flex flex-col bg-white border border-nous-border rounded-none overflow-hidden">
 
 <div className="flex justify-between items-center p-8 border-b border-nous-border shrink-0">
 <div className="space-y-1">
 <h2 className="font-serif text-3xl italic tracking-tighter text-nous-text text-nous-text">Mimi Colophon.</h2>
 <p className="font-sans text-[8px] uppercase tracking-[0.4em] text-nous-subtle font-black">System v4.4 // Identity Registry</p>
 </div>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors">
 <X size={24} />
 </button>
 </div>

 <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
 <div className="w-full md:w-48 bg-nous-base /20 border-b md:border-b-0 md:border-r border-nous-border flex md:flex-col overflow-x-auto md:overflow-visible shrink-0">
 {(Object.keys(CONTENT) as Array<keyof typeof CONTENT>).map((key) => (
 <button
 key={key}
 onClick={() => setActiveTab(key)}
 className={`flex-1 md:flex-none p-6 text-left flex items-center gap-3 transition-all ${activeTab === key ? 'bg-white text-nous-text text-nous-text' : 'text-nous-subtle hover:text-nous-subtle '}`}
 >
 <div className={activeTab === key ? 'text-nous-subtle' : 'opacity-50'}>{CONTENT[key].icon}</div>
 <span className="font-sans text-[9px] uppercase tracking-widest font-black hidden md:block">{CONTENT[key].title}</span>
 </button>
 ))}
 </div>

 <div className="flex-1 p-8 md:p-12 overflow-y-auto no-scrollbar">
 <AnimatePresence mode="wait">
 <motion.div 
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={{ duration: 0.2 }}
 className="space-y-8"
 >
 <div className="space-y-2 mb-8">
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black text-nous-subtle">{content.title}</span>
 <h3 className="font-serif text-4xl italic tracking-tighter text-nous-text text-nous-text">{content.subtitle}</h3>
 </div>
 {content.body}
 </motion.div>
 </AnimatePresence>
 </div>
 </div>

 <div className="p-6 border-t border-nous-border text-center shrink-0">
 <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Aesthetic Equity Protocol // Sovereign Memory</span>
 </div>
 </div>
 </motion.div>
 );
};

// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DossierArtifact } from '../types';
import { X, Share2, Download, ExternalLink, Activity, Info, Briefcase, FileText, Check, Copy, Globe, Pin, LayoutGrid, Quote, Terminal, Cpu, ScanLine, Target } from 'lucide-react';
import { AestheticDNA } from './AestheticDNA';

export const DossierArtifactView: React.FC<{ artifact: DossierArtifact; onClose: () => void }> = ({ artifact, onClose }) => {
 const [copied, setCopied] = useState(false);

 const handleShare = () => {
 const url = `${window.location.origin}/?dossier=${artifact.id}`;
 navigator.clipboard.writeText(url).catch(e => console.error("MIMI // Clipboard error", e));
 setCopied(true);
 setTimeout(() => setCopied(false), 3000);
 };

 const handleExportPdf = () => {
 window.print();
 };

 return (
 <div className="fixed inset-0 z-[5000] bg text-nous-text overflow-y-auto no-scrollbar font-mono selection:bg-nous-base0/30 selection:text-nous-text">
 {/* Grid Background */}
 <div className="fixed inset-0 bg bg-[size:40px_40px] opacity-20 pointer-events-none"/>

 <div className="h-20 border-b border-nous-border px-6 md:px-12 flex justify-between items-center sticky top-0 bg-nous-text/90 dark:bg-nous-base/90 backdrop-blur-xl z-[100] print:hidden">
 <button onClick={onClose} className="flex items-center gap-4 group">
 <div className="p-2 border border-nous-border rounded-none group-hover:border-nous-border group-hover:text-nous-text transition-all"><X size={16} /></div>
 <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-nous-subtle group-hover:text-nous-text transition-colors">Close Artifact</span>
 </button>
 <div className="flex items-center gap-4">
 <button onClick={handleShare} className="flex items-center gap-3 px-6 py-2 bg-nous-base border border-nous-border rounded-none font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle hover:text-nous-subtle hover:border-nous-border/50 transition-all">
 {copied ? <Check size={12} className="text-nous-subtle"/> : <Share2 size={12} />}
 {copied ? 'Link Copied' : 'Share Shard'}
 </button>
 <button onClick={handleExportPdf} className="p-3 bg-nous-base border border-nous-border text-nous-subtle hover:text-nous-subtle hover:border-nous-border/50 rounded-none transition-all">
 <Download size={18} />
 </button>
 </div>
 </div>

 <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24 space-y-12 relative z-10">
 <header className="space-y-6">
 <div className="flex items-center gap-4 text-nous-subtle">
 <ScanLine size={18} className="animate-pulse"/>
 <span className="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Artifact Analysis</span>
 </div>
 <h1 className="font-serif text-4xl md:text-6xl italic tracking-tighter leading-none text-nous-text">
 {artifact.title}
 </h1>
 </header>
 
 <div className="grid md:grid-cols-2 gap-12">
 <div className="bg-nous-base p-2 border border-nous-border flex items-center justify-center min-h-[300px]">
 {artifact.content ? (
 <img src={artifact.content} className="w-full h-auto object-contain"alt={artifact.title} />
 ) : artifact.type === 'strategy' ? (
 <div className="p-8 text-center space-y-4">
 <Target size={48} className="mx-auto text-nous-subtle opacity-50"/>
 <h3 className="font-serif italic text-2xl text-nous-subtle">Strategy Audit</h3>
 <p className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Platform Analysis</p>
 </div>
 ) : (
 <div className="p-8 text-center space-y-4">
 <FileText size={48} className="mx-auto text-nous-subtle"/>
 <p className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">Text Document</p>
 </div>
 )}
 </div>
 <div className="space-y-8">
 <p className="font-serif text-xl text-nous-subtle leading-relaxed">
 {artifact.description}
 </p>
 <AestheticDNA dna={artifact.dna} />
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-8 border-t border-nous-border">
 <div className="flex items-center gap-4">
 <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle">Type:</span>
 <span className="font-mono text-sm text-nous-subtle uppercase tracking-widest border border-nous-border/20 bg-nous-base0/5 px-3 py-1 rounded-none">{artifact.type || 'Unknown'}</span>
 </div>
 <div className="flex flex-col items-start md:items-end">
 <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle">Timestamp</span>
 <span className="font-mono text-xs text-nous-subtle">{new Date(artifact.createdAt).toLocaleDateString()} <span className="text-nous-subtle">|</span> {new Date(artifact.createdAt).toLocaleTimeString()}</span>
 </div>
 </div>
 </div>
 </div>

 <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
 {artifact.elements?.map((el, idx) => (
 <motion.div 
 key={el.id || idx}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.05 }}
 className={`relative flex flex-col group ${el.type === 'text' || el.type === 'analysis_pin' ? 'md:col-span-2 lg:col-span-1' : ''}`}
 >
 {el.type === 'image' ? (
 <div className="space-y-6">
 <div className="bg-nous-base p-1 border border-nous-border rounded-none relative overflow-hidden group-hover:border-nous-border/30 transition-all duration-500">
 <img src={el.content} className="w-full h-auto object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-700"/>
 <div className="absolute top-2 right-2">
 <Pin size={12} className={`text-nous-subtle ${el.style?.hasPin ?"opacity-100":"opacity-0"}`} />
 </div>
 <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 backdrop-blur-sm border-t border-nous-border flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
 <span className="font-mono text-[7px] uppercase tracking-widest text-nous-subtle">IMG_SEQ_0{idx+1}</span>
 </div>
 </div>
 {el.notes && (
 <div className="px-2 space-y-3 border-l border-nous-border pl-4">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Quote size={10} />
 <span className="font-mono text-[8px] uppercase tracking-widest font-bold">Annotation</span>
 </div>
 <p className="font-serif italic text-lg text-nous-subtle leading-relaxed">{el.notes}</p>
 </div>
 )}
 </div>
 ) : (
 <div className="flex flex-col h-full space-y-6">
 <div className="flex-1 bg-nous-base/50 p-8 flex flex-col justify-start text-left border border-nous-border hover:border-nous-border/30 transition-colors rounded-none relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-nous-base group-hover:bg-nous-base0 transition-colors"/>
 <div className="flex justify-between items-center mb-6 border-b border-nous-border pb-2">
 <div className="flex items-center gap-2 text-nous-subtle">
 <Terminal size={12} className="text-nous-subtle"/>
 <span className="font-mono text-[8px] uppercase tracking-widest font-bold">
 {el.type === 'analysis_pin' ? 'System_Log' : 'Text_Fragment'}
 </span>
 </div>
 <span className="font-mono text-[8px] text-nous-subtle">HEX_0{idx+1}</span>
 </div>
 <div className={`font-serif tracking-tight text-nous-subtle whitespace-pre-wrap ${el.type === 'analysis_pin' ? 'text-lg leading-relaxed' : 'text-xl leading-snug'}`}>
 {artifact.type === 'strategy' ? (
 (() => {
 try {
 const data = JSON.parse(el.content);
 return (
 <div className="space-y-6 text-sm">
 <div>
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Opening Line</h4>
 <p className="italic text-nous-subtle">"{data.openingLine}"</p>
 </div>
 <div>
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Aesthetic Audit</h4>
 <ul className="list-disc pl-4 space-y-1 text-nous-subtle">
 <li><strong>Palette:</strong> {data.aestheticAudit.palette}</li>
 <li><strong>Density:</strong> {data.aestheticAudit.density}</li>
 <li><strong>Entropy:</strong> {data.aestheticAudit.entropy}</li>
 <li className="italic mt-2">"{data.aestheticAudit.insight}"</li>
 </ul>
 </div>
 <div>
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Strategy Shift</h4>
 <ul className="list-disc pl-4 space-y-1 text-nous-subtle">
 {data.strategyShift.map((s: string, i: number) => <li key={i}>{s}</li>)}
 </ul>
 </div>
 <div>
 <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Identity Reframe</h4>
 <p className="italic text-nous-subtle">"{data.identityReframe}"</p>
 </div>
 </div>
 );
 } catch (e) {
 return <pre className="font-mono text-[10px] text-nous-subtle overflow-x-auto p-4 bg-black/50 rounded-none border border-nous-border">{el.content}</pre>;
 }
 })()
 ) : (
 `"${el.content}"`
 )}
 </div>
 </div>
 </div>
 )}
 </motion.div>
 ))}
 </section>

 {artifact.report && (
 <section className="grid md:grid-cols-12 gap-16 md:gap-32 pt-24 border-t border-nous-border items-start">
 <div className="md:col-span-7 space-y-12">
 <div className="flex items-center gap-4 text-nous-subtle">
 <Cpu size={18} />
 <span className="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Executive Synthesis</span>
 </div>
 <h3 className="font-serif text-4xl md:text-5xl italic tracking-tighter leading-tight text-nous-text">
 {artifact.report.conceptualThroughline || artifact.report.coreFrequency}
 </h3>
 <div className="space-y-8 font-serif italic text-xl text-nous-subtle leading-relaxed text-balance">
 <p>{artifact.report.designBrief || artifact.report.diagnosis}</p>
 </div>
 </div>
 <aside className="md:col-span-5 space-y-8">
 <div className="p-8 bg-nous-base/30 border border-nous-border rounded-none space-y-8">
 <div className="space-y-2">
 <span className="font-mono text-[8px] uppercase tracking-widest font-bold text-nous-subtle">Frequency Audit</span>
 <p className="font-serif italic text-2xl text-nous-text">{artifact.report.coreFrequency}</p>
 </div>
 <div className="space-y-4">
 <span className="font-mono text-[8px] uppercase tracking-widest font-bold text-nous-subtle">Chromatic Data</span>
 <div className="flex gap-2">
 {artifact.report.colorStory?.map((c, i) => (
 <div key={i} className="w-8 h-8 rounded-none border border-nous-border"style={{ backgroundColor: c.hex }} title={c.name} />
 ))}
 </div>
 </div>
 </div>
 </aside>
 </section>
 )}

 <section className="pt-24 border-t border-nous-border">
 <AestheticDNA 
 report={artifact.report} 
 palette={artifact.report?.colorStory} 
 title={artifact.title} 
 />
 </section>

 <footer className="pt-32 pb-48 text-center space-y-12 border-t border-nous-border print:hidden">
 <div className="opacity-10 pointer-events-none select-none">
 <h1 className="font-serif italic text-[8rem] md:text-[12rem] text-nous-text">Mimi.</h1>
 </div>
 <button onClick={onClose} className="px-12 py-4 border border-nous-border hover:border-nous-border text-nous-subtle hover:text-nous-subtle font-mono text-[9px] uppercase tracking-[0.4em] font-bold rounded-none transition-all">Return to Grid</button>
 </footer>
 </div>
 </div>
 );
};

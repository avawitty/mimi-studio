import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ZineMetadata } from '../types';
import { Activity, Sparkles, Target, Compass, BookOpen, Briefcase } from 'lucide-react';

interface ThreadGraphProps {
 metadata: ZineMetadata;
 accentColor: string;
}

export const ThreadGraph: React.FC<ThreadGraphProps> = ({ metadata, accentColor }) => {
 const nodes = useMemo(() => {
 const items = [];
 
 // Origin Node
 items.push({
 id: 'origin',
 label: 'Raw Input',
 type: 'origin',
 x: 10,
 y: 50,
 icon: Activity
 });

 // Intent Node
 if (metadata.content.meta?.intent) {
 items.push({
 id: 'intent',
 label: 'Intent',
 type: 'meta',
 x: 30,
 y: 30,
 icon: Target
 });
 }

 // Aesthetic Vector Node
 if (metadata.aestheticVector && Object.keys(metadata.aestheticVector).length > 0) {
 items.push({
 id: 'aesthetic',
 label: 'Aesthetic',
 type: 'meta',
 x: 30,
 y: 70,
 icon: Sparkles
 });
 }

 // Semiotic Signals (Motifs)
 const signals = metadata.content.semiotic_signals || [];
 signals.forEach((sig, i) => {
 const yPos = 20 + (i * (60 / Math.max(1, signals.length - 1)));
 items.push({
 id: `sig_${i}`,
 label: sig.motif,
 type: 'motif',
 x: 60,
 y: yPos,
 icon: sig.type === 'acquisition' ? Briefcase : sig.type === 'lexical' ? BookOpen : Sparkles
 });
 });

 // Trajectory / Edge
 items.push({
 id: 'trajectory',
 label: 'Trajectory',
 type: 'trajectory',
 x: 90,
 y: 50,
 icon: Compass
 });

 return items;
 }, [metadata]);

 const edges = useMemo(() => {
 const links = [];
 
 // Connect Origin to Meta
 if (nodes.find(n => n.id === 'intent')) links.push({ source: 'origin', target: 'intent' });
 if (nodes.find(n => n.id === 'aesthetic')) links.push({ source: 'origin', target: 'aesthetic' });

 // Connect Meta to Motifs
 const motifs = nodes.filter(n => n.type === 'motif');
 motifs.forEach(motif => {
 if (nodes.find(n => n.id === 'intent')) links.push({ source: 'intent', target: motif.id });
 if (nodes.find(n => n.id === 'aesthetic')) links.push({ source: 'aesthetic', target: motif.id });
 });

 // Connect Motifs to Trajectory
 motifs.forEach(motif => {
 links.push({ source: motif.id, target: 'trajectory' });
 });

 // Fallback if no meta or motifs
 if (motifs.length === 0) {
 if (nodes.find(n => n.id === 'intent')) links.push({ source: 'intent', target: 'trajectory' });
 if (nodes.find(n => n.id === 'aesthetic')) links.push({ source: 'aesthetic', target: 'trajectory' });
 if (!nodes.find(n => n.id === 'intent') && !nodes.find(n => n.id === 'aesthetic')) {
 links.push({ source: 'origin', target: 'trajectory' });
 }
 }

 return links;
 }, [nodes]);

 return (
 <div className="relative w-full h-[400px] md:h-[500px] bg-nous-base rounded-none overflow-hidden border border-nous-border p-8">
 {/* Background Grid */}
 <div className="absolute inset-0 opacity-20 pointer-events-none"
 style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
 />

 {/* SVG Edges */}
 <svg className="absolute inset-0 w-full h-full pointer-events-none">
 {edges.map((edge, i) => {
 const source = nodes.find(n => n.id === edge.source);
 const target = nodes.find(n => n.id === edge.target);
 if (!source || !target) return null;

 return (
 <motion.line
 key={`edge_${i}`}
 x1={`${source.x}%`}
 y1={`${source.y}%`}
 x2={`${target.x}%`}
 y2={`${target.y}%`}
 stroke={accentColor}
 strokeWidth="1"
 strokeOpacity="0.3"
 initial={{ pathLength: 0, opacity: 0 }}
 animate={{ pathLength: 1, opacity: 1 }}
 transition={{ duration: 1.5, delay: i * 0.1, ease:"easeInOut"}}
 />
 );
 })}
 </svg>

 {/* Nodes */}
 {nodes.map((node, i) => {
 const Icon = node.icon;
 return (
 <motion.div
 key={node.id}
 className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 group z-10"
 style={{ left: `${node.x}%`, top: `${node.y}%` }}
 initial={{ scale: 0, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ type:"spring", stiffness: 200, damping: 20, delay: 0.5 + (i * 0.1) }}
 >
 <div className="relative">
 <div className="w-10 h-10 md:w-12 md:h-12 rounded-none bg-black border border-nous-border flex items-center justify-center group-hover:scale-110 transition-transform duration-300 z-10 relative"style={{ borderColor: node.type === 'motif' ? accentColor : undefined }}>
 <Icon size={16} className={node.type === 'motif' ? 'text-white' : 'text-nous-subtle'} style={node.type === 'motif' ? { color: accentColor } : {}} />
 </div>
 {/* Pulse effect */}
 <div className="absolute inset-0 rounded-none animate-ping opacity-20"style={{ backgroundColor: accentColor }} />
 </div>
 
 <div className="mt-3 text-center w-32">
 <span className="font-mono text-[8px] md:text-[9px] uppercase tracking-widest text-nous-subtle group-hover:text-nous-text transition-colors bg-black/50 px-2 py-1 rounded-none backdrop-blur-sm">
 {node.label}
 </span>
 </div>
 </motion.div>
 );
 })}
 </div>
 );
};

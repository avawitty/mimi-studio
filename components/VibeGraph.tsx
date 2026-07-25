import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getAllShadowMemory } from '../services/vectorSearch';
import { getClusterAnchors, generateClusterAnchors, ThemeNode } from '../services/clusteringService';
import { findThread, Thread, ThreadMode } from '../services/threadService';
import { Loader2, Sparkles, X } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
 id: string;
 type: string;
 content_preview: string;
 isTheme?: boolean;
 label?: string;
 radius?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
 source: string | Node;
 target: string | Node;
 value: number;
}

interface MemoryItem {
 id: string;
 type: string;
 content_preview: string;
}

interface VibeGraphProps {
 onGenerateZine?: (thread: Thread) => void;
 onNodeSelect?: (node: any) => void;
}

export const VibeGraph: React.FC<VibeGraphProps> = ({ onGenerateZine, onNodeSelect }) => {
 const svgRef = useRef<SVGSVGElement>(null);
 const [isGenerating, setIsGenerating] = useState(false);
 const [themes, setThemes] = useState<ThemeNode[]>([]);
 const [memories, setMemories] = useState<MemoryItem[]>([]);
 
 const [selectedNode, setSelectedNode] = useState<Node | null>(null);
 const [activeThread, setActiveThread] = useState<Thread | null>(null);
 const [isThreading, setIsThreading] = useState(false);
 const [threadMode, setThreadMode] = useState<ThreadMode>('emotion');

 const loadData = async () => {
 try {
 const mems = await getAllShadowMemory() as MemoryItem[];
 const thms = await getClusterAnchors();
 setMemories(mems);
 setThemes(thms);
 console.log(`MIMI // VibeGraph: Loaded ${mems.length} artifacts, ${thms.length} themes.`);
 } catch (e) {
 console.error("MIMI // Failed to load vibe graph data:", e);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 useEffect(() => {
 if (memories.length === 0) return;

 const nodes: Node[] = memories.map((m): Node => ({
 id: m.id,
 type: m.type || 'shard',
 content_preview: m.content_preview || '',
 radius: 5
 }));

 // Add theme nodes
 themes.forEach(t => {
 nodes.push({
 id: t.id,
 type: 'theme',
 content_preview: t.label,
 isTheme: true,
 label: t.label,
 radius: 15
 });
 });

 const links: Link[] = [];
 
 // Connect artifacts to their themes
 themes.forEach(t => {
 t.artifact_ids.forEach(aId => {
 // Ensure the artifact exists in our nodes list
 if (nodes.find(n => n.id === aId)) {
 links.push({ source: aId, target: t.id, value: 1 });
 }
 });
 });

 // If no themes, do simple similarity-based linking (placeholder)
 if (themes.length === 0) {
 for (let i = 0; i < memories.length; i++) {
 for (let j = i + 1; j < memories.length; j++) {
 const similarity = 0.5; // Placeholder
 if (similarity > 0.7) {
 links.push({ source: nodes[i].id, target: nodes[j].id, value: similarity });
 }
 }
 }
 }

 const width = 800;
 const height = 600;

 const svg = d3.select(svgRef.current)
 .attr('viewBox', `0 0 ${width} ${height}`);

 svg.selectAll('*').remove();

 const simulation = d3.forceSimulation(nodes)
 .force('link', d3.forceLink(links).id((d: any) => d.id).distance(d => (d.source as Node).isTheme || (d.target as Node).isTheme ? 50 : 100))
 .force('charge', d3.forceManyBody().strength(d => (d as Node).isTheme ? -200 : -30))
 .force('center', d3.forceCenter(width / 2, height / 2))
 .force('collide', d3.forceCollide().radius(d => (d as Node).radius! + 2));

 const isThreadNode = (id: string) => activeThread?.path.some(p => p.id === id);

 const link = svg.append('g')
 .selectAll('line')
 .data(links)
 .join('line')
 .attr('stroke', '#999')
 .attr('stroke-opacity', activeThread ? 0.05 : 0.4)
 .attr('stroke-width', d => d.value * 2);

 // Render thread path
 const threadLinks = activeThread ? activeThread.path.slice(0, -1).map((p, i) => ({
 source: p.id,
 target: activeThread.path[i+1].id
 })) : [];

 const threadLinksData = threadLinks.map(tl => ({
 source: nodes.find(n => n.id === tl.source),
 target: nodes.find(n => n.id === tl.target)
 })).filter(tl => tl.source && tl.target);

 const tLink = svg.append('g')
 .selectAll('line.thread-link')
 .data(threadLinksData)
 .join('line')
 .attr('class', 'thread-link')
 .attr('stroke', '#10b981')
 .attr('stroke-width', 3)
 .attr('stroke-dasharray', '5,5')
 .attr('opacity', 0.8);

 const nodeGroup = svg.append('g')
 .selectAll('g')
 .data(nodes)
 .join('g')
 .attr('opacity', d => activeThread ? (isThreadNode(d.id) ? 1 : 0.1) : 1)
 .call(d3.drag<any, any>()
 .on('start', dragstarted)
 .on('drag', dragged)
 .on('end', dragended));

 nodeGroup.on('click', (event: any, d: any) => {
 if (!d.isTheme) {
 setSelectedNode(d);
 setActiveThread(null);
 if (onNodeSelect) onNodeSelect(d);
 }
 });

 nodeGroup.append('circle')
 .attr('r', d => d.radius!)
 .attr('fill', d => {
 if (d.isTheme) return '#f59e0b'; // amber-500
 return d.type === 'zine' ? '#10b981' : '#6366f1';
 })
 .attr('stroke', d => d.isTheme ? '#fff' : (selectedNode?.id === d.id ? '#10b981' : 'none'))
 .attr('stroke-width', d => d.isTheme ? 2 : (selectedNode?.id === d.id ? 3 : 0));

 // Add labels for themes
 nodeGroup.filter(d => !!d.isTheme)
 .append('text')
 .text(d => d.label!)
 .attr('x', 20)
 .attr('y', 5)
 .attr('font-family', 'serif')
 .attr('font-style', 'italic')
 .attr('font-size', '14px')
 .attr('fill', '#a8a29e'); // stone-400

 nodeGroup.append('title')
 .text(d => d.content_preview);

 simulation.on('tick', () => {
 link
 .attr('x1', (d: any) => d.source.x)
 .attr('y1', (d: any) => d.source.y)
 .attr('x2', (d: any) => d.target.x)
 .attr('y2', (d: any) => d.target.y);

 tLink
 .attr('x1', (d: any) => d.source.x)
 .attr('y1', (d: any) => d.source.y)
 .attr('x2', (d: any) => d.target.x)
 .attr('y2', (d: any) => d.target.y);

 nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
 });

 function dragstarted(event: any) {
 if (!event.active) simulation.alphaTarget(0.3).restart();
 event.subject.fx = event.subject.x;
 event.subject.fy = event.subject.y;
 }

 function dragged(event: any) {
 event.subject.fx = event.x;
 event.subject.fy = event.y;
 }

 function dragended(event: any) {
 if (!event.active) simulation.alphaTarget(0);
 event.subject.fx = null;
 event.subject.fy = null;
 }

 return () => {
 simulation.stop();
 };
 }, [memories, themes, activeThread, selectedNode]);

 const handleGenerateClusters = async () => {
 setIsGenerating(true);
 try {
 await generateClusterAnchors();
 await loadData();
 } catch (e) {
 console.error("MIMI // Failed to generate clusters:", e);
 } finally {
 setIsGenerating(false);
 }
 };

 const handleFindThread = async () => {
 if (!selectedNode) return;
 setIsThreading(true);
 try {
 const thread = await findThread(selectedNode.id, memories, themes, threadMode);
 if (thread) {
 setActiveThread(thread);
 } else {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Not enough resonance to form a thread.", type: 'error' } 
 }));
 }
 } catch (e) {
 console.error("MIMI // Failed to find thread:", e);
 } finally {
 setIsThreading(false);
 }
 };

 return (
 <div className="relative w-full h-full bg-nous-base dark:bg rounded-none border border-nous-border overflow-hidden">
 <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
 <button
 onClick={handleGenerateClusters}
 disabled={isGenerating || memories.length < 5}
 className="flex items-center gap-2 bg-white border border-nous-border px-4 py-2 rounded-none hover: transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isGenerating ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} className="text-amber-500"/>}
 <span className="font-sans text-[10px] uppercase tracking-widest font-black text-nous-subtle">
 {isGenerating ? 'Synthesizing...' : 'Generate Cluster Anchors'}
 </span>
 </button>
 
 <div className="flex bg-white border border-nous-border rounded-none p-1">
 {(['biographical', 'influence', 'emotion', 'time'] as ThreadMode[]).map(mode => (
 <button
 key={mode}
 onClick={() => setThreadMode(mode)}
 className={`px-3 py-1 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all ${threadMode === mode ? 'bg-nous-base0 text-white' : 'text-nous-subtle hover:text-nous-text '}`}
 >
 {mode}
 </button>
 ))}
 </div>
 </div>

 {selectedNode && !activeThread && (
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 /90 backdrop-blur-md p-6 rounded-none border border-nous-border max-w-md w-full text-center space-y-4 z-20">
 <p className="font-serif italic text-nous-subtle line-clamp-2">"{selectedNode.content_preview}"</p>
 <button 
 onClick={handleFindThread}
 disabled={isThreading}
 className="px-6 py-2 bg-nous-base0 text-white rounded-none font-sans text-[10px] uppercase tracking-widest font-black hover:bg-stone-600 transition-colors disabled:opacity-50"
 >
 {isThreading ? 'Tracing Path...' : 'Find the Thread'}
 </button>
 </div>
 )}

 {activeThread && (
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 /95 backdrop-blur-xl p-8 rounded-none border border-nous-border/30 max-w-lg w-full space-y-6 z-20">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-nous-subtle">
 <Sparkles size={16} />
 <span className="font-sans text-[10px] uppercase tracking-widest font-black">Semantic Thread</span>
 </div>
 <div className="flex items-center gap-4">
 {onGenerateZine && (
 <button 
 onClick={() => onGenerateZine(activeThread)}
 className="px-4 py-1.5 bg-nous-base  text-white rounded-none font-sans text-[10px] uppercase tracking-widest font-bold hover:bg-nous-base transition-colors"
 >
 Weave into Zine
 </button>
 )}
 <button onClick={() => setActiveThread(null)} className="text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors">
 <X size={16} />
 </button>
 </div>
 </div>
 <p className="font-serif text-lg text-nous-text leading-relaxed">
 {activeThread.narrative}
 </p>
 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
 {activeThread.path.map((p, i) => {
 const nodeLabel = p.type === 'theme' 
 ? activeThread.themes.find(t => t.id === p.id)?.label 
 : 'Artifact';
 return (
 <div key={i} className="flex items-center gap-2 shrink-0">
 <span className={`px-2 py-1 rounded-none text-[8px] uppercase tracking-widest font-black ${p.type === 'theme' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-500' : 'bg-nous-base text-nous-subtle '}`}>
 {nodeLabel}
 </span>
 {i < activeThread.path.length - 1 && <span className="text-nous-subtle">→</span>}
 </div>
 );
 })}
 </div>
 </div>
 )}

 <svg ref={svgRef} className="w-full h-full cursor-crosshair"/>
 </div>
 );
};

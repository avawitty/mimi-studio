import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { useUser } from '../contexts/UserContext';
import { fetchUserZines } from '../services/firebaseUtils';
import { ZineMetadata } from '../types';
import { ZineCoverCard } from './ZineCoverCard';
import { X, Loader2, Layers } from 'lucide-react';

interface LoomNode extends d3.SimulationNodeDatum {
 id: string;
 group: 'motif' | 'tag';
 frequency: number;
 radius: number;
}

interface LoomLink extends d3.SimulationLinkDatum<LoomNode> {
 source: string | LoomNode;
 target: string | LoomNode;
 weight: number;
}

export const NarrativeThreadsView: React.FC = () => {
 const { user, loading: userLoading } = useUser();
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [loading, setLoading] = useState(true);
 
 const [nodes, setNodes] = useState<LoomNode[]>([]);
 const [links, setLinks] = useState<LoomLink[]>([]);
 
 const [renderNodes, setRenderNodes] = useState<LoomNode[]>([]);
 const [renderLinks, setRenderLinks] = useState<LoomLink[]>([]);
 
 const [selectedNode, setSelectedNode] = useState<string | null>(null);
 const [geoBlock, setGeoBlock] = useState<any | null>(null);
 const [isExtracting, setIsExtracting] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const loadData = async () => {
 if (!user?.uid) return;
 setLoading(true);
 try {
 const fetchedZines = await fetchUserZines(user.uid);
 setZines(fetchedZines);
 } catch (e) {
 console.error("Failed to load zines for The Loom", e);
 } finally {
 setLoading(false);
 }
 };
 if (!userLoading) loadData();
 }, [user, userLoading]);

 // Data Aggregation Engine
 useEffect(() => {
 if (zines.length === 0) return;

 const nodesMap = new Map<string, LoomNode>();
 const linksMap = new Map<string, LoomLink>();

 zines.forEach(zine => {
 const motifs = (zine.content?.semiotic_signals || []).map(s => s.motif).filter(Boolean);
 const tags = (zine.tags || []).filter(Boolean);
 
 const allTerms = [...new Set([...motifs, ...tags])];
 
 allTerms.forEach(term => {
 if (!nodesMap.has(term)) {
 nodesMap.set(term, {
 id: term,
 group: motifs.includes(term) ? 'motif' : 'tag',
 frequency: 0,
 radius: 10,
 });
 }
 nodesMap.get(term)!.frequency += 1;
 });
 
 // Co-occurrences
 for (let i = 0; i < allTerms.length; i++) {
 for (let j = i + 1; j < allTerms.length; j++) {
 const source = allTerms[i];
 const target = allTerms[j];
 // Sort to ensure consistent edge IDs
 const [s, t] = [source, target].sort();
 const linkId = `${s}|${t}`;
 
 if (!linksMap.has(linkId)) {
 linksMap.set(linkId, {
 source: s,
 target: t,
 weight: 0
 });
 }
 linksMap.get(linkId)!.weight += 1;
 }
 }
 });

 const nodesArr = Array.from(nodesMap.values());
 const maxFreq = Math.max(...nodesArr.map(n => n.frequency), 1);
 
 nodesArr.forEach(node => {
 // Scale radius between 10 and 50 based on frequency
 node.radius = 10 + (node.frequency / maxFreq) * 40;
 });

 setNodes(nodesArr);
 setLinks(Array.from(linksMap.values()));
 }, [zines]);

 // D3 Physics Engine
 useEffect(() => {
 if (nodes.length === 0 || !containerRef.current) return;

 const width = containerRef.current.clientWidth;
 const height = containerRef.current.clientHeight;

 // Clone nodes and links for D3 to mutate
 const simNodes = nodes.map(n => ({ ...n }));
 const simLinks = links.map(l => ({ ...l }));

 const simulation = d3.forceSimulation<LoomNode>(simNodes)
 .force('charge', d3.forceManyBody().strength(-200))
 .force('center', d3.forceCenter(width / 2, height / 2))
 .force('collide', d3.forceCollide().radius(d => (d as LoomNode).radius + 15))
 .force('link', d3.forceLink<LoomNode, LoomLink>(simLinks).id(d => d.id).distance(100))
 .on('tick', () => {
 setRenderNodes([...simulation.nodes()]);
 setRenderLinks([...simLinks]);
 });

 return () => {
 simulation.stop();
 };
 }, [nodes, links]);

 // Filter zines for side drawer
 const filteredZines = useMemo(() => {
 if (!selectedNode) return [];
 return zines.filter(zine => {
 const motifs = (zine.content?.semiotic_signals || []).map(s => s.motif);
 const tags = zine.tags || [];
 return motifs.includes(selectedNode) || tags.includes(selectedNode);
 });
 }, [selectedNode, zines]);

 const handleNodeHover = (node: LoomNode) => {
 // Sound removed
 };

 const handleEdgeHover = (link: LoomLink) => {
 // Sound removed
 };

 return (
 <div className="flex-1 relative overflow-hidden bg-nous-base text-nous-text font-serif"ref={containerRef}>
 {loading && (
 <div className="absolute inset-0 flex items-center justify-center z-50 bg-nous-base/80 backdrop-blur-sm">
 <div className="flex flex-col items-center gap-4 text-nous-subtle">
 <Loader2 className="animate-spin"size={32} />
 <p className="font-sans text-[10px] uppercase tracking-[0.3em]">Weaving the Loom...</p>
 </div>
 </div>
 )}

 {/* Header */}
 <div className="absolute top-12 left-12 z-40 pointer-events-none">
 <h2 className="text-5xl italic font-serif text-nous-text drop-shadow-md">The Loom</h2>
 <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-nous-subtle mt-2">Latent Constellation of Motifs</p>
 </div>

 {/* Edges */}
 <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
 {renderLinks.map((link, i) => {
 const source = link.source as LoomNode;
 const target = link.target as LoomNode;
 if (source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return null;
 
 return (
 <motion.line
 key={`link-${i}`}
 x1={source.x}
 y1={source.y}
 x2={target.x}
 y2={target.y}
 stroke="rgba(16, 185, 129, 0.2)"
 strokeWidth={Math.max(1, link.weight * 1.5)}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 onHoverStart={() => handleEdgeHover(link)}
 className="pointer-events-auto cursor-crosshair hover:stroke-stone-400 transition-colors duration-300"
 />
 );
 })}
 </svg>

 {/* Nodes */}
 <div className="absolute inset-0 z-20 pointer-events-none">
 {renderNodes.map(node => (
 <motion.div
 key={node.id}
 className="absolute flex items-center justify-center cursor-pointer pointer-events-auto group"
 style={{ 
 width: node.radius * 2, 
 height: node.radius * 2,
 backgroundColor: node.group === 'motif' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(99, 102, 241, 0.8)',
 boxShadow: node.group === 'motif' 
 ? `0 0 ${node.radius}px rgba(16, 185, 129, 0.5)` 
 : `0 0 ${node.radius}px rgba(99, 102, 241, 0.5)`,
 }}
 animate={{ x: node.x ? node.x - node.radius : 0, y: node.y ? node.y - node.radius : 0 }}
 transition={{ type: 'spring', stiffness: 50, damping: 15 }}
 onHoverStart={() => handleNodeHover(node)}
 onClick={() => setSelectedNode(node.id)}
 whileHover={{ scale: 1.2 }}
 whileTap={{ scale: 0.9 }}
 >
 <span className="opacity-0 group-hover:opacity-100 absolute top-full mt-2 whitespace-nowrap font-mono text-[9px] uppercase tracking-widest bg-nous-base border border-nous-border px-2 py-1 text-nous-subtle transition-opacity">
 {node.id} ({node.frequency})
 </span>
 </motion.div>
 ))}
 </div>

 {/* Side Drawer */}
 <AnimatePresence>
 {selectedNode && (
 <motion.div
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
 className="absolute top-0 right-0 bottom-0 w-full md:w-[450px] bg-nous-base border-l border-nous-border z-50 flex flex-col"
 >
 <div className="p-8 border-b border-nous-border flex justify-between items-center bg-nous-base/80 backdrop-blur-md">
 <div>
 <h3 className="text-2xl italic text-nous-text">{selectedNode}</h3>
 <p className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle mt-1">
 {filteredZines.length} Manifestations
 </p>
 </div>
 <button 
 onClick={() => {
 setSelectedNode(null);
 setGeoBlock(null);
 }}
 className="p-2 border border-nous-border hover:bg-nous-base text-nous-subtle hover:text-nous-subtle transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 
 <div className="p-4 border-b border-nous-border bg-nous-base0/5">
 <button 
 onClick={async () => {
 if (isExtracting) return;
 setIsExtracting(true);
 const { generateGeoBlock } = await import('../services/geminiService');
 const content = filteredZines.map(z => z.content.oracular_mirror).join('\n\n');
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
 detail: { message: "Extracting structure...", type: 'info' }
 }));
 try {
 const extracted = await generateGeoBlock(content);
 if (extracted) {
 setGeoBlock(extracted);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
 detail: {
 message: `GEO Extracted: ${extracted.concepts.length} concepts, ${extracted.frameworks.length} frameworks.`,
 type: 'success'
 }
 }));
 }
 } catch (e) {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
 detail: { message: "Failed to extract structure.", type: 'error' }
 }));
 } finally {
 setIsExtracting(false);
 }
 }}
 disabled={isExtracting}
 className="w-full py-3 border border-primary text-primary hover:bg-primary hover:text-nous-base font-sans text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isExtracting ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
 {isExtracting ? 'Extracting...' : 'Extract Structure (GEO)'}
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-8 space-y-8">
 {geoBlock && (
 <div className="space-y-6 mb-8 pb-8 border-b border-nous-border">
 <h4 className="font-sans text-[10px] uppercase tracking-widest text-primary">Structured Output</h4>
 
 {geoBlock.concepts && geoBlock.concepts.length > 0 && (
 <div className="space-y-4">
 <h5 className="font-serif italic text-sm text-nous-subtle">Concepts</h5>
 {geoBlock.concepts.map((concept: any, i: number) => (
 <div key={i} className="bg-nous-base0/5 p-4 border border-nous-border">
 <span className="font-bold text-nous-text block mb-1">{concept.name}</span>
 <span className="font-mono text-[10px] text-nous-subtle">{concept.description}</span>
 </div>
 ))}
 </div>
 )}

 {geoBlock.frameworks && geoBlock.frameworks.length > 0 && (
 <div className="space-y-4">
 <h5 className="font-serif italic text-sm text-nous-subtle">Frameworks</h5>
 {geoBlock.frameworks.map((fw: any, i: number) => (
 <div key={i} className="bg-nous-base0/5 p-4 border border-nous-border">
 <span className="font-bold text-nous-text block mb-2">{fw.title}</span>
 <ul className="list-disc list-inside font-mono text-[10px] text-nous-subtle space-y-1">
 {fw.steps.map((step: string, j: number) => (
 <li key={j}>{step}</li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 )}
 
 {geoBlock.citableLines && geoBlock.citableLines.length > 0 && (
 <div className="space-y-4">
 <h5 className="font-serif italic text-sm text-nous-subtle">Citable Lines</h5>
 {geoBlock.citableLines.map((line: string, i: number) => (
 <blockquote key={i} className="border-l-2 border-primary pl-3 py-1 font-serif italic text-xs text-nous-text">
 "{line}"
 </blockquote>
 ))}
 </div>
 )}
 </div>
 )}

 {filteredZines.map(zine => (
 <div key={zine.id} className="w-full">
 <ZineCoverCard zine={zine} onClick={() => {}} />
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

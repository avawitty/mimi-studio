import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Loader2, Activity, Network, UserCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { fetchUserZines } from '../services/firebaseUtils';
import { ZineMetadata, NarrativeThread, TasteGraphNode, TasteGraphEdge } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, CartesianGrid } from 'recharts';
import { saveNarrativeThread, fetchNarrativeThreads } from '../services/firebaseUtils';
import { generateNarrativeThread, analyzeThreadPath, generateTrajectoryReadout } from '../services/geminiService';
import { ThreadPathVisualization } from './ThreadPathVisualization';

type ThreadMode = 'biographical' | 'influence' | 'emotional';

const WEAVER_CONFIG = {
 emotional: { bg: '#FDFBF7', accent: '#78716c', icon: Activity, label: 'Emotional' },
 influence: { bg: '#050510', accent: '#06B6D4', icon: Network, label: 'Influence' },
 biographical: { bg: '#080808', accent: '#A855F7', icon: UserCircle, label: 'Biography' }
};

const SegmentedControl: React.FC<{ mode: string, onChange: (mode: string) => void }> = ({ mode, onChange }) => {
 return (
 <div className="flex w-full my-8 border-b border-nous-text/10 dark:border-nous-base/10 ">
 <div className="flex items-center w-full">
 {(Object.keys(WEAVER_CONFIG) as Array<keyof typeof WEAVER_CONFIG>).map((key) => {
 const config = WEAVER_CONFIG[key];
 const isActive = mode === key;
 const Icon = config.icon;
 
 return (
 <button
 key={key}
 onClick={() => {
 if (!isActive) {
 window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'click' } }));
 onChange(key);
 }
 }}
 className={`relative flex items-center gap-3 px-6 py-3 text-[10px] font-mono uppercase tracking-[0.2em] transition-colors border-r border-nous-text/10 dark:border-nous-base/10  last:border-r-0 ${
 isActive 
 ? 'bg text dark:bg dark:text' 
 : 'text-nous-text/50 dark:text-nous-base/50 hover:text  dark:hover:text hover:bg-nous-text/5 dark:bg-nous-base/5 dark:hover:bg-nous-text/5 dark:bg-nous-base/5'
 }`}
 >
 <span className="flex items-center gap-2">
 <Icon size={12} />
 {config.label}
 </span>
 {isActive && <span className="opacity-50"> [ ACTIVE ]</span>}
 </button>
 );
 })}
 </div>
 </div>
 );
};

const TerminalTooltip = ({ active, payload, label, type }: any) => {
 if (active && payload && payload.length) {
 const data = payload[0].payload;
 const value = type === 'TONE' ? data.tone : data.motif;
 return (
 <div className="bg border border-nous-text/30 dark:border-nous-base/30 p-4 font-mono text-[10px] uppercase tracking-widest text min-w-[200px]">
 <div className="text-nous-text/50 dark:text-nous-base/50 mb-2">{'>'} EXTRACTING {type} DATA...</div>
 <div className="flex items-center gap-2 mb-2">
 <span className="text">{'>'} [ {value} ]</span>
 <span className="animate-pulse">█</span>
 </div>
 <div className="border-t border-nous-text/20 dark:border-nous-base/20 pt-2 mt-2 grid grid-cols-2 gap-2 text-[9px] text-nous-text/40 dark:text-nous-base/40">
 <div>TS: {data.date}</div>
 <div>VAL: {payload[0].value}</div>
 </div>
 </div>
 );
 }
 return null;
};

const CustomSquareDot = (props: any) => {
 const { cx, cy, stroke } = props;
 return (
 <rect x={cx - 3} y={cy - 3} width={6} height={6} fill="transparent"stroke={stroke} strokeWidth={1} />
 );
};

export const ThreadsView: React.FC = () => {
 const { user, loading: userLoading, activeThread, setActiveThread } = useUser();
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [threads, setThreads] = useState<NarrativeThread[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeMode, setActiveMode] = useState<ThreadMode>('emotional');
 const [newNote, setNewNote] = useState('');
 const [isGenerating, setIsGenerating] = useState(false);
 const [graphData, setGraphData] = useState<{ nodes: TasteGraphNode[], edges: TasteGraphEdge[] } | null>(null);
 const [trajectoryReadout, setTrajectoryReadout] = useState<string | null>(null);
 const [isAnalyzing, setIsAnalyzing] = useState(false);

 useEffect(() => {
 if (activeThread) {
 setIsAnalyzing(true);
 Promise.all([
 analyzeThreadPath(activeThread, zines),
 generateTrajectoryReadout(activeThread, zines)
 ]).then(([data, readout]) => {
 setGraphData(data);
 setTrajectoryReadout(readout);
 setIsAnalyzing(false);
 }).catch(e => {
 console.error("MIMI // Failed to analyze thread trajectory", e);
 setIsAnalyzing(false);
 });
 }
 }, [activeThread, zines]);

 useEffect(() => {
 if (userLoading) return;
 if (user?.uid) {
 setLoading(true);
 Promise.all([
 fetchUserZines(user.uid),
 fetchNarrativeThreads(user.uid)
 ]).then(([fetchedZines, fetchedThreads]) => {
 // Sort by timestamp ascending for timeline
 const sorted = fetchedZines.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
 setZines(sorted);
 setThreads(fetchedThreads);
 setLoading(false);
 }).catch(e => {
 console.error("MIMI // Failed to load threads data", e);
 setLoading(false);
 });
 } else {
 setLoading(false);
 }
 }, [user, userLoading]);

 // Emotional Thread Data (Tone mapping)
 const emotionalData = useMemo(() => {
 const toneMap: Record<string, number> = {
 'Euphoric': 5,
 'Vibrant': 4,
 'Dreamy': 3,
 'Editorial Stillness': 2,
 'Melancholic': 1,
 'Industrial': 0,
 'Noir': -1,
 'Brutalist': -2,
 'Clinical': -3,
 };

 return zines.map((zine, index) => {
 const date = new Date(zine.timestamp || Date.now());
 return {
 name: zine.content?.headlines?.[0] || zine.title || `Artifact ${index + 1}`,
 date: `${date.getMonth() + 1}/${date.getDate()}`,
 toneScore: toneMap[zine.tone] || 2, // Default to neutral/editorial
 tone: zine.tone
 };
 });
 }, [zines]);

 // Biographical Thread Data (Motif occurrences over time)
 const biographicalData = useMemo(() => {
 const data: any[] = [];
 zines.forEach((zine, index) => {
 const date = new Date(zine.timestamp || Date.now());
 const motifs = zine.content?.semiotic_signals?.map(t => t.motif) || [];
 
 motifs.forEach((motif, mIndex) => {
 data.push({
 x: index, // Timeline index
 y: mIndex % 5, // Spread vertically
 z: 1, // Size
 name: zine.content?.headlines?.[0] || zine.title,
 motif: motif,
 date: `${date.getMonth() + 1}/${date.getDate()}`
 });
 });
 });
 return data;
 }, [zines]);

 // Influence Thread Data (Top motifs distribution)
 const influenceData = useMemo(() => {
 const motifCounts: Record<string, number> = {};
 let totalMotifs = 0;
 zines.forEach(zine => {
 const motifs = zine.content?.semiotic_signals?.map(t => t.motif) || [];
 motifs.forEach(motif => {
 motifCounts[motif] = (motifCounts[motif] || 0) + 1;
 totalMotifs++;
 });
 });

 // Get top motifs
 const sortedMotifs = Object.entries(motifCounts)
 .sort((a, b) => b[1] - a[1])
 .slice(0, 8); // Top 8 for the list

 return sortedMotifs.map(([motif, count]) => ({
 subject: motif,
 count: count,
 percentage: totalMotifs > 0 ? Math.round((count / totalMotifs) * 100) : 0,
 }));
 }, [zines]);

 return (
 <div className="flex-1 overflow-y-auto bg dark:bg text-nous-text font-serif selection:bg-nous-base0/20 pb-32 custom-scrollbar">
 <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-16">
 
 {/* Header */}
 <div className="border-b border-nous-border pb-8">
 <h2 className="text-4xl md:text-5xl font-serif italic text-nous-text">Narrative Pathing</h2>
 <p className="text-nous-subtle font-sans text-[10px] uppercase tracking-[0.2em] mt-4">Semantic Paths Through Creative History</p>
 </div>

 {/* Navigation Tabs */}
 <SegmentedControl mode={activeMode} onChange={(mode) => setActiveMode(mode as ThreadMode)} />

 {/* Content Area */}
 <div className="min-h-[400px] relative">
 {loading ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-nous-text/50 dark:text-nous-base/50  space-y-4">
 <Loader2 size={24} className="animate-spin"/>
 <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Analyzing Archive...</p>
 </div>
 ) : zines.length < 2 ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-nous-text/50 dark:text-nous-base/50  space-y-4 text-center px-6">
 <Compass size={32} className="opacity-20"/>
 <p className="font-serif italic text-xl text dark:text">Insufficient Data</p>
 <p className="font-mono text-[10px] uppercase tracking-widest max-w-md">The Narrative Engine requires at least two artifacts in your archive to construct a semantic pathway.</p>
 </div>
 ) : (
 <AnimatePresence mode="wait">
 {activeMode === 'emotional' && (
 <motion.div key="emotional"initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-[400px] w-full flex flex-col">
 <div className="mb-8 border-b border-nous-text/10 dark:border-nous-base/10  pb-4 flex justify-between items-end">
 <h3 className="text-3xl italic text dark:text">Tonal Trajectory</h3>
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50 ">Telemetry Active</span>
 </div>
 <div className="flex-1 relative bg-nous-text/5 dark:bg-nous-base/5  border border-nous-text/20 dark:border-nous-base/20  p-4">
 <ResponsiveContainer width="100%"height="100%"minWidth={1} minHeight={1}>
 <LineChart data={emotionalData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
 <CartesianGrid strokeDasharray="1 4"stroke="currentColor"className="text-nous-text/20 dark:text-nous-base/20 "vertical={true} horizontal={true} />
 <XAxis dataKey="date"stroke="currentColor"className="text-nous-text/40 dark:text-nous-base/40 "tick={{ fill: 'currentColor', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ strokeWidth: 1 }} tickLine={{ strokeWidth: 1 }} tickMargin={10} />
 <YAxis stroke="currentColor"className="text-nous-text/40 dark:text-nous-base/40 "tick={{ fill: 'currentColor', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ strokeWidth: 1 }} tickLine={{ strokeWidth: 1 }} domain={[-4, 6]} tickMargin={10} />
 <Tooltip content={<TerminalTooltip type="TONE"/>} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '2 2', className: 'text-nous-text/50 dark:text-nous-base/50 ' }} />
 <Line type="linear"dataKey="toneScore"stroke="currentColor"className="text dark:text"strokeWidth={1} dot={<CustomSquareDot />} activeDot={{ r: 5, fill: 'currentColor', stroke: 'transparent', className: 'text dark:text' }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </motion.div>
 )}

 {activeMode === 'biographical' && (
 <motion.div key="biographical"initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-[400px] w-full flex flex-col">
 <div className="mb-8 border-b border-nous-text/10 dark:border-nous-base/10  pb-4 flex justify-between items-end">
 <h3 className="text-3xl italic text dark:text">Motif Constellation</h3>
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50 ">Telemetry Active</span>
 </div>
 <div className="flex-1 relative bg-nous-text/5 dark:bg-nous-base/5  border border-nous-text/20 dark:border-nous-base/20  p-4">
 <ResponsiveContainer width="100%"height="100%"minWidth={1} minHeight={1}>
 <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
 <CartesianGrid strokeDasharray="1 4"stroke="currentColor"className="text-nous-text/20 dark:text-nous-base/20 "vertical={true} horizontal={true} />
 <XAxis type="number"dataKey="x"name="Timeline"stroke="currentColor"className="text-nous-text/40 dark:text-nous-base/40 "tick={{ fill: 'currentColor', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ strokeWidth: 1 }} tickLine={{ strokeWidth: 1 }} tickMargin={10} tickFormatter={(val) => `T+${val}`} />
 <YAxis type="number"dataKey="y"name="Spread"stroke="currentColor"className="text-nous-text/40 dark:text-nous-base/40 "tick={{ fill: 'currentColor', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ strokeWidth: 1 }} tickLine={{ strokeWidth: 1 }} domain={[-1, 6]} tickMargin={10} />
 <ZAxis type="number"dataKey="z"range={[40, 120]} />
 <Tooltip 
 cursor={{ strokeDasharray: '2 2', stroke: 'currentColor', strokeWidth: 1, className: 'text-nous-text/50 dark:text-nous-base/50 ' }}
 content={<TerminalTooltip type="MOTIF"/>}
 />
 <Scatter name="Motifs"data={biographicalData} fill="currentColor"className="text dark:text"shape="cross"/>
 </ScatterChart>
 </ResponsiveContainer>
 </div>
 </motion.div>
 )}

 {activeMode === 'influence' && (
 <motion.div key="influence"initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col">
 <div className="mb-8 flex items-center justify-between border-b border-nous-text/10 dark:border-nous-base/10  pb-4">
 <h3 className="text-3xl italic text dark:text">Influence Lineage</h3>
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50 ">System Index</span>
 </div>
 <div className="w-full">
 {influenceData.length > 0 ? (
 <div className="border border-nous-text/20 dark:border-nous-base/20  bg-nous-text/5 dark:bg-nous-base/5 ">
 {/* Header Row */}
 <div className="grid grid-cols-12 border-b border-nous-text/20 dark:border-nous-base/20  font-mono text-[9px] uppercase tracking-[0.2em] text-nous-text/50 dark:text-nous-base/50 ">
 <div className="col-span-2 p-3 border-r border-nous-text/20 dark:border-nous-base/20 ">ID</div>
 <div className="col-span-4 p-3 border-r border-nous-text/20 dark:border-nous-base/20 ">Subject</div>
 <div className="col-span-2 p-3 border-r border-nous-text/20 dark:border-nous-base/20 ">Occurrences</div>
 <div className="col-span-4 p-3">Capacity Load</div>
 </div>
 
 {/* Data Rows */}
 {influenceData.map((item, idx) => (
 <div key={idx} className="grid grid-cols-12 border-b border-nous-text/10 dark:border-nous-base/10  last:border-0 hover:bg-nous-text/10 dark:bg-nous-base/10 dark:hover:bg-nous-text/10 dark:bg-nous-base/10 transition-colors">
 <div className="col-span-2 p-3 border-r border-nous-text/10 dark:border-nous-base/10  font-mono text-[10px] text-nous-text/70 dark:text-nous-base/70  flex items-center">
 IDX-{String(idx + 1).padStart(2, '0')}
 </div>
 <div className="col-span-4 p-3 border-r border-nous-text/10 dark:border-nous-base/10  font-serif italic text-sm text dark:text flex items-center truncate">
 {item.subject}
 </div>
 <div className="col-span-2 p-3 border-r border-nous-text/10 dark:border-nous-base/10  font-mono text-[10px] text-nous-text/70 dark:text-nous-base/70  flex items-center">
 {String(item.count).padStart(3, '0')}
 </div>
 <div className="col-span-4 p-3 flex items-center gap-3">
 <div className="flex-1 h-1 bg-nous-text/10 dark:bg-nous-base/10  relative overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${item.percentage}%` }}
 transition={{ duration: 1, delay: idx * 0.1, ease:"easeOut"}}
 className="absolute top-0 left-0 h-full bg dark:bg"
 />
 </div>
 <span className="font-mono text-[9px] text-nous-text/50 dark:text-nous-base/50  w-8 text-right">{item.percentage}%</span>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="py-12 border border-nous-text/20 dark:border-nous-base/20  flex flex-col items-center justify-center text-center space-y-4 bg-nous-text/5 dark:bg-nous-base/5 ">
 <Compass size={32} className="text-nous-text/30 dark:text-nous-base/30 "/>
 <p className="font-mono text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50  max-w-md">Insufficient motif data to map influence lineage. Continue creating artifacts to build your semantic graph.</p>
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 )}
 </div>

 {/* Thread Management Section */}
 <div className="border-t border-nous-text/10 dark:border-nous-base/10  pt-12">
 <h3 className="text-3xl italic text dark:text mb-8">Narrative Threads</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {/* Thread List */}
 <div className="md:col-span-1 space-y-4">
 {threads.map(thread => (
 <button
 key={thread.id}
 onClick={() => setActiveThread(activeThread?.id === thread.id ? null : thread)}
 className={`w-full text-left p-4 border ${activeThread?.id === thread.id ? 'border dark:border bg-nous-text/5 dark:bg-nous-base/5 ' : 'border-nous-text/20 dark:border-nous-base/20  hover:border-nous-text/50 dark:border-nous-base/50 dark:hover:border-nous-text/50 dark:border-nous-base/50'} transition-all`}
 >
 <h4 className="font-serif italic text-lg text dark:text">{thread.title}</h4>
 <p className="font-mono text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50  mt-2">{thread.mode}</p>
 </button>
 ))}
 <button
 onClick={() => {
 setActiveThread({
 id: Date.now().toString(),
 userId: user?.uid || '',
 title: 'New Narrative Thread',
 narrative: '',
 mode: 'emotional',
 createdAt: Date.now(),
 updatedAt: Date.now()
 });
 }}
 className="w-full p-4 border border-dashed border-nous-text/30 dark:border-nous-base/30  text-nous-text/50 dark:text-nous-base/50  font-mono text-[10px] uppercase tracking-widest hover:border dark:hover:border hover:text dark:hover:text transition-all"
 >
 + Create New Thread
 </button>
 </div>

 {/* Thread Editor */}
 <div className="md:col-span-2 space-y-4">
 {activeThread ? (
 <div className="space-y-4">
 <input
 type="text"
 value={activeThread.title}
 onChange={(e) => setActiveThread({ ...activeThread, title: e.target.value })}
 className="w-full p-2 bg-transparent border-b border-nous-text/20 dark:border-nous-base/20  font-serif text-xl italic text dark:text focus:outline-none focus:border dark:focus:border transition-colors"
 />
 <textarea
 value={activeThread.narrative}
 onChange={(e) => setActiveThread({ ...activeThread, narrative: e.target.value })}
 className="w-full p-4 bg-nous-text/5 dark:bg-nous-base/5  border border-nous-text/20 dark:border-nous-base/20  font-mono text-xs min-h-[200px] text dark:text focus:outline-none focus:border dark:focus:border transition-colors resize-y"
 placeholder="Narrative..."
 />
 <input
 type="text"
 value={activeThread.notes || ''}
 onChange={(e) => setActiveThread({ ...activeThread, notes: e.target.value })}
 className="w-full p-3 bg-transparent border border-nous-text/20 dark:border-nous-base/20  font-mono text-xs text dark:text focus:outline-none focus:border dark:focus:border transition-colors"
 placeholder="Notes for AI analysis..."
 />
 <div className="flex gap-4">
 <select
 value={activeThread.mode}
 onChange={(e) => setActiveThread({ ...activeThread, mode: e.target.value as 'emotional' | 'biographical' | 'influence' })}
 className="p-3 bg-transparent border border-nous-text/20 dark:border-nous-base/20  font-mono text-[10px] uppercase tracking-widest text dark:text focus:outline-none focus:border dark:focus:border transition-colors"
 >
 <option value="emotional">Emotional</option>
 <option value="biographical">Biographical</option>
 <option value="influence">Influence</option>
 </select>
 </div>
 {isAnalyzing ? (
 <div className="flex items-center justify-center h-[400px] text-nous-text/50 dark:text-nous-base/50  font-mono text-[10px] uppercase tracking-widest">
 <Loader2 size={24} className="animate-spin"/>
 <span className="ml-2">Analyzing path...</span>
 </div>
 ) : graphData && (
 <div className="space-y-4">
 <div className="border border-nous-text/20 dark:border-nous-base/20  bg-nous-text/5 dark:bg-nous-base/5 ">
 <ThreadPathVisualization nodes={graphData.nodes} edges={graphData.edges} />
 </div>
 {trajectoryReadout && (
 <div className="p-6 bg-nous-text/5 dark:bg-nous-base/5  border border-nous-text/20 dark:border-nous-base/20  space-y-4">
 <div className="flex justify-between items-end border-b border-nous-text/10 dark:border-nous-base/10  pb-4">
 <h4 className="font-serif italic text-xl text dark:text">Trajectory Readout</h4>
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-text/50 dark:text-nous-base/50 ">System Output</span>
 </div>
 <p className="font-mono text-xs text-nous-text/70 dark:text-nous-base/70  leading-relaxed">
 {trajectoryReadout}
 </p>
 <button
 onClick={() => window.dispatchEvent(new CustomEvent('mimi:nav', { detail: 'studio' }))}
 className="text-[10px] font-mono uppercase tracking-widest text dark:text hover:opacity-70 transition-opacity flex items-center gap-2 mt-4"
 >
 Draft in Studio <Compass size={14} />
 </button>
 </div>
 )}
 </div>
 )}
 <div className="flex gap-4 pt-4 border-t border-nous-text/10 dark:border-nous-base/10 ">
 <button
 onClick={async () => {
 if (activeThread && user?.uid) {
 try {
 await saveNarrativeThread({ ...activeThread, updatedAt: Date.now() });
 const updatedThreads = await fetchNarrativeThreads(user.uid);
 setThreads(updatedThreads);
 } catch (e) {
 console.error("MIMI // Failed to save thread", e);
 }
 }
 }}
 className="px-6 py-3 bg text dark:bg dark:text font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
 >
 Save Thread
 </button>
 <button
 onClick={async () => {
 setIsGenerating(true);
 try {
 const newNarrative = await generateNarrativeThread(activeThread.narrative, threads);
 setActiveThread({ ...activeThread, narrative: activeThread.narrative + '\n\n' + newNarrative });
 } catch (e) {
 console.error("MIMI // Failed to generate continuation", e);
 } finally {
 setIsGenerating(false);
 }
 }}
 disabled={isGenerating}
 className="px-6 py-3 border border dark:border text dark:text font-mono text-[10px] uppercase tracking-widest hover:bg-nous-text/5 dark:bg-nous-base/5 dark:hover:bg-nous-text/5 dark:bg-nous-base/5 transition-colors disabled:opacity-50"
 >
 {isGenerating ? 'Generating...' : 'Generate Continuation'}
 </button>
 </div>
 </div>
 ) : (
 <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-nous-text/50 dark:text-nous-base/50  font-mono text-[10px] uppercase tracking-widest border border-dashed border-nous-text/20 dark:border-nous-base/20  bg-nous-text/5 dark:bg-nous-base/5 ">
 <Compass size={32} className="mb-4 opacity-50"/>
 Select or create a thread to begin.
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

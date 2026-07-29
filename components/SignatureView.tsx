import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { fetchUserZines } from '../services/firebaseUtils';
import { generateSignature } from '../services/signatureService';
import { AestheticSignature } from '../types';
import { SignatureImageGenerator } from './SignatureImageGenerator';
import { Share2, Download, Fingerprint, Activity, GitCommit, Layers, Hexagon, Triangle, Circle, Square, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts';
import * as htmlToImage from 'html-to-image';
import { truncateUid } from '../lib/privacyUtils';

const SignatureSkeleton = () => (
 <div className="flex-1 overflow-y-auto bg dark:bg text-nous-text font-serif pb-32 custom-scrollbar">
 <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-16 animate-pulse">
 
 {/* Header Skeleton */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-nous-border pb-8">
 <div>
 <div className="h-16 w-64 bg-stone-200 mb-4"></div>
 <div className="h-4 w-48 bg-stone-200"></div>
 </div>
 <div className="flex items-center gap-3">
 <div className="h-10 w-32 bg-stone-200"></div>
 <div className="h-10 w-32 bg-stone-200"></div>
 </div>
 </div>

 {/* Top Section Skeleton */}
 <div className="grid md:grid-cols-12 gap-8 mt-12">
 {/* DNA Card Skeleton */}
 <div className="md:col-span-5">
 <div className="bg-nous-base border border-nous-border p-8 h-[400px]">
 <div className="flex justify-between items-start mb-12">
 <div>
 <div className="h-8 w-48 bg-stone-200 mb-2"></div>
 <div className="h-3 w-32 bg-stone-200"></div>
 </div>
 <div className="h-8 w-8 bg-stone-200"></div>
 </div>
 <div className="space-y-8">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="h-3 w-20 bg-stone-200 mb-2"></div>
 <div className="h-6 w-32 bg-stone-200"></div>
 </div>
 <div>
 <div className="h-3 w-20 bg-stone-200 mb-2"></div>
 <div className="h-6 w-32 bg-stone-200"></div>
 </div>
 </div>
 <div>
 <div className="h-3 w-24 bg-stone-200 mb-2"></div>
 <div className="flex gap-2">
 <div className="h-6 w-16 bg-stone-200"></div>
 <div className="h-6 w-20 bg-stone-200"></div>
 <div className="h-6 w-16 bg-stone-200"></div>
 </div>
 </div>
 </div>
 </div>
 </div>
 {/* Image Gen Skeleton */}
 <div className="md:col-span-7">
 <div className="bg-stone-200 w-full h-[400px]"></div>
 </div>
 </div>
 </div>
 </div>
);

export const SignatureView: React.FC = () => {
 const { user, profile, updateProfile, activePersona } = useUser();
 const [signature, setSignature] = useState<AestheticSignature | null>(null);
 const [loading, setLoading] = useState(true);
 const dnaCardRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const init = async () => {
 if (!user) return;
 
 if (profile?.tasteProfile?.aestheticSignature) {
 setSignature(profile.tasteProfile.aestheticSignature);
 setLoading(false);
 return;
 }

 try {
 const zines = await fetchUserZines(user.uid);
 console.info("MIMI // SignatureView: Fetched zines:", zines);
 if (zines.length > 0) {
 const sig = await generateSignature(zines, activePersona?.tailorDraft || null);
 console.info("MIMI // SignatureView: Generated signature:", sig);
 setSignature(sig);
 if (profile) {
 await updateProfile({
 ...profile,
 tasteProfile: {
 ...profile.tasteProfile!,
 aestheticSignature: sig
 }
 });
 }
 } else {
 console.info("MIMI // SignatureView: No zines found.");
 }
 } catch (error) {
 console.error("MIMI // SignatureView: Error generating signature:", error);
 } finally {
 setLoading(false);
 }
 };
 init();
 }, [user, profile, updateProfile, activePersona]);

 const handleExport = async (format: 'plate' | 'story' = 'plate') => {
 if (!dnaCardRef.current) return;
 try {
 const dataUrl = await htmlToImage.toPng(dnaCardRef.current, {
 quality: 1,
 pixelRatio: 2,
 fontEmbedCSS: '',
 });

 if (format === 'plate') {
 const link = document.createElement('a');
 link.download = 'mimi-signature-plate.png';
 link.href = dataUrl;
 link.click();
 return;
 }

 // Story crop — center the DNA plate into a 9:16 canvas.
 const img = new Image();
 img.crossOrigin = 'anonymous';
 await new Promise<void>((resolve, reject) => {
 img.onload = () => resolve();
 img.onerror = () => reject(new Error('Failed to load signature plate'));
 img.src = dataUrl;
 });
 const W = 1080;
 const H = 1920;
 const canvas = document.createElement('canvas');
 canvas.width = W;
 canvas.height = H;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;
 ctx.fillStyle = '#FDFBF7';
 ctx.fillRect(0, 0, W, H);
 // Column rules for share-card language
 ctx.strokeStyle = 'rgba(0,0,0,0.06)';
 ctx.lineWidth = 1;
 for (let i = 1; i < 8; i++) {
 const x = (W / 8) * i;
 ctx.beginPath();
 ctx.moveTo(x, 0);
 ctx.lineTo(x, H);
 ctx.stroke();
 }
 const maxW = W * 0.86;
 const maxH = H * 0.55;
 const scale = Math.min(maxW / img.width, maxH / img.height);
 const dw = img.width * scale;
 const dh = img.height * scale;
 const dx = (W - dw) / 2;
 const dy = H * 0.22;
 ctx.drawImage(img, dx, dy, dw, dh);
 ctx.fillStyle = '#1A1A1A';
 ctx.font = 'italic 42px Georgia, serif';
 ctx.textAlign = 'center';
 ctx.fillText('Signature', W / 2, dy - 48);
 ctx.font = '11px monospace';
 ctx.fillStyle = '#78716c';
 const handleLabel = profile?.handle ? `@${profile.handle}` : 'mimi.you';
 ctx.fillText(handleLabel.toUpperCase(), W / 2, dy + dh + 56);
 const storyUrl = canvas.toDataURL('image/png');
 const link = document.createElement('a');
 link.download = 'mimi-signature-story.png';
 link.href = storyUrl;
 link.click();
 } catch (err) {
 console.error('Failed to export signature', err);
 }
 };

 const handleCopyShareLink = async () => {
 const handle = profile?.handle;
 const url = handle
 ? `${window.location.origin}/u/${handle}`
 : `${window.location.origin}/signature`;
 try {
 await navigator.clipboard.writeText(url);
 window.dispatchEvent(
 new CustomEvent('mimi:toast', {
 detail: { message: 'Share link copied', type: 'success' },
 }),
 );
 } catch {
 window.prompt('Copy share link', url);
 }
 };

 if (loading) return <SignatureSkeleton />;

 if (!signature) {
 return (
 <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full bg dark:bg">
 <Fingerprint size={48} className="text-nous-subtle mb-6"/>
 <h2 className="font-serif italic text-3xl text-nous-text mb-2">No Signature Found</h2>
 <p className="text-nous-subtle max-w-md mb-6">Your archive is currently empty. Create more artifacts in the Studio to generate your aesthetic fingerprint.</p>
 <button 
 onClick={async () => {
 if (!user) return;
 setLoading(true);
 try {
 const zines = await fetchUserZines(user.uid, true);
 if (zines.length > 0) {
 const sig = await generateSignature(zines, activePersona?.tailorDraft || null);
 setSignature(sig);
 if (profile) {
 await updateProfile({
 ...profile,
 tasteProfile: {
 ...profile.tasteProfile!,
 aestheticSignature: sig
 }
 });
 }
 } else {
 alert("You need to create at least one zine first.");
 }
 } catch (error) {
 console.error("MIMI // SignatureView: Error generating signature:", error);
 } finally {
 setLoading(false);
 }
 }}
 className="px-6 py-3 bg-nous-base text-nous-text text-xs uppercase tracking-widest hover:bg-nous-base dark:hover:bg-stone-200 transition-colors font-mono font-bold"
 >
 [ COMPILE DOSSIER ]
 </button>
 </div>
 );
 }

 return (
 <div className="flex-1 overflow-y-auto bg dark:bg text-nous-text font-serif selection:bg-nous-base0/20 pb-32 custom-scrollbar">
 <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-16">
 
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-nous-border pb-8">
 <div>
 <h1 className="text-5xl md:text-7xl font-light italic tracking-tight">Signature</h1>
 <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-nous-subtle mt-4">Aesthetic Fingerprint & Lineage</p>
 {activePersona?.tailorDraft && (
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mt-2 flex items-center gap-1">
 <Sparkles size={10} /> Signature influenced by active Tailor Directives
 </p>
 )}
 </div>
 <div className="flex items-center gap-3 flex-wrap">
 <button 
 onClick={async () => {
 if (!user) return;
 setLoading(true);
 try {
 const zines = await fetchUserZines(user.uid, true);
 if (zines.length > 0) {
 const sig = await generateSignature(zines, activePersona?.tailorDraft || null);
 setSignature(sig);
 if (profile) {
 await updateProfile({
 ...profile,
 tasteProfile: {
 ...profile.tasteProfile!,
 aestheticSignature: sig
 }
 });
 }
 } else {
 alert("You need to create at least one zine first.");
 }
 } catch (error) {
 console.error("MIMI // SignatureView: Error generating signature:", error);
 } finally {
 setLoading(false);
 }
 }}
 className="px-4 py-2 bg-nous-base text-nous-text font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-nous-base dark:hover:bg-stone-200 transition-colors"
 >
 [ EXECUTE RE-SYNC ]
 </button>
 <button
 onClick={() => handleExport('plate')}
 className="flex items-center gap-2 px-4 py-2 border border-nous-border font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-stone-200 transition-colors"
 >
 <Download size={14} />
 Plate PNG
 </button>
 <button
 onClick={() => handleExport('story')}
 className="flex items-center gap-2 px-4 py-2 border border-nous-border font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-stone-200 transition-colors"
 >
 <Share2 size={14} />
 Story 9:16
 </button>
 <button
 onClick={() => void handleCopyShareLink()}
 className="flex items-center gap-2 px-4 py-2 border border-nous-border font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-stone-200 transition-colors"
 >
 Link
 </button>
 </div>
 </div>

 {/* Top Section: DNA Card & Image Gen */}
 <div className="grid md:grid-cols-12 gap-8 mt-12">
 
 {/* Aesthetic DNA Card (Exportable) */}
 <div className="md:col-span-5 relative group">
 <div 
 ref={dnaCardRef}
 className="bg-nous-base border border-nous-border p-8 relative overflow-hidden"
 >
 {/* Card Background Texture */}
 <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"style={{ backgroundImage:"url('https://www.transparenttextures.com/patterns/noise.png')"}} />
 
 <div className="flex justify-between items-start mb-12 relative z-10">
 <div>
 <h2 className="text-3xl italic font-light">Aesthetic DNA</h2>
 <p className="font-sans text-[8px] uppercase tracking-[0.2em] text-nous-subtle mt-1">Mimi Intelligence Output</p>
 </div>
 <Fingerprint className="text-nous-subtle/50"size={32} />
 </div>

 <div className="space-y-8 relative z-10">
  {profile?.aestheticDNA ? (
   <div className="space-y-6">
    <div>
     <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-1">DNA Statement</p>
     <p className="text-xl italic text-white">{profile.aestheticDNA.dnaStatement}</p>
    </div>

    {profile.aestheticDNA.axisBreakdown && (
     <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(profile.aestheticDNA.axisBreakdown).map(([key, value]) => (
       <div key={key} className="flex justify-between border-b border-white/5 pb-1">
        <span className="font-mono text-[8px] uppercase text-nous-subtle">{key}</span>
        <span className="font-serif italic text-[10px] text-white/80">{value}</span>
       </div>
      ))}
     </div>
    )}

    <div>
     <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-2">Archetypes</p>
     <div className="flex flex-wrap gap-1">
      {profile.aestheticDNA.archetypes.map((arch, i) => (
       <span key={i} className="px-1.5 py-0.5 border border-white/10 text-white font-mono text-[8px] uppercase">
        {arch}
       </span>
      ))}
     </div>
    </div>

    <div className="pt-4 border-t border-white/5">
     <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-2">Poetic Expansion</p>
     <p className="font-serif text-[11px] italic text-white/70 leading-relaxed">
      {profile.aestheticDNA.poeticExpansion}
     </p>
    </div>
   </div>
  ) : (
   <>
    <div className="grid grid-cols-2 gap-4">
     <div>
      <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-1">Primary Axis</p>
      <p className="text-lg italic text-nous-subtle">{signature.primaryAxis}</p>
     </div>
     <div>
      <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-1">Secondary Axis</p>
      <p className="text-lg italic text-indigo-600 dark:text-indigo-400">{signature.secondaryAxis}</p>
     </div>
    </div>

    <div>
     <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-2">Core Motifs</p>
     <div className="flex flex-wrap gap-2">
      {signature.motifs.map((m, i) => (
       <span key={i} className="px-2 py-1 bg-nous-base border border-nous-border font-mono text-[9px] uppercase text-nous-subtle">
        {m}
       </span>
      ))}
     </div>
    </div>

    <div>
     <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-1">Mood Cluster</p>
     <p className="text-xl italic text-nous-text">{signature.moodCluster}</p>
    </div>
   </>
  )}

 {/* Material & Semantic Blueprint */}
 <div className="pt-6 border-t border-nous-border">
 <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] text-nous-subtle mb-4">Material & Semantic Blueprint</h3>
 
 <div className="space-y-4">
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-2">Palette Extraction</p>
 <div className="flex flex-wrap gap-4">
 {signature.paletteExtraction?.map((hex, i) => (
 <div key={i} className="flex items-center gap-3 border border-nous-border p-2 bg-nous-base ">
 <div className="w-8 h-8 border border-nous-border"style={{ backgroundColor: hex }} />
 <div className="flex flex-col">
 <span className="font-mono text-[10px] uppercase tracking-widest text-nous-text font-bold">{hex}</span>
 <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">Swatch {i + 1}</span>
 </div>
 </div>
 )) || (
 <span className="font-mono text-[9px] text-nous-subtle">Awaiting Extraction...</span>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-2">Tactile Bias</p>
 <div className="border border-nous-border p-3 bg-nous-base  h-full flex flex-col gap-2">
 {signature.tactileBias ? (
 <>
 <div>
 <span className="font-mono text-[8px] text-nous-subtle block mb-0.5">DOMINANT</span>
 <span className="font-mono text-[10px] text-nous-subtle uppercase">{signature.tactileBias.dominant}</span>
 </div>
 <div>
 <span className="font-mono text-[8px] text-nous-subtle block mb-0.5">SECONDARY</span>
 <span className="font-mono text-[10px] text-nous-subtle uppercase">{signature.tactileBias.secondary}</span>
 </div>
 </>
 ) : (
 <p className="font-mono text-[10px] text-nous-subtle uppercase leading-relaxed">Awaiting...</p>
 )}
 </div>
 </div>
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-2">Typographic Pairing</p>
 <div className="border border-nous-border p-3 bg-nous-base  h-full flex flex-col gap-2">
 {signature.typographicPairing ? (
 <>
 <div>
 <span className="font-mono text-[8px] text-nous-subtle block mb-0.5">SERIF</span>
 <span className="font-mono text-[10px] text-nous-subtle uppercase">{signature.typographicPairing.serif}</span>
 </div>
 <div>
 <span className="font-mono text-[8px] text-nous-subtle block mb-0.5">SANS</span>
 <span className="font-mono text-[10px] text-nous-subtle uppercase">{signature.typographicPairing.sans}</span>
 </div>
 </>
 ) : (
 <p className="font-mono text-[10px] text-nous-subtle uppercase leading-relaxed">Awaiting...</p>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="pt-6 border-t border-nous-border flex justify-between items-center">
 <div className="font-mono text-[8px] text-nous-subtle">
 ID: {truncateUid(user?.uid).toUpperCase()}
 </div>
 <div className="font-mono text-[8px] text-nous-subtle">
 {new Date(signature.generatedAt).toLocaleDateString()}
 </div>
 </div>
 </div>
 </div>

 {/* Prompt Matrix */}
 <div className="mt-8 bg border border-nous-border p-6 text-nous-subtle">
 <div className="flex items-center gap-2 mb-4">
 <Sparkles size={14} className="text-indigo-400"/>
 <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-nous-subtle">Algorithmic Translation (Prompt Matrix)</h3>
 </div>
 <div className="bg-black border border-nous-border p-4 relative group">
 <pre className="font-mono text-[10px] whitespace-pre-wrap leading-relaxed text-nous-subtle">
 {signature.promptMatrix ? (
 signature.promptMatrix.map((prompt, i) => (
 <div key={i} className="mb-4 last:mb-0">
 <span className="text-indigo-400 font-bold">[{i + 1}]</span> {prompt}
 </div>
 ))
 ) : (
 'Awaiting Synthesis...'
 )}
 </pre>
 <button 
 onClick={() => {
 navigator.clipboard.writeText(signature.promptMatrix?.join('\n\n') || '').catch(e => console.error("MIMI // Clipboard error", e));
 // Optional: add a toast here
 }}
 className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-nous-base text-nous-text px-2 py-1 font-mono text-[8px] uppercase tracking-widest border border-nous-border hover:bg-stone-700"
 >
 Copy
 </button>
 </div>
 </div>

 {/* Influence Lineage (Moved here) */}
 <div className="mt-8 space-y-6 pt-8 border-t border-nous-border">
 <div className="flex items-center gap-3 mb-6">
 <GitCommit className="text-indigo-500"size={20} />
 <h3 className="text-2xl italic">Influence Lineage</h3>
 </div>
 
 <div className="grid gap-4">
 {signature.influenceLineage.map((item, idx) => (
 <div key={idx} className="bg-white/50 /50 border border-nous-border p-4 flex items-center justify-between group hover:border-indigo-500/50 transition-colors">
 <div>
 <h4 className="font-serif text-lg text-nous-text">{item.artist}</h4>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle">{item.movement}</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="w-32 h-1 bg-stone-200 relative overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${item.connectionStrength * 100}%` }}
 transition={{ duration: 1, delay: idx * 0.2 }}
 className="absolute top-0 left-0 h-full bg-indigo-500"
 />
 </div>
 <span className="font-mono text-xs text-nous-subtle w-8 text-right">
 {isNaN(item.connectionStrength) ? 0 : Math.round(item.connectionStrength * 100)}%
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>

 </div>

 {/* Image Generation */}
 <div className="md:col-span-7">
 <SignatureImageGenerator signature={signature} />
 </div>
 </div>

 {/* Bottom Section: Charts */}
 <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-nous-border">
 
 {/* Creative Cycles */}
 <div className="space-y-6 min-h-[300px]">
 <div className="flex items-center gap-3">
 <Activity className="text-rose-500"size={20} />
 <h3 className="text-2xl italic">Creative Cycles</h3>
 </div>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-6">Output volume & mood patterns</p>
 
 <div className="h-[300px] w-full bg-white/30 /30 border border-nous-border p-4">
 <ResponsiveContainer width="100%"height="100%"minWidth={1} minHeight={1}>
 <AreaChart data={signature.creativeCycles} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <defs>
 <linearGradient id="colorOutput"x1="0"y1="0"x2="0"y2="1">
 <stop offset="5%"stopColor="#f43f5e"stopOpacity={0.3}/>
 <stop offset="95%"stopColor="#f43f5e"stopOpacity={0}/>
 </linearGradient>
 </defs>
 <XAxis dataKey="period"stroke="#78716c"tick={{ fill: '#a8a29e', fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis stroke="#78716c"tick={{ fill: '#a8a29e', fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip 
 contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #292524', borderRadius: '0px' }}
 itemStyle={{ color: '#f43f5e', fontFamily: 'monospace', fontSize: '12px' }}
 labelStyle={{ color: '#a8a29e', fontFamily: 'serif', fontStyle: 'italic', marginBottom: '4px' }}
 />
 <Area type="monotone"dataKey="outputCount"stroke="#f43f5e"fillOpacity={1} fill="url(#colorOutput)"/>
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Motif Frequency Analyzer */}
 <div className="space-y-6 min-h-[300px]">
 <div className="flex items-center gap-3">
 <Layers className="text-nous-subtle"size={20} />
 <h3 className="text-2xl italic">Motif Frequency</h3>
 </div>
 <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-6">Evolution of recurring visual elements</p>
 
 <div className="h-[300px] w-full bg-white/30 /30 border border-nous-border p-4">
 <ResponsiveContainer width="100%"height="100%"minWidth={1} minHeight={1}>
 <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <XAxis 
 type="number"
 dataKey="date"
 domain={['auto', 'auto']} 
 tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
 stroke="#78716c"
 tick={{ fill: '#a8a29e', fontSize: 10 }} 
 axisLine={false} 
 tickLine={false} 
 />
 <YAxis 
 type="category"
 dataKey="motif"
 stroke="#78716c"
 tick={{ fill: '#a8a29e', fontSize: 10 }} 
 axisLine={false} 
 tickLine={false} 
 width={80}
 />
 <ZAxis type="number"dataKey="frequency"range={[20, 200]} />
 <Tooltip 
 cursor={{ strokeDasharray: '3 3' }}
 contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #292524', borderRadius: '0px' }}
 formatter={(value: any, name: any, props: any) => {
 if (name === 'frequency') return [value, 'Frequency'];
 return [];
 }}
 labelFormatter={(label) => new Date(label).toLocaleDateString()}
 />
 <Scatter name="Motifs"data={signature.motifEvolution} fill="#10b981"opacity={0.6} />
 </ScatterChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Motif Relationships */}
 <div className="pt-8 border-t border-nous-border">
 <h3 className="text-2xl italic mb-6">Motif Relationships</h3>
 <div className="bg-nous-base dark:bg border border-nous-border p-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-6">
 {signature.motifs.map((m, i) => (
 <div key={m} className="flex items-center gap-8">
 <span className={`font-mono text-[10px] uppercase tracking-widest ${i % 2 === 0 ? 'text-nous-subtle 0' : 'text-nous-subtle '}`}>
 {m}
 </span>
 {i < signature.motifs.length - 1 && (
 <div className="w-8 h-[1px] bg-stone-300"/>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

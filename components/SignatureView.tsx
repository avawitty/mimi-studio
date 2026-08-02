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
import { SignaturePlate } from './signature/SignaturePlate';
import { PublicField, PublicCTA } from './public-face';
import { PressReveal } from './motion/PressReveal';
import { getApprovedUsedContext } from '../services/usedContextService';

const SignatureSkeleton = () => (
 <div className="flex-1 overflow-y-auto bg dark:bg text-nous-text font-serif pb-20 md:pb-28 custom-scrollbar">
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
 ctx.fillStyle = '#FFFFFF';
 ctx.fillRect(0, 0, W, H);
 // Column rules for share-card language
 ctx.strokeStyle = 'rgba(10,10,10,0.08)';
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
 ctx.fillStyle = '#0A0A0A';
 ctx.font = 'italic 42px "Cormorant Garamond", Georgia, serif';
 ctx.textAlign = 'center';
 ctx.fillText('Mimi', W / 2, dy - 48);
 ctx.font = '11px "Geist Variable", sans-serif';
 ctx.fillStyle = '#78716c';
 const handleLabel = profile?.handle ? `@${profile.handle}` : 'Signature';
 ctx.fillText(handleLabel, W / 2, dy + dh + 56);
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
 <PublicField className="flex-1 overflow-y-auto font-serif selection:bg-black/5 pb-16 md:pb-24 custom-scrollbar">
 <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12 md:space-y-16">
 
 <PressReveal>
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--mimi-hairline)] pb-8">
 <div className="space-y-3">
 <h1 className="text-4xl md:text-7xl font-light italic tracking-tight text-[var(--mimi-ink)]">Signature</h1>
 <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[var(--mimi-stone)]">Collectible aesthetic plate</p>
 {activePersona?.tailorDraft && (
 <p className="font-sans text-[10px] uppercase tracking-widest text-[var(--mimi-stone)] mt-2 flex items-center gap-1">
 <Sparkles size={10} /> Influenced by active Tailor directives
 </p>
 )}
 </div>
 <div className="flex items-center gap-3 flex-wrap">
 <PublicCTA
 variant="ghost"
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
 console.error("Mimi // SignatureView: Error generating signature:", error);
 } finally {
 setLoading(false);
 }
 }}
 >
 Re-sync
 </PublicCTA>
 <PublicCTA variant="ghost" onClick={() => handleExport('plate')}>
 <Download size={14} /> Plate PNG
 </PublicCTA>
 <PublicCTA onClick={() => handleExport('story')}>
 <Share2 size={14} /> Story 9:16
 </PublicCTA>
 <button
 type="button"
 onClick={() => void handleCopyShareLink()}
 className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)]"
 >
 Link
 </button>
 </div>
 </div>
 </PressReveal>

 {/* Collectible plate first — DNA/charts remain back matter */}
 <div className="grid md:grid-cols-12 gap-8 mt-12">
 <div className="md:col-span-5 relative group">
 <SignaturePlate
 ref={dnaCardRef}
 signature={signature}
 handle={profile?.handle}
 approvedAtomCount={getApprovedUsedContext(undefined, user?.uid || profile?.uid).length}
 />
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
 </PublicField>
 );
};

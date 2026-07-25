// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToUserZines, subscribeToCommunityZines, getUserProfile } from '../services/firebaseUtils';
import { getLocalZines } from '../services/localArchive';
import { fetchFollowing, Connection } from '../services/connections';
import { ZineMetadata, ToneTag, UserProfile } from '../types';
import { useUser } from '../contexts/UserContext';
import { Archive, Search, Hash, X, Eye, Folder, Loader2, Radio, Zap, Wind, Ghost, Star, Info, Layers, Target, Compass, Sparkles, User, Network, BrainCircuit, LayoutGrid, Maximize2 } from 'lucide-react';
import { VibeGraph } from './VibeGraph';
import { PublicProfileModal } from './PublicProfileModal';
import { generateEditorialBrief } from '../services/geminiService';
import { archiveManager } from '../services/archiveManager';

const TONE_MAP: Record<ToneTag, { bg: string, text: string, accent: string }> = {
 'Cinematic Witness': { bg: 'bg', text: 'text-nous-text', accent: 'border-nous-border' },
 'Editorial Stillness': { bg: 'bg', text: 'text', accent: 'border-nous-border' },
 'Romantic Interior': { bg: 'bg', text: 'text-rose-950', accent: 'border-rose-100' },
 'Structured Desire': { bg: 'bg', text: 'text-white', accent: 'border-red-900' },
 'Documentary B&W': { bg: 'bg-stone-300', text: 'text-nous-text', accent: 'border-nous-border' },
 'chic': { bg: 'bg', text: 'text-nous-text', accent: 'border-nous-border' },
 'nostalgia': { bg: 'bg', text: 'text-amber-950', accent: 'border-amber-200' },
 'dream': { bg: 'bg', text: 'text-rose-900', accent: 'border-rose-100' },
 'panic': { bg: 'bg-black', text: 'text-red-500', accent: 'border-red-600' },
 'unhinged': { bg: 'bg', text: 'text-green-400', accent: 'border-indigo-500' },
 'editorial': { bg: 'bg-white', text: 'text-black', accent: 'border-nous-border' }
};

const ArchiveCloudNebula: React.FC<{ onSelectZine: (zine: ZineMetadata) => void, onGenerateThreadZine?: (thread: any) => void }> = ({ onSelectZine, onGenerateThreadZine }) => {
 const { user, profile, toggleZineStar } = useUser();
 const [localZines, setLocalZines] = useState<ZineMetadata[]>([]);
 const [cloudZines, setCloudZines] = useState<ZineMetadata[]>([]);
 const [communityZines, setCommunityZines] = useState<ZineMetadata[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [activeTag, setActiveTag] = useState<string | null>(null);
 const [nebulaMode, setNebulaMode] = useState<'strategist' | '' | 'starred' | 'network' | 'vibe'>('strategist');
 const [showcaseMode, setShowcaseMode] = useState<'bento' | 'dossier' | 'minimalist'>('dossier');
 const [followingProfiles, setFollowingProfiles] = useState<UserProfile[]>([]);
 const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
 const [analysis, setAnalysis] = useState<any>(null);
 const [isAnalyzing, setIsAnalyzing] = useState(false);

 const handleAnalyze = async () => {
 setIsAnalyzing(true);
 try {
 const result = await generateEditorialBrief(filteredZines, profile);
 setAnalysis(result);
 } catch (e) {
 console.error(e);
 } finally {
 setIsAnalyzing(false);
 }
 };

 useEffect(() => {
 // 1. Subscribe to Real-time Community Feed
 const unsubCommunity = subscribeToCommunityZines(setCommunityZines);
 
 let unsubUser = () => {};
 
 // 2. Load Personal Data with Real-time Sync
 const loadPersonal = async () => {
 setLoading(true);
 const local = await getLocalZines() || [];
 setLocalZines(local.filter(z => z && z.id && z.content));
 
 if (user && !user.isAnonymous) {
 unsubUser = subscribeToUserZines(user.uid, (data) => {
 setCloudZines(data.filter(z => z && z.id && z.content));
 setLoading(false);
 });
 
 // Load network
 try {
 const connections = await fetchFollowing(user.uid);
 const profiles = await Promise.all(connections.map(c => getUserProfile(c.followingId)));
 setFollowingProfiles(profiles.filter(Boolean) as UserProfile[]);
 } catch (e) {
 console.error("Failed to load network", e);
 }
 } else {
 setLoading(false);
 }
 };
 loadPersonal();

 return () => {
 unsubCommunity();
 unsubUser();
 };
 }, [user]);

 const allZines = useMemo(() => {
 if (nebulaMode === 'community') {
 return communityZines;
 }
 // Merge personal sources
 const mergedPersonal = [...localZines, ...cloudZines];
 const uniquePersonal = Array.from(new Map(mergedPersonal.map(item => [item.id, item])).values());
 
 const baseSet = uniquePersonal;

 return baseSet;
 }, [localZines, cloudZines, communityZines, nebulaMode, profile?.starredZineIds]);

 const filteredZines = useMemo(() => {
 return allZines.filter(zine => {
 if (nebulaMode === 'starred' && !profile?.starredZineIds?.includes(zine.id)) return false;
 const tags = Array.isArray(zine.content?.tags) ? zine.content.tags : [];
 const zineTags = [...tags, zine.tone];
 const matchesTag = !activeTag || zineTags.includes(activeTag);
 const searchLower = searchQuery.toLowerCase();
 const matchesSearch = !searchQuery || 
 zine.title.toLowerCase().includes(searchLower) ||
 zineTags.some(t => t && typeof t === 'string' && t.toLowerCase().includes(searchLower));
 return matchesTag && matchesSearch;
 });
 }, [allZines, searchQuery, activeTag, nebulaMode, profile?.starredZineIds]);

 return (
 <div className="flex-1 w-full h-full flex flex-col items-center overflow-y-auto no-scrollbar pb-64 px-6 md:px-16 pt-12 md:pt-20 bg-nous-base transition-colors duration-1000">
 <div className="w-full max-w-7xl space-y-12">
 <header className="flex flex-col border-b border-nous-border pb-12 gap-8">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Archive size={16} />
 <span className="font-sans text-[8px] uppercase tracking-[0.5em] font-black italic">Sovereign Registry // Your Public Storefront</span>
 </div>
 <h2 className="font-serif text-6xl md:text-8xl italic tracking-tighter text-nous-text  leading-none luminescent-text">Your Stand.</h2>
 </div>
 <div className="flex flex-col gap-2">
 <div className="flex items-center gap-0 bg-white border border-nous-border rounded-none overflow-hidden">
 <button 
 onClick={() => setNebulaMode('strategist')}
 className={`flex items-center gap-3 px-6 md:px-8 py-3 transition-all ${nebulaMode === 'strategist' ? 'bg-nous-base text-nous-text' : 'text-nous-subtle hover:text-nous-subtle'}`}
 >
 <Wind size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">My Archive</span>
 </button>
 <div className="w-px h-8 bg-stone-200"/>
 <button 
 onClick={() => setNebulaMode('community')}
 className={`flex items-center gap-3 px-6 md:px-8 py-3 transition-all ${nebulaMode === 'community' ? 'bg-indigo-500 text-white' : 'text-nous-subtle hover:text-nous-subtle'}`}
 >
 <Compass size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Community Feed</span>
 </button>
 <div className="w-px h-8 bg-stone-200"/>
 <button 
 onClick={() => setNebulaMode('vibe')}
 className={`flex items-center gap-3 px-6 md:px-8 py-3 transition-all ${nebulaMode === 'vibe' ? 'bg-nous-base0 text-white' : 'text-nous-subtle hover:text-nous-subtle'}`}
 >
 <Network size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Vibe</span>
 </button>
 <div className="w-px h-8 bg-stone-200"/>
 <button 
 onClick={() => setNebulaMode('network')}
 className={`flex items-center gap-3 px-6 md:px-8 py-3 transition-all ${nebulaMode === 'network' ? 'bg-indigo-500 text-white' : 'text-nous-subtle hover:text-nous-subtle'}`}
 >
 <Radio size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Network</span>
 </button>
 <div className="w-px h-8 bg-stone-200"/>
 <button 
 onClick={handleAnalyze}
 disabled={isAnalyzing}
 className={`flex items-center gap-3 px-6 md:px-8 py-3 transition-all ${isAnalyzing ? 'bg-nous-base0 text-white' : 'text-nous-subtle hover:text-nous-text '}`}
 >
 {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <BrainCircuit size={14} />}
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Analyze</span>
 </button>
 </div>
 </div>
 </div>

 <div className="hidden md:grid md:grid-cols-3 gap-12 pt-8">
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Layers size={14} />
 <h4 className="font-sans text-[9px] uppercase tracking-widest font-black">Manifest History</h4>
 </div>
 <p className="font-serif italic text-base text-nous-subtle leading-snug">
 Every authored issue is anchored here. Community feed is live: <span className="text-nous-subtle font-bold">{communityZines.length} signals active.</span>
 </p>
 </div>
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-amber-500">
 <Star size={14} className="fill-amber-500"/>
 <h4 className="font-sans text-[9px] uppercase tracking-widest font-black">Curation Canon</h4>
 </div>
 <p className="font-serif italic text-base text-nous-subtle leading-snug">
 Filter by Favorites to isolate the pinnacle of your current personal canon. These artifacts represent your most stable frequencies.
 </p>
 </div>
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-indigo-500">
 <Compass size={14} />
 <h4 className="font-sans text-[9px] uppercase tracking-widest font-black">Global Audit</h4>
 </div>
 <p className="font-serif italic text-base text-nous-subtle leading-snug">
 Use Folder Anchors to filter by frequency. Identify patterns in your debris to refine future manifestations.
 </p>
 </div>
 </div>
 </header>

 <div className="flex flex-col lg:flex-row gap-4 mb-8">
 <div className="w-full relative group flex-grow">
 <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-3 pl-8 pointer-events-none">
 <Search size={16} className="text-nous-subtle group-focus-within:text-nous-subtle transition-colors"/>
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-black text-nous-subtle/50">Audit_Log</span>
 </div>
 <input 
 id="archiveSearch"
 name="archiveSearch"
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Trace an issue by title, theme, or frequency..."
 className="w-full bg-nous-base/50 /50 border-b-2 border-nous-border py-10 pl-40 pr-8 font-serif italic text-2xl md:text-3xl focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-all placeholder:text-nous-text placeholder:opacity-50 text-nous-text text-nous-text"
 />
 </div>
 {nebulaMode === 'strategist' && (
 <div className="flex border border-nous-border bg-white/50 /50 p-2 gap-2 self-start lg:self-center">
 <button 
 onClick={() => setShowcaseMode('bento')}
 className={`px-4 py-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono transition-colors ${showcaseMode === 'bento' ? 'bg-stone-200 text-nous-text text-nous-text' : 'text-nous-subtle hover:bg-nous-base '}`}
 >
 <LayoutGrid size={14} /> Bento Archive
 </button>
 <button 
 onClick={() => setShowcaseMode('dossier')}
 className={`px-4 py-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono transition-colors ${showcaseMode === 'dossier' ? 'bg-stone-200 text-nous-text text-nous-text' : 'text-nous-subtle hover:bg-nous-base '}`}
 >
 <Archive size={14} /> Archival Dossier
 </button>
 <button 
 onClick={() => setShowcaseMode('minimalist')}
 className={`px-4 py-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono transition-colors ${showcaseMode === 'minimalist' ? 'bg-stone-200 text-nous-text text-nous-text' : 'text-nous-subtle hover:bg-nous-base '}`}
 >
 <Maximize2 size={14} /> Minimalist
 </button>
 </div>
 )}
 </div>

 {nebulaMode === 'network' ? (
 <div className="w-full pt-12">
 <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle mb-8 text-center">Your Resonating Network</h3>
 {followingProfiles.length === 0 ? (
 <div className="py-32 text-center opacity-30 space-y-8">
 <Radio size={64} className="mx-auto"/>
 <p className="font-serif italic text-3xl">“No active connections.”</p>
 <p className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle">Find signals in the Proscenium.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
 {followingProfiles.map(p => (
 <div 
 key={p.uid} 
 onClick={() => setViewingProfileId(p.uid)}
 className="bg-nous-base border border-nous-border p-6 flex flex-col items-center text-center cursor-pointer hover:border-indigo-500 transition-colors group"
 >
 <div className="w-16 h-16 rounded-none overflow-hidden mb-4 bg-nous-base border border-nous-border">
 <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.handle || 'U'}&background=1c1917&color=fff`} className="w-full h-full object-cover transition-all"alt=""/>
 </div>
 <h4 className="font-serif text-2xl italic text-nous-text text-nous-text group-hover:text-indigo-500 transition-colors">@{p.handle}</h4>
 {p.tasteProfile?.definition && (
 <p className="mt-3 font-serif italic text-xs text-nous-subtle line-clamp-2">"{p.tasteProfile.definition}"</p>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 ) : nebulaMode === 'vibe' ? (
 <div className="w-full h-[600px] pt-12">
 <VibeGraph onGenerateZine={onGenerateThreadZine} />
 </div>
 ) : (
 <div className={`pt-12 ${
 showcaseMode === 'dossier' ? 'grid grid-cols-1 md:grid-cols-12 gap-[1px] bg-stone-300 border border-nous-border ' : 
 showcaseMode === 'bento' ? 'grid grid-cols-1 md:grid-cols-12 gap-4' : 
 'grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16'
 }`}>
 {filteredZines.map(zine => (
 <ZineShelfItem 
 key={zine.id} 
 zine={zine} 
 onSelect={() => onSelectZine(zine)} 
 isCloud={zine.userId && !zine.userId.startsWith('ghost')} 
 isStarred={profile?.starredZineIds?.includes(zine.id)}
 onToggleStar={() => {
 if (user?.isAnonymous || user?.uid?.startsWith('local_')) {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Cloud Database requires an active Sync. Artifact saved locally."} 
 }));
 } else {
 toggleZineStar(zine.id);
 }
 }}
 onSaveToPocket={async () => {
 try {
 await archiveManager.saveToPocket(user?.uid || 'ghost', 'zine', zine);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Saved to Pocket."} 
 }));
 } catch (error) {
 console.error("Failed to save to pocket:", error);
 }
 }}
 mode={showcaseMode}
 />
 ))}
 <InitSequenceCard mode={showcaseMode} />
 {filteredZines.length === 0 && (
 <div className="col-span-full py-48 text-center opacity-30 space-y-8 bg-nous-base">
 <Ghost size={64} className="mx-auto"/>
 <p className="font-serif italic text-3xl">“This frequency is currently void.”</p>
 <button onClick={() => setNebulaMode('strategist')} className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle border-b border-nous-border">Return to Strategist</button>
 </div>
 )}
 </div>
 )}
 </div>

 <AnimatePresence>
 {viewingProfileId && (
 <PublicProfileModal 
 userId={viewingProfileId} 
 onClose={() => setViewingProfileId(null)} 
 onSelectZine={onSelectZine}
 />
 )}
 </AnimatePresence>
 </div>
 );
};

const ZineShelfItem: React.FC<{ zine: ZineMetadata, onSelect: () => void, isCloud?: boolean, isStarred?: boolean, onToggleStar: () => void, onSaveToPocket?: () => void, mode?: string }> = ({ zine, onSelect, isCloud, isStarred, onToggleStar, onSaveToPocket, mode = 'dossier' }) => {
 const dateStr = new Date(zine.timestamp).toISOString().split('T')[0];
 const shortId = zine.id.slice(-4);
 const synthesisScore = (Math.random() * (0.99 - 0.70) + 0.70).toFixed(2); // Mock score for aesthetics

 const hasNote = Math.random() > 0.7;
 const noteRotation = Math.random() > 0.5 ? 'rotate-3' : '-rotate-2';
 const notePosition = Math.random() > 0.5 ? 'bottom-16 right-4' : 'top-24 left-4';

 if (mode === 'dossier') {
 return (
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 className="col-span-1 md:col-span-6 lg:col-span-4 bg flex flex-col relative overflow-hidden"
 >
 <div className="p-6 pb-0 flex justify-between items-start border-b border-nous-border pb-4">
 <div className="flex items-center gap-2">
 <span className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle bg-nous-base px-2 py-1"># {zine.tone}</span>
 </div>
 <div className="flex items-center gap-4 z-20">
 {onSaveToPocket && (
 <button 
 onClick={(e) => { e.stopPropagation(); onSaveToPocket(); }}
 className="text-nous-subtle hover:text-nous-text transition-colors"
 title="Save to Pocket"
 >
 <Folder size={16} />
 </button>
 )}
 <button 
 onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
 className={`transition-colors ${isStarred ? 'text-amber-500' : 'text-nous-subtle hover:text-amber-500'}`}
 >
 <Star size={16} fill={isStarred ?"currentColor":"none"} />
 </button>
 </div>
 </div>
 <div className="p-6 flex-grow flex flex-col justify-center cursor-pointer z-10"onClick={onSelect}>
 <div className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle mb-4">REF_{shortId}</div>
 <h2 className="font-serif text-4xl italic leading-tight mb-2 text-nous-text text-nous-text hover:text-nous-subtle transition-colors">{zine.title}</h2>
 <p className="font-mono text-xs text-nous-subtle mt-4">SYNTHESIS_SCORE: {synthesisScore}</p>
 </div>
 <div className="border-t border-nous-border bg-nous-base p-4 grid grid-cols-2 gap-4 font-mono text-[9px] uppercase tracking-widest text-nous-subtle cursor-pointer z-10"onClick={onSelect}>
 <div>
 <span className="block text-nous-subtle mb-1">Anchored</span>
 <span className="text-nous-text">{dateStr}</span>
 </div>
 <div className="flex justify-between items-end">
 <div>
 <span className="block text-nous-subtle mb-1">Frequency</span>
 <span className="text-nous-text">Alpha-Decay</span>
 </div>
 {isCloud && <div className="w-1.5 h-1.5 rounded-none bg-nous-base0 animate-pulse mb-1"/>}
 </div>
 </div>
 
 {hasNote && (
 <div className={`absolute bg-nous-text/90 dark:bg-nous-base/90 /90 border border backdrop-blur-sm p-3 w-36 z-20 ${notePosition} ${noteRotation}`}>
 <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 -rotate-2 w-10 h-3 bg-white/40 /10 border border-black/10 /10"></div>
 <p className="font-serif italic text-xs text-nous-subtle leading-tight">Aesthetic resonance detected in recent scans.</p>
 </div>
 )}
 </motion.div>
 );
 } else if (mode === 'bento') {
 return (
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 className="col-span-1 md:col-span-6 lg:col-span-4 bg border border-nous-border rounded-none flex flex-col p-6 hover: transition-"
 >
 <div className="flex justify-between items-start mb-8">
 <span className="text-[9px] uppercase tracking-widest font-mono text-nous-subtle border border-nous-border px-2 py-1 rounded-none"># {zine.tone}</span>
 <div className="flex items-center gap-4 z-20">
 {onSaveToPocket && (
 <button 
 onClick={(e) => { e.stopPropagation(); onSaveToPocket(); }}
 className="text-nous-subtle hover:text-nous-text transition-colors"
 title="Save to Pocket"
 >
 <Folder size={14} />
 </button>
 )}
 <button 
 onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
 className={`transition-colors ${isStarred ? 'text-amber-500' : 'text-nous-subtle hover:text-amber-500'}`}
 >
 <Star size={14} fill={isStarred ?"currentColor":"none"} />
 </button>
 </div>
 </div>
 <div className="flex-grow cursor-pointer"onClick={onSelect}>
 <div className="text-[9px] uppercase tracking-widest font-mono text-nous-subtle mb-2">REF_{shortId}</div>
 <h2 className="font-serif text-3xl italic leading-tight text-nous-text text-nous-text hover:text-nous-subtle transition-colors">{zine.title}</h2>
 </div>
 <div className="mt-8 pt-4 border-t border-nous-border/50 /50 flex justify-between items-end cursor-pointer"onClick={onSelect}>
 <div className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
 <span className="block mb-1">Score</span>
 <span className="text-nous-text">{synthesisScore}</span>
 </div>
 <div className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle text-right flex items-center gap-2">
 {isCloud && <div className="w-1.5 h-1.5 rounded-none bg-nous-base0 animate-pulse"/>}
 <div>
 <span className="block mb-1">Alpha-Decay</span>
 <span className="text-nous-text">{dateStr}</span>
 </div>
 </div>
 </div>
 </motion.div>
 );
 } else {
 // minimalist
 return (
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 className="col-span-1 md:col-span-6 lg:col-span-4 group cursor-pointer flex flex-col"
 onClick={onSelect}
 >
 <div className="flex-grow flex items-center justify-between">
 <h2 className="font-serif text-4xl md:text-5xl italic leading-tight text-nous-text group-hover:text-black dark:group-hover:text-nous-text transition-colors">{zine.title}</h2>
 <div className="flex items-center gap-4">
 {onSaveToPocket && (
 <button 
 onClick={(e) => { e.stopPropagation(); onSaveToPocket(); }}
 className="opacity-0 group-hover:opacity-100 transition-all text-nous-subtle hover:text-nous-text"
 title="Save to Pocket"
 >
 <Folder size={18} />
 </button>
 )}
 <button 
 onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
 className={`ml-4 opacity-0 group-hover:opacity-100 transition-all ${isStarred ? 'text-amber-500 opacity-100' : 'text-nous-subtle hover:text-amber-500'}`}
 >
 <Star size={18} fill={isStarred ?"currentColor":"none"} />
 </button>
 </div>
 </div>
 <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-between items-center border-t border-nous-border pt-4">
 <span className="text-[9px] uppercase tracking-widest font-mono text-nous-subtle">REF_{shortId} // {zine.tone}</span>
 <div className="flex items-center gap-2">
 {isCloud && <div className="w-1.5 h-1.5 rounded-none bg-nous-base0 animate-pulse"/>}
 <span className="text-[9px] uppercase tracking-widest font-mono text-nous-subtle">{dateStr}</span>
 </div>
 </div>
 </motion.div>
 );
 }
};

const InitSequenceCard: React.FC<{ mode: string }> = ({ mode }) => {
 const handleInit = () => {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }));
 };

 if (mode === 'dossier') {
 return (
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 className="col-span-1 md:col-span-6 lg:col-span-4 bg-nous-base text-nous-subtle p-8 flex flex-col justify-between"
 >
 <div>
 <h3 className="font-serif text-2xl italic text-white mb-4">Initialize Sequence</h3>
 <p className="font-sans text-xs text-nous-subtle mb-8 leading-relaxed">
 Begin a new manifestation. Connect disparate nodes to form a cohesive dossier.
 </p>
 </div>
 <button 
 onClick={handleInit}
 className="w-full py-4 border border-nous-border text-white font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:text-nous-text transition-colors flex items-center justify-center gap-2"
 >
 <Zap size={14} />
 Draft New Protocol
 </button>
 </motion.div>
 );
 } else if (mode === 'bento') {
 return (
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 className="col-span-1 md:col-span-6 lg:col-span-4 bg-nous-base text-nous-text p-8 flex flex-col justify-between rounded-none hover: transition-"
 >
 <div>
 <div className="flex items-center gap-2 mb-6">
 <span className="w-2 h-2 rounded-none bg-stone-400 animate-pulse"></span>
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">System Ready</span>
 </div>
 <h3 className="font-serif text-3xl italic text-white mb-4">New Archive Entry</h3>
 <p className="font-sans text-sm text-nous-subtle mb-8 leading-relaxed">
 Catalog a new module into the canon.
 </p>
 </div>
 <button 
 onClick={handleInit}
 className="w-full py-3 bg-stone-700 text-white font-mono text-[9px] uppercase tracking-widest hover:bg-stone-600 transition-colors rounded-none flex items-center justify-center gap-2"
 >
 <Zap size={12} />
 Initialize
 </button>
 </motion.div>
 );
 } else {
 return (
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 onClick={handleInit}
 className="col-span-1 md:col-span-6 lg:col-span-4 flex items-center justify-center border border-dashed border-nous-border hover:border-nous-border transition-colors min-h-[200px] group cursor-pointer"
 >
 <div className="text-center opacity-50 group-hover:opacity-100 transition-opacity">
 <Zap size={24} className="mx-auto mb-4 text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text transition-colors"/>
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text transition-colors">Draft Protocol</span>
 </div>
 </motion.div>
 );
 }
};

export default ArchiveCloudNebula;

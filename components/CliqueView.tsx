
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { fetchCommunityZines, fetchUserZines } from '../services/firebase';
import { ZineMetadata, ProsceniumRole } from '../types';
import { Users, Radio, Info, Loader2, Sparkles, Handshake, Wind, ArrowUpRight, Fingerprint, Layers, Activity, Heart, Camera, Eye, Layout, Map, Globe2, Share2, Copy, Check, Lock, ArrowRight, User } from 'lucide-react';
import { ZineCard } from './ZineCard';

export const ProsceniumView: React.FC<{ onSelectZine: (z: ZineMetadata) => void, onCapture: (text: string) => void }> = ({ onSelectZine, onCapture }) => {
 const { user, profile } = useUser();
 const [publicZines, setPublicZines] = useState<ZineMetadata[]>([]);
 const [myPublicZines, setMyPublicZines] = useState<ZineMetadata[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'showroom' | 'portal'>('showroom');
 const [copiedId, setCopiedId] = useState<string | null>(null);

 useEffect(() => {
 const load = async () => {
 setLoading(true);
 try {
 const community = await fetchCommunityZines(24);
 setPublicZines(community || []);
 
 if (user && !user.isAnonymous) {
 const userZines = await fetchUserZines(user.uid);
 setMyPublicZines(userZines.filter(z => z.isPublic) || []);
 }
 } catch (e) {}
 setLoading(false);
 };
 load();
 }, [user]);

 const handleShare = (id: string) => {
 const url = `${window.location.origin}/?zine=${id}`;
 navigator.clipboard.writeText(url).catch(e => console.error("MIMI // Clipboard error", e));
 setCopiedId(id);
 setTimeout(() => setCopiedId(null), 3000);
 };

 const fontChoice = profile?.tasteProfile?.dominant_archetypes?.[0] || 'minimalist-sans';

 if (loading) return (
 <div className="w-full h-full flex flex-col items-center justify-center gap-12 bg-nous-base">
 <Loader2 className="animate-spin text-nous-subtle"size={32} />
 <span className="font-sans text-[8px] uppercase tracking-[0.6em] text-nous-subtle font-black">Syncing Sovereign Showroom...</span>
 </div>
 );

 return (
 <div className="flex-1 w-full h-full flex flex-col overflow-y-auto no-scrollbar pb-64 relative bg-nous-base transition-colors duration-1000">
 <div className="w-full max-w-7xl mx-auto px-6 md:px-16 pt-12 md:pt-20 space-y-16">
 
 {/* HEADER */}
 <div className="flex flex-col border-b border-nous-border pb-12 gap-8">
 <div className="space-y-6">
 <div className="flex items-center gap-3 text-nous-subtle">
 <Globe2 size={16} className="text-nous-subtle animate-pulse"/>
 <span className="font-sans text-[10px] uppercase tracking-[0.5em] font-black italic">The Sovereign Showroom</span>
 </div>
 <div className="space-y-2">
 <h2 className="font-serif text-6xl md:text-9xl italic tracking-tighter luminescent-text text-nous-text  leading-none">The Floor.</h2>
 <p className="font-serif italic text-base md:text-xl text-nous-subtle max-w-xl leading-tight">
 Where private manifests achieving <span className="text-nous-text text-nous-text">Witness Density</span> are committed to the collective field.
 </p>
 </div>
 </div>
 
 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
 <div className="flex gap-8">
 <button onClick={() => setActiveTab('showroom')} className={`font-serif italic text-xl md:text-2xl pb-2 border-b-2 transition-all ${activeTab === 'showroom' ? 'text-nous-text text-nous-text border-nous-text ' : 'text-nous-subtle border-transparent hover:text-nous-text '}`}>Showroom</button>
 <button onClick={() => setActiveTab('portal')} className={`font-serif italic text-xl md:text-2xl pb-2 border-b-2 transition-all ${activeTab === 'portal' ? 'text-nous-text text-nous-text border-nous-text ' : 'text-nous-subtle border-transparent hover:text-nous-text '}`}>My Portal</button>
 </div>
 
 <div className="flex items-center gap-4 bg-white/50 /50 backdrop-blur-xl px-6 py-3 rounded-none border border-nous-border">
 <div className="flex flex-col items-end">
 <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">Portal Status</span>
 <span className="font-serif italic text-sm text-nous-text text-nous-text">{myPublicZines.length} Public Manifests</span>
 </div>
 <Activity size={14} className="text-nous-subtle animate-pulse"/>
 </div>
 </div>
 </div>

 <AnimatePresence mode="wait">
 {activeTab === 'showroom' ? (
 <motion.div key="showroom"initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-24">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-24">
 {publicZines.map((zine, idx) => (
 <div key={zine.id} className="space-y-6 group">
 <ZineCard zine={zine} onClick={() => onSelectZine(zine)} />
 <div className="flex justify-between items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => onSelectZine(zine)} className="flex items-center gap-2 font-serif italic text-nous-subtle hover:text-nous-text hover:text-nous-text">
 Witness Full Manifest <ArrowRight size={12} />
 </button>
 <button onClick={() => handleShare(zine.id)} className="p-2 text-nous-subtle hover:text-nous-subtle">
 {copiedId === zine.id ? <Check size={14} /> : <Share2 size={14} />}
 </button>
 </div>
 </div>
 ))}
 </div>
 
 {publicZines.length === 0 && (
 <div className="py-48 text-center opacity-20 space-y-8">
 <Globe2 size={64} className="mx-auto"/>
 <p className="font-serif italic text-3xl">“The world is quiet.”</p>
 </div>
 )}
 </motion.div>
 ) : (
 <motion.div key="portal"initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
 {user?.isAnonymous ? (
 <div className="flex flex-col items-center justify-center py-32 text-center space-y-10">
 <Lock size={48} className="text-nous-text"/>
 <div className="space-y-4">
 <h3 className="font-serif text-4xl italic tracking-tighter">Portal Locked.</h3>
 <p className="font-serif italic text-xl text-nous-subtle max-w-sm">Ghosts cannot occupy The Floor. Anchor your identity to open your public portal.</p>
 </div>
 <button onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }))} className="px-10 py-5 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-widest font-black">Anchor Identity</button>
 </div>
 ) : myPublicZines.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-32 text-center space-y-10">
 <User size={48} className="text-nous-text"/>
 <div className="space-y-4">
 <h3 className="font-serif text-4xl italic tracking-tighter">Portal Empty.</h3>
 <p className="font-serif italic text-xl text-nous-subtle max-w-sm">None of your manifests have been committed to The Floor yet. Transmute a zine to public to begin.</p>
 </div>
 <button onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'nebula' }))} className="px-10 py-5 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-widest font-black">Browse Archives</button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-24">
 {myPublicZines.map((zine) => (
 <div key={zine.id} className="space-y-6 group">
 <ZineCard zine={zine} onClick={() => onSelectZine(zine)} />
 <div className="flex justify-between items-center px-4">
 <button onClick={() => handleShare(zine.id)} className="flex items-center gap-3 px-6 py-2 bg-nous-base border border-nous-border rounded-none font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-subtle transition-all">
 {copiedId === zine.id ? <Check size={12} /> : <Share2 size={12} />}
 {copiedId === zine.id ? 'Link Preserved' : 'Get Share Link'}
 </button>
 <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">Public</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 );
};

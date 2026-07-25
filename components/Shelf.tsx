
// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { fetchCommunityZines, subscribeToUserZines, subscribeToCommunityZines } from '../services/firebaseUtils';
import { generateSeasonReport } from '../services/geminiService';
import { getLocalZines } from '../services/localArchive';
import { ZineMetadata, SeasonReport } from '../types';
import { useUser } from '../contexts/UserContext';
import { Ghost, Loader2, RefreshCw, Zap, Archive, Plus } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ZineCard } from './ZineCard'; 

interface ShelfProps {
 variant: 'community' | 'personal' | 'clique';
 onSelectZine: (zine: ZineMetadata) => void;
}

export const Shelf: React.FC<ShelfProps> = ({ variant, onSelectZine }) => {
 const { user } = useUser();
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<boolean>(false);
 
 // Split state for merging
 const [cloudZines, setCloudZines] = useState<ZineMetadata[]>([]);
 const [localZines, setLocalZines] = useState<ZineMetadata[]>([]);

 useEffect(() => {
 let unsubscribe = () => {};

 const setupStream = async () => {
 setLoading(true);
 setError(false);

 try {
 if (variant === 'personal') {
 // 1. Initial Local Load
 const local = await getLocalZines() || [];
 setLocalZines(local);

 // 2. Cloud Subscription
 if (user && !user.isAnonymous) {
 unsubscribe = subscribeToUserZines(user.uid, (data) => {
 setCloudZines(data);
 setLoading(false);
 });
 } else {
 setLoading(false);
 }
 } else {
 // Community Feed
 // Note: subscribeToCommunityZines limits to 30 usually. 
 // Shelf used 20. 
 unsubscribe = subscribeToCommunityZines((data) => {
 setZines(data);
 setLoading(false);
 });
 }
 } catch (e) {
 console.error("MIMI // Failed to setup stream", e);
 setError(true);
 setLoading(false);
 }
 };

 setupStream();
 
 // Listen for local artifacts creation (for personal view)
 const handleLocalUpdate = async () => {
 try {
 if (variant === 'personal') {
 const updated = await getLocalZines();
 setLocalZines(updated || []);
 }
 } catch (e) {
 console.error("MIMI // Failed to handle local update", e);
 }
 };
 window.addEventListener('mimi:artifact_finalized', handleLocalUpdate);

 return () => {
 unsubscribe();
 window.removeEventListener('mimi:artifact_finalized', handleLocalUpdate);
 };
 }, [variant, user]);

 // Merge Personal Data
 useEffect(() => {
 if (variant === 'personal') {
 const registry = new Map<string, ZineMetadata>();
 cloudZines.forEach(z => { if (z && z.id) registry.set(z.id, z); });
 localZines.forEach(z => { if (z && z.id) registry.set(z.id, z); });
 
 const merged = Array.from(registry.values())
 .filter(z => z && z.id)
 .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
 
 setZines(merged);
 }
 }, [cloudZines, localZines, variant]);

 const refreshManually = async () => {
 setLoading(true);
 try {
 if (variant === 'personal') {
 const updated = await getLocalZines();
 setLocalZines(updated || []);
 // Cloud updates automatically via subscription
 } else {
 // Force refetch community
 const data = await fetchCommunityZines(20);
 setZines(data || []);
 }
 } catch (e) {
 console.error("MIMI // Failed to refresh manually", e);
 } finally {
 setLoading(false);
 }
 };

 if (loading && zines.length === 0) {
 return (
 <div className="w-full flex flex-col items-center justify-center p-24 gap-4 animate-pulse">
 <LoadingSkeleton lines={4} className="w-full max-w-sm"/>
 <span className="font-sans text-[8px] uppercase tracking-[0.4em] text-nous-subtle font-black italic">Consulting Archives...</span>
 </div>
 );
 }

 return (
 <div className="w-full pb-32 animate-fade-in">
 <div className="px-6 md:px-12 pt-8">
 <div className="flex items-center justify-between mb-24 border-b border-nous-border pb-10">
 <div className="flex flex-col gap-4">
 <div className="flex items-center gap-3">
 {variant === 'personal' ? null : <Zap size={18} className="text-amber-400"/>}
 <h3 className={`font-[Cormorant] font-light text-5xl md:text-6xl italic luminescent-text tracking-tight ${variant === 'personal' ? 'text-[#5C1A1A] dark:text-[#E89E9E]' : 'text-nous-text'}`}>
 {variant === 'personal' ? 'The Shadow Archive' : variant === 'clique' ? 'Clique Radar' : 'Transmissions'}
 </h3>
 </div>
 <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">
 {variant === 'personal' ? `TEMPORAL LOGS: ${zines.length}` : 'BROADCAST_FEED'}
 </span>
 </div>
 <div className="flex items-center gap-4">
 {variant === 'personal' && (
 <div className="flex items-center gap-2 text-nous-subtle opacity-70">
 <span className="font-sans text-[8px] uppercase tracking-widest">SPECTRUM ACTIVE</span>
 <Zap size={12} />
 </div>
 )}
 <button onClick={refreshManually} className="p-4 bg-transparent hover:bg-nous-base rounded-none text-nous-subtle hover:text-nous-text transition-all active:rotate-180"title="Refresh">
 <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
 </button>
 </div>
 </div>

 {zines.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-48 text-center space-y-8">
 <div className="p-8 bg-nous-base rounded-none mb-4">
 <Ghost size={48} className="text-nous-subtle"/>
 </div>
 <p className="font-serif italic text-3xl">“The archive is currently a void.”</p>
 <button 
 onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }))}
 className="px-10 py-4 bg-nous-text text-nous-base rounded-none font-sans text-[9px] uppercase tracking-[0.4em] font-black active:scale-95 transition-all flex items-center gap-3"
 >
 <Plus size={14} /> Initialize Registry
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-16 gap-y-32">
 {zines.map((zine) => (
 <ZineCard key={zine.id} zine={zine} onClick={() => onSelectZine(zine)} currentUserId={user?.uid} />
 ))}
 </div>
 )}
 </div>
 </div>
 );
};

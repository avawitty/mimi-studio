import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, UserMinus, Loader2, Eye, UserCheck, UserX, Handshake, Clock, Link2Off, Zap, Check } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getUserProfile, fetchUserZines } from '../services/firebaseUtils';
import { followUser, unfollowUser, fetchFollowers, fetchFollowing, checkConnectionStatus, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } from '../services/connections';
import { UserProfile, ZineMetadata } from '../types';

interface PublicProfileModalProps {
 userId: string;
 onClose: () => void;
 onSelectZine?: (zine: ZineMetadata) => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ userId, onClose, onSelectZine }) => {
 const { user } = useUser();
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [zines, setZines] = useState<ZineMetadata[]>([]);
 const [loading, setLoading] = useState(true);
 const [isFollowing, setIsFollowing] = useState(false);
 const [followerCount, setFollowerCount] = useState(0);
 const [followingCount, setFollowingCount] = useState(0);
 const [actionLoading, setActionLoading] = useState(false);
 
 const [connectionStatus, setConnectionStatus] = useState<'none' | 'friends' | 'request_sent' | 'request_received'>('none');
 const [requestId, setRequestId] = useState<string | null>(null);
 const [connectLoading, setConnectLoading] = useState(false);

 useEffect(() => {
 const loadData = async () => {
 setLoading(true);
 try {
 // Handle mock users
 if (['ghost', 'user1', 'user2'].includes(userId)) {
 const mockProfiles: Record<string, any> = {
 'ghost': {
 uid: 'ghost',
 handle: 'oracle',
 tailorDraft: { typographyIntent: { archetype: 'minimalist-sans' } },
 tasteProfile: { definition: 'The aesthetic is not a choice, it is a biological imperative.' }
 },
 'user1': {
 uid: 'user1',
 handle: 'velvet_void',
 tailorDraft: { typographyIntent: { archetype: 'editorial-serif' } },
 tasteProfile: { definition: 'Refracting the mundane through a lens of hyper-nostalgia.' }
 },
 'user2': {
 uid: 'user2',
 handle: 'chrome_heart',
 tailorDraft: { typographyIntent: { archetype: 'brutalist-mono' } },
 tasteProfile: { definition: 'Silence is the loudest texture.' }
 }
 };
 setProfile(mockProfiles[userId]);
 setZines([]);
 setFollowerCount(Math.floor(Math.random() * 100));
 setFollowingCount(Math.floor(Math.random() * 50));
 if (user) {
 const connStatus = await checkConnectionStatus(userId);
 setConnectionStatus(connStatus.status as any);
 setRequestId(connStatus.requestId);
 }
 setLoading(false);
 return;
 }

 const p = await getUserProfile(userId);
 setProfile(p);
 
 const z = await fetchUserZines(userId);
 setZines(z.filter(zine => zine.isPublic));
 
 const followers = await fetchFollowers(userId);
 setFollowerCount(followers.length);
 
 const following = await fetchFollowing(userId);
 setFollowingCount(following.length);
 
 if (user) {
 setIsFollowing(followers.some(f => f.followerId === user.uid));
 const connStatus = await checkConnectionStatus(userId);
 setConnectionStatus(connStatus.status as any);
 setRequestId(connStatus.requestId);
 }
 } catch (e) {
 console.error("Failed to load profile", e);
 } finally {
 setLoading(false);
 }
 };
 
 loadData();
 }, [userId, user]);

 const handleFollowToggle = async () => {
 if (!user) return;
 setActionLoading(true);
 try {
 if (isFollowing) {
 await unfollowUser(userId);
 setIsFollowing(false);
 setFollowerCount(prev => prev - 1);
 } else {
 await followUser(userId);
 setIsFollowing(true);
 setFollowerCount(prev => prev + 1);
 }
 } catch (e) {
 console.error("Follow action failed", e);
 } finally {
 setActionLoading(false);
 }
 };

 const handleConnectAction = async () => {
 if (!user) return;
 setConnectLoading(true);
 try {
 if (connectionStatus === 'none') {
 await sendFriendRequest(userId);
 setConnectionStatus('request_sent');
 // We don't have the requestId immediately from sendFriendRequest, 
 // but it's usually `${user.uid}_${userId}`
 setRequestId(`${user.uid}_${userId}`);
 } else if (connectionStatus === 'request_received' && requestId) {
 await acceptFriendRequest(requestId, userId);
 setConnectionStatus('friends');
 } else if (connectionStatus === 'friends') {
 await removeFriend(userId);
 setConnectionStatus('none');
 } else if (connectionStatus === 'request_sent' && requestId) {
 // Cancel request by deleting it
 const { db } = await import('../services/firebaseInit');
 const { deleteDoc, doc } = await import('firebase/firestore');
 await deleteDoc(doc(db,"friend_requests", requestId));
 setConnectionStatus('none');
 setRequestId(null);
 }
 } catch (e) {
 console.error("Connection action failed", e);
 } finally {
 setConnectLoading(false);
 }
 };

 const handleRejectRequest = async () => {
 if (!requestId) return;
 setConnectLoading(true);
 try {
 await rejectFriendRequest(requestId);
 setConnectionStatus('none');
 setRequestId(null);
 } catch (e) {
 console.error("Reject action failed", e);
 } finally {
 setConnectLoading(false);
 }
 };

 const getStatusIcon = () => {
 if (connectionStatus === 'friends') return <span title="Connected"><Handshake size={20} className="text-nous-subtle"/></span>;
 if (connectionStatus === 'request_sent' || connectionStatus === 'request_received') return <span title="Pending"><Clock size={20} className="text-amber-500 animate-pulse"/></span>;
 if (connectionStatus === 'none') return <span title="Disconnected"><Link2Off size={20} className="text-nous-subtle"/></span>;
 if (isFollowing) return <span title="Resonating"><Zap size={20} className="text-indigo-500"/></span>;
 return null;
 };

 const renderConnectButton = () => {
 if (connectLoading) {
 return (
 <button disabled className="px-8 py-3 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 border border-nous-border text-nous-subtle">
 <Loader2 size={14} className="animate-spin"/>
 </button>
 );
 }

 switch (connectionStatus) {
 case 'friends':
 return (
 <button onClick={handleConnectAction} className="px-8 py-3 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 bg-nous-base text-nous-subtle border border-nous-border hover:text-red-500 hover:border-red-500/30"title="Disconnect">
 <Link2Off size={14} />
 </button>
 );
 case 'request_sent':
 return (
 <button onClick={handleConnectAction} className="px-8 py-3 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 bg-nous-base text-nous-subtle border border-nous-border hover:text-red-500 hover:border-red-500/30"title="Cancel Request">
 <Clock size={14} className="animate-pulse"/>
 </button>
 );
 case 'request_received':
 return (
 <div className="flex gap-2">
 <button onClick={handleConnectAction} className="px-8 py-3 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 bg-nous-base0 text-white -stone-500/20 hover:bg-stone-600">
 <Check size={14} /> Accept
 </button>
 <button onClick={handleRejectRequest} className="px-6 py-3 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 border border-nous-border text-nous-subtle hover:text-red-500">
 <X size={14} />
 </button>
 </div>
 );
 case 'none':
 default:
 return (
 <button onClick={handleConnectAction} className="px-8 py-3 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 border border-nous-text  text-nous-text  hover:bg-nous-text hover:text-nous-text dark:hover:bg-white dark:hover:text-black"title="Add Friend">
 <UserPlus size={14} /> Add Friend
 </button>
 );
 }
 };

 return (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
 onClick={onClose}
 >
 <motion.div 
 initial={{ scale: 0.95, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.95, y: 20 }}
 className="w-full max-w-2xl bg-nous-base dark:bg border border-nous-border overflow-hidden max-h-[90vh] flex flex-col"
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className="relative p-8 border-b border-nous-border flex flex-col items-center text-center">
 <button onClick={onClose} className="absolute top-4 right-4 p-2 text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors">
 <X size={20} />
 </button>
 
 {loading ? (
 <div className="py-12"><Loader2 size={32} className="animate-spin text-nous-subtle"/></div>
 ) : profile ? (
 <>
 <div className="w-24 h-24 rounded-none overflow-hidden border border-nous-border mb-6 bg-nous-base">
 <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.handle || 'U'}&background=1c1917&color=fff`} className="w-full h-full object-cover grayscale"alt=""/>
 </div>
 <div className="flex items-center gap-3 mb-2">
 <h2 className="font-serif text-4xl italic tracking-tighter text-nous-text text-nous-text">The Stand // @{profile.handle}</h2>
 {getStatusIcon()}
 </div>
 
 {(profile.tailorDraft as any)?.typographyIntent?.archetype && (
 <div className="mt-2 px-3 py-1 bg-nous-base border border-nous-border rounded-none inline-block">
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">
 Archetype: {(profile.tailorDraft as any).typographyIntent.archetype.replace('-', ' ')}
 </span>
 </div>
 )}

 <h3 className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle mb-3 mt-4">Semantic Signature</h3>
 <div className="flex flex-wrap justify-center gap-1.5 max-w-[80%] mx-auto mb-4">
 {profile?.tasteProfile?.dominantClusters?.length || profile?.tasteProfile?.aestheticSignature?.core_keywords?.length || profile?.tasteProfile?.dominant_archetypes?.length ? (
 (profile?.tasteProfile?.dominantClusters || profile?.tasteProfile?.aestheticSignature?.core_keywords || profile?.tasteProfile?.dominant_archetypes || []).slice(0, 6).map((tag, i) => (
 <span key={i} className="px-3 py-1 bg-nous-text/5 border border-nous-border/50 text-nous-text font-serif italic text-xs whitespace-nowrap">
 {typeof tag === 'string' ? tag.replace(/-/g, ' ') : tag}
 </span>
 ))
 ) : (
 <span className="text-nous-subtle/50 font-serif italic text-xs">Unclassified Signals</span>
 )}
 </div>
 
 {(profile.tasteProfile as any)?.definition && (
 <p className="mt-4 font-serif italic text-sm text-nous-subtle max-w-sm text-center">
"{(profile.tasteProfile as any).definition}"
 </p>
 )}

 {/* Semantic Clusters (Tag Cloud) */}
 <div className="mt-6 w-full max-w-sm">
    <p className="font-mono text-[8px] uppercase tracking-widest text-[#a8b79f] mb-3 text-center border-b border-[#a8b79f]/30 pb-2">Aesthetic Nodes (Semantic Clusters)</p>
    <div className="flex flex-wrap justify-center gap-2">
      {(() => {
        // Pseudo-random selection based on handle length to make it semi-consistent
        const seed = profile?.handle ? profile.handle.length : 5;
        const allClusters = [
          "Luxury Utilitarian", "Low-Fidelity Archival", "Brutalist Domestic", 
          "Tactile Nostalgia", "Synthesized Naturals", "Post-Irony Streetwear",
          "Ambient Avant-Garde", "Corporate Core", "Neo-Romance"
        ];
        // Select 3 clusters
        const subset = [
          allClusters[seed % allClusters.length],
          allClusters[(seed + 3) % allClusters.length],
          allClusters[(seed + 7) % allClusters.length]
        ];
        return subset.map((cluster, i) => (
          <span key={i} className="inline-flex items-center px-2 py-1 bg-transparent border border-nous-border text-nous-subtle font-mono text-[9px] uppercase tracking-wider hover:text-nous-text hover:border-nous-text transition-colors cursor-pointer">
            # {cluster}
          </span>
        ));
      })()}
    </div>
 </div>

 <div className="flex items-center gap-6 mt-8 mb-8">
 <div className="text-center">
 <span className="block font-serif text-2xl italic text-nous-text text-nous-text">{followerCount}</span>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Resonators</span>
 </div>
 <div className="w-px h-8 bg-stone-200"/>
 <div className="text-center">
 <span className="block font-serif text-2xl italic text-nous-text text-nous-text">{followingCount}</span>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle">Resonating</span>
 </div>
 </div>
 
 {user && user.uid !== userId && (
 <div className="flex gap-4">
 <button 
 onClick={handleFollowToggle}
 disabled={actionLoading}
 className={`px-8 py-3 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 ${isFollowing ? 'bg-nous-base text-nous-subtle border border-nous-border ' : 'bg-nous-text text-nous-base '}`}
 >
 {actionLoading ? <Loader2 size={14} className="animate-spin"/> : isFollowing ? <><UserMinus size={14} /> Stop Resonating</> : <><UserPlus size={14} /> Resonate</>}
 </button>
 {renderConnectButton()}
 </div>
 )}
 </>
 ) : (
 <div className="py-12"><p className="font-serif italic text-nous-subtle">Profile not found.</p></div>
 )}
 </div>
 
 {/* Content */}
 <div className="flex-1 overflow-y-auto p-8 bg-nous-base /20">
 <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] font-black text-nous-subtle mb-6 text-center">The Stand // Published Manifests</h3>
 
 {loading ? (
 <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-nous-subtle"/></div>
 ) : zines.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 {zines.map(zine => (
 <div 
 key={zine.id}
 onClick={() => {
 if (onSelectZine) {
 onSelectZine(zine);
 onClose();
 }
 }}
 className="aspect-[3/4] bg-white border border-nous-border relative group cursor-pointer overflow-hidden"
 >
 {zine.coverImageUrl ? (
 <img src={zine.coverImageUrl} alt={zine.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"/>
 ) : (
 <div className="w-full h-full flex items-center justify-center p-4 text-center">
 <span className="font-serif italic text-sm text-nous-subtle">{zine.title}</span>
 </div>
 )}
 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
 <Eye size={24} className="text-white"/>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-12">
 <p className="font-serif italic text-nous-subtle">No public manifests available.</p>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 );
};

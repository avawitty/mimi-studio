import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserPlus, UserMinus, Check, X, Loader2, Users, Heart, ArrowRight, Search, Handshake, Clock, Link2Off, Zap } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { useUser } from '../contexts/UserContext';
import { fetchFollowers, fetchFollowing, fetchFriends, fetchFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, unfollowUser, Friendship, FriendRequest, Connection, sendFriendRequest, followUser, checkConnectionStatus } from '../services/connections';
import { getUserProfile, searchUsers } from '../services/firebaseUtils';
import { UserProfile } from '../types';

interface ConnectionItemProps {
 userId: string;
 type: 'friend' | 'follower' | 'following' | 'request' | 'search';
 requestId?: string;
 onActionComplete: () => void;
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ userId, type, requestId, onActionComplete }) => {
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);
 const [connectionStatus, setConnectionStatus] = useState<{ status: string, requestId: string | null } | null>(null);

 useEffect(() => {
 const loadData = async () => {
 try {
 const p = await getUserProfile(userId);
 setProfile(p);
 
 if (type === 'search') {
 const status = await checkConnectionStatus(userId);
 setConnectionStatus(status);
 }
 } catch (e) {
 console.error("MIMI // Failed to load connection data", e);
 } finally {
 setLoading(false);
 }
 };
 loadData();
 }, [userId, type]);

 const handleAccept = async () => {
 if (!requestId) return;
 setActionLoading(true);
 try {
 await acceptFriendRequest(requestId, userId);
 onActionComplete();
 } catch (e) {
 console.error("MIMI // Failed to accept request", e);
 } finally {
 setActionLoading(false);
 }
 };

 const handleReject = async () => {
 if (!requestId) return;
 setActionLoading(true);
 try {
 await rejectFriendRequest(requestId);
 onActionComplete();
 } catch (e) {
 console.error("MIMI // Failed to reject request", e);
 } finally {
 setActionLoading(false);
 }
 };

 const handleRemoveFriend = async () => {
 setActionLoading(true);
 try {
 await removeFriend(userId);
 onActionComplete();
 } catch (e) {
 console.error("MIMI // Failed to remove friend", e);
 } finally {
 setActionLoading(false);
 }
 };

 const handleUnfollow = async () => {
 setActionLoading(true);
 try {
 await unfollowUser(userId);
 onActionComplete();
 } catch (e) {
 console.error("MIMI // Failed to unfollow", e);
 } finally {
 setActionLoading(false);
 }
 };

 const handleConnect = async () => {
 setActionLoading(true);
 try {
 await sendFriendRequest(userId);
 onActionComplete();
 } catch (e) {
 console.error("MIMI // Failed to send request", e);
 } finally {
 setActionLoading(false);
 }
 };

 const handleFollow = async () => {
 setActionLoading(true);
 try {
 await followUser(userId);
 onActionComplete();
 } catch (e) {
 console.error("MIMI // Failed to follow", e);
 } finally {
 setActionLoading(false);
 }
 };

 if (loading) return <div className="h-16 animate-pulse bg-nous-base /50 rounded-none"/>;
 if (!profile) return null;

 const getStatusIcon = () => {
 if (type === 'friend' || connectionStatus?.status === 'friends') return <span title="Connected"><Handshake size={12} className="text-nous-subtle"/></span>;
 if (type === 'request' || connectionStatus?.status === 'request_sent' || connectionStatus?.status === 'request_received') return <span title="Pending"><Clock size={12} className="text-amber-500 animate-pulse"/></span>;
 if (type === 'following') return <span title="Resonating"><Zap size={12} className="text-indigo-500"/></span>;
 if (type === 'search' && connectionStatus?.status === 'none') return <span title="Disconnected"><Link2Off size={12} className="text-nous-subtle"/></span>;
 return null;
 };

 return (
 <div className="flex items-center justify-between p-4 bg-white /30 border border-nous-border rounded-none group transition-all hover:border-nous-border">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-none overflow-hidden border border-nous-border bg-nous-base">
 <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.handle || 'U'}&background=1c1917&color=fff`} className="w-full h-full object-cover grayscale"alt=""/>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h4 className="font-serif italic text-sm text-nous-text ">@{profile.handle}</h4>
 {getStatusIcon()}
 </div>
 <p className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
 {type === 'follower' ? 'Resonator' : 'Sovereign'}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {type === 'request' ? (
 <>
 <button 
 onClick={handleAccept} 
 disabled={actionLoading}
 className="p-2 text-nous-subtle hover:bg-nous-base 0/10 rounded-none transition-colors"
 title="Accept Request"
 >
 {actionLoading ? <Loader2 size={14} className="animate-spin"/> : <Check size={16} />}
 </button>
 <button 
 onClick={handleReject} 
 disabled={actionLoading}
 className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-none transition-colors"
 title="Reject Request"
 >
 <X size={16} />
 </button>
 </>
 ) : type === 'friend' ? (
 <button 
 onClick={handleRemoveFriend} 
 disabled={actionLoading}
 className="p-2 text-nous-subtle hover:text-red-500 transition-colors rounded-none hover:bg-red-50 dark:hover:bg-red-500/10"
 title="Disconnect"
 >
 {actionLoading ? <Loader2 size={14} className="animate-spin"/> : <Link2Off size={16} />}
 </button>
 ) : type === 'following' ? (
 <button 
 onClick={handleUnfollow} 
 disabled={actionLoading}
 className="p-2 text-nous-subtle hover:text-red-500 transition-colors rounded-none hover:bg-red-50 dark:hover:bg-red-500/10"
 title="Stop Resonating"
 >
 {actionLoading ? <Loader2 size={14} className="animate-spin"/> : <UserMinus size={16} />}
 </button>
 ) : type === 'search' ? (
 <div className="flex items-center gap-2">
 {connectionStatus?.status === 'friends' ? (
 <div className="p-2 text-nous-subtle bg-nous-base0/10 rounded-none"title="Connected">
 <Handshake size={16} />
 </div>
 ) : connectionStatus?.status === 'request_sent' ? (
 <div className="p-2 text-amber-500 bg-amber-500/10 rounded-none animate-pulse"title="Request Sent">
 <Clock size={16} />
 </div>
 ) : connectionStatus?.status === 'request_received' ? (
 <button 
 onClick={() => handleAccept()} 
 disabled={actionLoading}
 className="flex items-center gap-2 px-3 py-1.5 bg-nous-base0 text-white rounded-none font-sans text-[7px] uppercase tracking-widest font-black hover:bg-stone-600 transition-all"
 >
 <Check size={10} /> Accept
 </button>
 ) : (
 <>
 <button 
 onClick={handleConnect} 
 disabled={actionLoading}
 className="p-2 bg-nous-text text-nous-base rounded-none hover:opacity-80 transition-all"
 title="Connect"
 >
 {actionLoading ? <Loader2 size={14} className="animate-spin"/> : <UserPlus size={16} />}
 </button>
 <button 
 onClick={handleFollow} 
 disabled={actionLoading}
 className="p-2 border border-nous-border rounded-none text-nous-subtle hover:bg-nous-base transition-all"
 title="Resonate"
 >
 {actionLoading ? <Loader2 size={14} className="animate-spin"/> : <Zap size={16} />}
 </button>
 </>
 )}
 </div>
 ) : null}
 </div>
 </div>
 );
};

export const ConnectionsManager: React.FC = () => {
 const { user } = useUser();
 const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'followers' | 'following' | 'search'>('friends');
 const [friends, setFriends] = useState<(Friendship & { friendId: string })[]>([]);
 const [requests, setRequests] = useState<FriendRequest[]>([]);
 const [followers, setFollowers] = useState<Connection[]>([]);
 const [following, setFollowing] = useState<Connection[]>([]);
 const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [loading, setLoading] = useState(true);
 const [searching, setSearching] = useState(false);

 const loadData = async () => {
 if (!user) return;
 
 // Check if user is a local ghost (no Firebase Auth session)
 const { auth } = await import('../services/firebaseInit');
 if (!auth.currentUser) {
 setLoading(false);
 return;
 }

 setLoading(true);
 try {
 const f = await fetchFriends(user.uid).catch(e => { console.error("MIMI // fetchFriends failed", e); throw e; });
 const r = await fetchFriendRequests(user.uid).catch(e => { console.error("MIMI // fetchFriendRequests failed", e); throw e; });
 const fl = await fetchFollowers(user.uid).catch(e => { console.error("MIMI // fetchFollowers failed", e); throw e; });
 const fg = await fetchFollowing(user.uid).catch(e => { console.error("MIMI // fetchFollowing failed", e); throw e; });
 
 setFriends(f);
 setRequests(r);
 setFollowers(fl);
 setFollowing(fg);
 } catch (e) {
 console.error("MIMI // Failed to load connections data", e);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [user]);

 useEffect(() => {
 const delayDebounceFn = setTimeout(async () => {
 if (searchTerm.length >= 2) {
 setSearching(true);
 try {
 const results = await searchUsers(searchTerm);
 // Filter out current user
 setSearchResults(results.filter(r => r.uid !== user?.uid));
 } catch (e) {
 console.error("MIMI // Search failed", e);
 } finally {
 setSearching(false);
 }
 } else {
 setSearchResults([]);
 }
 }, 500);

 return () => clearTimeout(delayDebounceFn);
 }, [searchTerm, user]);

 const tabs = [
 { id: 'friends', label: 'Connected', count: friends.length, icon: <Users size={14} /> },
 { id: 'requests', label: 'Requests', count: requests.length, icon: <UserPlus size={14} />, highlight: requests.length > 0 },
 { id: 'followers', label: 'Resonators', count: followers.length, icon: <Heart size={14} /> },
 { id: 'following', label: 'Resonating', count: following.length, icon: <ArrowRight size={14} /> },
 { id: 'search', label: 'Search', count: 0, icon: <Search size={14} /> },
 ];

 return (
 <div className="w-full space-y-8">
 <div className="flex flex-wrap items-center justify-center gap-4">
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`px-6 py-3 rounded-none border transition-all flex items-center gap-3 relative ${activeTab === tab.id ? 'bg-nous-text text-nous-base border-nous-text  ' : 'bg-white text-nous-subtle border-nous-border hover:border-nous-border '}`}
 >
 {tab.icon}
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">{tab.label}</span>
 {tab.count > 0 && (
 <span className={`ml-1 px-1.5 py-0.5 rounded-none text-[7px] font-black ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-nous-base text-nous-subtle'}`}>
 {tab.count}
 </span>
 )}
 {tab.highlight && (
 <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-nous-base0 rounded-none border-2 border-nous-base dark:border-stone-950 animate-pulse"/>
 )}
 </button>
 ))}
 </div>

 <div className="min-h-[300px] relative">
 {loading ? (
 <div className="absolute inset-0 flex items-center justify-center">
 <Loader2 size={24} className="animate-spin text-nous-subtle"/>
 </div>
 ) : (
 <motion.div 
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="grid grid-cols-1 md:grid-cols-2 gap-4"
 >
 {activeTab === 'friends' && (
 friends.length > 0 ? (
 friends.map(f => <ConnectionItem key={f.id} userId={f.friendId} type="friend"onActionComplete={loadData} />)
 ) : (
 <EmptyState message="No connections established yet."/>
 )
 )}
 {activeTab === 'requests' && (
 requests.length > 0 ? (
 requests.map(r => <ConnectionItem key={r.id} userId={r.senderId} type="request"requestId={r.id} onActionComplete={loadData} />)
 ) : (
 <EmptyState message="No pending connection requests."/>
 )
 )}
 {activeTab === 'followers' && (
 followers.length > 0 ? (
 followers.map(f => <ConnectionItem key={f.id} userId={f.followerId} type="follower"onActionComplete={loadData} />)
 ) : (
 <EmptyState message="No resonators yet."/>
 )
 )}
 {activeTab === 'following' && (
 following.length > 0 ? (
 following.map(f => <ConnectionItem key={f.id} userId={f.followingId} type="following"onActionComplete={loadData} />)
 ) : (
 <EmptyState message="You haven't resonated with anyone yet."/>
 )
 )}
 {activeTab === 'search' && (
 <div className="col-span-full space-y-6">
 <div className="relative max-w-md mx-auto">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nous-subtle"size={16} />
 <input 
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search by handle..."
 className="w-full pl-12 pr-4 py-3 bg-white border border-nous-border rounded-none focus:outline-none focus:ring-2 focus:ring-nous-text dark:focus:ring-white transition-all font-serif italic"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {searching ? (
 <div className="col-span-full flex justify-center py-10">
 <Loader2 size={24} className="animate-spin text-nous-subtle"/>
 </div>
 ) : searchResults.length > 0 ? (
 searchResults.map(r => <ConnectionItem key={r.uid} userId={r.uid} type="search"onActionComplete={loadData} />)
 ) : searchTerm.length >= 2 ? (
 <EmptyState message="No users found matching that handle."/>
 ) : (
 <div className="col-span-full py-10 text-center opacity-40">
 <p className="font-serif italic text-nous-subtle">Enter at least 2 characters to search.</p>
 </div>
 )}
 </div>
 </div>
 )}
 </motion.div>
 )}
 </div>
 </div>
 );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
 <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
 <Users size={40} className="text-nous-subtle"/>
 <p className="font-serif italic text-nous-subtle">{message}</p>
 </div>
);

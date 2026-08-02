import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { CheckCircle2, User, LogOut, Edit2, Loader2, Award } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { isHandleAvailable, fetchCommunityZines } from '../services/firebaseUtils';
import { listDolls } from '../services/tailorService';
import { getLocalPocket } from '../services/localArchive';
import { fetchPocketItems } from '../services/firebase';
import { normalizePlanTier, PATRONAGE_PLAN_LABELS } from "../constants";

interface ProfileHoverCardProps {
 isOpen: boolean;
 onClose: () => void;
 triggerRef: React.RefObject<HTMLDivElement>;
}

export const ProfileHoverCard: React.FC<ProfileHoverCardProps> = ({ isOpen, onClose, triggerRef }) => {
 const { user, profile, updateProfile } = useUser();
 const [isEditingUsername, setIsEditingUsername] = useState(false);
 const [newUsername, setNewUsername] = useState(profile?.handle || '');
 const [isSaving, setIsSaving] = useState(false);
 const [isCheckingHandle, setIsCheckingHandle] = useState(false);
 const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
 const cardRef = useRef<HTMLDivElement>(null);

 const [dollsCount, setDollsCount] = useState(0);
 const [zinesCount, setZinesCount] = useState(0);
 const [shardsCount, setShardsCount] = useState(0);

 useEffect(() => {
   if (!user?.uid) return;
   Promise.all([
     listDolls(user.uid).catch((): any[] => []),
     fetchCommunityZines(60).catch((): any[] => []),
     getLocalPocket().catch((): any[] => []),
     user && !user.isAnonymous ? fetchPocketItems(user.uid).catch((): any[] => []) : Promise.resolve([])
   ]).then(([dolls, zines, localShards, cloudShards]) => {
     setDollsCount(dolls.length);
     const userZines = zines.filter((z: any) => z.userId === user.uid || user.uid === 'ghost');
     setZinesCount(userZines.length);
     setShardsCount((localShards || []).length + (cloudShards || []).length);
   }).catch(err => {
     console.error("MIMI // Failed to fetch stats in ProfileHoverCard:", err);
   });
 }, [user?.uid]);

 // Derived Cult Rank System
 const totalComplexity = dollsCount * 12 + zinesCount * 8 + shardsCount * 4;
 let cultRank = {
   title: "Neophyte (Grade 0)",
   desc: "Initiated into the outer court. Minimal rites performed.",
   colorClass: "text-stone-500 border-stone-200 dark:border-stone-850/80 bg-stone-500/5",
   accentColor: "#78716c",
   badge: "INITIATE"
 };

 if (totalComplexity > 0 && totalComplexity <= 20) {
   cultRank = {
     title: "Acolyte of the Veil (Grade I)",
     desc: "Active neural feeds established. Outer court exploration.",
     colorClass: "text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50 bg-teal-500/5",
     accentColor: "#0f766e",
     badge: "ACOLYTE"
   };
 } else if (totalComplexity > 20 && totalComplexity <= 60) {
   cultRank = {
     title: "Aesthetic Alchemist (Grade II)",
     desc: "Mastering pattern compilation and latent wardrobe synthesis.",
     colorClass: "text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 bg-purple-500/5",
     accentColor: "#7c3aed",
     badge: "ALCHEMIST"
   };
 } else if (totalComplexity > 60 && totalComplexity <= 120) {
   cultRank = {
     title: "Hierophant of the Lace (Grade III)",
     desc: "Profound conditioning. Highly structured latent output logs.",
     colorClass: "text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900/50 bg-amber-500/5",
     accentColor: "#d97706",
     badge: "HIEROPHANT"
   };
 } else if (totalComplexity > 120) {
   cultRank = {
     title: "Mimi High Sovereign (Grade IV)",
     desc: "Absolute aesthetic devotion. Complete control over the cybernetic grid.",
     colorClass: "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 bg-rose-500/5 animate-[pulse_3s_infinite]",
     accentColor: "#e11d48",
     badge: "SOVEREIGN"
   };
 }

 useEffect(() => {
 setNewUsername(profile?.handle || '');
 }, [profile?.handle]);

 useEffect(() => {
 if (!isEditingUsername) return;
 if (!newUsername || newUsername === profile?.handle) {
 setHandleAvailable(true);
 return;
 }
 if (newUsername.length < 2) {
 setHandleAvailable(null);
 return;
 }
 setIsCheckingHandle(true);
 const timer = setTimeout(async () => {
 const available = await isHandleAvailable(newUsername, user?.uid || '');
 setHandleAvailable(available);
 setIsCheckingHandle(false);
 }, 500);
 return () => clearTimeout(timer);
 }, [newUsername, user?.uid, profile?.handle, isEditingUsername]);

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (
 cardRef.current && 
 !cardRef.current.contains(event.target as Node) &&
 triggerRef.current &&
 !triggerRef.current.contains(event.target as Node)
 ) {
 onClose();
 }
 };

 if (isOpen) {
 document.addEventListener('mousedown', handleClickOutside);
 }
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [isOpen, onClose, triggerRef]);

 const handleSaveUsername = async () => {
 if (!profile || !newUsername.trim() || newUsername === profile.handle || handleAvailable === false) {
 setIsEditingUsername(false);
 return;
 }
 setIsSaving(true);
 try {
 await updateProfile({ ...profile, handle: newUsername.trim().toLowerCase() });
 setIsEditingUsername(false);
 } catch (e) {
 console.error("Failed to update username", e);
 } finally {
 setIsSaving(false);
 }
 };

 const handleSignOut = async () => {
 try {
 await signOut(getAuth());
 onClose();
 } catch (e) {
 console.error("Failed to sign out", e);
 }
 };

 const authProvider = user?.email?.includes('gmail') ? 'Google' : 'Email';

 return (
 <AnimatePresence>
 {isOpen && user && (
 <motion.div
 ref={cardRef}
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className="absolute top-full right-0 mt-2 w-80 bg dark:bg border border-nous-border rounded-none dark: overflow-hidden z-[100] relative"
 >
 {/* Texture Overlay */}
 <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/noise.png')] z-0 mix-blend-overlay"/>
 
 <div className="p-6 relative z-10">
 <div className="flex items-start gap-4 mb-6">
 <div className="w-16 h-16 rounded-none bg-nous-base border border-nous-border flex items-center justify-center overflow-hidden shrink-0">
 {profile?.photoURL ? (
 <img src={profile.photoURL} alt="Profile"className="w-full h-full object-cover"referrerPolicy="no-referrer"/>
 ) : (
 <User size={24} className="text-nous-subtle"/>
 )}
 </div>
 
 <div className="flex-1 min-w-0">
 {isEditingUsername ? (
 <div className="flex flex-col gap-1 mb-1">
 <div className="flex items-center gap-2">
 <input
 type="text"
 value={newUsername}
 onChange={(e) => setNewUsername(e.target.value)}
 className="w-full bg-nous-base border border-nous-border rounded-none px-2 py-1 text-sm focus:outline-none focus:border-nous-border dark:focus:border-nous-border text-nous-text "
 autoFocus
 onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
 />
 <button 
 onClick={handleSaveUsername}
 disabled={isSaving || handleAvailable === false}
 className="text-nous-subtle hover:text-nous-subtle text-xs font-bold uppercase tracking-wider disabled:opacity-50"
 >
 Save
 </button>
 </div>
 {isCheckingHandle && <div className="text-[10px] text-nous-subtle flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Checking...</div>}
 {!isCheckingHandle && handleAvailable === false && <div className="text-[10px] text-red-500">Handle unavailable</div>}
 {!isCheckingHandle && handleAvailable === true && newUsername !== profile?.handle && newUsername.length >= 2 && <div className="text-[10px] text-nous-subtle">Handle available</div>}
 </div>
 ) : (
 <div className="flex items-center gap-2 mb-1 group cursor-pointer"onClick={() => setIsEditingUsername(true)}>
 <h3 className="font-serif italic text-xl text-nous-text text-nous-text truncate">
 @{profile?.handle || 'Swan'}
 </h3>
 <Edit2 size={12} className="text-nous-subtle opacity-0 group-hover:opacity-100 transition-opacity"/>
 </div>
 )}
 
 <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-nous-subtle mb-1 truncate">
 <span>{authProvider} Authorized</span>
 <CheckCircle2 size={10} className="text-nous-subtle"/>
 </div>
 <div className="text-[10px] uppercase tracking-widest text-nous-subtle truncate">
 {user.email}
 </div>

 {/* Taste Embeddings Tag Cloud / Tagline */}
 {(profile?.tasteProfile?.dominantClusters?.length || profile?.tasteProfile?.aestheticSignature?.core_keywords?.length || profile?.tasteProfile?.dominant_archetypes?.length) ? (
 <div className="flex flex-col gap-1.5 mt-3">
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle/80">Semantic Clusters</span>
 <div className="flex flex-wrap gap-1.5">
 {(profile?.tasteProfile?.dominantClusters || profile?.tasteProfile?.aestheticSignature?.core_keywords || profile?.tasteProfile?.dominant_archetypes || []).slice(0, 4).map((tag, i) => (
 <span key={i} className="px-2 py-0.5 bg-nous-text/5 text-nous-text font-serif italic text-[10px] whitespace-nowrap">
 {typeof tag === 'string' ? tag.replace(/-/g, ' ') : tag}
 </span>
 ))}
 </div>
 </div>
 ) : (
 <div className="flex flex-col gap-1.5 mt-3">
 <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle/80">Semantic Clusters</span>
 <span className="text-nous-subtle/50 font-serif italic text-[10px]">Unclassified</span>
 </div>
 )}

 </div>
 </div>

 {/* Cult Devotion Rank Section */}
 <div className={`mt-4 mb-4 p-3 border rounded-none relative overflow-hidden flex flex-col gap-1 ${cultRank.colorClass}`}>
   <div className="flex justify-between items-center border-b border-stone-200/50 dark:border-stone-800 pb-1 mb-1">
     <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-1">
       <Award size={10} style={{ color: cultRank.accentColor }} /> Cult Devotion Rank
     </span>
     <span 
       className="font-mono text-[6px] px-1 py-0.5 border font-black tracking-widest"
       style={{ borderColor: cultRank.accentColor, color: cultRank.accentColor }}
     >
       {cultRank.badge}
     </span>
   </div>
   <div className="font-serif italic text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
     <span className="font-bold">{cultRank.title}</span>
   </div>
   <p className="text-[9px] text-stone-500 dark:text-stone-400 leading-normal italic">
     {cultRank.desc}
   </p>
   <div className="flex justify-between items-center text-[7px] font-mono text-stone-400 mt-1 pt-1 border-t border-dotted border-stone-200 dark:border-stone-800">
     <span>Rites logged: {dollsCount + zinesCount + shardsCount}</span>
     <span>Complexity: {totalComplexity}</span>
   </div>
 </div>

 <div className="space-y-3 pt-4 border-t border-nous-border">
 <div className="flex justify-between items-center">
 <span className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle">Membership Tier</span>
 <span className="font-serif italic text-sm text-nous-text">
 {PATRONAGE_PLAN_LABELS[normalizePlanTier(profile?.plan || profile?.planStatus)]}
 {profile?.subscriptionInterval === 'year' && ' (Annual)'}
 </span>
 </div>
 </div>
 </div>

 <div className="bg-nous-base /50 p-4 border-t border-nous-border">
 <button
 onClick={handleSignOut}
 className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-sans uppercase tracking-widest font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-none transition-colors"
 >
 <LogOut size={14} />
 Sign Out
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 );
};

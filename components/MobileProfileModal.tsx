import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 onOpenSettings: () => void;
}

export const MobileProfileModal: React.FC<Props> = ({ isOpen, onClose, onOpenSettings }) => {
 const { user, profile, logout } = useUser();

 if (!isOpen || !user) return null;

 return (
 <AnimatePresence>
 {isOpen && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
 onClick={onClose}
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 onClick={(e) => e.stopPropagation()}
 className="w-full sm:w-96 bg-nous-base rounded-none sm:rounded-none p-6 border-t border-nous-border pb-12"
 >
 <div className="flex justify-between items-center mb-8">
 <h2 className="text-2xl font-serif italic text-nous-text">Profile</h2>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-nous-text transition-colors">
 <X size={20} />
 </button>
 </div>

 <div className="flex flex-col items-center mb-8">
 {profile?.photoURL ? (
 <img src={profile.photoURL} alt="Profile"className="w-24 h-24 rounded-none object-cover border-4 border-white mb-4"/>
 ) : (
 <div className="w-24 h-24 rounded-none bg-stone-200 flex items-center justify-center border-4 border-white mb-4">
 <UserIcon size={40} className="text-nous-subtle"/>
 </div>
 )}
 <h3 className="text-xl font-medium text-nous-text">{profile?.displayName || 'Anonymous'}</h3>
 <p className="text-sm text-nous-subtle mt-1">{user.email}</p>
 
 {profile?.plan && profile.plan !== 'free' && (
 <div className={`mt-4 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-widest border ${
 profile.plan === 'lab' ? 'bg-nous-base text-nous-subtle border-nous-border /20 ' :
 profile.plan === 'pro' ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' :
 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
 }`}>
 Mimi {profile.plan}
 </div>
 )}
 </div>

 <div className="space-y-3">
 <button 
 onClick={() => { onClose(); onOpenSettings(); }}
 className="w-full flex items-center justify-between p-4 bg-white rounded-none border border-nous-border text-nous-subtle hover:bg-nous-base transition-colors"
 >
 <div className="flex items-center gap-3">
 <Settings size={18} />
 <span className="font-medium">Full Settings</span>
 </div>
 </button>
 
 <button 
 onClick={() => { logout(); onClose(); }}
 className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-none border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
 >
 <div className="flex items-center gap-3">
 <LogOut size={18} />
 <span className="font-medium">Log Out</span>
 </div>
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 );
};

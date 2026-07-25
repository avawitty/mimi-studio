
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Anchor, Sparkles, UserPlus, Fingerprint, Loader2, Check, Radio, Mail, Key } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

export const CliqueProtocol: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
 const { profile, updateProfile, user } = useUser();
 const [frequencyKey, setFrequencyKey] = useState('');
 const [isBinding, setIsBinding] = useState(false);
 const [success, setSuccess] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const myFrequency = useMemo(() => {
 if (!user?.uid) return"O2-VOID-000";
 return `O2-${user.uid.slice(0, 4).toUpperCase()}-${Math.floor(Math.random() * 999)}`;
 }, [user]);

 const handleAnchorMuse = async () => {
 if (!frequencyKey.trim() || !profile) return;
 
 if (!frequencyKey.startsWith('O2-')) {
 setError("The frequency key is structurally invalid. It must begin with O2-.");
 return;
 }

 setIsBinding(true);
 setError(null);
 
 // Simulate spectral handshake with the O2 Registry
 await new Promise(resolve => setTimeout(resolve, 2000));
 
 try {
 const updatedSynced = [...(profile.syncedUsers || []), frequencyKey.trim().toLowerCase()];
 const uniqueMuses = Array.from(new Set(updatedSynced));
 
 await updateProfile({
 ...profile,
 syncedUsers: uniqueMuses
 });
 
 setSuccess(true);
 setTimeout(() => {
 setSuccess(false);
 setFrequencyKey('');
 onClose();
 }, 2000);
 } catch (e) {
 setError("The O2 Registry rejected this frequency.");
 } finally {
 setIsBinding(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/40 /40 backdrop-blur-3xl">
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="relative w-full max-lg bg-white border border-nous-border rounded-none overflow-hidden"
 >
 <div className="p-10 md:p-14 space-y-12">
 <div className="flex justify-between items-start">
 <div className="space-y-2">
 <h2 className="font-serif text-4xl italic tracking-tighter">Clique Protocol.</h2>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">Anchoring New Muses</p>
 </div>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors">
 <X size={24} />
 </button>
 </div>

 <div className="space-y-8">
 <div className="flex items-center gap-4 p-6 bg-nous-base border border-nous-border rounded-none cursor-pointer active:scale-95 transition-all"onClick={() => {
 navigator.clipboard.writeText(myFrequency).catch(e => console.error("MIMI // Clipboard error", e));
 alert("Your frequency has been preserved to the clipboard.");
 }}>
 <div className="p-3 bg-white rounded-none">
 <Radio size={20} className="text-nous-subtle animate-pulse"/>
 </div>
 <div className="flex flex-col">
 <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">Your Frequency Key</span>
 <span className="font-mono text-xs text-nous-text  font-black tracking-tighter">
 {myFrequency}
 </span>
 </div>
 </div>

 <div className="space-y-4">
 <label htmlFor="frequencyKey"className="font-sans text-[9px] uppercase tracking-[0.5em] text-nous-subtle font-black block">Enter Muse Frequency</label>
 <input 
 id="frequencyKey"
 name="frequencyKey"
 type="text"
 value={frequencyKey}
 onChange={(e) => setFrequencyKey(e.target.value.toUpperCase())}
 placeholder="O2-XXXX-000"
 required
 pattern="O2-[A-Z0-9]{4}-[0-9]{3}"
 className="w-full bg-transparent border-b border-nous-border py-4 font-mono text-2xl font-black focus:outline-none focus:border-nous-text dark:focus:border-white transition-colors tracking-tighter"
 />
 <AnimatePresence>
 {error && (
 <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 font-sans text-[8px] uppercase tracking-widest font-black">
 {error}
 </motion.p>
 )}
 </AnimatePresence>
 </div>

 <button 
 onClick={handleAnchorMuse}
 disabled={!frequencyKey.trim() || isBinding || success}
 className={`w-full py-6 flex items-center justify-center gap-4 font-sans text-xs tracking-[0.6em] uppercase font-black transition-all active:scale-95 rounded-none ${success ? 'bg-nous-text text-nous-base' : 'bg-nous-text text-nous-base'}`}
 >
 {isBinding ? <Loader2 size={16} className="animate-spin"/> : success ? <Check size={16} /> : <Anchor size={16} />}
 <span>{isBinding ? 'Calibrating Sync' : success ? 'Frequency Locked' : 'Anchor Muse'}</span>
 </button>
 </div>

 <div className="pt-8 border-t border-nous-border text-center space-y-4">
 <div className="flex items-center justify-center gap-3 opacity-20">
 <Key size={12} />
 <div className="h-px w-12 bg-stone-400"/>
 <Sparkles size={12} />
 </div>
 <p className="font-serif italic text-nous-subtle text-xs px-4">
 Exchange frequencies to bind your aesthetic manifests.
 </p>
 </div>
 </div>
 </motion.div>
 </div>
 );
};

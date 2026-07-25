
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Crown, Key, Copy, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

export const PatronMintView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
 const { user } = useUser();
 const [step, setStep] = useState<'forging' | 'minted'>('forging');
 const [key, setKey] = useState('');
 const [copied, setCopied] = useState(false);

 useEffect(() => {
 // Simulate the"Forging"of a unique key
 const timer = setTimeout(() => {
 const randomSegment = Math.random().toString(36).substring(2, 6).toUpperCase();
 const timestamp = Date.now().toString().slice(-4);
 // Format: MIMI-IMP-[RANDOM]-[TIME]
 setKey(`MIMI-IMP-${randomSegment}-${timestamp}`);
 setStep('minted');
 }, 3000);
 return () => clearTimeout(timer);
 }, []);

 const handleCopy = () => {
 navigator.clipboard.writeText(key).catch(e => console.error("MIMI // Clipboard error", e));
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const handleProceed = () => {
 // In a real app, you might auto-inject this key. 
 // Here we let the user perform the ritual of entering it.
 window.dispatchEvent(new CustomEvent('mimi:change_view', { 
 detail: 'profile',
 detail_data: { section: 'patronage', prefill: key }
 }));
 };

 return (
 <div className="fixed inset-0 z-[20000] bg dark:bg flex flex-col items-center justify-center p-8 transition-colors duration-1000">
 
 {/* Background Texture */}
 <div className="absolute inset-0 pointer-events-none opacity-[0.05]"style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

 <div className="max-w-lg w-full relative z-10 text-center space-y-12">
 
 {step === 'forging' && (
 <motion.div 
 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
 className="flex flex-col items-center gap-8"
 >
 <div className="relative">
 <div className="absolute inset-0 border-t-2 border-amber-500 rounded-none animate-[spin_2s_linear_infinite]"/>
 <div className="w-24 h-24 border border-nous-border rounded-none flex items-center justify-center">
 <Crown size={32} className="text-amber-500 animate-pulse"/>
 </div>
 </div>
 <div className="space-y-2">
 <h1 className="font-serif text-4xl italic text-nous-text ">Forging Key...</h1>
 <p className="font-sans text-[9px] uppercase tracking-[0.4em] text-nous-subtle font-black">Verifying Patronage Protocol</p>
 </div>
 </motion.div>
 )}

 {step === 'minted' && (
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
 className="space-y-12"
 >
 <div className="space-y-4">
 <div className="w-16 h-16 bg-amber-500 text-white rounded-none flex items-center justify-center mx-auto mb-6">
 <Key size={32} />
 </div>
 <h1 className="font-serif text-5xl md:text-6xl italic text-nous-text text-nous-text tracking-tighter">Sovereign Grant.</h1>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">Your Imperial Access Code</p>
 </div>

 <div className="p-8 bg-white border border-nous-border rounded-none relative overflow-hidden group">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 to-amber-600"/>
 <p className="font-mono text-2xl md:text-3xl text-center tracking-widest text-nous-text text-nous-text font-black select-all">
 {key}
 </p>
 <div className="flex justify-center mt-6">
 <button 
 onClick={handleCopy}
 className="flex items-center gap-2 px-4 py-2 bg-nous-base rounded-none font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-amber-500 transition-colors"
 >
 {copied ? <Check size={12} /> : <Copy size={12} />}
 {copied ? 'Copied to Clipboard' : 'Copy Key'}
 </button>
 </div>
 </div>

 <div className="space-y-4">
 <p className="font-serif italic text-nous-subtle text-sm">
"This key is your permanent bond to the registry. Enter it in your profile to dissolve the limits."
 </p>
 <button 
 onClick={handleProceed}
 className="w-full py-5 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-[0.4em] font-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
 >
 Enter Registry <ArrowRight size={14} />
 </button>
 </div>
 </motion.div>
 )}

 </div>
 </div>
 );
};


// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, Globe, Twitter, Instagram, Send, ExternalLink, Zap } from 'lucide-react';
import { ZineMetadata } from '../types';
import { getFishShareUrl } from '../lib/siteHost';

interface SocialShareModalProps {
 metadata: ZineMetadata;
 onClose: () => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ metadata, onClose }) => {
 const [copied, setCopied] = useState(false);
 const imperialUrl = getFishShareUrl(metadata.id);
 
 // NARRATIVE POSITIONING
 const shareText = `Published from Mimi — provenance intact: "${metadata.title}".`;

 const handleCopy = () => {
 navigator.clipboard.writeText(imperialUrl).catch(e => console.error("MIMI // Clipboard error", e));
 setCopied(true);
 setTimeout(() => setCopied(false), 3000);
 };

 const handleNativeShare = async () => {
 if (navigator.share) {
 try {
 await navigator.share({
 title: `Mimi // ${metadata.title}`,
 text: shareText,
 url: imperialUrl,
 });
 } catch (err) {
 console.warn("MIMI // Native Share cancelled.");
 }
 } else {
 handleCopy();
 }
 };

 const shareToX = () => {
 const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(imperialUrl)}`;
 window.open(url, '_blank');
 };

 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-nous-base/80 backdrop-blur-xl selection:bg-nous-base0 selection:text-white"
 >
 <motion.div 
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 data-surface="public"
 className="relative w-full max-w-md bg-[var(--mimi-field,#ffffff)] rounded-none border border-[var(--mimi-ink,#0a0a0a)] overflow-hidden"
 >
 <div className="p-8 md:p-10 space-y-8">
 <div className="flex justify-between items-start">
 <div className="space-y-2">
 <div className="flex items-center gap-3 text-[var(--mimi-stone,#78716c)]">
 <Share2 size={16} />
 <span className="font-sans text-[9px] uppercase tracking-[0.28em] font-semibold">Share</span>
 </div>
 <h2 className="font-serif text-3xl italic tracking-tight text-[var(--mimi-ink,#0a0a0a)]">Mimi</h2>
 <p className="font-serif italic text-lg text-[var(--mimi-stone,#78716c)]">Share this plate via mimi.fish.</p>
 </div>
 <button onClick={onClose} className="p-2 text-nous-subtle hover:text-nous-text hover:text-nous-text transition-all"><X size={20}/></button>
 </div>

 <div className="space-y-6">
 {/* THE IMPERIAL LINK */}
 <div className="bg-nous-base p-6 rounded-none border border-black/5 /5 space-y-4">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-black rounded-none overflow-hidden flex-shrink-0 border border-white/10">
 <img 
 src={metadata.coverImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.title)}&background=1c1917&color=fff`} 
 className="w-full h-full object-cover grayscale opacity-60"
 />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-serif italic text-lg text-nous-text  truncate">"{metadata.title}"</p>
 <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">Ref: {metadata.id.slice(-4)}</span>
 </div>
 </div>
 
 <div className="relative group">
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-nous-subtle">
 <Globe size={12} />
 </div>
 <input 
 readOnly 
 value={imperialUrl} 
 className="w-full bg-white border border-nous-border rounded-none py-3 pl-10 pr-12 font-mono text-[9px] text-nous-subtle focus:outline-none"
 />
 <button 
 onClick={handleCopy} 
 className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 transition-all ${copied ? 'text-nous-subtle scale-110' : 'text-nous-subtle hover:text-nous-text '}`}
 title="Copy Imperial Link"
 >
 {copied ? <Check size={14} /> : <Copy size={14} />}
 </button>
 </div>
 </div>

 {/* ACTION GRID */}
 <div className="grid grid-cols-2 gap-4">
 <button 
 onClick={shareToX}
 className="flex flex-col items-center justify-center gap-3 py-6 bg-nous-base border border-nous-border rounded-none hover:bg-nous-base dark:hover:bg-stone-700 transition-all group"
 >
 <Twitter size={20} className="text-nous-text text-nous-text group-hover:scale-110 transition-transform"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Twitter / X</span>
 </button>

 <button 
 onClick={handleNativeShare}
 className="flex flex-col items-center justify-center gap-3 py-6 bg-nous-base border border-nous-border rounded-none hover:bg-nous-base dark:hover:bg-stone-700 transition-all group"
 >
 <Send size={20} className="text-nous-subtle group-hover:scale-110 transition-transform"/>
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Share Sheet</span>
 </button>
 </div>

 {/* INSTAGRAM NOTE */}
 <div className="p-5 bg-amber-500/5 rounded-none border border-amber-500/10 space-y-3">
 <div className="flex items-center gap-3 text-amber-500">
 <Instagram size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black italic">The Story Protocol</span>
 </div>
 <p className="font-serif italic text-xs text-nous-subtle leading-relaxed">
 Download the high-fidelity plates from the <span className="text-nous-text text-nous-text underline">Export Chamber</span>. Attach your <span className="font-bold">Imperial Link</span> to IG Stories to anchor the witness.
 </p>
 </div>
 </div>
 </div>

 <div className="p-6 border-t border-nous-border text-center bg-nous-base/50 /20">
 <p className="font-serif italic text-[10px] text-nous-subtle">"The artifact and the anchor must remain tethered."</p>
 </div>
 </motion.div>
 </motion.div>
 );
};


// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, QrCode } from 'lucide-react';

export const ManifestSignet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
 // DYNAMIC ANCHOR: Uses the current origin to avoid manual forwarding rituals.
 const IMPERIAL_URL = typeof window !== 'undefined' ? window.location.origin : 'https://mimi.you';

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-white/60 /80 backdrop-blur-3xl">
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="relative w-full max-md bg-white border border-nous-border rounded-none p-10 md:p-14 text-center space-y-10"
 >
 <button onClick={onClose} className="absolute top-6 right-6 p-2 text-nous-subtle hover:text-nous-text hover:text-nous-text transition-colors">
 <X size={24} />
 </button>

 <div className="space-y-3">
 <h2 className="font-serif text-4xl italic tracking-tighter">Imperial Anchor.</h2>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">Transfer Frequency to Mobile</p>
 </div>

 <div className="bg-white p-6 md:p-8 inline-block rounded-none border border-nous-border">
 <img 
 src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(IMPERIAL_URL)}&bgcolor=ffffff&color=1c1917&margin=2`} 
 className="w-48 h-48 md:w-64 md:h-64"
 alt="Manifest QR"
 />
 </div>

 <div className="space-y-6">
 <p className="font-serif italic text-nous-subtle text-sm px-4">
"Scan this signet to manifest Mimi within a sovereign mobile chamber. The Imperial Link is the only immutable path."
 </p>
 
 <div className="flex flex-col gap-3">
 <button 
 onClick={() => {
 navigator.clipboard.writeText(IMPERIAL_URL).catch(e => console.error("MIMI // Clipboard error", e));
 alert("Imperial Link Preserved.");
 }}
 className="flex items-center justify-center gap-3 w-full py-4 border border-nous-border rounded-none font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text hover:text-nous-text transition-all"
 >
 <Smartphone size={14} /> Copy Imperial URL
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 );
};

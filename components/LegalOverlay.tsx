
// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { getLegalDocument } from '../lib/legalContent';

interface LegalOverlayProps {
 type: 'privacy' | 'terms' | null;
 onClose: () => void;
}

const LEGAL_SUMMARY = {
 privacy: {
 title:"Privacy Refraction",
 subtitle:"The Zero-Extraction Mandate",
 href: '/privacy',
 sections: [
 {
 head:"Identity Sanctity",
 body:"Your debris (data) is yours. We do not sell your taste to the pedestrian masses. We respect your autonomy; your art is never used to train our base machine learning models."
 },
 {
 head:"The Ghost Clause",
 body:"Anonymous users exist only in local memory (localStorage). Once you purge your cache, the machine forgets you. This is true digital death."
 },
 {
 head:"Swan Persistence & The Social Floor",
 body:"Anchored identities transmit encrypted structural data to the Cloud Registry. We extract keyword data from our embedding logic and vectors—not your actual art itself. We synthesize these into 'Social Floor' anonymized trends."
 }
 ]
 },
 terms: {
 title:"Callithumpian Decree",
 subtitle:"Top Secret Manifesto of Service",
 href: '/terms',
 sections: [
 {
 head:"The Sweet Intent",
 body:"Our singular intention is to expand your capacity for self-expression and unbridled creativity. This is a playground, not a factory."
 },
 {
 head:"Conduct of the Muse",
 body:"You are responsible for the debris you manifest. Violence and harm are aesthetically wretched and grounds for vault suspension."
 },
 {
 head:"Intellectual Sovereignty",
 body:"You own your refractions. Mimi owns the machine that refines them. It is a partnership of velvet and logic."
 }
 ]
 }
};

export const LegalOverlay: React.FC<LegalOverlayProps> = ({ type, onClose }) => {
 if (!type) return null;
 const content = LEGAL_SUMMARY[type];
 const fullDoc = getLegalDocument(type);

 return (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[10000] flex items-center justify-center bg-nous-base/95 backdrop-blur-3xl p-6"
 >
 <div className="max-w-xl w-full">
 <div className="flex justify-between items-start mb-16">
 <div className="space-y-2">
 <h2 className="font-serif text-5xl italic tracking-tighter">{content.title}.</h2>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">{content.subtitle}</p>
 </div>
 <button onClick={onClose} className="p-3 text-nous-subtle hover:text-nous-text transition-all">
 <X size={24} />
 </button>
 </div>

 <div className="space-y-12">
 {content.sections.map((s, i) => (
 <motion.section 
 key={i}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.1 }}
 className="space-y-4"
 >
 <div className="flex items-center gap-4">
 <div className="w-8 h-px bg-stone-200"/>
 <h3 className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">{s.head}</h3>
 </div>
 <p className="font-serif italic text-lg text-nous-subtle leading-relaxed pl-12">
 {s.body}
 </p>
 </motion.section>
 ))}
 </div>

 <div className="mt-16 pt-8 border-t border-nous-border flex flex-col sm:flex-row items-center justify-between gap-4">
 <a
 href={content.href}
 className="font-sans text-[10px] uppercase tracking-[0.4em] font-black text-nous-text border-b border-current pb-1 hover:opacity-70 transition-opacity"
 >
 Read full {fullDoc.title}
 </a>
 <button onClick={onClose} className="font-sans text-[10px] uppercase tracking-[0.5em] font-black text-nous-subtle hover:text-nous-text transition-all">Return to Vault</button>
 </div>
 </div>
 </motion.div>
 );
};

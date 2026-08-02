// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { getLegalDocument, legalPathFor } from '../lib/legalContent';

interface LegalOverlayProps {
 type: 'privacy' | 'terms' | null;
 onClose: () => void;
}

const LEGAL_SUMMARY = {
 privacy: {
 title: "Privacy",
 subtitle: "How we look after your information",
 href: legalPathFor('privacy'),
 sections: [
 {
 head: "Your work stays yours",
 body: "We do not sell your personal information or your creative work. Your private studio material is not used to train public foundation models."
 },
 {
 head: "Guest mode stays local",
 body: "If you explore as a guest, much of what you make can stay in your browser. Clearing your cache can remove it — so sign in when you want a lasting archive."
 },
 {
 head: "Publishing & Mean Median Mode",
 body: "When you publish to The Proscenium and acknowledge the disclosure, eligible structure — themes, motifs, inquiry types, and form — may contribute anonymized signals to Mean Median Mode inside The Observatory. Your private Studio, Tailor memory, and personal Scry stay out of that readout, and we do not show exact private wording as collective data."
 }
 ]
 },
 terms: {
 title: "Terms of Service",
 subtitle: "A fair agreement for using Mimi",
 href: legalPathFor('terms'),
 sections: [
 {
 head: "Made for making",
 body: "Mimi is here to help you express yourself. This is a creative studio — use it kindly, and we will too."
 },
 {
 head: "Be good to the space",
 body: "You are responsible for what you create and share. Harassment, harm, and illegal content are not welcome and can lead to account suspension."
 },
 {
 head: "You own your work",
 body: "You keep ownership of what you make. Mimi only gets the limited rights needed to host, show, and operate the service — including public work you choose to publish."
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
 <h2 className="font-serif text-5xl italic tracking-tighter">{content.title}</h2>
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
 <button onClick={onClose} className="font-sans text-[10px] uppercase tracking-[0.5em] font-black text-nous-subtle hover:text-nous-text transition-all">Close</button>
 </div>
 </div>
 </motion.div>
 );
};

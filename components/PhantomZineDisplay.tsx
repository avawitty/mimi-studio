import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ZinePage, EditorElement, UserProfile } from '../types';
import { AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { applyTreatment } from '../services/geminiService';

interface PhantomZineDisplayProps {
 page: ZinePage;
 profile: UserProfile;
}

export const PhantomZineDisplay: React.FC<PhantomZineDisplayProps> = ({ page, profile }) => {
 const [elements, setElements] = useState<EditorElement[]>(page.customLayout?.elements || []);

 const tailorDraft = profile?.tailorDraft;
 const fontFamily = tailorDraft?.expressionEngine?.typographyIntent?.styleDescription || 'Inter';
 const baseHex = tailorDraft?.expressionEngine?.chromaticRegistry?.baseNeutral || '#FFFFFF';
 const accentHex = tailorDraft?.expressionEngine?.chromaticRegistry?.accentSignal || '#000000';

 const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=swap`;

 const handleHarmonize = async (el: EditorElement) => {
 if (!el.content.startsWith('data:image')) return;
 
 setElements(prev => prev.map(e => e.id === el.id ? { ...e, harmonizing: true } : e));
 
 try {
 const treatment = profile.savedTreatments?.[0];
 const instruction = treatment ? (treatment.canonicalTaste?.prompt_fragments?.join(' ') || treatment.canonicalTaste?.motifs?.join(', ') || 'Make it look editorial, high contrast, film photography style.') : 'Make it look editorial, high contrast, film photography style.';
 const mimeType = el.content.split(';')[0].split(':')[1];
 const base64 = el.content.split(',')[1];
 
 const harmonizedBase64 = await applyTreatment(base64, instruction, profile);
 
 if (harmonizedBase64) {
 const newContent = `data:${mimeType};base64,${harmonizedBase64}`;
 setElements(prev => prev.map(e => e.id === el.id ? { 
 ...e, 
 content: newContent, 
 harmonizing: false,
 aestheticViolation: { isViolation: false, reason: 'Harmonized' }
 } : e));
 } else {
 throw new Error("Harmonization failed");
 }
 } catch (error) {
 console.error("Failed to harmonize:", error);
 setElements(prev => prev.map(e => e.id === el.id ? { ...e, harmonizing: false } : e));
 }
 };

 return (
 <>
 <link href={fontUrl} rel="stylesheet"/>
 <div 
 className="relative w-full h-full bg-nous-base/50 backdrop-blur-xl border border-white/10 overflow-hidden rounded-none flex items-center justify-center p-8"
 style={{ 
 fontFamily: `'${fontFamily}', sans-serif`,
 '--zine-base-color': baseHex,
 '--zine-accent-color': accentHex,
 } as React.CSSProperties}
 >
 <div className="relative w-full max-w-2xl aspect-[3/4] bg-white"style={{ backgroundColor: 'var(--zine-base-color)' }}>
 {elements.sort((a,b) => (a.style.zIndex || 0) - (b.style.zIndex || 0)).map(el => (
 <motion.div 
 key={el.id} 
 className="absolute"
 style={{ 
 top: `${el.style.top}%`, 
 left: `${el.style.left}%`, 
 width: `${el.style.width}%`, 
 height: el.style.height ? `${el.style.height}%` : undefined, 
 rotate: `${el.style.rotation}deg`, 
 zIndex: el.style.zIndex,
 opacity: el.style.opacity
 }}
 >
 {el.type === 'image' && (
 <div className="relative w-full h-full group">
 <img src={el.content} className="w-full h-full object-cover pointer-events-none"style={{ filter: el.style.filter || 'none' }}/>
 {el.aestheticViolation?.isViolation && (
 <div className="absolute inset-0 border-2 border-red-500/50 pointer-events-none flex items-start justify-end p-2">
 <Tooltip text={el.aestheticViolation.reason}>
 <AlertCircle size={16} className="text-red-500 animate-pulse"/>
 </Tooltip>
 </div>
 )}
 {el.aestheticViolation?.isViolation && (
 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 whileHover={{ scale: 1 }}
 className="flex flex-col items-center gap-3 text-center"
 >
 {el.harmonizing ? (
 <div className="flex flex-col items-center gap-2">
 <Loader2 size={16} className="animate-spin text-white/60"/>
 <span className="text-[8px] uppercase tracking-[0.3em] text-white/60">Refracting...</span>
 </div>
 ) : (
 <>
 <p className="text-[7px] text-white/40 font-mono uppercase tracking-[0.4em]">Latent Instruction</p>
 <p className="text-[9px] text-white italic leading-tight max-w-[140px] line-clamp-2">
 "{profile.savedTreatments?.[0]?.canonicalTaste?.prompt_fragments?.[0] || 'Editorial Synthesis'}"
 </p>
 <button 
 onClick={(e) => { e.stopPropagation(); handleHarmonize(el); }}
 className="mt-2 bg-white text-black px-4 py-1.5 text-[8px] uppercase tracking-[0.3em] font-black hover:bg-stone-200 transition-colors"
 >
 Refract
 </button>
 </>
 )}
 </motion.div>
 </div>
 )}
 </div>
 )}
 {el.type === 'text' && (
 <div style={{ 
 fontFamily: (el.style.fontFamily === 'serif' || el.style.fontFamily === 'sans') ? `'${fontFamily}', sans-serif` : el.style.fontFamily, 
 fontSize: `${el.style.fontSize}rem`, 
 color: el.style.color, 
 lineHeight: el.style.lineHeight, 
 fontWeight: el.style.fontWeight, 
 textAlign: el.style.textAlign as any 
 }}>
 {el.content}
 </div>
 )}
 </motion.div>
 ))}
 </div>
 </div>
 </>
 );
};

import React from 'react';
import { ZineGenerationOptions, UserProfile } from '../types';
import { SUPERINTELLIGENCE_PROMPTS } from '../constants';
import { Check, Wand2, Settings2 } from 'lucide-react';

interface ZineConfigurationProps {
 zineOptions: ZineGenerationOptions;
 setZineOptions: (options: ZineGenerationOptions) => void;
 profile?: UserProfile | null;
 onSelectPrompt?: (prompt: string) => void;
}

export const ZineConfiguration: React.FC<ZineConfigurationProps> = ({ zineOptions, setZineOptions, profile, onSelectPrompt }) => {
 return (
 <div className="flex flex-col gap-8 w-full">
 {/* Saved Treatments */}
 <div className="flex flex-col gap-4">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 /60 flex items-center gap-2">
 <Wand2 size={12} />
 Saved Treatments
 </label>
 
 <div className="grid grid-cols-1 gap-2">
 <button
 onClick={() => setZineOptions({...zineOptions, selectedTreatmentId: undefined})}
 className={`text-left p-3 border rounded-none transition-colors flex items-center justify-between ${!zineOptions.selectedTreatmentId ? 'border-primary  bg-primary/5 /5' : 'border-nous-border hover:border-primary/50 dark:hover:border-white/50'}`}
 >
 <div>
 <p className={`font-sans text-xs uppercase tracking-widest ${!zineOptions.selectedTreatmentId ? 'text-primary text-nous-text font-bold' : 'text-nous-subtle'}`}>Default / Manual</p>
 <p className="text-[10px] text-nous-subtle mt-1">Use manual directives or default Tailor logic.</p>
 </div>
 {!zineOptions.selectedTreatmentId && <Check size={14} className="text-primary text-nous-text"/>}
 </button>

 {profile?.savedTreatments?.map(t => (
 <button
 key={t.id}
 onClick={() => setZineOptions({...zineOptions, selectedTreatmentId: t.id})}
 className={`text-left p-3 border rounded-none transition-colors flex items-center justify-between ${zineOptions.selectedTreatmentId === t.id ? 'border-nous-border bg-nous-base0/5' : 'border-nous-border hover:border-nous-border /50'}`}
 >
 <div>
 <p className={`font-serif italic text-sm ${zineOptions.selectedTreatmentId === t.id ? 'text-nous-subtle' : 'text-nous-subtle '}`}>{t.treatmentName}</p>
 <p className="text-[10px] font-mono text-nous-subtle mt-1 line-clamp-1">{t.canonicalTaste?.motifs?.join(', ')}</p>
 </div>
 {zineOptions.selectedTreatmentId === t.id && <Check size={14} className="text-nous-subtle"/>}
 </button>
 ))}
 </div>
 </div>

 {/* Manual Directives */}
 <div className={`flex flex-col gap-4 transition-opacity duration-300 ${zineOptions.selectedTreatmentId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60 flex items-center gap-2">
 <Settings2 size={12} />
 Manual Directives
 </label>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4 border border-nous-border rounded-none bg-nous-base /30">
 <div className="flex flex-col gap-2">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Style</label>
 <select 
 value={zineOptions.style} 
 onChange={(e) => setZineOptions({...zineOptions, style: e.target.value as any})}
 className="bg-transparent border-b border-primary/20 /20 text-sm font-sans text-primary text-nous-text focus:outline-none focus:border-primary dark:focus:border-white pb-2 cursor-pointer"
 >
 <option value="minimalist"className="bg-nous-base">Minimalist</option>
 <option value="maximalist"className="bg-nous-base">Maximalist</option>
 <option value="experimental"className="bg-nous-base">Experimental</option>
 <option value="balanced"className="bg-nous-base">Balanced</option>
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Theme</label>
 <select 
 value={zineOptions.theme} 
 onChange={(e) => setZineOptions({...zineOptions, theme: e.target.value as any})}
 className="bg-transparent border-b border-primary/20 /20 text-sm font-sans text-primary text-nous-text focus:outline-none focus:border-primary dark:focus:border-white pb-2 cursor-pointer"
 >
 <option value="organic"className="bg-nous-base">Organic</option>
 <option value="synthetic"className="bg-nous-base">Synthetic</option>
 <option value="latent"className="bg-nous-base">Latent</option>
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Content Focus</label>
 <select 
 value={zineOptions.contentFocus} 
 onChange={(e) => setZineOptions({...zineOptions, contentFocus: e.target.value as any})}
 className="bg-transparent border-b border-primary/20 /20 text-sm font-sans text-primary text-nous-text focus:outline-none focus:border-primary dark:focus:border-white pb-2 cursor-pointer"
 >
 <option value="visual-heavy"className="bg-nous-base">Visual-heavy</option>
 <option value="text-heavy"className="bg-nous-base">Text-heavy</option>
 <option value="balanced"className="bg-nous-base">Balanced</option>
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Aesthetic Tone</label>
 <select 
 value={zineOptions.aestheticTone || ''} 
 onChange={(e) => setZineOptions({...zineOptions, aestheticTone: e.target.value as any})}
 className="bg-transparent border-b border-primary/20 /20 text-sm font-sans text-primary text-nous-text focus:outline-none focus:border-primary dark:focus:border-white pb-2 cursor-pointer"
 >
 <option value=""className="bg-nous-base">Select Tone</option>
 <option value="Cinematic"className="bg-nous-base">Cinematic</option>
 <option value="Editorial"className="bg-nous-base">Editorial</option>
 <option value="Dreamy"className="bg-nous-base">Dreamy</option>
 <option value="Industrial"className="bg-nous-base">Industrial</option>
 <option value="Noir"className="bg-nous-base">Noir</option>
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Reading Level</label>
 <select 
 value={zineOptions.readingLevel || 'short'} 
 onChange={(e) => setZineOptions({...zineOptions, readingLevel: e.target.value as any})}
 className="bg-transparent border-b border-primary/20 /20 text-sm font-sans text-primary text-nous-text focus:outline-none focus:border-primary dark:focus:border-white pb-2 cursor-pointer"
 >
 <option value="short"className="bg-nous-base">Short Read (2-4 min)</option>
 <option value="slow"className="bg-nous-base">Slow Read (10-15 min)</option>
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Composition Mix</label>
 <select 
 value={zineOptions.compositionMix || 'uniform'} 
 onChange={(e) => setZineOptions({...zineOptions, compositionMix: e.target.value as any})}
 className="bg-transparent border-b border-primary/20 /20 text-sm font-sans text-primary text-nous-text focus:outline-none focus:border-primary dark:focus:border-white pb-2 cursor-pointer"
 >
 <option value="uniform" className="bg-nous-base">Uniform (Standard)</option>
 <option value="editorial_mix" className="bg-nous-base">Editorial Mix (Portrait, Texture, Text-post, Conceptual)</option>
 </select>
 </div>
 <div className="flex flex-col gap-2 md:col-span-2">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Art Style</label>
 <input 
 type="text"
 value={zineOptions.artStyle || ''}
 onChange={(e) => setZineOptions({...zineOptions, artStyle: e.target.value})}
 placeholder="e.g. Bauhaus, Cyberpunk, Impressionist..."
 className="bg-transparent border-b border-primary/20 /20 text-sm font-sans text-primary text-nous-text focus:outline-none focus:border-primary dark:focus:border-white pb-2 w-full"
 />
 </div>
 <div className="flex flex-col gap-2 md:col-span-2 mt-4">
 <label className="flex items-center gap-2 cursor-pointer">
 <input 
 type="checkbox" 
 checked={zineOptions.includeGeoBlock || false}
 onChange={(e) => setZineOptions({...zineOptions, includeGeoBlock: e.target.checked})}
 className="accent-primary"
 />
 <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60">Structured Output (GEO)</span>
 </label>
 <p className="text-[9px] text-nous-subtle font-sans ml-5">Append a Generative Engine Optimization block to the output.</p>
 </div>

 {/* Image Enhancement & Upscaling Toggle */}
 <div className="flex flex-col gap-3 md:col-span-2 pt-4 border-t border-nous-border/60">
   <label className="flex items-center justify-between cursor-pointer group">
     <div className="flex items-center gap-2.5">
       <input 
         type="checkbox" 
         checked={zineOptions.imageEnhancement || false}
         onChange={(e) => setZineOptions({...zineOptions, imageEnhancement: e.target.checked, imageFilter: e.target.checked ? (zineOptions.imageFilter || 'upscale') : 'none'})}
         className="accent-purple-600 rounded-sm cursor-pointer w-4 h-4"
       />
       <div className="flex flex-col">
         <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-nous-text group-hover:text-purple-500 transition-colors">
           Image Enhancement & Upscaling
         </span>
         <span className="text-[9px] text-nous-subtle font-sans">
           Upscale generated images to high-fidelity 2K resolution and apply custom artistic filters.
         </span>
       </div>
     </div>
   </label>

   {zineOptions.imageEnhancement && (
     <div className="mt-1 pl-6 flex flex-col gap-1.5">
       <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-nous-subtle">
         Post-Processing Filter Preset
       </label>
       <select 
         value={zineOptions.imageFilter || 'upscale'} 
         onChange={(e) => setZineOptions({...zineOptions, imageFilter: e.target.value as any})}
         className="bg-nous-base border border-nous-border text-xs font-mono text-nous-text p-2 rounded-xs focus:outline-none focus:border-purple-500 cursor-pointer"
       >
         <option value="upscale">2K High-Definition Upscale (Clean)</option>
         <option value="grain">35mm Analog Film Grain</option>
         <option value="duotone">Film Noir Duotone (High Contrast)</option>
         <option value="vivid">Vivid Editorial Saturation</option>
         <option value="vintage">Vintage Chrome Sepia</option>
       </select>
     </div>
   )}
 </div>
 </div>
 </div>
 
 <div className="pt-8 border-t border-primary/10 /10">
 <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 text-nous-text/60 mb-4 block">Superintelligence Prompts</label>
 <div className="flex flex-wrap gap-2">
 {SUPERINTELLIGENCE_PROMPTS.map((p, i) => (
 <button 
 key={i}
 onClick={() => onSelectPrompt && onSelectPrompt(p.prompt)}
 className="text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 border border-primary/20 /20 text-primary text-nous-text hover:bg-primary hover:text-nous-text dark:hover:bg-white dark:hover:text-primary transition-colors"
 >
 {p.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 );
};

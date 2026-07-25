import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Image as ImageIcon, Link as LinkIcon, FileText, ArrowRight, Eye, ShieldCheck, HelpCircle, Check } from 'lucide-react';

export const BeforeAfterGrid: React.FC = () => {
  return (
    <div className="w-full border border-nous-border/40 bg-[#FDFBF7] dark:bg-[#0A0A0A] p-6 mb-8 text-left transition-colors duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-30 select-none">
        <Sparkles size={16} className="text-nous-subtle animate-pulse" />
      </div>

      <div className="mb-6">
        <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-nous-accent font-black block mb-1">
          Aesthetic Transformation Grid & Showcase
        </span>
        <h2 className="font-serif text-2xl font-normal text-nous-text tracking-tight italic" style={{ lineHeight: '1.1' }}>
          Refining raw signals into Symbolic Authority.
        </h2>
        <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mt-1.5 list-none leading-relaxed">
          From a fragmented directory of visual reference noise into a structured brand trajectory.
        </p>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        {/* Divider line for desktop */}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-nous-border/30 transform -translate-x-1/2" />

        {/* BEFORE SIDE (THE MESSY INPUT DIR) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-nous-border/25 pb-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#861919] font-black">
              Raw Feed // Fragmented Reference Directory
            </span>
            <span className="font-mono text-[8px] uppercase text-nous-subtle border border-[#861919]/20 px-1.5 py-0.5 bg-red-50/10">
              Noise State
            </span>
          </div>

          <div className="space-y-3 opacity-70">
            {/* Mesh 1: screenshots */}
            <div className="p-3 bg-nous-base/40 border border-nous-border/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-nous-subtle" />
                <span className="font-mono text-[10px] text-nous-subtle">Screenshot_2026-05-24_0114.png</span>
              </div>
              <span className="font-mono text-[8px] text-[#861919] uppercase">[2.4 MB unparsed]</span>
            </div>

            {/* Mesh 2: broken links */}
            <div className="p-3 bg-nous-base/40 border border-nous-border/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-nous-subtle" />
                <span className="font-mono text-[10px] text-nous-subtle truncate max-w-[180px]">pinterest.com/pin/8348924982/ref...</span>
              </div>
              <span className="font-mono text-[8px] text-[#861919] uppercase">[No context tags]</span>
            </div>

            {/* Mesh 3: unorganized notes */}
            <div className="p-3 bg-nous-base/40 border border-nous-border/15 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-nous-subtle" />
                <span className="font-mono text-[10px] text-nous-text font-semibold">Notes Draft.txt</span>
              </div>
              <p className="font-serif italic text-xs text-nous-subtle leading-normal">
                "We want that 90s look ... minimalist but very expensive looking ... black and eggshell color palette with heavy concrete backgrounds. Avoid marketing jargon please."
              </p>
            </div>
            
            {/* Mesh 4: random image */}
            <div className="p-3 bg-nous-base/40 border border-nous-border/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-nous-subtle" />
                <span className="font-mono text-[10px] text-nous-subtle">Outfit_Reference_Final3.jpg</span>
              </div>
              <span className="font-mono text-[8px] text-nous-subtle uppercase">Unsorted</span>
            </div>
          </div>
        </div>

        {/* AFTER SIDE (THE STRUCTURED TASTE MATRIX) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-nous-border/25 pb-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#1e3a24] dark:text-[#a7f3d0] font-black">
              Taste Matrix // Living Brand Blueprint
            </span>
            <span className="font-mono text-[8px] uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 bg-emerald-500/10 flex items-center gap-1 font-semibold">
              <Check className="w-2.5 h-2.5" /> Synthesized
            </span>
          </div>

          <div className="space-y-3">
            {/* Structured row 1: Aesthetic Core */}
            <div className="p-3 bg-emerald-50 border border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/20 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="font-sans text-[8px] uppercase tracking-widest text-emerald-800 dark:text-emerald-400 font-bold">
                  I. Aesthetic Core & Silhouette
                </span>
                <span className="font-mono text-[8px] text-emerald-700 dark:text-emerald-300 font-bold">Structured Minimal</span>
              </div>
              <div className="flex gap-2">
                {['Architectural', 'Organic Brutalism', '90s Minimal'].map(tag => (
                  <span key={tag} className="font-mono text-[8px] border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-400/5 text-emerald-900 dark:text-emerald-400 px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Structured row 2: Visual Language & Palettes */}
            <div className="p-3 bg-[#1C1C1C] text-[#F3F4F6] border border-[#2B2B2B] flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="font-sans text-[8px] uppercase tracking-widest text-[#a8a29e] font-bold">
                  II. Chromatic Registry & Spacing
                </span>
                <span className="font-mono text-[8px] text-emerald-400 tracking-wider font-bold">Grid Score: 95%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3.5 h-3.5 bg-black border border-white/20" title="Ink" />
                  <div className="w-3.5 h-3.5 bg-[#FDFBF7] border border-white/20" title="Paper" />
                  <div className="w-3.5 h-3.5 bg-[#8A8A8A] border border-white/20" title="Concrete" />
                </div>
                <span className="font-mono text-[8px] text-[#A8A8A8]">Fonts: Cormorant Garamond (Serif), Space Mono</span>
              </div>
            </div>

            {/* Structured row 3: Narrative Voice */}
            <div className="p-3 bg-emerald-50 border border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/20 flex flex-col gap-1 flex-1">
              <div className="flex justify-between items-center">
                <span className="font-sans text-[8px] uppercase tracking-widest text-emerald-800 dark:text-emerald-400 font-bold">
                  III. Editorial Cadence & Voice
                </span>
                <span className="font-mono text-[8px] text-emerald-700 dark:text-emerald-300 font-bold">Detached Poetic</span>
              </div>
              <p className="font-serif italic text-xs text-nous-accent leading-relaxed">
                "An archival architecture that resists trends. Matter speaks softly through negative space and structural restraint, capturing concrete elegance."
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer link to jump instantly into the Tailor */}
      <div className="mt-4 pt-4 border-t border-nous-border/15 flex items-center justify-between text-xs text-nous-subtle font-mono">
        <span className="text-[10px]">&gt; Active Profile Ingestion: 4 Core references connected and validated.</span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 animate-pulse font-semibold">Ready to Refract</span>
      </div>
    </div>
  );
};

export default BeforeAfterGrid;

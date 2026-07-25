import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, Palette, Type, Hash, Frame, Box, Info } from 'lucide-react';
import { TailorLogicDraft } from '../types';

export const AestheticTokensMap: React.FC<{ onClose?: () => void; draft?: TailorLogicDraft | null }> = ({ onClose, draft }) => {
  const [selectedToken, setSelectedToken] = useState<any>(null);

  // Extract from draft or fallback to defaults
  const palette = draft?.expressionEngine?.chromaticRegistry?.primaryPalette || ['#d4b069', '#1A1A1A', '#F0EFE9'];
  const baseNeutral = draft?.expressionEngine?.chromaticRegistry?.baseNeutral || '#FFFFFF';
  const accent = draft?.expressionEngine?.chromaticRegistry?.accentSignal || '#000000';
  
  const typography = draft?.expressionEngine?.typographyIntent || {
    styleDescription: 'Editorial Serif / Brutalist Mono',
    scale: { primary: '2rem', secondary: '1rem', caption: '0.75rem' }
  };
  
  const scaleObj = (typography as any).scale || { primary: '2rem', secondary: '1rem', caption: '0.75rem' };

  const materiality = draft?.positioningCore?.aestheticCore?.materiality || ['Matte Ceramic', 'Heavy Cotton'];
  const density = draft?.positioningCore?.aestheticCore?.density || 5;

  return (
    <div className="flex-1 w-full h-full bg-nous-base text-nous-text overflow-y-auto overflow-x-hidden relative font-sans p-6 md:p-12 custom-scrollbar">
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-16 relative z-10">
        <h2 className="font-serif italic text-4xl md:text-6xl tracking-tight leading-none mb-4">Aesthetic Tokens</h2>
        <div className="font-mono text-[9px] uppercase tracking-widest text-[#d4b069] flex items-center gap-2">
          <Hash size={12} /> System Design Framework & Structural Parameters
        </div>
        <p className="font-sans text-xs text-nous-subtle mt-4 max-w-2xl leading-relaxed">
          The exact sizing, pacing, and visual DNA that compose your active persona's aesthetic output. These design tokens act as the absolute source of truth for downstream visual generation.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">
        
        {/* LEFT COLUMN: VISUAL PARAMETERS */}
        <div className="md:col-span-8 space-y-16">
          
          {/* CHROMATIC TOKENS */}
          <section>
            <div className="flex items-center gap-3 border-b border-nous-border pb-4 mb-8">
              <Palette size={16} className="text-[#d4b069]" />
              <h3 className="font-sans text-xs uppercase tracking-[0.2em] font-black">Chromatic Scale</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[baseNeutral, accent, ...palette].slice(0, 4).map((colorObj, i) => {
                const hex = typeof colorObj === 'string' ? colorObj : colorObj?.hex || '#000000';
                return (
                  <div key={i} className="group cursor-pointer">
                    <div 
                      className="w-full aspect-square border border-nous-border shadow-sm mb-3 transition-transform group-hover:scale-[1.02]"
                      style={{ backgroundColor: hex }}
                    />
                    <div className="font-mono text-[10px] uppercase">{['Base Neutral', 'Accent Signal', 'Palette I', 'Palette II'][i]}</div>
                    <div className="font-mono text-[9px] text-[#d4b069] tracking-widest">{hex}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TYPOGRAPHIC TOKENS */}
          <section>
            <div className="flex items-center gap-3 border-b border-nous-border pb-4 mb-8">
              <Type size={16} className="text-[#d4b069]" />
              <h3 className="font-sans text-xs uppercase tracking-[0.2em] font-black">Typographic Geometry</h3>
            </div>
            <div className="bg-nous-base0/30 p-8 border border-nous-border space-y-8">
              <div>
                <p className="font-mono text-[9px] uppercase text-nous-subtle mb-2">Primary Intent</p>
                <div className="font-serif italic text-3xl">{typography.styleDescription}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-nous-border/50">
                <div>
                  <div className="font-mono text-[9px] uppercase text-nous-subtle mb-2">H1 Scale</div>
                  <div className="font-serif italic text-2xl" style={{ fontSize: scaleObj.primary }}>Aa</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase text-nous-subtle mb-2">Body Scale</div>
                  <div className="font-sans text-lg" style={{ fontSize: scaleObj.secondary }}>Aa</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase text-nous-subtle mb-2">Caption</div>
                  <div className="font-mono uppercase text-xs" style={{ fontSize: scaleObj.caption }}>Aa</div>
                </div>
              </div>
            </div>
          </section>

          {/* SPATIAL & MATERIALITY */}
          <section>
            <div className="flex items-center gap-3 border-b border-nous-border pb-4 mb-8">
              <Box size={16} className="text-[#d4b069]" />
              <h3 className="font-sans text-xs uppercase tracking-[0.2em] font-black">Spatial & Materiality</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-nous-border p-6 bg-nous-base0/20">
                <div className="font-mono text-[9px] uppercase text-nous-subtle mb-4 flex items-center justify-between">
                  <span>Composition Density</span>
                  <span className="text-[#d4b069]">{density} / 10</span>
                </div>
                <div className="h-1 w-full bg-nous-border overflow-hidden">
                  <div className="h-full bg-[#d4b069]" style={{ width: `${(density / 10) * 100}%` }} />
                </div>
                <p className="font-sans text-[10px] text-nous-subtle mt-4 italic">Controls the physical weight and visual crowding of the output.</p>
              </div>
              
              <div className="border border-nous-border p-6 bg-nous-base0/20">
                <div className="font-mono text-[9px] uppercase text-nous-subtle mb-4">Core Textures</div>
                <div className="flex flex-wrap gap-2">
                  {materiality.map((mat: string, i: number) => (
                    <span key={i} className="px-3 py-1 border border-nous-border font-mono text-[9px] lowercase bg-nous-base">
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: STRUCTURAL ANALYSIS */}
        <div className="md:col-span-4 space-y-8">
          <div className="bg-nous-text text-nous-base p-8 space-y-8">
            <h3 className="font-serif italic text-2xl">Token Blueprint</h3>
            
            <div className="space-y-4">
              <div className="border-b border-nous-base/20 pb-4">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-50 block mb-1">Architecture</span>
                <span className="font-sans text-sm">Design variables are currently tightly coupled to your Tailor draft. Modifying tokens will instantly reflow the UI.</span>
              </div>
              
              <div className="border-b border-nous-base/20 pb-4">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-50 block mb-1">Sizing & Ratios</span>
                <span className="font-sans text-sm">Adhering to a strict Golden Ratio (1.618) for typographic scaling and box models.</span>
              </div>
              
              <div>
                 <span className="font-mono text-[9px] uppercase tracking-widest opacity-50 block mb-1">Status</span>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#d4b069] animate-pulse" />
                   <span className="font-mono text-[10px] uppercase">Synced with Oracle</span>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="border border-nous-border p-6 bg-nous-base0/30">
            <div className="flex gap-3 items-start">
              <Info size={14} className="text-[#d4b069] mt-0.5 shrink-0" />
              <p className="font-sans text-[10px] text-nous-subtle leading-loose">
                Tokens bridge abstract aesthetic concepts into concrete CSS variables and generative prompt instructions. They guarantee consistency across your sovereign media empire.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};


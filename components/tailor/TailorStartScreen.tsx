import React from 'react';
import type { TailoringIntent } from '../../types';

const INTENTS: { id: TailoringIntent; label: string; description: string }[] = [
  { id: 'creative_practice', label: 'My creative practice', description: 'Studio, process, and visual language' },
  { id: 'brand', label: 'My brand', description: 'Identity, positioning, and market presence' },
  { id: 'illustrations', label: 'My illustrations', description: 'Drawing style, motifs, and technique' },
  { id: 'writing', label: 'My writing', description: 'Voice, cadence, and editorial tone' },
  { id: 'product', label: 'My product', description: 'UX, objects, and material choices' },
  { id: 'wardrobe', label: 'My wardrobe', description: 'Silhouette, fabric, and personal style' },
  { id: 'internet_presence', label: 'My internet presence', description: 'Feeds, profiles, and digital aura' },
  { id: 'campaign', label: 'My campaign', description: 'Launch narrative and visual system' },
  { id: 'room', label: 'My room', description: 'Interior atmosphere and objects' },
  { id: 'world', label: 'My world', description: 'Full creative universe' },
];

interface TailorStartScreenProps {
  onSelect: (intent: TailoringIntent) => void;
  onBack?: () => void;
}

export const TailorStartScreen: React.FC<TailorStartScreenProps> = ({ onSelect, onBack }) => (
  <div className="max-w-2xl mx-auto px-6 py-12">
    {onBack && (
      <button type="button" onClick={onBack} className="text-xs uppercase tracking-widest text-nous-subtle mb-8 hover:text-nous-text">
        ← Back
      </button>
    )}
    <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-3">Tailor</p>
    <h1 className="font-serif text-3xl md:text-4xl text-nous-text mb-3">What are we tailoring?</h1>
    <p className="text-sm text-nous-subtle mb-10 max-w-lg">
      A fitting room for ideas — not a personality quiz. Upload references; Mimi extracts evidence.
    </p>
    <div className="grid gap-2">
      {INTENTS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className="group text-left px-5 py-4 border border-nous-border/40 bg-[#FDFBF7]/50 dark:bg-[#0A0A0A]/40 hover:border-nous-text/30 transition-colors"
        >
          <span className="block text-sm font-medium text-nous-text group-hover:underline">{item.label}</span>
          <span className="block text-xs text-nous-subtle mt-1">{item.description}</span>
        </button>
      ))}
    </div>
  </div>
);

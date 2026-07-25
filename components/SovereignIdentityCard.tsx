import React from 'react';
import { SovereignIdentityCard as SovereignIdentityCardType } from '../types';

export const SovereignIdentityCard: React.FC<{ card: SovereignIdentityCardType }> = ({ card }) => {
  return (
    <div className="absolute z-50 w-64 p-4 bg-nous-base text-nous-text border border-nous-border shadow-2xl pointer-events-none">
      <h3 className="font-serif text-lg italic mb-2">Sovereign Vibe</h3>
      <div 
        className="w-full aspect-[1.586/1] bg-white overflow-hidden border border-nous-border mb-3"
        dangerouslySetInnerHTML={{ __html: card.svgVisual }}
      />
      <div className="space-y-2">
        <p className="font-sans text-[10px] uppercase tracking-widest font-bold text-nous-subtle">Archetype</p>
        <p className="font-serif italic text-sm text-nous-text">{card.aestheticCoordinates?.[0]?.name || 'Unknown'}</p>
      </div>
    </div>
  );
};

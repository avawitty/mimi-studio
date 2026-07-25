import React from 'react';
import { SovereignIdentityCard } from '../types';

export const SovereignIdentityCardView: React.FC<{ card: SovereignIdentityCard }> = ({ card }) => {
 return (
 <div className="flex flex-col items-center gap-6 p-8 bg-nous-base text-nous-text border border-nous-border">
 <h2 className="font-serif text-2xl italic">Sovereign Identity Card</h2>
 <div 
 className="w-full max-w-sm aspect-[1.586/1] bg-white overflow-hidden border border-nous-border"
 dangerouslySetInnerHTML={{ __html: card.svgVisual }}
 />
 <div className="grid grid-cols-1 gap-4 w-full">
 {card.aestheticCoordinates?.map((coord, i) => (
 <div key={i} className="border-b border-nous-border pb-2">
 <h3 className="font-sans text-xs uppercase tracking-widest font-bold text-nous-subtle">{coord.name}</h3>
 <p className="font-serif italic text-sm text-nous-text">{coord.description}</p>
 </div>
 ))}
 </div>
 <div className="text-xs font-mono text-nous-subtle">
 Taste Drift: {card.tasteDriftPercentage?.toFixed(2) || '0.00'}%
 </div>
 </div>
 );
};

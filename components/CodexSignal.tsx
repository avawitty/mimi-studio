import React from 'react';

export const CodexSignal = ({ entropy, density }: { entropy: number, density: number }) => {
 const mode =
 entropy > 0.6
 ?"Exploratory"
 : density > 0.6
 ?"Focused"
 :"Balanced";

 return (
 <div className="text-[10px] font-mono uppercase tracking-widest text-nous-subtle border border p-4 bg-white">
 <div className="mb-2 font-bold text-nous-subtle">Codex State</div>
 <div className="flex justify-between">
 <span>Entropy:</span> <span>{entropy.toFixed(2)}</span>
 </div>
 <div className="flex justify-between">
 <span>Density:</span> <span>{density.toFixed(2)}</span>
 </div>
 <div className="mt-2 pt-2 border-t border italic text-nous-subtle">{mode}</div>
 </div>
 );
};

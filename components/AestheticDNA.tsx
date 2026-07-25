import React from 'react';
import { ZineMetadata } from '../types';
import { Target, Type } from 'lucide-react';

export const AestheticDNA: React.FC<{ 
 metadata?: ZineMetadata;
 dna?: any;
 report?: any;
 palette?: any;
 title?: string;
}> = ({ metadata, dna, report, palette: propPalette, title }) => {
 if (!metadata && !dna && !report) return null;

 const content = metadata?.content;
 
 // Extracting aesthetic data
 const typography = content?.aesthetic_touchpoints?.filter(t => t.type === 'lexical')?.map(t => t.motif) 
 || dna?.motifs 
 || report?.keyMotifs 
 || [];
 const tone = metadata?.tone || dna?.moodCluster || report?.tone || 'Unknown';

 return (
 <div className="w-full bg-nous-base p-8 border border-nous-border mt-12 relative">
 <div className="flex items-center gap-3 mb-8">
 <Target size={16} className="text-nous-subtle"/>
 <h3 className="font-sans text-[10px] uppercase tracking-[0.3em] font-black text-nous-text ">
 {title ? `${title} - Aesthetic DNA` : 'Aesthetic DNA'}
 </h3>
 </div>
 
 <div className="grid md:grid-cols-1 gap-12">
 {/* Typography */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-nous-subtle">
 <Type size={14} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Typographic Anchors</span>
 </div>
 <div className="space-y-2">
 <p className="font-serif italic text-xl text-nous-text">
 Tone: <span className="font-bold">{tone}</span>
 </p>
 {typography.length > 0 ? (
 <ul className="list-disc list-inside font-mono text-xs text-nous-subtle">
 {typography.slice(0, 3).map((t: any, i: number) => (
 <li key={i}>{typeof t === 'string' ? t : t.motif}</li>
 ))}
 </ul>
 ) : (
 <span className="font-serif italic text-sm text-nous-subtle">No specific typography anchors.</span>
 )}
 </div>
 </div>
 </div>
 </div>
 );
};

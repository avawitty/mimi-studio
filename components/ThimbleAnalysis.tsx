import React, { useMemo } from 'react';
import { AestheticVector, ThimbleTasteEvent } from '../types';

interface Props {
 artifactVector: AestheticVector;
 userVector: AestheticVector;
 trajectoryLabel: ThimbleTasteEvent['trajectoryLabel'];
 similarityScore: number;
 interpretation: string;
 onSave: () => void;
 thumbnailUrl?: string;
}

export const ThimbleAnalysis: React.FC<Props> = ({ artifactVector, userVector, trajectoryLabel, similarityScore, interpretation, onSave, thumbnailUrl }) => {
 // Simple"thimble with threads"visualization logic
 const threads = useMemo(() => {
 return Object.keys(artifactVector).map((key, index) => ({
 axis: key,
 artifact: artifactVector[key as keyof AestheticVector],
 user: userVector[key as keyof AestheticVector],
 angle: (index / 9) * 360,
 }));
 }, [artifactVector, userVector]);

 return (
 <div className="p-6 border-nous-border border bg-nous-base text-nous-text font-sans">
 <div className="flex justify-between items-baseline mb-6 border-b border-nous-border pb-4">
 <h3 className="font-serif text-2xl italic">Thimble Analysis</h3>
 <span className="archival-stamp text-[10px] tracking-widest uppercase">{trajectoryLabel} // { (similarityScore * 100).toFixed(0) }%</span>
 </div>
 
 {/* Thumbnail Placeholder */}
 {thumbnailUrl && (
 <div className="mb-6 aspect-video border-nous-border border bg-white flex items-center justify-center">
 <img src={thumbnailUrl} alt="Artifact"className="max-h-full object-contain"/>
 </div>
 )}

 {/* Thimble with Threads Visualization */}
 <div className="relative h-64 w-64 mx-auto mb-8">
 <svg viewBox="0 0 200 200"className="w-full h-full">
 {/* Thimble Shape */}
 <path d="M60 40 L140 40 L130 160 L70 160 Z"fill="none"stroke="#2A2A2A"strokeWidth="1"/>
 {/* Threads */}
 {threads.map((thread, i) => (
 <line 
 key={i}
 x1="100"y1="100"
 x2={100 + Math.cos(thread.angle * Math.PI / 180) * 80} 
 y2={100 + Math.sin(thread.angle * Math.PI / 180) * 80}
 stroke="#8E8C84"
 strokeWidth="0.5"
 />
 ))}
 </svg>
 </div>

 {/* Analysis Points */}
 <div className="space-y-4 text-sm font-serif italic text-nous-text">
 <p className="leading-relaxed">{interpretation}</p>
 <ul className="list-disc list-inside space-y-1 text-xs font-sans uppercase tracking-widest opacity-70">
 <li>Fits the capsule core</li>
 <li>Requires tactile verification</li>
 </ul>
 </div>

 <button 
 onClick={onSave}
 className="mt-8 w-full py-3 bg-nous-base text-nous-text text-[10px] uppercase tracking-[0.2em] hover:bg-nous-base transition-colors"
 >
 Save to Constellation
 </button>
 </div>
 );
};

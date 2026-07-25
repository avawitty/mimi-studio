import React from 'react';
import { ZineMetadata } from '../types';
import { useUser } from '../contexts/UserContext';

interface ZineCoverCardProps {
 zine: ZineMetadata;
 onClick: () => void;
}

export const ZineCoverCard: React.FC<ZineCoverCardProps> = ({ zine, onClick }) => {
 const { profile } = useUser();
 
 // Extract tailor data
 const tailorDraft = profile?.tailorDraft;
 const fontFamily = tailorDraft?.expressionEngine?.typographyIntent?.styleDescription || 'Inter';
 const baseHex = tailorDraft?.expressionEngine?.chromaticRegistry?.baseNeutral || '#FFFFFF';
 const accentHex = tailorDraft?.expressionEngine?.chromaticRegistry?.accentSignal || '#000000';

 const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=swap`;

 return (
 <>
 <link href={fontUrl} rel="stylesheet"/>
 <div 
 onClick={onClick}
 className="group relative w-full aspect-[3/4] rounded-none rounded-none overflow-hidden flex flex-col cursor-pointer hover:scale-[1.02] transition-transform duration-500"
 style={{ 
 fontFamily: `'${fontFamily}', sans-serif`,
 '--zine-base-color': baseHex,
 '--zine-accent-color': accentHex,
 } as React.CSSProperties}
 >
 {/* Top 75%: The AI Generated or Selected Header Image */}
 <div 
 className="flex-1 bg-cover bg-center relative overflow-hidden"
 style={{ backgroundImage: `url(${zine.coverImageUrl || zine.content?.header_image_prompt || ''})` }} 
 >
 {/* Hover Overlay */}
 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 md:p-6 flex flex-col justify-between text-white">
 <div className="space-y-4">
 <div className="flex justify-between items-start">
 <span className="text-[9px] uppercase tracking-widest font-sans font-bold text-white/60">
 {new Date(zine.createdAt).toLocaleDateString()}
 </span>
 <span className="text-[9px] uppercase tracking-widest font-sans font-bold text-white/60">
 @{zine.userHandle ||"Anonymous"}
 </span>
 </div>
 
 <p className="font-serif italic text-sm md:text-base leading-relaxed line-clamp-6 text-white/90">
 {zine.content?.vocal_summary_blurb || zine.content?.the_reading || zine.content?.strategic_hypothesis || zine.content?.pages?.[0]?.bodyCopy ||"No signal data available."}
 </p>
 </div>

 <div className="flex flex-wrap gap-1.5 mt-4">
 {(zine.tags && zine.tags.length > 0 ? zine.tags : (zine.theme ? [zine.theme] : [])).slice(0, 4).map((tag, idx) => (
 <span key={idx} className="px-2 py-1 bg-white/10 rounded-none text-[8px] uppercase tracking-widest font-sans font-bold text-white/80">
 {tag}
 </span>
 ))}
 </div>
 </div>
 </div>
 
 {/* Bottom 25%: The Solid Tailor Color Swatch */}
 <div className="h-[25%] p-4 md:p-6 flex flex-col justify-between"style={{ backgroundColor: 'var(--zine-base-color)', color: 'var(--zine-accent-color)' }}>
 <h3 className="text-xl md:text-2xl leading-none font-medium truncate">
 {zine.content?.headlines?.[0] || zine.title ||"Untitled"}
 </h3>
 
 {/* Editorial Metadata Footer */}
 <div className="flex justify-between items-end opacity-60">
 <span className="text-[8px] uppercase tracking-widest font-sans font-bold">
 {fontFamily} // {baseHex}
 </span>
 <div className="flex gap-1 items-end h-3">
 {/* Fake barcode/blueprint lines */}
 <div className="w-0.5 h-full bg-current"/>
 <div className="w-1 h-[80%] bg-current"/>
 <div className="w-0.5 h-full bg-current"/>
 <div className="w-[1px] h-[60%] bg-current"/>
 <div className="w-1.5 h-full bg-current"/>
 </div>
 </div>
 </div>
 </div>
 </>
 );
};

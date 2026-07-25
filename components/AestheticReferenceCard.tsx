import React, { forwardRef } from 'react';
import { UserProfile } from '../types';

interface AestheticReferenceCardProps {
 profile: UserProfile;
}

export const AestheticReferenceCard = forwardRef<HTMLDivElement, AestheticReferenceCardProps>(({ profile }, ref) => {
 const tailor = profile.tailorDraft?.expressionEngine;
 
 if (!tailor) return null;

 const primaryColors = tailor.chromaticRegistry?.primaryPalette || [];
 const baseNeutral = tailor.chromaticRegistry?.baseNeutral || '#ffffff';
 const accentSignal = tailor.chromaticRegistry?.accentSignal || '#000000';
 
 const serif = tailor.typography?.serif || 'Georgia, serif';
 const sans = tailor.typography?.sans || 'Inter, sans-serif';

 return (
 <div 
 ref={ref}
 className="w-[800px] h-[800px] bg-nous-base text-nous-text p-12 flex flex-col justify-between"
 style={{ fontFamily: sans }}
 >
 {/* Header */}
 <div className="border-b-4 border-black pb-6 mb-8">
 <h1 className="text-6xl font-black uppercase tracking-tighter"style={{ fontFamily: sans }}>
 {profile.handle || 'Brand'} Aesthetic Reference
 </h1>
 <p className="text-2xl mt-2 text-gray-600"style={{ fontFamily: serif }}>
 Strict Style Guide & Visual Touchpoints
 </p>
 </div>

 {/* Typography Specimen */}
 <div className="flex-1 flex flex-col gap-8">
 <div>
 <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Primary Serif</h2>
 <div className="text-5xl"style={{ fontFamily: serif }}>
 Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
 </div>
 <div className="text-3xl mt-2"style={{ fontFamily: serif }}>0123456789 !@#$%^&*()</div>
 </div>

 <div>
 <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Primary Sans</h2>
 <div className="text-5xl font-bold"style={{ fontFamily: sans }}>
 Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
 </div>
 <div className="text-3xl mt-2"style={{ fontFamily: sans }}>0123456789 !@#$%^&*()</div>
 </div>
 </div>

 {/* Color Palette */}
 <div className="mt-12">
 <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Chromatic Registry</h2>
 <div className="flex gap-4 h-48">
 {primaryColors.map((color, idx) => (
 <div key={idx} className="flex-1 flex flex-col">
 <div 
 className="w-full flex-1 rounded-none border border-gray-200"
 style={{ backgroundColor: color.hex }}
 />
 <div className="bg-gray-100 p-3 rounded-none border border-t-0 border-gray-200">
 <div className="font-bold text-sm uppercase">{color.name}</div>
 <div className="text-xs font-mono text-gray-600">{color.hex}</div>
 </div>
 </div>
 ))}
 
 <div className="flex-1 flex flex-col">
 <div 
 className="w-full flex-1 rounded-none border border-gray-200"
 style={{ backgroundColor: baseNeutral }}
 />
 <div className="bg-gray-100 p-3 rounded-none border border-t-0 border-gray-200">
 <div className="font-bold text-sm uppercase">Base Neutral</div>
 <div className="text-xs font-mono text-gray-600">{baseNeutral}</div>
 </div>
 </div>

 <div className="flex-1 flex flex-col">
 <div 
 className="w-full flex-1 rounded-none border border-gray-200"
 style={{ backgroundColor: accentSignal }}
 />
 <div className="bg-gray-100 p-3 rounded-none border border-t-0 border-gray-200">
 <div className="font-bold text-sm uppercase">Accent Signal</div>
 <div className="text-xs font-mono text-gray-600">{accentSignal}</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
});

AestheticReferenceCard.displayName = 'AestheticReferenceCard';

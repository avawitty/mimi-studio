
// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import { Moon, Clock, Info, ShieldAlert } from 'lucide-react';
import { useAvailability, FeatureKey } from '../hooks/useAvailability';

export const RitualGuard: React.FC<{ feature: FeatureKey; children: React.ReactNode }> = ({ feature, children }) => {
 const { isAvailable, reason, nextWindow } = useAvailability(feature);

 if (isAvailable) return <>{children}</>;

 return (
 <motion.div 
 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
 className="w-full h-full flex items-center justify-center bg-nous-base dark:bg p-8 text-center"
 >
 <div className="max-w-md space-y-12 relative">
 <div className="absolute inset-0 bg-nous-base0/5 blur-[120px] rounded-none pointer-events-none"/>
 
 <div className="space-y-6 relative z-10">
 <div className="w-20 h-20 border border-nous-border rounded-none flex items-center justify-center mx-auto">
 <Moon size={32} className="text-nous-subtle animate-pulse"/>
 </div>
 <div className="space-y-2">
 <h2 className="font-serif text-4xl italic tracking-tighter">This space is resting.</h2>
 <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-nous-subtle font-black">Intentional Availability Protocol</p>
 </div>
 </div>

 <div className="p-8 bg-nous-base border border-black/5 /5 rounded-none space-y-4">
 <p className="font-serif italic text-lg text-nous-subtle">{reason}</p>
 <div className="flex items-center justify-center gap-3 text-nous-subtle pt-4 border-t border-black/5">
 <Clock size={12} />
 <span className="font-sans text-[8px] uppercase tracking-widest font-black">Window: {nextWindow}</span>
 </div>
 </div>

 <p className="font-serif italic text-xs text-nous-subtle">"Quality requires containment. Trust the rhythm."</p>
 </div>
 </motion.div>
 );
};

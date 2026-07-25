import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

interface GlossaryTooltipProps {
 term: string;
 poeticMeaning: string;
 functionalMeaning: string;
 children: React.ReactNode;
}

export const GlossaryTooltip: React.FC<GlossaryTooltipProps> = ({
 term,
 poeticMeaning,
 functionalMeaning,
 children
}) => {
 const [isHovered, setIsHovered] = useState(false);

 return (
 <div 
 className="relative inline-flex items-center gap-1 cursor-help group"
 onMouseEnter={() => setIsHovered(true)}
 onMouseLeave={() => setIsHovered(false)}
 >
 {children}
 <Info size={12} className="text-nous-subtle group-hover:text-nous-subtle 0 dark:group-hover:text-nous-subtle transition-colors"/>
 
 <AnimatePresence>
 {isHovered && (
 <motion.div
 initial={{ opacity: 0, y: 5, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 5, scale: 0.95 }}
 transition={{ duration: 0.15 }}
 className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-nous-base text-nous-text rounded-none border border-nous-border text-left pointer-events-none"
 >
 <div className="text-xs font-sans tracking-widest uppercase text-nous-subtle mb-1">{term}</div>
 <div className="text-sm font-serif italic text-nous-subtle mb-2">"{poeticMeaning}"</div>
 <div className="text-xs font-sans text-nous-subtle border-t border-nous-border pt-2">
 <span className="font-semibold text-nous-subtle">Function:</span> {functionalMeaning}
 </div>
 {/* Triangle pointer */}
 <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900 dark:border-t-stone-800"/>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

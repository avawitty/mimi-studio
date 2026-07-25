import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface MagazineLayoutProps {
  title: string;
  subtitle?: string;
  content: string;
  image?: string;
  shapePoints?: string; // e.g., "polygon(0 0, 100% 20%, 80% 100%, 0 80%)"
  accentIcon?: LucideIcon;
  theme?: 'minimal' | 'cyber' | 'editorial';
}

export const AestheticFlow: React.FC<MagazineLayoutProps> = ({
  title,
  subtitle,
  content,
  image,
  shapePoints = "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
  accentIcon: Icon,
  theme = 'editorial'
}) => {
  return (
    <div className={`w-full max-w-5xl mx-auto p-8 md:p-16 font-sans ${theme === 'cyber' ? 'bg-black text-white' : 'bg-stone-50 text-stone-900'}`}>
      {/* Header Section */}
      <header className="mb-20 space-y-4 border-b border-current pb-12">
        {subtitle && (
          <p className="text-[10px] uppercase tracking-[0.5em] opacity-50 font-mono">
            {subtitle}
          </p>
        )}
        <h1 className="text-6xl md:text-9xl font-serif italic tracking-tighter leading-none">
          {title}
        </h1>
      </header>

      {/* Main Magazine Body */}
      <div className="relative">
        {/* Floating Shape with Text Wrap */}
        {image && (
          <div 
            className="float-right ml-12 mb-8 relative group"
            style={{
              width: '45%',
              height: '500px',
              shapeOutside: shapePoints,
              clipPath: shapePoints,
            }}
          >
            <motion.img 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
              src={image} 
              alt={title}
              className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
            {Icon && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <Icon className="w-24 h-24 text-white/50 animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* The Copy */}
        <div className="prose prose-stone max-w-none">
          {content.split('\n\n').map((para, i) => (
            <p 
              key={i} 
              className={`text-lg md:text-xl leading-relaxed mb-8 text-justify hyphens-auto ${i === 0 ? 'first-letter:text-7xl first-letter:font-serif first-letter:float-left first-letter:mr-4 first-letter:leading-none' : ''}`}
            >
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Footer / Symbols Section */}
      <footer className="mt-20 pt-12 border-t border-black/10 flex justify-between items-end">
        <div className="space-y-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] opacity-40 italic">
            Refracted by Mimi // Vol. 01
          </p>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-current rotate-45 opacity-20" />
            ))}
          </div>
        </div>
        
        <div className="text-[10px] font-mono opacity-30">
          STYX_PROTOCOL_NODE_{Math.random().toString(16).slice(2, 8).toUpperCase()}
        </div>
      </footer>
    </div>
  );
};

export default AestheticFlow;

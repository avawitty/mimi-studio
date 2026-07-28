import React, { useEffect, useState } from 'react';
import { LayoutGrid, Scissors, ImageIcon, BookOpen, Feather, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface MobileNavigationProps {
  currentView: string;
  setViewMode: (view: string) => void;
  profile?: UserProfile | null;
  isGenerating?: boolean;
  isLoading?: boolean;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  currentView, 
  setViewMode, 
  profile,
  isGenerating = false,
  isLoading = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const tabs = [
    { key: 'studio', label: 'Studio', icon: <LayoutGrid size={16} strokeWidth={1.5} /> },
    { key: 'pocket', label: 'Pocket', icon: <BookOpen size={16} strokeWidth={1.5} /> },
    { key: 'scribe', label: 'Scribe', icon: <Feather size={16} strokeWidth={1.5} /> },
    { key: 'tailor', label: 'Tailor', icon: <Scissors size={16} strokeWidth={1.5} /> },
    { key: 'darkroom', label: 'Files', icon: <ImageIcon size={16} strokeWidth={1.5} /> }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-5 left-0 right-0 z-[100] md:hidden px-4 pointer-events-none flex justify-center"
        >
          <div className="bg-nous-text/95 backdrop-blur-md text-nous-base p-1.5 rounded-[26px] flex items-center justify-between gap-0.5 pointer-events-auto shadow-2xl border border-white/10 max-w-md w-full relative overflow-hidden">
            {isGenerating && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-400 animate-[shimmer_1.2s_infinite_linear]" />
            )}

            {isLoading ? (
              <div className="flex items-center justify-between w-full px-2 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 flex-1 mx-0.5 bg-white/10 animate-pulse rounded-[18px]" />
                ))}
              </div>
            ) : (
              tabs.map((tab) => {
                const isActive = currentView === tab.key;
                return (
                  <button
                    key={tab.key}
                    disabled={isGenerating}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      if (!isGenerating) {
                        setViewMode(tab.key);
                      }
                    }}
                    className={`relative flex-1 min-w-0 min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-[18px] transition-colors duration-200 ${
                      isGenerating ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      isActive
                        ? 'text-[#FDFBF7]'
                        : 'text-nous-base/55 hover:text-[#FDFBF7]/90 active:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="mobile-nav-capsule"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className="absolute inset-0 rounded-[18px] bg-white/10 border border-white/10"
                        aria-hidden="true"
                      />
                    )}
                    <div className={`relative z-10 ${isActive ? 'text-nous-accent' : ''}`}>
                      {isActive && isGenerating ? (
                        <Loader2 size={17} className="animate-spin text-amber-400" />
                      ) : (
                        tab.icon
                      )}
                    </div>
                    <span className={`relative z-10 text-[8px] uppercase tracking-[0.12em] font-sans leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

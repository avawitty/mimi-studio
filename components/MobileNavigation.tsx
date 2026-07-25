import React, { useEffect, useState } from 'react';
import { LayoutGrid, Scissors, ImageIcon, BookOpen, Activity, Loader2 } from 'lucide-react';
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
    { key: 'mimi-drop', label: 'Drop', icon: <Activity size={16} strokeWidth={1.5} /> },
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
          className="fixed bottom-6 left-0 right-0 z-[100] md:hidden px-4 pointer-events-none flex justify-center"
        >
          <div className="bg-nous-text text-nous-base px-5 py-2.5 rounded-full flex items-center justify-between gap-4 pointer-events-auto shadow-2xl border border-white/10 max-w-md w-full relative overflow-hidden">
            {isGenerating && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-400 animate-[shimmer_1.2s_infinite_linear]" />
            )}

            {isLoading ? (
              <div className="flex items-center justify-between w-full py-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-6 w-8 bg-white/20 animate-pulse rounded-md" />
                ))}
              </div>
            ) : (
              tabs.map((tab) => {
                const isActive = currentView === tab.key;
                return (
                  <button
                    key={tab.key}
                    disabled={isGenerating}
                    onClick={() => {
                      if (!isGenerating) {
                        setViewMode(tab.key);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      isGenerating ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      isActive 
                        ? 'text-[#FDFBF7] scale-110 font-bold opacity-100' 
                        : 'text-nous-base/60 hover:text-[#FDFBF7] hover:opacity-100'
                    }`}
                  >
                    <div className={isActive ? 'text-nous-accent relative' : ''}>
                      {isActive && isGenerating ? (
                        <Loader2 size={16} className="animate-spin text-amber-400" />
                      ) : (
                        tab.icon
                      )}
                    </div>
                    <span className="text-[7px] uppercase tracking-[0.15em] font-sans font-bold">
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

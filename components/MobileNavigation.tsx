import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Scissors,
  ImageIcon,
  BookOpen,
  Feather,
  Loader2,
  User,
  Layers,
  Compass,
  Archive,
  Star,
  Share2,
  Sparkles,
  FolderOpen,
  Shirt,
  Edit3,
  Activity,
  Network,
  Terminal,
  Award,
  SlidersHorizontal,
  Book,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { MENU_STRUCTURE } from './navigationConfig';

interface MobileNavigationProps {
  currentView: string;
  setViewMode: (view: string) => void;
  profile?: UserProfile | null;
  isGenerating?: boolean;
  isLoading?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  studio: <LayoutGrid size={16} strokeWidth={1.5} />,
  pocket: <BookOpen size={16} strokeWidth={1.5} />,
  scribe: <Feather size={16} strokeWidth={1.5} />,
  tailor: <Scissors size={16} strokeWidth={1.5} />,
  darkroom: <ImageIcon size={16} strokeWidth={1.5} />,
  profile: <User size={16} strokeWidth={1.5} />,
  wardrobe: <Shirt size={16} strokeWidth={1.5} />,
  scry: <Compass size={16} strokeWidth={1.5} />,
  archival: <Archive size={16} strokeWidth={1.5} />,
  signature: <Star size={16} strokeWidth={1.5} />,
  proscenium: <Share2 size={16} strokeWidth={1.5} />,
  oracle: <Sparkles size={16} strokeWidth={1.5} />,
  moodboard: <Layers size={16} strokeWidth={1.5} />,
  'the-edit': <Edit3 size={16} strokeWidth={1.5} />,
  'editorial-home': <Book size={16} strokeWidth={1.5} />,
  'the-press': <FolderOpen size={16} strokeWidth={1.5} />,
  'taste-graph': <Network size={16} strokeWidth={1.5} />,
  connections: <Activity size={16} strokeWidth={1.5} />,
  memberships: <Award size={16} strokeWidth={1.5} />,
  briefs: <SlidersHorizontal size={16} strokeWidth={1.5} />,
  codex: <Terminal size={16} strokeWidth={1.5} />,
};

const DEFAULT_NAV_KEYS = ['studio', 'pocket', 'scribe', 'tailor', 'darkroom'];

function getLabelForKey(key: string): string {
  for (const section of MENU_STRUCTURE) {
    const item = section.items.find((i) => i.mode === key);
    if (item) return item.label;
  }
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getIconForKey(key: string): React.ReactNode {
  return ICON_MAP[key] ?? <LayoutGrid size={16} strokeWidth={1.5} />;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  setViewMode,
  profile,
  isGenerating = false,
  isLoading = false,
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

  const pinnedKeys =
    profile?.pinnedNavItems && profile.pinnedNavItems.length > 0
      ? profile.pinnedNavItems.slice(0, 5)
      : DEFAULT_NAV_KEYS;

  const tabs = pinnedKeys.map((key) => ({
    key,
    label: getLabelForKey(key),
    icon: getIconForKey(key),
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-5 left-0 right-0 z-[100] md:hidden px-4 pointer-events-none flex justify-center"
        >
          <div className="bg-nous-text/95 backdrop-blur-md text-nous-base p-1.5 rounded-[26px] flex items-center justify-between gap-0.5 pointer-events-auto shadow-2xl border border-white/10 max-w-md w-full relative overflow-hidden">
            {isGenerating && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-400 animate-[shimmer_1.2s_infinite_linear]" />
            )}

            {isLoading ? (
              <div className="flex items-center justify-between w-full px-2 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 flex-1 mx-0.5 bg-white/10 animate-pulse rounded-[18px]"
                  />
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
                    <span
                      className={`relative z-10 text-[8px] uppercase tracking-[0.12em] font-sans leading-none ${
                        isActive ? 'font-bold' : 'font-semibold'
                      }`}
                    >
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

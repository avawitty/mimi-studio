import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MenuItem {
  label: string;
  viewMode: string;
}

const MENU_STRUCTURE: Record<string, MenuItem[]> = {
  Studio: [
    { label: 'Work Table', viewMode: 'studio' },
    { label: 'Project Builder', viewMode: 'moodboard' },
    { label: 'Narrative Pathing', viewMode: 'threads' },
  ],
  Tailor: [
    { label: 'Taste Profile', viewMode: 'tailor' },
    { label: 'Aesthetic Signature', viewMode: 'signature' },
    { label: 'Refined Seeds', viewMode: 'ward' },
    { label: 'Archetype Registry', viewMode: 'profile' },
  ],
  Darkroom: [
    { label: 'Layout Editor', viewMode: 'darkroom' },
    { label: 'Visual Lens', viewMode: 'the-lens' },
    { label: 'Obsidian Mirror', viewMode: 'obsidian-mirror' },
  ],
  Archive: [
    { label: 'Archival Collection', viewMode: 'archival' },
    { label: 'Proscenium Elements', viewMode: 'proscenium' },
    { label: 'Syllabus Codex', viewMode: 'syllabus' },
  ],
  Signals: [
    { label: 'GEO Engine Optimization', viewMode: 'signals' },
    { label: 'Observation Diagnostics', viewMode: 'thimble' },
    { label: 'Taste Graph Grid', viewMode: 'taste-graph' },
    { label: 'Trace & Scry', viewMode: 'scry' },
  ],
};

interface NavigationMenuProps {
  currentViewMode: string;
  setViewMode: (mode: string) => void;
  isGenerating?: boolean;
  isLoading?: boolean;
  isHighLatency?: boolean;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ 
  currentViewMode, 
  setViewMode,
  isGenerating = false,
  isLoading = false,
  isHighLatency = false
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-8">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="h-3 w-16 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-none" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      {Object.entries(MENU_STRUCTURE).map(([category, items]) => {
        const isSomeSubActive = items.some(item => item.viewMode === currentViewMode);
        return (
          <div 
            key={category}
            className="relative group"
            onMouseEnter={() => setHoveredItem(category)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button className={`font-sans text-[10px] uppercase tracking-[0.2em] font-medium transition-colors ${
              isGenerating ? 'cursor-wait opacity-80' : 'cursor-pointer'
            } ${isSomeSubActive ? 'text-nous-accent font-bold' : 'text-nous-subtle hover:text-nous-text'}`}>
              {category}
              {isHighLatency && isSomeSubActive && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5 animate-pulse" title="High Latency Endpoint Active" />
              )}
            </button>

            <AnimatePresence>
              {hoveredItem === category && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-52 z-[5000]"
                >
                  <div className="bg-[#FDFBF7] dark:bg-[#0A0A0A] border border-nous-border/40 p-3 flex flex-col gap-1 shadow-xl relative">
                    {isGenerating && (
                      <div className="px-3 py-1 bg-amber-500/10 border-b border-amber-500/20 text-[8px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-1 flex items-center justify-between">
                        <span>Generating...</span>
                        <span className="animate-spin text-amber-500">⟳</span>
                      </div>
                    )}

                    {items.map((item) => {
                      const isActive = currentViewMode === item.viewMode;
                      return (
                        <button
                          key={item.viewMode}
                          disabled={isGenerating}
                          onClick={() => {
                            if (!isGenerating) {
                              setViewMode(item.viewMode);
                              setHoveredItem(null);
                            }
                          }}
                          className={`text-[9px] uppercase tracking-[0.1em] text-left px-3 py-2 transition-all rounded-none ${
                            isGenerating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            isActive 
                              ? 'bg-nous-text text-nous-base font-bold' 
                              : 'text-nous-subtle hover:text-nous-text hover:bg-nous-base/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

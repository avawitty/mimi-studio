import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";

interface PanelConfig {
  id: string;
  title: string;
  subtitle: string;
  component: React.ReactNode;
}

interface MobileWorkspaceOptimizerProps {
  panels: PanelConfig[];
  desktopGridClassName?: string;
}

export const MobileWorkspaceOptimizer: React.FC<MobileWorkspaceOptimizerProps> = ({
  panels,
  desktopGridClassName = "grid grid-cols-12 gap-6 h-full w-full",
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<number>(0);

  const handleNext = () => {
    if (activeIndex < panels.length - 1) {
      setDragDirection(1);
      setActiveIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setDragDirection(-1);
      setActiveIndex((prev) => prev - 1);
    }
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background">
      
      {/* 1. MOBILE HEADER: VIEWPORT DIALS (Visible on Mobile/Tablet, Hidden on Desktop) */}
      <div className="md:hidden w-full border-b border-border bg-[#FCFCFA] dark:bg-[#0A0A09] px-4 py-3.5 flex flex-col gap-3 shrink-0 z-40 pt-safe">
        {/* Step tab Row */}
        <div className="flex items-center gap-1.5 w-full">
          {panels.map((p, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setDragDirection(idx > activeIndex ? 1 : -1);
                  setActiveIndex(idx);
                }}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2 px-1 relative`}
                aria-label={`Switch to ${p.title}`}
              >
                <span className={`font-mono text-[9px] uppercase tracking-widest font-black transition-colors duration-300 ${isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-600'}`}>
                  0{idx + 1} // {p.id}
                </span>
                <span className={`font-serif italic text-sm transition-colors duration-300 ${isActive ? 'text-stone-950 dark:text-stone-50' : 'text-stone-400 dark:text-stone-600'}`}>
                  {p.title}
                </span>
                
                {/* Active Underline indicator */}
                {isActive && (
                  <motion.div 
                    layoutId="activeWorkspaceTabLine"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-stone-900 dark:bg-stone-100"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DYNAMIC LAYOUT AREA */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* MOBILE CAROUSEL - Clean and raw, no redundant cards stretching fields */}
        <div className="md:hidden h-full w-full relative">
          <AnimatePresence initial={false} custom={dragDirection} mode="wait">
            <motion.div
              key={activeIndex}
              custom={dragDirection}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? "50%" : "-50%",
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (direction: number) => ({
                  x: direction < 0 ? "50%" : "-50%",
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "tween", duration: 0.25, ease: "easeInOut" },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0 w-full h-full p-4 flex flex-col overflow-y-auto no-scrollbar pb-safe"
            >
              <div className="flex-1 w-full h-full">
                {panels[activeIndex].component}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Inline Navigation helper banner */}
          <div className="absolute inset-x-0 bottom-[env(safe-area-inset-bottom,24px)] pointer-events-none flex justify-between px-6 z-40">
            {activeIndex > 0 ? (
              <button
                onClick={handlePrev}
                className="pointer-events-auto flex items-center gap-1 px-3 py-1 bg-[#141414] text-white dark:bg-[#FDFBF7] dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-md font-mono text-[8px] uppercase tracking-wider"
              >
                <ChevronLeft size={10} /> Prev
              </button>
            ) : <div />}
            {activeIndex < panels.length - 1 ? (
              <button
                onClick={handleNext}
                className="pointer-events-auto flex items-center gap-1 px-3 py-1 bg-[#141414] text-white dark:bg-[#FDFBF7] dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-md font-mono text-[8px] uppercase tracking-wider"
              >
                Next <ChevronRight size={10} />
              </button>
            ) : <div />}
          </div>
        </div>

        {/* 3. DESKTOP GRID LAYOUT (Rendered fully, Hidden on Mobile) */}
        <div className="hidden md:grid h-full w-full p-8 max-w-7xl mx-auto overflow-y-auto">
          <div className={desktopGridClassName}>
            {panels.map((p, idx) => (
              <div
                key={p.id}
                className={`flex flex-col h-full bg-card border border-border p-6 shadow-sm rounded-sm overflow-hidden ${
                  panels.length === 3
                    ? "col-span-4"
                    : panels.length === 2
                    ? "col-span-6"
                    : "col-span-12"
                }`}
              >
                <div className="border-b border-border pb-3 mb-4 flex justify-between items-baseline">
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-black">
                      SECTION 0{idx + 1} // {p.id}
                    </span>
                    <h3 className="font-serif italic text-xl mt-1 text-foreground">
                      {p.title}
                    </h3>
                  </div>
                  <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                    {p.subtitle}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {p.component}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

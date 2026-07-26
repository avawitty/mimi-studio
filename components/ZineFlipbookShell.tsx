import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronLeft, ChevronRight, ScrollText, Type, Eye, Grid3X3, X } from "lucide-react";

export type ZineReadingMode = "scroll" | "flipbook";

const PAGE_SELECTOR = ":scope > section, :scope > footer";

interface ZineFlipbookShellProps {
  mode: ZineReadingMode;
  onModeChange: (mode: ZineReadingMode) => void;
  accentColor: string;
  children: React.ReactNode;
}

export const ZineFlipbookShell: React.FC<ZineFlipbookShellProps> = ({
  mode,
  onModeChange,
  accentColor,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageTitles, setPageTitles] = useState<string[]>([]);
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showPageDrawer, setShowPageDrawer] = useState(false);
  const isFlipbook = mode === "flipbook";

  const refreshPageCount = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pages = el.querySelectorAll<HTMLElement>(PAGE_SELECTOR);
    setPageCount(pages.length);

    const titles: string[] = [];
    pages.forEach((p, idx) => {
      const titled =
        p.getAttribute("data-section-title") ||
        p.querySelector("h1, h2, h3, [data-section-title]")?.textContent;
      titles.push(titled ? titled.trim().slice(0, 40) : `Page ${String(idx + 1).padStart(2, "0")}`);
    });
    setPageTitles(titles);
  }, []);

  useEffect(() => {
    refreshPageCount();
    const el = containerRef.current;
    if (!el) return;

    const observer = new MutationObserver(refreshPageCount);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [refreshPageCount, children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const pages = Array.from(el.querySelectorAll<HTMLElement>(PAGE_SELECTOR));
      if (pages.length === 0) return;

      if (isFlipbook) {
        const scrollPos = el.scrollLeft + el.clientWidth / 2;
        let nearest = 0;
        let minDist = Infinity;
        pages.forEach((page, i) => {
          const center = page.offsetLeft + page.offsetWidth / 2;
          const dist = Math.abs(scrollPos - center);
          if (dist < minDist) {
            minDist = dist;
            nearest = i;
          }
        });
        setCurrentPage(nearest);
      } else {
        const scrollTop = el.scrollTop + el.clientHeight / 3;
        let nearest = 0;
        let minDist = Infinity;
        pages.forEach((page, i) => {
          const top = page.offsetTop;
          const dist = Math.abs(scrollTop - top);
          if (dist < minDist) {
            minDist = dist;
            nearest = i;
          }
        });
        setCurrentPage(nearest);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [isFlipbook, pageCount]);

  const goToPage = useCallback(
    (index: number) => {
      const el = containerRef.current;
      if (!el) return;
      const pages = el.querySelectorAll<HTMLElement>(PAGE_SELECTOR);
      const target = pages[Math.max(0, Math.min(index, pages.length - 1))];
      if (target) {
        if (isFlipbook) {
          target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      setShowPageDrawer(false);
    },
    [isFlipbook],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || (isFlipbook && e.key === "ArrowDown")) {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === "ArrowLeft" || (isFlipbook && e.key === "ArrowUp")) {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === "f" || e.key === "F") {
        setIsFocusMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, goToPage, isFlipbook]);

  const progressPct = pageCount > 0 ? ((currentPage + 1) / pageCount) * 100 : 0;

  const fontClass =
    fontSizeLevel === "large"
      ? "zine-font-large"
      : fontSizeLevel === "xlarge"
      ? "zine-font-xlarge"
      : "zine-font-normal";

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative min-h-0 ${isFocusMode ? "zine-focus-mode" : ""}`}>
      {/* Top Reading Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 z-[6000] bg-stone-200 dark:bg-stone-800 pointer-events-none print:hidden">
        <motion.div
          className="h-full transition-all duration-300"
          style={{ width: `${progressPct}%`, backgroundColor: accentColor || "#1a1a1a" }}
        />
      </div>

      {/* Reading Controls Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[5000] flex items-center gap-1.5 p-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-nous-border/60 rounded-full print:hidden shadow-md transition-opacity duration-300">
        <button
          type="button"
          onClick={() => onModeChange("scroll")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[7px] uppercase tracking-widest transition-all ${
            mode === "scroll"
              ? "bg-nous-text text-nous-base shadow-sm font-bold"
              : "text-nous-subtle hover:text-nous-text"
          }`}
          title="Vertical continuous scroll"
        >
          <ScrollText size={11} />
          Scroll
        </button>
        <button
          type="button"
          onClick={() => onModeChange("flipbook")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[7px] uppercase tracking-widest transition-all ${
            mode === "flipbook"
              ? "bg-nous-text text-nous-base shadow-sm font-bold"
              : "text-nous-subtle hover:text-nous-text"
          }`}
          title="Flipbook horizontal reader"
        >
          <BookOpen size={11} />
          Flipbook
        </button>

        <div className="w-px h-4 bg-nous-border/60 mx-1" />

        {/* Font size multiplier toggle */}
        <button
          type="button"
          onClick={() =>
            setFontSizeLevel((prev) =>
              prev === "normal" ? "large" : prev === "large" ? "xlarge" : "normal"
            )
          }
          className="flex items-center gap-1 px-2.5 py-1.5 text-nous-subtle hover:text-nous-text font-mono text-[7px] uppercase tracking-wider transition-colors rounded-full"
          title="Adjust text size (Normal / Large / Extra)"
        >
          <Type size={11} />
          <span className="font-bold">{fontSizeLevel === "normal" ? "100%" : fontSizeLevel === "large" ? "115%" : "130%"}</span>
        </button>

        {/* Page jump drawer trigger */}
        <button
          type="button"
          onClick={() => setShowPageDrawer(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-nous-subtle hover:text-nous-text font-mono text-[7px] uppercase tracking-wider transition-colors rounded-full"
          title="Open page directory"
        >
          <Grid3X3 size={11} />
          <span className="hidden sm:inline">Directory</span>
        </button>

        {/* Focus Mode toggle */}
        <button
          type="button"
          onClick={() => setIsFocusMode((prev) => !prev)}
          className={`p-1.5 rounded-full transition-colors ${
            isFocusMode
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              : "text-nous-subtle hover:text-nous-text"
          }`}
          title="Toggle Focus Reader Mode (Press F)"
        >
          <Eye size={12} />
        </button>
      </div>

      {/* Bottom Navigation pill (Flipbook & Scroll) */}
      <AnimatePresence>
        {pageCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[5000] flex items-center gap-3 px-4 py-2 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-nous-border/50 rounded-full print:hidden shadow-xl"
          >
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-1 text-nous-subtle hover:text-nous-text disabled:opacity-20 transition-colors"
              aria-label="Previous section"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowPageDrawer(true)}
              className="flex flex-col items-center min-w-[90px] px-2 group"
            >
              <span className="font-mono text-[7px] uppercase tracking-[0.3em] text-nous-subtle group-hover:text-nous-text transition-colors">
                Section {currentPage + 1} of {pageCount}
              </span>
              <span className="font-serif italic text-xs truncate max-w-[140px]" style={{ color: accentColor }}>
                {pageTitles[currentPage] || `Plate 0${currentPage + 1}`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              className="p-1 text-nous-subtle hover:text-nous-text disabled:opacity-20 transition-colors"
              aria-label="Next section"
            >
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Jump Drawer Modal */}
      <AnimatePresence>
        {showPageDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[12000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowPageDrawer(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-stone-900 border border-nous-border p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-nous-border pb-4">
                <div>
                  <h3 className="font-serif italic text-2xl text-nous-text">Zine Directory</h3>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">Jump to any editorial section or plate</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPageDrawer(false)}
                  className="p-2 text-nous-subtle hover:text-nous-text"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {pageTitles.map((title, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goToPage(idx)}
                    className={`p-4 border text-left transition-all flex flex-col gap-1 ${
                      currentPage === idx
                        ? "border-nous-text bg-stone-100 dark:bg-stone-800/80 font-bold"
                        : "border-nous-border/60 hover:border-nous-text hover:bg-stone-50 dark:hover:bg-stone-800/40"
                    }`}
                  >
                    <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                      0{idx + 1} // Section
                    </span>
                    <span className="font-serif italic text-lg text-nous-text line-clamp-1">
                      {title}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page spine accent (flipbook only) */}
      {isFlipbook && (
        <div
          className="absolute left-1/2 top-0 bottom-0 w-px z-[3000] pointer-events-none print:hidden opacity-20"
          style={{
            background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)`,
            boxShadow: `0 0 12px ${accentColor}`,
          }}
        />
      )}

      <div
        ref={containerRef}
        id="zine-content"
        className={`${fontClass} ${
          isFlipbook
            ? "flex-1 flex flex-row overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth print:flex-col print:overflow-visible print:snap-none zine-flipbook-track"
            : "flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar scroll-smooth print:overflow-visible print:snap-none"
        }`}
        style={
          isFlipbook
            ? ({ perspective: "1400px" } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>

      <style>{`
        .zine-font-normal p { font-size: 1.05rem; line-height: 1.8; }
        .zine-font-large p { font-size: 1.2rem; line-height: 1.9; }
        .zine-font-xlarge p { font-size: 1.35rem; line-height: 2.0; }

        .zine-focus-mode .print\\:hidden:not(.top-0) {
          opacity: 0.2;
        }
        .zine-focus-mode .print\\:hidden:not(.top-0):hover {
          opacity: 1;
        }

        .zine-flipbook-track > section,
        .zine-flipbook-track > footer {
          min-width: 100%;
          width: 100%;
          max-width: 100%;
          height: 100%;
          min-height: 100%;
          flex: 0 0 100%;
          flex-shrink: 0;
          scroll-snap-align: center;
          scroll-snap-stop: always;
          transform-style: preserve-3d;
          overflow: hidden;
          transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease;
        }
        @media (max-width: 768px) {
          .zine-flipbook-track > section,
          .zine-flipbook-track > footer {
            min-width: 100%;
            width: 100%;
            flex: 0 0 100%;
          }
        }
        @media print {
          .zine-flipbook-track {
            flex-direction: column !important;
            overflow: visible !important;
          }
          .zine-flipbook-track > section,
          .zine-flipbook-track > footer {
            min-width: auto !important;
            width: auto !important;
            height: auto !important;
            min-height: auto !important;
            flex: none !important;
            overflow: visible !important;
            filter: none !important;
          }
        }
      `}</style>
    </div>
  );
};


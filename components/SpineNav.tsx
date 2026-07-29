import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * SpineNav — an editorial "zine spine" global navigation.
 *
 * Collapsed: a thin vertical bar pinned to the left screen edge, styled like
 * the binding of a magazine, showing the current room's name set vertically.
 * Expanded: the spine widens into an editorial table-of-contents listing the
 * primary rooms (numbered, serif), plus a "Full Index" entry that opens the
 * complete 26-destination drawer.
 *
 * Shares the same navigation contract as the rest of the app: a single
 * `onNavigate(key)` call, and `onOpenIndex()` for the full drawer.
 */

export interface SpineItem {
  key: string;
  label: string;
}

interface SpineNavProps {
  items?: SpineItem[];
  currentView?: string;
  onNavigate?: (key: string) => void;
  /** Opens the full-index drawer (the ~26-item menu). */
  onOpenIndex?: () => void;
}

const DEFAULT_ITEMS: SpineItem[] = [
  { key: "studio", label: "Worktable" },
  { key: "pocket", label: "Pocket" },
  { key: "scribe", label: "Scribe" },
  { key: "tailor", label: "Tailor" },
  { key: "darkroom", label: "Darkroom" },
];

export const SpineNav: React.FC<SpineNavProps> = ({
  items = DEFAULT_ITEMS,
  currentView,
  onNavigate,
  onOpenIndex,
}) => {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the spine is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const current = items.find((i) => i.key === currentView);
  const currentLabel = current?.label ?? "Menu";

  return (
    <div className="md:hidden">
      {/* Collapsed spine: the "binding" pinned to the left edge */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open navigation. Current room: ${currentLabel}`}
        aria-expanded={open}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[9991] flex flex-col items-center justify-center gap-3 w-8 h-56 rounded-r-nous border-y border-r border-nous-border bg-nous-text text-nous-base shadow-lg active:scale-[0.98] transition-transform"
      >
        {/* binding grooves */}
        <span className="absolute left-[3px] top-4 bottom-4 w-px bg-nous-base/25" />
        <span className="absolute left-[6px] top-4 bottom-4 w-px bg-nous-base/15" />
        <span
          className="font-serif text-sm italic tracking-wide whitespace-nowrap"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {currentLabel}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Scrim */}
            <motion.button
              type="button"
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[9992] bg-nous-text/30 backdrop-blur-[2px]"
            />

            {/* Expanded spine → table of contents */}
            <motion.nav
              aria-label="Primary"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed left-0 top-0 bottom-0 z-[9993] w-72 max-w-[80vw] bg-nous-base border-r border-nous-border shadow-2xl flex flex-col"
            >
              {/* Masthead */}
              <div className="flex items-start justify-between px-6 pt-8 pb-6 border-b border-nous-border">
                <div>
                  <div className="font-serif text-3xl leading-none text-nous-text">Mimi</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle mt-2">
                    Contents
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex items-center justify-center w-11 h-11 -mr-2 -mt-1 rounded-nous text-nous-subtle active:scale-95 transition-transform"
                >
                  <X size={20} strokeWidth={1.6} />
                </button>
              </div>

              {/* Table of contents */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
                <ul className="flex flex-col">
                  {items.map((item, i) => {
                    const isActive = currentView === item.key;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate?.(item.key);
                            setOpen(false);
                          }}
                          className="group w-full min-h-[52px] flex items-baseline gap-4 py-3 border-b border-nous-border/60 text-left"
                        >
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              isActive ? "text-nous-text" : "text-nous-subtle"
                            }`}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`font-serif text-2xl leading-tight transition-colors ${
                              isActive
                                ? "text-nous-text italic"
                                : "text-nous-text/80 group-active:text-nous-text"
                            }`}
                          >
                            {item.label}
                          </span>
                          {isActive && (
                            <span className="ml-auto self-center w-1.5 h-1.5 rounded-full bg-nous-text" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Full index */}
              {onOpenIndex && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenIndex();
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-6 py-5 border-t border-nous-border text-nous-subtle active:bg-nous-paper transition-colors"
                >
                  <Menu size={18} strokeWidth={1.6} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                    Full Index
                  </span>
                </button>
              )}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

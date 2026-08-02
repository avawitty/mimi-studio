import React from "react";
import type { DossierFolder } from "./DossierTabs";

type ChamberExploreProps = {
  folders: DossierFolder[];
  activeId: string;
  onSelect: (folder: DossierFolder) => void;
  className?: string;
};

/**
 * 3×2 chamber grid — calmer explore surface than the manila tab rail,
 * while keeping the same DESK / SCRY / FILE destinations.
 */
export const ChamberExplore: React.FC<ChamberExploreProps> = ({
  folders,
  activeId,
  onSelect,
  className = "",
}) => {
  return (
    <section
      data-specimen="WT-CHAMBERS"
      className={`${className}`.trim()}
      aria-label="Explore chambers"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--wt-ink-2,#6b6a66)] mb-3">
        Explore chambers
      </p>
      <div className="grid grid-cols-3 gap-2">
        {folders.map((folder) => {
          const active = folder.id === activeId;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelect(folder)}
              aria-current={active ? "page" : undefined}
              className={`relative min-h-[4.5rem] border px-2 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
                active
                  ? "border-[var(--wt-ink,#1b1b19)] bg-[var(--wt-paper-2,#f0ede6)]"
                  : "border-[var(--wt-line,#d8d3c6)] bg-[var(--wt-paper,#f6f3ec)] hover:border-[var(--wt-ink,#1b1b19)]"
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--wt-seal,#c33b32)]"
                />
              )}
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--wt-ink,#1b1b19)]">
                {folder.label}
              </span>
              <span className="font-serif italic text-[12px] text-[var(--wt-ink-2,#6b6a66)]">
                {folder.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

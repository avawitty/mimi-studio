import React from "react";
import { LayoutGrid } from "lucide-react";
import { useChamber } from "../../hooks/useChamber";
import { useIsNarrow } from "../../hooks/useBreakpoint";

export interface AppShellProps {
  viewMode: string;
  /** Hide binder spine (e.g. zine reveal) */
  hideBinder?: boolean;
  /** Menu open state for aria */
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  /** Top chrome slot (StudioChrome) — rendered above the binder+main row */
  chrome?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function mainSurfaceClass(viewMode: string): string {
  const chamber = {
    isWorktable: [
      "studio",
      "taste-graph",
      "taste-discovery",
      "the-edit",
      "tailor",
      "moodboard",
      "darkroom",
      "private-studio",
      "quiet-studio",
      "brand-intake",
    ].includes(viewMode),
    isVoid: viewMode === "mimi-rip" || viewMode === "scry",
    isPublicPad: [
      "editorial-home",
      "stand",
      "signature",
      "showcase",
      "archival",
    ].includes(viewMode),
  };

  if (chamber.isWorktable) {
    return "overflow-hidden min-h-0 pb-0 h-full";
  }
  if (chamber.isVoid) {
    return "overflow-hidden min-h-0 pb-0 h-full bg-[#050506]";
  }
  if (chamber.isPublicPad) {
    return "overflow-y-auto bg-nous-base pb-8 md:pb-0 mimi-page-pad mimi-page-pad--public";
  }
  return "overflow-y-auto bg-nous-base pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-0 mimi-page-pad";
}

/**
 * Chamber-aware application frame: optional chrome, binder spine, main plate.
 * Preserves StudioChrome public-face / dark-plate rules via useChamber flags
 * exposed as data attributes for CSS and QA.
 */
export const AppShell: React.FC<AppShellProps> = ({
  viewMode,
  hideBinder = false,
  menuOpen = false,
  onToggleMenu,
  chrome,
  children,
  className = "",
}) => {
  const chamber = useChamber(viewMode);
  const isNarrow = useIsNarrow();

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 overflow-hidden ${className}`}
      data-chamber-family={chamber.family}
      data-public-face={chamber.isPublicFace ? "true" : "false"}
      data-dark-plate={chamber.isDarkPlate ? "true" : "false"}
      data-quiet-chrome={chamber.quietChrome ? "true" : "false"}
      data-breakpoint={isNarrow ? "narrow" : "wide"}
    >
      {chrome}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {!hideBinder && (
          <button
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-label="Toggle Mimi Canon Menu"
            title="Toggle Mimi Canon Menu"
            className="w-16 bg-black flex flex-col items-center py-6 border-r border-stone-900 relative z-20 hidden md:flex cursor-pointer hover:bg-stone-950 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/80 text-left"
          >
            <div className="flex flex-col items-center justify-between h-full select-none w-full relative z-10 text-stone-300 pointer-events-none">
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <div className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center bg-[#1c1c1a]/50 text-[#f3f1ea]">
                  <LayoutGrid size={14} strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black">
                  MENU
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center py-8 relative w-full">
                <div
                  className="binder-spine-rod absolute left-1/2 -translate-x-1/2"
                  aria-hidden
                >
                  <span
                    className="binder-spine-stud"
                    style={{ top: "18%" }}
                  />
                  <span
                    className="binder-spine-stud"
                    style={{ bottom: "18%" }}
                  />
                </div>
                <div
                  className="absolute left-2 top-[18%] bottom-[18%] w-0.5 opacity-50"
                  style={{
                    background:
                      "repeating-linear-gradient(to bottom, #fff 0 2px, transparent 2px 12px)",
                  }}
                  aria-hidden
                />
              </div>

              <div className="flex flex-col items-center gap-1 font-mono text-[7px] text-stone-500 mb-2">
                <span>FOLIO</span>
                <span
                  className="text-[9px]"
                  style={{
                    color: chamber.signalDense
                      ? "var(--mimi-cobalt, #9BB8CE)"
                      : "#f3f1ea",
                  }}
                >
                  ◎
                </span>
              </div>
            </div>
          </button>
        )}

        <main
          className={`flex-1 flex flex-col relative ${mainSurfaceClass(viewMode)}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

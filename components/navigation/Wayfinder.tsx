import React from "react";
import { CREATOR_PATH } from "../../lib/design-system";
import { useChamber } from "../../hooks/useChamber";

export interface WayfinderProps {
  viewMode: string;
  onNavigate: (mode: string) => void;
  /** Hide on public faces — quiet chrome */
  forceHide?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Chamber-aware orientation strip: previous → current → likely next.
 * Intended for the nav drawer (and future desktop chrome), not public plates.
 */
export const Wayfinder: React.FC<WayfinderProps> = ({
  viewMode,
  onNavigate,
  forceHide = false,
  disabled = false,
  className = "",
}) => {
  const chamber = useChamber(viewMode);

  if (forceHide || chamber.quietChrome) return null;

  const activeIndex = chamber.pathIndex >= 0 ? chamber.pathIndex : 0;
  const visiblePath = CREATOR_PATH.map((step, index) => ({
    step,
    index,
  })).filter(
    ({ index }) => index >= activeIndex - 1 && index <= activeIndex + 1,
  );

  return (
    <div
      className={`px-6 py-4 border-b studio-border studio-bg-surface ${className}`}
      data-wayfinder="creator-path"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[8px] uppercase tracking-[0.28em] font-bold studio-text-muted">
          Wayfinder
        </span>
        <span
          className="font-mono text-[8px] uppercase tracking-[0.2em] font-bold"
          style={{ color: "var(--mimi-cobalt-deep, #6A8AA4)" }}
        >
          {chamber.module?.name || chamber.pathLabel || chamber.family}
        </span>
      </div>

      <ol className="grid grid-cols-3 gap-1.5">
        {visiblePath.map(({ step, index }) => {
          const active = activeIndex === index;
          const passed =
            chamber.pathIndex >= 0 && index < activeIndex;
          return (
            <li key={step.step}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onNavigate(step.primaryMode)}
                title={`${step.label}: ${step.note}`}
                aria-current={active ? "step" : undefined}
                className={`w-full text-left px-1.5 py-2 border transition-colors min-h-12 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? "border-[color:var(--mimi-cobalt,#9BB8CE)] bg-[color:var(--mimi-cobalt,#9BB8CE)]/10"
                    : passed
                      ? "studio-border studio-text-ink"
                      : "studio-border studio-text-muted hover:studio-text-ink"
                }`}
              >
                <span className="block font-mono text-[7px] uppercase tracking-[0.22em] font-bold opacity-70">
                  {step.number}
                </span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.14em] font-extrabold mt-1 leading-none">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

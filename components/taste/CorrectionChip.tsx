/**
 * CorrectionChip
 *
 * Lightweight inline correction affordance for Taste Intelligence interpretations.
 * Shown alongside AI-generated observations and taste assertions.
 *
 * Designed to feel fast and editorial — not like a survey.
 * The user should be able to react in a single tap.
 *
 * Mobile-first: chips are tappable, min 44px hit area on touch.
 */
import React from "react";
import type { CorrectionState } from "../../types";
import { describeCorrectionState, CORRECTION_CHIP_OPTIONS } from "../../services/taste/correctionService";
import { cn } from "../../lib/utils";

export interface CorrectionChipProps {
  /** The currently selected correction, if any */
  selected?: CorrectionState;
  /** Called when the user taps a correction chip */
  onCorrect: (correction: CorrectionState) => void;
  /** Whether correction is in-progress (shows loading state) */
  isApplying?: boolean;
  /** Compact mode — show only shortLabel instead of full label */
  compact?: boolean;
  className?: string;
}

const CHIP_STYLES: Record<CorrectionState, string> = {
  YES: "border-emerald-300/60 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60",
  SORT_OF: "border-amber-300/60 bg-amber-50/80 text-amber-800 hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60",
  NOT_ANYMORE: "border-orange-300/60 bg-orange-50/80 text-orange-800 hover:bg-orange-100 dark:border-orange-700/50 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/60",
  ONLY_HERE: "border-sky-300/60 bg-sky-50/80 text-sky-800 hover:bg-sky-100 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/60",
  NOT_ME: "border-rose-300/60 bg-rose-50/80 text-rose-800 hover:bg-rose-100 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60",
  MORE_LIKE_THIS: "border-violet-300/60 bg-violet-50/80 text-violet-800 hover:bg-violet-100 dark:border-violet-700/50 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/60",
};

const SELECTED_CHIP_STYLES: Record<CorrectionState, string> = {
  YES: "border-emerald-500 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400/60 dark:border-emerald-500 dark:bg-emerald-900/60 dark:text-emerald-100",
  SORT_OF: "border-amber-500 bg-amber-100 text-amber-900 ring-1 ring-amber-400/60 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-100",
  NOT_ANYMORE: "border-orange-500 bg-orange-100 text-orange-900 ring-1 ring-orange-400/60 dark:border-orange-500 dark:bg-orange-900/60 dark:text-orange-100",
  ONLY_HERE: "border-sky-500 bg-sky-100 text-sky-900 ring-1 ring-sky-400/60 dark:border-sky-500 dark:bg-sky-900/60 dark:text-sky-100",
  NOT_ME: "border-rose-500 bg-rose-100 text-rose-900 ring-1 ring-rose-400/60 dark:border-rose-500 dark:bg-rose-900/60 dark:text-rose-100",
  MORE_LIKE_THIS: "border-violet-500 bg-violet-100 text-violet-900 ring-1 ring-violet-400/60 dark:border-violet-500 dark:bg-violet-900/60 dark:text-violet-100",
};

export function CorrectionChip({
  selected,
  onCorrect,
  isApplying = false,
  compact = false,
  className,
}: CorrectionChipProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        isApplying && "pointer-events-none opacity-60",
        className,
      )}
      role="group"
      aria-label="Correct this interpretation"
    >
      {CORRECTION_CHIP_OPTIONS.map((state) => {
        const { label, shortLabel, description } = describeCorrectionState(state);
        const isSelected = selected === state;
        return (
          <button
            key={state}
            type="button"
            title={description}
            aria-pressed={isSelected}
            aria-label={description}
            onClick={() => onCorrect(state)}
            className={cn(
              // Base styles — editorial mono feel
              "inline-flex min-h-[2rem] items-center rounded-sm border px-2 py-0.5",
              "font-mono text-[10px] uppercase tracking-wider",
              "transition-all duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              // Touch target
              "min-w-[2.5rem]",
              isSelected
                ? SELECTED_CHIP_STYLES[state]
                : CHIP_STYLES[state],
            )}
          >
            {compact ? shortLabel : label}
          </button>
        );
      })}
    </div>
  );
}

export default CorrectionChip;

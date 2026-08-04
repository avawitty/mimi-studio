import React from "react";
import type { ZineCoverVariant } from "../../types";

export type CoverContactStripProps = {
  variants: ZineCoverVariant[];
  onPromote: (seed: string) => void;
  disabled?: boolean;
};

/**
 * 2×2 contact strip below the main cover frame (Dev · Darkroom).
 * Theme tokens only — no chamber-specific chrome.
 */
export const CoverContactStrip: React.FC<CoverContactStripProps> = ({
  variants,
  onPromote,
  disabled = false,
}) => {
  if (variants.length === 0) return null;

  const slots = variants.slice(0, 4);

  return (
    <div
      className="mt-3 border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-field,#ffffff)]"
      aria-label="Cover contact sheet"
    >
      <div className="px-2 py-1.5 border-b border-[var(--mimi-hairline,#d4d4d4)] flex items-center justify-between gap-2">
        <span className="font-sans text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
          Contact strip
        </span>
        <span className="font-sans text-[7px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]">
          {slots.length}/4
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 p-1">
        {slots.map((variant, index) => (
          <button
            key={variant.seed}
            type="button"
            disabled={disabled}
            onClick={() => onPromote(variant.seed)}
            className="relative aspect-[3/4] overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-bone,#f4f1ea)] hover:border-[var(--mimi-ink,#0a0a0a)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--mimi-ink,#0a0a0a)] disabled:opacity-50 transition-colors"
            aria-label={`Promote variant ${index + 1} to main frame`}
          >
            <img
              src={variant.url}
              alt=""
              className="w-full h-full object-cover grayscale-[0.15]"
            />
            <span
              className="absolute bottom-0.5 right-0.5 font-sans text-[6px] uppercase tracking-[0.16em] px-1 py-0.5 bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#ffffff)]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

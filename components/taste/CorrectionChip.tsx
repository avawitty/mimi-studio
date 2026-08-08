import React from "react";
import type { CorrectionState } from "../../lib/taste/types";

const OPTIONS: Array<{ value: CorrectionState; label: string }> = [
  { value: "YES", label: "Yes" },
  { value: "SORT_OF", label: "Sort of" },
  { value: "NOT_ANYMORE", label: "Not anymore" },
  { value: "ONLY_HERE", label: "Only here" },
  { value: "NOT_ME", label: "Not me" },
  { value: "MORE_LIKE_THIS", label: "More like this" },
];

export interface CorrectionChipProps {
  value?: CorrectionState;
  disabled?: boolean;
  compact?: boolean;
  onChange: (value: CorrectionState) => void | Promise<void>;
}

export default function CorrectionChip({
  value,
  disabled = false,
  compact = false,
  onChange,
}: CorrectionChipProps) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Correct Mimi's interpretation"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              selected
                ? "border-stone-900 bg-stone-900 text-stone-50"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-500",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

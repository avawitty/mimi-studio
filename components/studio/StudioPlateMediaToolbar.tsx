import React from "react";
import type { ZinePlateMediaMode } from "../../types";
import { ZINE_PLATE_MEDIA_MODE_LABELS } from "../../lib/zinePlateMediaMode";

export type StudioPlateMediaToolbarProps = {
  value: ZinePlateMediaMode;
  onChange: (mode: ZinePlateMediaMode) => void;
};

const TOOLBAR_MODES: ZinePlateMediaMode[] = [
  "generated",
  "photography-first",
  "references-only",
];

export const StudioPlateMediaToolbar: React.FC<StudioPlateMediaToolbarProps> = ({
  value,
  onChange,
}) => {
  return (
    <div
      role="toolbar"
      aria-label="Plate media"
      className="flex flex-wrap items-center gap-1"
    >
      {TOOLBAR_MODES.map((mode) => {
        const copy = ZINE_PLATE_MEDIA_MODE_LABELS[mode];
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            title={copy.note}
            onClick={() => onChange(mode)}
            className={`min-h-9 border px-2.5 font-mono text-[8px] uppercase tracking-[0.16em] transition-colors ${
              active
                ? "border-[var(--mimi-ink,#0a0a0a)] bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#ffffff)]"
                : "border-[var(--mimi-hairline,#d4d4d4)] text-[var(--mimi-stone,#78716c)] hover:border-[var(--mimi-stone,#78716c)] hover:text-[var(--mimi-ink,#0a0a0a)]"
            }`}
          >
            {copy.label}
          </button>
        );
      })}
    </div>
  );
};

export default StudioPlateMediaToolbar;

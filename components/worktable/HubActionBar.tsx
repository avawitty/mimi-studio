import React from "react";

type HubActionBarProps = {
  contextSummary: string;
  onOpenContext: () => void;
  onGenerate: () => void;
  generating?: boolean;
  className?: string;
};

/**
 * Unified bottom bar: Context · M mark · Generate
 * Middle ground between separate context/spark stacks and a dense tab nav.
 */
export const HubActionBar: React.FC<HubActionBarProps> = ({
  contextSummary,
  onOpenContext,
  onGenerate,
  generating = false,
  className = "",
}) => {
  const shortContext =
    contextSummary.length > 42
      ? `${contextSummary.slice(0, 40)}…`
      : contextSummary;

  return (
    <div
      data-specimen="WT-HUB-BAR"
      className={`shrink-0 border-t border-[var(--wt-line,#d8d3c6)] bg-[var(--wt-paper,#f6f3ec)] ${className}`.trim()}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 min-h-14">
        <button
          type="button"
          onClick={onOpenContext}
          className="min-h-12 text-left px-1"
        >
          <span className="block font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--wt-ink-2,#6b6a66)]">
            Context
          </span>
          <span className="block font-serif italic text-[12px] leading-snug text-[var(--wt-ink,#1b1b19)] truncate">
            {shortContext}
          </span>
        </button>

        <button
          type="button"
          aria-label="Mimi home"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("mimi:change_view", { detail: "studio" }),
            )
          }
          className="w-12 h-12 rounded-full border border-[var(--wt-ink,#1b1b19)] bg-[var(--wt-paper,#f6f3ec)] flex items-center justify-center font-serif italic text-[18px] text-[var(--wt-ink,#1b1b19)] shrink-0"
        >
          M
        </button>

        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="min-h-12 text-right px-1 disabled:opacity-50"
        >
          <span className="block font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--wt-ink-2,#6b6a66)]">
            Generate
          </span>
          <span className="inline-flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--wt-ink,#1b1b19)] font-bold">
            {generating ? "Developing…" : "Spark new work"}
            <span aria-hidden className="text-[13px]">
              ⚡
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

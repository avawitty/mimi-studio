import React from "react";
import { ArrowRight, Telescope } from "lucide-react";
import { OBSERVATORY_COPY } from "../../lib/observatoryChamberContract";
import { PublicCTA } from "../public-face/PublicCTA";
import { PressMark } from "../public-face/PressMark";

export const ProsceniumCollectiveBrief: React.FC<{
  contributingCount?: number;
  stagedCount?: number;
  onNavigate?: (path: string) => void;
}> = ({ contributingCount = 0, stagedCount = 0, onNavigate }) => {
  const go = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    window.dispatchEvent(
      new CustomEvent("mimi:change_view", {
        detail: path.replace(/^\//, ""),
      }),
    );
  };

  return (
    <aside
      data-testid="proscenium-collective-brief"
      className="border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-worktable,#fafafa)]/80 px-5 py-4 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2 max-w-xl">
          <PressMark label="Collective consent" tone="cobalt" />
          <p className="font-serif italic text-base text-[var(--mimi-ink,#0a0a0a)] leading-relaxed">
            Staging on The Proscenium is the consent moment for{" "}
            <span className="not-italic font-sans text-[11px] uppercase tracking-[0.16em] text-[var(--mimi-stone,#78716c)]">
              Mean Median Mode
            </span>
            .
          </p>
          <p className="font-sans text-[12px] text-[var(--mimi-stone,#78716c)] leading-relaxed">
            {OBSERVATORY_COPY.demonstrationBanner}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[var(--mimi-stone,#78716c)]">
          <Telescope size={14} aria-hidden />
          <span className="font-mono text-[8px] uppercase tracking-[0.24em]">
            Observatory
          </span>
        </div>
      </div>

      {(contributingCount > 0 || stagedCount > 0) && (
        <div className="flex flex-wrap gap-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
          {contributingCount > 0 && (
            <span data-testid="proscenium-mmm-count">
              {contributingCount} contributing
            </span>
          )}
          {stagedCount > 0 && (
            <span data-testid="proscenium-staged-only-count">
              {stagedCount} staged only
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <PublicCTA onClick={() => go("/mean-median-mode")}>
          Mean Median Mode <ArrowRight size={12} />
        </PublicCTA>
        <PublicCTA variant="ghost" onClick={() => go("/observatory")}>
          The Observatory
        </PublicCTA>
      </div>
    </aside>
  );
};

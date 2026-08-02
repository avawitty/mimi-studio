import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import type { StudioPhase } from "../../lib/productCanon";
import { MimiWordmark } from "../public-face/MimiWordmark";

export interface StudioHeaderProps {
  phase: StudioPhase;
  title?: string;
  /** Opens the global NavigationDrawer — same owner as StudioChrome. */
  onOpenMenu?: () => void;
}

const formatDeskTime = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  phase,
  title = "Studio desk",
  onOpenMenu,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-[var(--mimi-rule,#d8d4c9)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {onOpenMenu ? (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Open full menu"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-[var(--mimi-ink,#111110)]"
            >
              <Menu size={16} strokeWidth={1.5} />
            </button>
          ) : null}
          <div className="flex min-w-0 items-baseline gap-2">
            <MimiWordmark as="span" size="sm" />
            <span
              aria-hidden
              className="font-mono text-[9px] text-[var(--mimi-pencil,#8a877f)]"
            >
              /
            </span>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--mimi-pencil,#8a877f)]">
              {title}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-pencil,#8a877f)]">
            Phase · {phase}
          </p>
          <p className="mt-1 hidden font-mono text-[8px] tracking-[0.08em] text-[var(--mimi-pencil,#8a877f)] sm:block">
            {formatDeskTime(now)}
          </p>
        </div>
      </div>
    </header>
  );
};

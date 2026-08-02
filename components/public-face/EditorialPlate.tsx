import React from "react";
import { MimiWordmark } from "./MimiWordmark";
import { PublicCTA } from "./PublicCTA";
import { PressMark } from "./PressMark";

type EditorialPlateProps = {
  thesis: string;
  supporting?: string;
  actionLabel: string;
  onAction: () => void;
  visual: React.ReactNode;
  folioLabel?: string;
  className?: string;
  /** Hide wordmark when parent already shows brand */
  showWordmark?: boolean;
};

/**
 * One-composition entry plate: brand + thesis + one action + dominant visual.
 * House style first; light blue is accent-only (PRD-02 / PRD-07).
 */
export const EditorialPlate: React.FC<EditorialPlateProps> = ({
  thesis,
  supporting,
  actionLabel,
  onAction,
  visual,
  folioLabel = "ISSUE",
  className = "",
  showWordmark = true,
}) => {
  return (
    <section
      className={`relative grid grid-cols-1 lg:grid-cols-12 lg:min-h-[min(100dvh,920px)] ${className}`}
    >
      <div className="lg:col-span-5 flex flex-col justify-between gap-8 md:gap-10 px-6 md:px-12 py-8 md:py-16 border-b lg:border-b-0 lg:border-r border-[var(--mimi-hairline,#d4d4d4)]">
        <div className="space-y-6 md:space-y-8">
          {showWordmark && <MimiWordmark size="lg" as="h1" />}
          <div className="space-y-3 md:space-y-4 max-w-md">
            <p className="font-serif italic text-2xl md:text-3xl leading-snug text-[var(--mimi-ink,#0a0a0a)]">
              {thesis}
            </p>
            {supporting && (
              <p className="font-sans text-sm text-[var(--mimi-stone,#78716c)] leading-relaxed">
                {supporting}
              </p>
            )}
          </div>
          <PublicCTA onClick={onAction}>{actionLabel}</PublicCTA>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <PressMark label={folioLabel} tone="olive" />
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full bg-[var(--mimi-cobalt,#9BB8CE)]"
          />
        </div>
      </div>
      <div className="lg:col-span-7 relative min-h-[36vh] md:min-h-[42vh] lg:min-h-0 overflow-hidden bg-[var(--mimi-worktable,#fafafa)]">
        <div className="absolute inset-0">{visual}</div>
      </div>
    </section>
  );
};

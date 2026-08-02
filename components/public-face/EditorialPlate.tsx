import React from "react";
import { MimiWordmark } from "./MimiWordmark";
import { PublicCTA } from "./PublicCTA";
import { ColumnRule } from "./ColumnRule";
import { PressMark } from "./PressMark";
import { RegistryCorners } from "./RegistryCorners";

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
 * PRD-02 / PRD-07.
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
      className={`relative grid grid-cols-1 lg:grid-cols-12 min-h-[min(100dvh,920px)] ${className}`}
    >
      <RegistryCorners tone="cobalt" />
      <div className="lg:col-span-5 flex flex-col justify-between gap-10 px-6 md:px-12 py-12 md:py-16 border-b lg:border-b-0 lg:border-r border-[var(--mimi-hairline,#d4d4d4)]">
        <div className="space-y-8">
          {showWordmark && <MimiWordmark size="lg" as="h1" />}
          <div className="space-y-4 max-w-md">
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
        <div className="space-y-3">
          <div className="mimi-gilt-rule" aria-hidden />
          <PressMark label={folioLabel} tone="cobalt" />
        </div>
      </div>
      <div className="lg:col-span-7 relative min-h-[42vh] lg:min-h-0 bg-[var(--mimi-ink,#0a0a0a)] overflow-hidden mimi-cobalt-haze">
        {visual}
      </div>
    </section>
  );
};

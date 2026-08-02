import React from "react";
import type { ChamberIntent } from "../../lib/chamberIntents";
import { useDossierContext } from "./DossierContext";
import { MimiGlyph } from "./MimiGlyph";

export interface NextActionProps {
  label: string;
  sentence: string;
  intent: ChamberIntent;
  disabled?: boolean;
  className?: string;
}

export const NextAction: React.FC<NextActionProps> = ({
  label,
  sentence,
  intent,
  disabled = false,
  className = "",
}) => {
  const { dispatchIntent } = useDossierContext();

  return (
    <section
      aria-labelledby="next-action-heading"
      className={`border-l-2 border-[var(--mimi-periwinkle,#b9c4e0)] pl-4 ${className}`}
    >
      <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-pencil,#8a877f)]">
        Next best action
      </p>
      <h2
        id="next-action-heading"
        className="mt-2 max-w-2xl font-serif text-2xl leading-tight md:text-3xl"
      >
        {sentence}
      </h2>
      <button
        type="button"
        disabled={disabled}
        onClick={() => dispatchIntent(intent)}
        className="mt-4 inline-flex min-h-12 items-center gap-3 bg-[var(--mimi-ink,#111110)] px-5 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--mimi-bone,#f4f1ea)] disabled:opacity-40"
      >
        {label}
        <MimiGlyph name="arrow" decorative size={14} />
      </button>
    </section>
  );
};

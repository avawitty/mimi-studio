import React from "react";
import { Loader2 } from "lucide-react";
import type { TasteCritique } from "../../schemas/tasteIntelligenceContracts";

type TasteCritiqueCardProps = {
  critique: TasteCritique | null;
  loading?: boolean;
};

function CritiqueSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "positive" | "warning" | "neutral";
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "positive"
      ? "text-mimi-olive"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-400"
        : "text-mimi-ink";

  return (
    <div>
      <p className="font-mono text-[7px] uppercase tracking-widest text-mimi-stone mb-1">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={`${title}-${item}`} className={`font-sans text-[11px] leading-snug ${toneClass}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const TasteCritiqueCard: React.FC<TasteCritiqueCardProps> = ({
  critique,
  loading,
}) => {
  if (!loading && !critique) return null;

  return (
    <div className="w-full max-w-2xl border border-mimi-hairline/40 bg-mimi-field/90 px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-mimi-olive">
          Taste critic
        </p>
        {critique && (
          <p className="font-mono text-[8px] text-mimi-stone">
            Alignment {Math.round(critique.alignmentScore * 100)}%
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-mimi-stone">
          <Loader2 size={14} className="animate-spin" />
          <span className="font-sans text-[11px]">Critiquing output against contract…</span>
        </div>
      )}

      {critique && (
        <div className="grid gap-3 sm:grid-cols-2">
          <CritiqueSection title="Preserved" items={critique.preservedRules} tone="positive" />
          <CritiqueSection title="Violated" items={critique.violatedRules} tone="warning" />
          <CritiqueSection title="Useful departures" items={critique.usefulDepartures} />
          <CritiqueSection title="Accidental departures" items={critique.accidentalDepartures} tone="warning" />
        </div>
      )}
    </div>
  );
};

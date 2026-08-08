import React, { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { TasteCritique } from "../../schemas/tasteIntelligenceContracts";

type TasteCritiqueCardProps = {
  critique: TasteCritique | null;
  loading?: boolean;
  unavailable?: boolean;
  error?: string | null;
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

function confidenceDisplay(label?: "low" | "moderate" | "high"): string {
  switch (label) {
    case "high":
      return "high";
    case "moderate":
      return "moderate";
    case "low":
      return "low";
    default:
      return "moderate";
  }
}

export const TasteCritiqueCard: React.FC<TasteCritiqueCardProps> = ({
  critique,
  loading,
  unavailable,
  error,
}) => {
  const [showProvenance, setShowProvenance] = useState(false);

  if (!loading && !critique && !unavailable) return null;

  const partialNote =
    critique?.featureExtraction?.completeness === "partial"
      ? critique.featureExtraction.partialReason ??
        "Partial critique — Mimi could evaluate text and layout metadata but not the generated imagery."
      : null;

  return (
    <div className="w-full max-w-2xl border border-mimi-hairline/40 bg-mimi-field/90 px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-mimi-olive">
          Taste Critic
        </p>
        {critique && (
          <p className="font-mono text-[8px] text-mimi-stone">
            Score {Math.round(critique.alignmentScore)} / 100
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-mimi-stone">
          <Loader2 size={14} className="animate-spin" />
          <span className="font-sans text-[11px]">Critiquing output against contract…</span>
        </div>
      )}

      {unavailable && !loading && (
        <p className="font-sans text-[11px] text-mimi-stone">Critique unavailable</p>
      )}

      {error && !loading && !critique && (
        <p className="font-sans text-[11px] text-amber-700 dark:text-amber-400">{error}</p>
      )}

      {critique && (
        <>
          <p className="font-sans text-[11px] text-mimi-stone">
            Confidence: {confidenceDisplay(critique.confidenceLabel)}
            {critique.artifactId ? (
              <span className="ml-2 font-mono text-[9px]">artifact {critique.artifactId.slice(0, 8)}…</span>
            ) : null}
          </p>

          {partialNote && (
            <p className="font-sans text-[11px] text-amber-700 dark:text-amber-400">{partialNote}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <CritiqueSection title="Preserved" items={critique.preservedRules} tone="positive" />
            <CritiqueSection title="Violated" items={critique.violatedRules} tone="warning" />
            <CritiqueSection title="Useful departures" items={critique.usefulDepartures} />
            <CritiqueSection
              title="Accidental departures"
              items={critique.accidentalDepartures}
              tone="warning"
            />
          </div>

          {critique.counterfactualRepairs.length > 0 && (
            <div>
              <p className="font-mono text-[7px] uppercase tracking-widest text-mimi-stone mb-1">
                Suggested repairs
              </p>
              <ul className="space-y-2">
                {critique.counterfactualRepairs.map((repair, index) => (
                  <li
                    key={`repair-${index}`}
                    className="border border-mimi-hairline/30 px-2 py-1.5"
                  >
                    {repair.modifications.slice(0, 2).map((mod) => (
                      <p key={`${mod.featureId}-${mod.operation}`} className="font-sans text-[11px] text-mimi-ink">
                        {mod.rationale}
                        <span className="ml-1 font-mono text-[9px] text-mimi-stone">
                          → {Math.round(mod.scoreAfter)} / 100
                        </span>
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowProvenance((v) => !v)}
            className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest text-mimi-stone"
          >
            Why Mimi scored this
            {showProvenance ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showProvenance && (
            <div className="space-y-1 border-t border-mimi-hairline/30 pt-2">
              {(critique.featureExtraction?.extractedFeatures ?? []).slice(0, 8).map((f) => (
                <p key={f.label} className="font-sans text-[10px] text-mimi-ink">
                  {f.label}
                  <span className="ml-1 text-mimi-stone">({f.source})</span>
                </p>
              ))}
              {(critique.unresolvedUnknowns ?? []).map((u) => (
                <p key={u} className="font-sans text-[10px] text-mimi-stone">
                  {u}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

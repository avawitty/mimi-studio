import React, { useState } from "react";
import type { CorrectionState, EvidenceAtom } from "../../lib/taste/types";
import { applyInlineCorrection } from "../../services/taste/correctionService";
import CorrectionChip from "./CorrectionChip";

export interface EvidenceAtomCardProps {
  atom: EvidenceAtom;
  assertionId?: string;
  interpretation?: string;
  onCorrected?: (correction: CorrectionState) => void;
}

export default function EvidenceAtomCard({
  atom,
  assertionId,
  interpretation,
  onCorrected,
}: EvidenceAtomCardProps) {
  const [correction, setCorrection] = useState<CorrectionState | undefined>(atom.correction);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCorrection = async (next: CorrectionState) => {
    setSaving(true);
    setError(null);
    try {
      await applyInlineCorrection(atom.userId, atom.id, next, assertionId);
      setCorrection(next);
      onCorrected?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save correction.");
    } finally {
      setSaving(false);
    }
  };

  const visualSource = atom.thumbnailUrl || atom.assetUrl;
  const read = interpretation || atom.semanticDescription;

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
      {visualSource && (atom.kind === "image" || atom.kind === "screenshot" || atom.kind === "product") ? (
        <img
          src={visualSource}
          alt={atom.title || "Taste reference"}
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
        />
      ) : null}

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Evidence</p>
            <h3 className="mt-1 text-sm font-medium text-stone-900">
              {atom.title || atom.originalSource.slice(0, 80)}
            </h3>
          </div>
          <span className="rounded-full border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500">
            {atom.processingState}
          </span>
        </div>

        {read ? (
          <div className="rounded-xl bg-white p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400">Mimi thinks</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-700">{read}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs text-stone-500">Does this interpretation belong to you?</p>
          <CorrectionChip value={correction} disabled={saving} onChange={handleCorrection} />
          {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
        </div>
      </div>
    </article>
  );
}

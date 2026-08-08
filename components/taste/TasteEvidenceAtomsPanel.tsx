/**
 * TasteEvidenceAtomsPanel
 *
 * Lists recent Evidence Atoms with inline correction affordances.
 * Mounted in Taste Graph (Intel Memo tab) as the first product surface for Phase 1.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { EvidenceAtom } from "../../types";
import { queryEvidenceAtoms } from "../../services/taste/evidenceAtomService";
import { EvidenceAtomCard } from "./EvidenceAtomCard";

type TasteEvidenceAtomsPanelProps = {
  userId: string;
  className?: string;
};

export const TasteEvidenceAtomsPanel: React.FC<TasteEvidenceAtomsPanelProps> = ({
  userId,
  className = "",
}) => {
  const [atoms, setAtoms] = useState<EvidenceAtom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAtoms = useCallback(async () => {
    if (!userId || userId === "ghost") {
      setAtoms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await queryEvidenceAtoms(userId, { maxResults: 12, tasteImpact: true });
      setAtoms(results);
    } catch {
      setError("Could not load evidence atoms.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAtoms();
  }, [loadAtoms]);

  if (!userId || userId === "ghost") {
    return (
      <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
        Sign in to review taste evidence and corrections.
      </p>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 py-6 ${className}`.trim()}>
        <Loader2 size={14} className="animate-spin text-stone-400" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
          Loading evidence atoms…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <p className={`font-mono text-[10px] text-rose-500 ${className}`.trim()}>{error}</p>
    );
  }

  if (atoms.length === 0) {
    return (
      <div
        className={`border border-dashed border-stone-300 dark:border-stone-700 p-5 text-center ${className}`.trim()}
      >
        <p className="font-serif italic text-sm text-stone-700 dark:text-stone-300">
          No evidence atoms yet.
        </p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500 mt-2">
          Capture references in Tailor or Pocket — mirrored atoms appear here for correction.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-stone-500">
          Evidence atoms · correction loop
        </p>
        <button
          type="button"
          onClick={() => void loadAtoms()}
          className="font-mono text-[8px] uppercase tracking-widest text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          Refresh
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {atoms.map((atom) => (
          <EvidenceAtomCard
            key={atom.id}
            atom={atom}
            userId={userId}
            contextScope={atom.contextScope ?? "global"}
            onCorrected={() => void loadAtoms()}
          />
        ))}
      </div>
    </div>
  );
};

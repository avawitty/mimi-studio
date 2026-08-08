/**
 * TasteEvidenceAtomsPanel
 *
 * Lists recent Evidence Atoms with inline correction affordances.
 * Mounted in Taste Graph (Intel Memo tab) as the first product surface for Phase 1.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { EvidenceAtom } from "../../types";
import { queryEvidenceAtoms } from "../../services/taste/evidenceAtomService";
import { searchEvidenceAtomsClient } from "../../services/taste/searchEvidenceAtomsClient";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [semanticMode, setSemanticMode] = useState(false);

  const loadAtoms = useCallback(async () => {
    if (!userId || userId === "ghost") {
      setAtoms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const trimmed = searchQuery.trim();
      if (trimmed.length >= 2) {
        const semanticHits = await searchEvidenceAtomsClient(trimmed, { maxResults: 12 });
        if (semanticHits.length > 0) {
          setSemanticMode(true);
          setAtoms(semanticHits.map((hit) => hit.atom));
          return;
        }
      }
      setSemanticMode(false);
      const results = await queryEvidenceAtoms(userId, { maxResults: 12, tasteImpact: true });
      setAtoms(results);
    } catch {
      setError("Could not load evidence atoms.");
    } finally {
      setLoading(false);
    }
  }, [userId, searchQuery]);

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

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-stone-500">
          Evidence atoms · correction loop
        </p>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search taste evidence…"
            className="w-full border border-stone-300 dark:border-stone-700 bg-transparent py-1.5 pl-7 pr-2 font-mono text-[10px] text-stone-800 dark:text-stone-200 placeholder:text-stone-400"
            aria-label="Search taste evidence"
          />
        </div>
        <button
          type="button"
          onClick={() => void loadAtoms()}
          className="font-mono text-[8px] uppercase tracking-widest text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          Refresh
        </button>
      </div>

      {semanticMode && searchQuery.trim() && (
        <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
          Semantic matches for “{searchQuery.trim()}”
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-6">
          <Loader2 size={14} className="animate-spin text-stone-400" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
            Loading evidence atoms…
          </span>
        </div>
      )}

      {!loading && error && (
        <p className="font-mono text-[10px] text-rose-500">{error}</p>
      )}

      {!loading && !error && atoms.length === 0 && (
        <div className="border border-dashed border-stone-300 dark:border-stone-700 p-5 text-center">
          <p className="font-serif italic text-sm text-stone-700 dark:text-stone-300">
            {searchQuery.trim() ? "No matching evidence atoms." : "No evidence atoms yet."}
          </p>
          {!searchQuery.trim() && (
            <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500 mt-2">
              Capture references in Tailor or Pocket — mirrored atoms appear here for correction.
            </p>
          )}
        </div>
      )}

      {!loading && !error && atoms.length > 0 && (
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
      )}
    </div>
  );
};

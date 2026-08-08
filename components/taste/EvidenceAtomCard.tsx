/**
 * EvidenceAtomCard
 *
 * Displays a single Evidence Atom with its AI interpretation and correction affordance.
 * This is the primary UI unit for the Taste Intelligence correction loop.
 *
 * Shows:
 *  - The original source (image, URL, text excerpt)
 *  - Processing state (pending / analyzed)
 *  - AI semantic description (when available)
 *  - Confidence label (editorial language — not raw percentages)
 *  - Inline CorrectionChip for YES / SORT OF / NOT ANYMORE / etc.
 *
 * Mobile-first: designed for swipe-and-tap interaction.
 * Does not expose raw confidence numbers — uses editorial signal labels.
 */
import React, { useState } from "react";
import type { CorrectionState, EvidenceAtom } from "../../types";
import { CorrectionChip } from "./CorrectionChip";
import { applyInlineCorrection } from "../../services/taste/correctionService";
import { tasteConfidenceLabel } from "../../services/taste/tasteStateService";
import { cn } from "../../lib/utils";

export interface EvidenceAtomCardProps {
  atom: EvidenceAtom;
  userId: string;
  /** Called after a correction is successfully applied */
  onCorrected?: (atomId: string, correction: CorrectionState) => void;
  /** Optional linked assertion ID to correct alongside the atom reaction */
  linkedAssertionId?: string;
  /** Whether to show the full semantic description or truncate */
  expanded?: boolean;
  className?: string;
}

const KIND_LABELS: Record<EvidenceAtom["kind"], string> = {
  image: "IMAGE",
  url: "LINK",
  text: "TEXT",
  note: "NOTE",
  screenshot: "SCREENSHOT",
  film: "FILM",
  product: "PRODUCT",
  brand: "BRAND",
  generated: "GENERATED",
  rejection: "REJECTION",
};

const STATE_LABELS: Record<EvidenceAtom["processingState"], string> = {
  pending: "Interpreting…",
  processing: "Analyzing…",
  analyzed: "Read",
  failed: "Could not read",
};

export function EvidenceAtomCard({
  atom,
  userId,
  onCorrected,
  linkedAssertionId,
  expanded = false,
  className,
}: EvidenceAtomCardProps) {
  const [correction, setCorrection] = useState<CorrectionState | undefined>(undefined);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnalyzed = atom.processingState === "analyzed";
  const signalLabel = isAnalyzed ? tasteConfidenceLabel(atom.confidence) : null;

  const handleCorrect = async (state: CorrectionState) => {
    if (isApplying) return;
    setIsApplying(true);
    setError(null);

    try {
      await applyInlineCorrection(userId, "atom", atom.id, state);

      if (linkedAssertionId) {
        await applyInlineCorrection(userId, "assertion", linkedAssertionId, state);
      }

      setCorrection(state);
      onCorrected?.(atom.id, state);
    } catch {
      setError("Could not save correction. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const displaySource =
    atom.kind === "url" || atom.kind === "image"
      ? atom.originalSource.length > 80
        ? atom.originalSource.slice(0, 80) + "…"
        : atom.originalSource
      : atom.originalSource.length > 120
        ? atom.originalSource.slice(0, 120) + "…"
        : atom.originalSource;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3 rounded-sm border border-border/60",
        "bg-background p-4 shadow-xs transition-shadow hover:shadow-sm",
        "dark:border-border/40 dark:bg-card/80",
        className,
      )}
      aria-label={`Evidence: ${atom.kind} — ${displaySource}`}
    >
      {/* Header: kind badge + processing state */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
          {KIND_LABELS[atom.kind]}
        </span>
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-wider",
            isAnalyzed
              ? "text-emerald-600 dark:text-emerald-400"
              : atom.processingState === "failed"
                ? "text-rose-500 dark:text-rose-400"
                : "text-muted-foreground/50",
          )}
        >
          {STATE_LABELS[atom.processingState]}
        </span>
      </div>

      {/* Thumbnail (image atoms) */}
      {atom.thumbnailUrl && (
        <div className="overflow-hidden rounded-[2px]">
          <img
            src={atom.thumbnailUrl}
            alt="Evidence reference"
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Original source */}
      <p
        className="break-words font-mono text-[11px] text-foreground/70 leading-relaxed"
        title={atom.originalSource}
      >
        {displaySource}
      </p>

      {/* AI interpretation */}
      {isAnalyzed && atom.semanticDescription && (
        <div className="space-y-1 border-t border-border/40 pt-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">
            Mimi reads
          </p>
          <p
            className={cn(
              "text-[12px] leading-relaxed text-foreground/80 italic",
              !expanded && "line-clamp-3",
            )}
          >
            {atom.semanticDescription}
          </p>
          {signalLabel && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
              {signalLabel}
            </span>
          )}
        </div>
      )}

      {/* Correction affordance */}
      {isAnalyzed && (
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">
            Is this accurate?
          </p>
          <CorrectionChip
            selected={correction}
            onCorrect={handleCorrect}
            isApplying={isApplying}
            compact
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <p className="font-mono text-[10px] text-rose-500 dark:text-rose-400">{error}</p>
      )}

      {/* Applied correction confirmation */}
      {correction && (
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
          Correction saved
        </p>
      )}
    </article>
  );
}

export default EvidenceAtomCard;

import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ReadProgressState } from '../../../services/tailorEvidenceIntake';

interface ReadProgressBannerProps {
  progress: ReadProgressState;
}

export const ReadProgressBanner: React.FC<ReadProgressBannerProps> = ({ progress }) => {
  const showShapeCopy =
    progress.stage === 'pattern_forming' ||
    progress.stage === 'dimensional_read' ||
    progress.stage === 'ready_to_interpret';

  return (
    <div
      className="mb-8 border border-nous-border/40 bg-[#FDFBF7]/60 dark:bg-[#0A0A0A]/40 px-4 py-3 sm:px-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-nous-subtle mb-1">
            Reading progress
          </p>
          <p className="text-sm text-nous-text">{progress.label}</p>
          {showShapeCopy && !progress.analysisAvailable && (
            <p className="mt-1 text-[11px] leading-relaxed text-nous-subtle">
              Your read is taking shape from accepted evidence — interpretation arrives after analysis.
            </p>
          )}
          {progress.analysisAvailable && progress.stage === 'ready_to_interpret' && (
            <p className="mt-1 text-[11px] leading-relaxed text-nous-subtle">
              Analysis is available. You can update the reading with new evidence.
            </p>
          )}
        </div>
        <Sparkles size={14} className="shrink-0 text-nous-subtle mt-1" aria-hidden />
      </div>
      {progress.referenceCount > 0 && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-nous-subtle tabular-nums">
          {progress.acceptedCount} accepted
          {progress.referenceCount > progress.acceptedCount
            ? ` · ${progress.referenceCount - progress.acceptedCount} staged`
            : ''}
          {progress.sourceVariety > 0 ? ` · ${progress.sourceVariety} source${progress.sourceVariety === 1 ? '' : 's'}` : ''}
        </p>
      )}
    </div>
  );
};

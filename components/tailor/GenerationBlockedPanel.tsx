import React from 'react';
import type { GenerationBlocked } from '../../services/tailorReadiness';

interface GenerationBlockedPanelProps {
  block: GenerationBlocked;
  onDismiss: () => void;
  onRecover?: () => void;
}

export const GenerationBlockedPanel: React.FC<GenerationBlockedPanelProps> = ({
  block,
  onDismiss,
  onRecover,
}) => (
  <div
    role="alert"
    className="max-w-xl mx-auto my-6 border border-nous-border/50 bg-[#FDFBF7] dark:bg-[#121212] px-5 py-5"
  >
    <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">
      Generation blocked
    </p>
    <p className="font-serif text-lg text-nous-text mb-2">{block.explanation}</p>
    <p className="text-sm text-nous-subtle mb-1">
      Missing: <span className="font-mono text-xs">{block.prerequisite}</span>
    </p>
    <p className="text-sm text-nous-text mb-5">{block.recoveryAction}</p>
    <div className="flex flex-wrap gap-2">
      {onRecover && (
        <button
          type="button"
          onClick={onRecover}
          className="px-4 py-2 bg-nous-text text-[#FDFBF7] text-[10px] uppercase tracking-[0.2em]"
        >
          Take recovery step
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="px-4 py-2 border border-nous-border/50 text-[10px] uppercase tracking-[0.2em] text-nous-subtle"
      >
        Dismiss
      </button>
    </div>
  </div>
);

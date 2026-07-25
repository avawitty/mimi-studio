import React from 'react';
import type { CreativeDossier, ClaimType } from '../../types';

const BADGE: Record<ClaimType, string> = {
  observed: 'Observed',
  inferred: 'Inferred',
  speculative: 'Speculative',
  user_confirmed: 'Confirmed',
  user_rejected: 'Rejected',
};

interface CreativeDossierScreenProps {
  dossier: CreativeDossier | null;
  loading?: boolean;
  onContinue: () => void;
}

export const CreativeDossierScreen: React.FC<CreativeDossierScreenProps> = ({
  dossier,
  loading,
  onContinue,
}) => {
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center text-sm text-nous-subtle">
        Composing your Creative Dossier…
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center text-sm text-nous-subtle">
        No dossier generated yet.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Creative Dossier</p>
      <h1 className="font-serif text-3xl text-nous-text mb-6">{dossier.title}</h1>
      <div className="prose prose-sm dark:prose-invert max-w-none mb-10">
        <p className="text-nous-subtle leading-relaxed">{dossier.overview}</p>
      </div>

      <div className="space-y-8 mb-10">
        {dossier.sections.map((section) => (
          <section key={section.id} className="border-t border-nous-border/30 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-serif text-lg text-nous-text">{section.title}</h2>
              <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 border border-nous-border/40 text-nous-subtle">
                {BADGE[section.claimType]}
              </span>
            </div>
            <p className="text-sm text-nous-subtle leading-relaxed whitespace-pre-wrap">{section.body}</p>
            {section.evidenceNodeIds.length > 0 && (
              <p className="text-[10px] text-nous-subtle mt-2">
                Evidence: {section.evidenceNodeIds.length} reference{section.evidenceNodeIds.length === 1 ? '' : 's'}
              </p>
            )}
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em]"
      >
        Choose outputs
      </button>
    </div>
  );
};

import React from 'react';
import type { CreativeLaw } from '../../types';

interface CreativeLawsScreenProps {
  laws: CreativeLaw[];
  onAccept: (lawId: string) => void;
  onReject: (lawId: string) => void;
  onContinue: () => void;
}

export const CreativeLawsScreen: React.FC<CreativeLawsScreenProps> = ({
  laws,
  onAccept,
  onReject,
  onContinue,
}) => (
  <div className="max-w-3xl mx-auto px-6 py-10">
    <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Creative Laws</p>
    <h2 className="font-serif text-2xl text-nous-text mb-2">Reusable principles</h2>
    <p className="text-sm text-nous-subtle mb-8">
      Laws describe decisions, not aesthetics. You are the final editor.
    </p>

    <div className="space-y-4 mb-10">
      {laws.map((law) => (
        <div key={law.id} className="border border-nous-border/40 p-5">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-medium text-nous-text">{law.title}</h3>
            <span className="text-xs tabular-nums text-nous-subtle shrink-0">
              {Math.round(law.confidence * 100)}%
            </span>
          </div>
          <p className="text-sm font-serif italic text-nous-text mb-2">{law.principle}</p>
          <p className="text-xs text-nous-subtle mb-4">{law.explanation}</p>
          {law.applications.length > 0 && (
            <p className="text-[10px] uppercase tracking-wider text-nous-subtle mb-3">
              Applications: {law.applications.join(' · ')}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAccept(law.id)}
              className={`text-xs px-4 py-2 border ${law.userStatus === 'accepted' ? 'bg-nous-text text-[#FDFBF7]' : 'border-nous-border/40'}`}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onReject(law.id)}
              className={`text-xs px-4 py-2 border ${law.userStatus === 'rejected' ? 'bg-red-900/20' : 'border-nous-border/40'}`}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
      {laws.length === 0 && (
        <p className="text-sm text-nous-subtle italic">No laws suggested yet. Accept patterns first.</p>
      )}
    </div>

    <button
      type="button"
      onClick={onContinue}
      className="w-full py-3 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em]"
    >
      Generate Creative Dossier
    </button>
  </div>
);

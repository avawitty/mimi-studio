import React from 'react';
import { Loader2 } from 'lucide-react';
import type { Observation } from '../../types';

const CATEGORIES = [
  'visual', 'language', 'material', 'historical', 'emotional', 'compositional',
] as const;

interface AnalysisProgressScreenProps {
  loading: boolean;
  observations: Observation[];
  message?: string;
}

export const AnalysisProgressScreen: React.FC<AnalysisProgressScreenProps> = ({
  loading,
  observations,
  message = 'Extracting signals from your references…',
}) => {
  const counts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = observations.filter((o) => o.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const total = observations.length;

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      {loading && <Loader2 className="mx-auto animate-spin text-nous-subtle mb-6" size={32} />}
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Observed</p>
      <h2 className="font-serif text-3xl text-nous-text mb-2">{total || '—'} Signals</h2>
      <p className="text-sm text-nous-subtle mb-10">{message}</p>

      <div className="border border-nous-border/30 text-left divide-y divide-nous-border/20">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex justify-between px-5 py-3 text-sm">
            <span className="capitalize text-nous-text">{cat}</span>
            <span className="text-nous-subtle tabular-nums">{counts[cat] ?? 0}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-nous-subtle mt-8 italic">
        Look again. Your references are reflecting something.
      </p>
    </div>
  );
};

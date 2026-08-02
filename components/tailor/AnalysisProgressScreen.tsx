import React from 'react';
import type { Observation } from '../../types';
import { ReflectiveEye } from './ReflectiveEye';

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
      <ReflectiveEye className="mb-8" />
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Observed</p>
      <h2 className="font-serif text-3xl text-nous-text mb-2">{total || '—'} Signals</h2>
      <p className="text-sm text-nous-subtle mb-10" role="status" aria-live="polite">
        {loading ? message : 'Your references are reflecting something.'}
      </p>

      <div className="border border-nous-border/30 text-left divide-y divide-nous-border/20">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex justify-between px-5 py-3 text-sm">
            <span className="capitalize text-nous-text">{cat}</span>
            <span className="text-nous-subtle tabular-nums">{counts[cat] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

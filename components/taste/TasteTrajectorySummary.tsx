import React from 'react';
import type { TasteModelSnapshot } from '../../lib/tasteModel';

interface TasteTrajectorySummaryProps {
  snapshot: TasteModelSnapshot | null;
  onSelectFeature?: (featureId: string) => void;
  compact?: boolean;
}

const TRAJECTORY_SECTIONS = [
  { key: 'emergingFeatureIds' as const, label: 'Emerging', color: 'text-mimi-cobalt' },
  { key: 'strengtheningFeatureIds' as const, label: 'Strengthening', color: 'text-mimi-olive' },
  { key: 'stableFeatureIds' as const, label: 'Stable', color: 'text-mimi-stone' },
  { key: 'decliningFeatureIds' as const, label: 'Declining', color: 'text-mimi-stone/60' },
] as const;

export const TasteTrajectorySummary: React.FC<TasteTrajectorySummaryProps> = ({
  snapshot,
  onSelectFeature,
  compact = false,
}) => {
  if (!snapshot) return null;

  const featureMap = new Map(
    snapshot.featureWeights.map((f) => [f.featureId, f]),
  );

  if (compact) {
    const total =
      snapshot.trajectory.emergingFeatureIds.length +
      snapshot.trajectory.strengtheningFeatureIds.length +
      snapshot.trajectory.stableFeatureIds.length +
      snapshot.trajectory.decliningFeatureIds.length;

    if (total === 0) return null;

    return (
      <div
        className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider"
        aria-label="Taste trajectory summary"
      >
        {TRAJECTORY_SECTIONS.map(({ key, label, color }) => {
          const count = snapshot.trajectory[key].length;
          if (count === 0) return null;
          return (
            <span key={key} className={color}>
              {label}: {count}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Taste trajectory">
      <h4 className="text-[10px] uppercase tracking-[0.2em] text-mimi-stone">
        Taste trajectory
      </h4>

      <div className="grid gap-3 sm:grid-cols-2">
        {TRAJECTORY_SECTIONS.map(({ key, label, color }) => {
          const ids = snapshot.trajectory[key];
          if (ids.length === 0) return null;

          return (
            <div key={key} className="border border-mimi-hairline/20 p-3">
              <p className={`text-[10px] uppercase tracking-wider mb-2 ${color}`}>
                {label} ({ids.length})
              </p>
              <ul className="space-y-1">
                {ids.slice(0, 5).map((fid) => {
                  const feature = featureMap.get(fid);
                  return (
                    <li key={fid}>
                      {onSelectFeature ? (
                        <button
                          type="button"
                          onClick={() => onSelectFeature(fid)}
                          className="text-sm text-mimi-ink hover:underline text-left min-h-[44px] flex items-center"
                        >
                          {feature?.label ?? fid}
                        </button>
                      ) : (
                        <span className="text-sm text-mimi-ink">
                          {feature?.label ?? fid}
                        </span>
                      )}
                    </li>
                  );
                })}
                {ids.length > 5 && (
                  <li className="text-xs text-mimi-stone">+{ids.length - 5} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {snapshot.diagnostics.contradictionCount > 0 && (
        <p className="text-xs text-mimi-stone">
          {snapshot.diagnostics.contradictionCount} potential contradiction
          {snapshot.diagnostics.contradictionCount === 1 ? '' : 's'} detected.
        </p>
      )}
    </section>
  );
};

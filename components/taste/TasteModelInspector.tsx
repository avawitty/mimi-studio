import React, { useMemo } from 'react';
import type { TasteFeatureWeight, TasteModelSnapshot } from '../../lib/tasteModel';
import { explainFeature, formatSignedStrength } from '../../lib/tasteModel';

interface TasteModelInspectorProps {
  snapshot: TasteModelSnapshot | null;
  selectedFeatureId?: string | null;
  onCurate?: (featureId: string, action: 'accept' | 'reject' | 'reduce' | 'context_only' | 'note') => void;
  loading?: boolean;
  stale?: boolean;
  onRecompile?: () => void;
}

const TREND_ICONS: Record<string, string> = {
  emerging: '↑ new',
  strengthening: '↗ growing',
  stable: '→ steady',
  declining: '↘ fading',
  uncertain: '? unclear',
};

export const TasteModelInspector: React.FC<TasteModelInspectorProps> = ({
  snapshot,
  selectedFeatureId,
  onCurate,
  loading,
  stale,
  onRecompile,
}) => {
  const feature = useMemo(() => {
    if (!snapshot || !selectedFeatureId) return null;
    return snapshot.featureWeights.find((f) => f.featureId === selectedFeatureId) ?? null;
  }, [snapshot, selectedFeatureId]);

  const explanation = useMemo(() => {
    if (!feature || !snapshot) return null;
    return explainFeature(feature, snapshot);
  }, [feature, snapshot]);

  if (!snapshot) {
    return (
      <aside
        className="border-l border-mimi-hairline/40 bg-mimi-field/50 p-4 md:p-6"
        aria-label="Why Mimi thinks this"
      >
        <h3 className="font-display text-lg text-mimi-ink mb-2">Why Mimi thinks this</h3>
        <p className="text-sm text-mimi-stone">
          {loading ? 'Loading taste model…' : 'No taste model compiled yet. Curate patterns to begin learning.'}
        </p>
      </aside>
    );
  }

  if (!feature || !explanation) {
    return (
      <aside
        className="border-l border-mimi-hairline/40 bg-mimi-field/50 p-4 md:p-6"
        aria-label="Why Mimi thinks this"
      >
        <h3 className="font-display text-lg text-mimi-ink mb-2">Why Mimi thinks this</h3>
        <p className="text-sm text-mimi-stone">
          Select a pattern or signal to inspect Mimi&apos;s reasoning.
        </p>
        <ModelSummary snapshot={snapshot} />
      </aside>
    );
  }

  return (
    <aside
      className="border-l border-mimi-hairline/40 bg-mimi-field/50 p-4 md:p-6 overflow-y-auto max-h-[80vh]"
      aria-label="Why Mimi thinks this"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display text-lg text-mimi-ink">Why Mimi thinks this</h3>
        {stale && (
          <button
            type="button"
            onClick={onRecompile}
            className="text-[10px] uppercase tracking-wider text-mimi-cobalt border border-mimi-cobalt/30 px-2 py-1"
          >
            Refresh model
          </button>
        )}
      </div>

      {stale && (
        <p className="text-xs text-mimi-stone mb-4 border border-mimi-hairline/30 p-2">
          Model may be stale. Last compiled {new Date(snapshot.compiledAt).toLocaleDateString()}.
        </p>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-mimi-stone mb-1">Signal</p>
          <p className="font-display text-xl text-mimi-ink">{explanation.label}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Strength" value={formatSignedStrength(explanation.signedStrength)} />
          <Metric
            label="Confidence"
            value={`${explanation.confidenceLabel} (${Math.round(explanation.confidence * 100)}%)`}
          />
          <Metric label="Trend" value={TREND_ICONS[feature.trend] ?? feature.trend} />
          <Metric label="Scope" value={explanation.scopeLabel} />
        </div>

        <p className="text-sm text-mimi-stone">{explanation.trend}</p>

        {explanation.supportingEvidence.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-mimi-stone mb-2">
              Supported by {explanation.evidenceCount} reference{explanation.evidenceCount === 1 ? '' : 's'}
            </p>
            <ul className="text-xs text-mimi-stone space-y-1">
              {explanation.supportingEvidence.map((id) => (
                <li key={id} className="font-mono truncate">{id}</li>
              ))}
            </ul>
          </div>
        )}

        {explanation.topContradiction && (
          <div className="border border-mimi-hairline/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-mimi-stone mb-1">Contradiction</p>
            <p className="text-sm text-mimi-stone">{explanation.topContradiction}</p>
          </div>
        )}

        {explanation.lastUpdate && (
          <p className="text-[10px] text-mimi-stone">
            Last meaningful update: {new Date(explanation.lastUpdate).toLocaleDateString()}
          </p>
        )}

        {onCurate && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-mimi-hairline/20">
            <CurateButton label="Keep" onClick={() => onCurate(feature.featureId, 'accept')} />
            <CurateButton label="Not why I like it" onClick={() => onCurate(feature.featureId, 'reject')} />
            <CurateButton label="Reduce weight" onClick={() => onCurate(feature.featureId, 'reduce')} />
            <CurateButton label="Context only" onClick={() => onCurate(feature.featureId, 'context_only')} />
          </div>
        )}
      </div>
    </aside>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-mimi-hairline/20 p-2">
      <p className="text-[9px] uppercase tracking-wider text-mimi-stone">{label}</p>
      <p className="text-sm text-mimi-ink mt-0.5">{value}</p>
    </div>
  );
}

function CurateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] uppercase tracking-wider border border-mimi-hairline/40 px-3 py-2 min-h-[44px] text-mimi-ink hover:bg-mimi-hairline/10"
    >
      {label}
    </button>
  );
}

function ModelSummary({ snapshot }: { snapshot: TasteModelSnapshot }) {
  return (
    <div className="mt-6 text-xs text-mimi-stone space-y-1">
      <p>{snapshot.featureWeights.length} features · {snapshot.interactionRules.length} combination rules</p>
      <p>{snapshot.diagnostics.eventCount} learning events · {snapshot.diagnostics.explicitEventCount} explicit</p>
    </div>
  );
}

export function findFeatureForCluster(
  snapshot: TasteModelSnapshot | null,
  clusterId: string,
): TasteFeatureWeight | null {
  if (!snapshot) return null;
  return (
    snapshot.featureWeights.find(
      (f) => f.featureId === `pattern_cluster:${clusterId}`,
    ) ?? null
  );
}

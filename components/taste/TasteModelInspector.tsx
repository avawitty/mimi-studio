import React, { useMemo } from 'react';
import type { TasteFeatureWeight, TasteModelSnapshot } from '../../lib/tasteModel';
import { explainFeature, formatSignedStrength } from '../../lib/tasteModel';
import type { TasteModelEdit, TasteRefusal } from '../../schemas/tasteIntelligenceContracts';
import type { TasteModelDelta } from '../../lib/tasteIntelligence/computeModelDelta';
import type { CreativeLaw } from '../../types';
import { describeInteractionRule } from '../tailor/TasteSignalGraphView';

interface TasteModelInspectorProps {
  snapshot: TasteModelSnapshot | null;
  selectedFeatureId?: string | null;
  refusals?: TasteRefusal[];
  laws?: CreativeLaw[];
  lastEdit?: TasteModelEdit | null;
  lastDelta?: TasteModelDelta | null;
  loading?: boolean;
  stale?: boolean;
  scopeLabel?: string;
  onRecompile?: () => void;
  onRefine?: () => void;
  onRename?: (nextLabel: string) => void;
  onDisconnect?: (otherFeatureId: string) => void;
  onMerge?: (otherFeatureId: string, mergedLabel: string) => void;
  onSplit?: (splitLabel: string) => void;
  mergeCandidates?: Array<{ featureId: string; label: string }>;
  mergeSplitEnabled?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
}

const TREND_ICONS: Record<string, string> = {
  emerging: '↑ Emerging',
  strengthening: '↗ Strengthening',
  stable: '→ Steady',
  declining: '↘ Fading',
  uncertain: '? Uncertain',
};

const EPISTEMIC_LABELS: Record<string, string> = {
  observed: 'Observed',
  inferred: 'Inferred',
  user_confirmed: 'Creator confirmed',
  user_rejected: 'Creator rejected',
  speculative: 'Uncertain',
};

export const TasteModelInspector: React.FC<TasteModelInspectorProps> = ({
  snapshot,
  selectedFeatureId,
  refusals = [],
  laws = [],
  lastEdit,
  lastDelta,
  loading,
  stale,
  scopeLabel,
  onRecompile,
  onRefine,
  onRename,
  onDisconnect,
  onMerge,
  onSplit,
  mergeCandidates = [],
  mergeSplitEnabled,
  onUndo,
  canUndo,
}) => {
  const [renameDraft, setRenameDraft] = React.useState('');
  const [mergeLabelDraft, setMergeLabelDraft] = React.useState('');
  const [splitLabelDraft, setSplitLabelDraft] = React.useState('');
  const [mergeTargetId, setMergeTargetId] = React.useState('');

  const feature = useMemo(() => {
    if (!snapshot || !selectedFeatureId) return null;
    return snapshot.featureWeights.find((f) => f.featureId === selectedFeatureId) ?? null;
  }, [snapshot, selectedFeatureId]);

  const explanation = useMemo(() => {
    if (!feature || !snapshot) return null;
    return explainFeature(feature, snapshot);
  }, [feature, snapshot]);

  const activeRefusals = useMemo(() => {
    if (!selectedFeatureId) return [];
    return refusals.filter((r) => r.featureIds.includes(selectedFeatureId));
  }, [refusals, selectedFeatureId]);

  const interactionRules = useMemo(() => {
    if (!selectedFeatureId || !snapshot) return [];
    return snapshot.interactionRules.filter((rule) =>
      rule.featureIds.includes(selectedFeatureId),
    );
  }, [snapshot, selectedFeatureId]);

  const linkedLaws = useMemo(() => {
    if (!selectedFeatureId) return [];
    const clusterId = selectedFeatureId.replace('pattern_cluster:', '');
    return laws.filter((law) => law.supportingPatternClusterIds?.includes(clusterId));
  }, [laws, selectedFeatureId]);

  React.useEffect(() => {
    setRenameDraft(feature?.label ?? '');
    setMergeLabelDraft(feature?.label ?? '');
    setSplitLabelDraft(feature ? `${feature.label} (variant)` : '');
    setMergeTargetId('');
  }, [feature?.label, selectedFeatureId]);

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
        <ModelSummary snapshot={snapshot} scopeLabel={scopeLabel} />
      </aside>
    );
  }

  const saturationNote =
    feature.trend === 'declining'
      ? 'May be resting or overexposed — check refusals and recent reuse.'
      : undefined;

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
            className="text-[10px] uppercase tracking-wider text-mimi-cobalt border border-mimi-cobalt/30 px-2 py-1 min-h-[44px]"
          >
            Refresh model
          </button>
        )}
      </div>

      {scopeLabel && (
        <p className="text-[10px] uppercase tracking-wider text-mimi-stone mb-3">
          Active scope: {scopeLabel}
        </p>
      )}

      {stale && (
        <p className="text-xs text-mimi-stone mb-4 border border-mimi-hairline/30 p-2">
          Model may be stale. Last compiled {new Date(snapshot.compiledAt).toLocaleDateString()}.
        </p>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-mimi-stone mb-1">Signal</p>
          <p className="font-display text-xl text-mimi-ink">{explanation.label}</p>
          <p className="text-[10px] text-mimi-stone mt-1">
            {feature.explicitMass > feature.implicitMass
              ? EPISTEMIC_LABELS.user_confirmed
              : feature.confidence < 0.35
                ? EPISTEMIC_LABELS.speculative
                : EPISTEMIC_LABELS.inferred}
            {feature.contextScopes.includes('project') ? ' · Contextual' : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Signed strength" value={formatSignedStrength(explanation.signedStrength)} />
          <Metric
            label="Confidence"
            value={`${explanation.confidenceLabel} (${Math.round(explanation.confidence * 100)}%)`}
          />
          <Metric label="Trend" value={TREND_ICONS[feature.trend] ?? feature.trend} />
          <Metric label="Scope" value={explanation.scopeLabel} />
        </div>

        {saturationNote && (
          <p className="text-xs text-mimi-stone border border-mimi-hairline/20 p-2">
            Saturation: {saturationNote}
          </p>
        )}

        <p className="text-sm text-mimi-stone">{explanation.trend}</p>

        {explanation.supportingEvidence.length > 0 && (
          <Section title="Positive evidence">
            <ul className="text-xs text-mimi-stone space-y-1">
              {explanation.supportingEvidence.map((id) => (
                <li key={id} className="font-mono truncate">{id}</li>
              ))}
            </ul>
          </Section>
        )}

        {explanation.topContradiction && (
          <Section title="Contradictory evidence">
            <p className="text-sm text-mimi-stone">{explanation.topContradiction}</p>
          </Section>
        )}

        {activeRefusals.length > 0 && (
          <Section title="Active refusals">
            <ul className="text-xs text-mimi-stone space-y-2">
              {activeRefusals.map((refusal) => (
                <li key={refusal.id} className="border border-mimi-hairline/20 p-2">
                  <span className="uppercase tracking-wider text-[9px]">
                    {refusal.refusalType.replace(/_/g, ' ')}
                  </span>
                  <p className="mt-1">
                    {refusal.explicit ? 'Creator rejected' : 'Inferred'}{' '}
                    · scope {refusal.scope}
                  </p>
                  {refusal.sourceIds.length > 0 && (
                    <p className="mt-1 font-mono truncate text-[10px]">
                      {refusal.sourceIds.join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {interactionRules.length > 0 && (
          <Section title="Interaction rules">
            <ul className="text-xs text-mimi-stone space-y-2">
              {interactionRules.map((rule) => {
                const otherId = rule.featureIds.find((id) => id !== selectedFeatureId);
                const other = snapshot.featureWeights.find((f) => f.featureId === otherId);
                return (
                  <li key={rule.id} className="border border-mimi-hairline/20 p-2">
                    <p>{describeInteractionRule(rule)}</p>
                    {other && (
                      <div className="mt-2 flex items-center gap-2">
                        <span>{other.label}</span>
                        {onDisconnect && otherId && (
                          <button
                            type="button"
                            onClick={() => onDisconnect(otherId)}
                            className="text-[10px] uppercase tracking-wider border border-mimi-hairline/30 px-2 py-1 min-h-[44px]"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {linkedLaws.length > 0 && (
          <Section title="Creative Laws using this signal">
            <ul className="text-xs text-mimi-stone space-y-1">
              {linkedLaws.map((law) => (
                <li key={law.id}>{law.principle}</li>
              ))}
            </ul>
          </Section>
        )}

        {lastEdit && (
          <Section title="Last explicit correction">
            <p className="text-xs text-mimi-stone">
              {lastEdit.operation.replace(/_/g, ' ')} ·{' '}
              {new Date(lastEdit.createdAt).toLocaleString()}
            </p>
          </Section>
        )}

        {lastDelta && lastDelta.changedFeatures.length > 0 && (
          <Section title="Model delta">
            <div data-testid="taste-model-delta">
              <ul className="text-xs text-mimi-stone space-y-1">
              {lastDelta.changedFeatures.map((delta) => (
                <li key={delta.featureId}>
                  {delta.label}: strength {delta.signedStrengthBefore.toFixed(2)} →{' '}
                  {delta.signedStrengthAfter.toFixed(2)}
                </li>
              ))}
            </ul>
            </div>
          </Section>
        )}

        {explanation.lastUpdate && (
          <p className="text-[10px] text-mimi-stone">
            Last meaningful update: {new Date(explanation.lastUpdate).toLocaleDateString()}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-mimi-hairline/20">
          {onRefine && (
            <button
              type="button"
              onClick={onRefine}
              data-testid="taste-refine-signal"
              className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-cobalt/40 px-3 py-2 text-mimi-cobalt"
            >
              Refine this signal
            </button>
          )}

          {onRename && (
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-mimi-stone">
                Rename (stable ID preserved)
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  data-testid="taste-rename-input"
                  className="flex-1 border border-mimi-hairline/30 bg-transparent px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRename(renameDraft)}
                  disabled={!renameDraft.trim()}
                  data-testid="taste-rename-save"
                  className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40 px-3"
                >
                  Save
                </button>
              </div>
            </label>
          )}

          {mergeSplitEnabled && onMerge && mergeCandidates.length > 0 && (
            <div className="space-y-2" data-testid="taste-merge-controls">
              <p className="text-[10px] uppercase tracking-wider text-mimi-stone">
                Merge with another signal
              </p>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                data-testid="taste-merge-target"
                className="w-full border border-mimi-hairline/30 bg-transparent px-2 py-2 text-sm min-h-[44px]"
              >
                <option value="">Select signal…</option>
                {mergeCandidates.map((candidate) => (
                  <option key={candidate.featureId} value={candidate.featureId}>
                    {candidate.label}
                  </option>
                ))}
              </select>
              <input
                value={mergeLabelDraft}
                onChange={(e) => setMergeLabelDraft(e.target.value)}
                data-testid="taste-merge-label"
                placeholder="Merged label"
                className="w-full border border-mimi-hairline/30 bg-transparent px-2 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!mergeTargetId || !mergeLabelDraft.trim()}
                onClick={() => onMerge(mergeTargetId, mergeLabelDraft.trim())}
                data-testid="taste-merge-save"
                className="min-h-[44px] w-full text-[10px] uppercase tracking-wider border border-mimi-cobalt/40 px-3 py-2 text-mimi-cobalt disabled:opacity-40"
              >
                Merge signals
              </button>
            </div>
          )}

          {mergeSplitEnabled && onSplit && (
            <div className="space-y-2" data-testid="taste-split-controls">
              <p className="text-[10px] uppercase tracking-wider text-mimi-stone">
                Split into a variant
              </p>
              <input
                value={splitLabelDraft}
                onChange={(e) => setSplitLabelDraft(e.target.value)}
                data-testid="taste-split-label"
                placeholder="Variant label"
                className="w-full border border-mimi-hairline/30 bg-transparent px-2 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!splitLabelDraft.trim()}
                onClick={() => onSplit(splitLabelDraft.trim())}
                data-testid="taste-split-save"
                className="min-h-[44px] w-full text-[10px] uppercase tracking-wider border border-mimi-hairline/40 px-3 py-2"
              >
                Split signal
              </button>
            </div>
          )}

          {canUndo && onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-hairline/40 px-3 py-2"
              data-testid="taste-undo-last-edit"
            >
              Undo last correction only
            </button>
          )}
          {canUndo && (
            <p className="text-[10px] text-mimi-stone">
              Reverses the most recent model edit in this session — not a full history rollback.
              Refusals must be changed with a new refine action.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-mimi-stone mb-2">{title}</p>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-mimi-hairline/20 p-2">
      <p className="text-[9px] uppercase tracking-wider text-mimi-stone">{label}</p>
      <p className="text-sm text-mimi-ink mt-0.5">{value}</p>
    </div>
  );
}

function ModelSummary({
  snapshot,
  scopeLabel,
}: {
  snapshot: TasteModelSnapshot;
  scopeLabel?: string;
}) {
  return (
    <div className="mt-6 text-xs text-mimi-stone space-y-1">
      {scopeLabel && <p>Scope: {scopeLabel}</p>}
      <p>
        {snapshot.featureWeights.length} features · {snapshot.interactionRules.length}{' '}
        combination rules
      </p>
      <p>
        {snapshot.diagnostics.eventCount} learning events ·{' '}
        {snapshot.diagnostics.explicitEventCount} explicit
      </p>
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

import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import type { Observation, EvidenceNode, ClaimType, UserWeight, CreativeLaw } from '../../types';
import type { TasteModelSnapshot } from '../../lib/tasteModel';
import { ProofMode } from '../ProofMode';
import { TasteModelInspector } from '../taste/TasteModelInspector';
import { TasteTrajectorySummary } from '../taste/TasteTrajectorySummary';
import { SignalRefineSheet } from './SignalRefineSheet';
import { TasteSignalGraphView } from './TasteSignalGraphView';
import { useIsNarrow } from '../../hooks/useBreakpoint';
import { useUser } from '../../contexts/UserContext';
import { useTasteSignalEditor } from '../../hooks/useTasteSignalEditor';
import type { SignalRefineOption } from '../../lib/tasteIntelligence/signalRefine';
import { isTasteIntelligenceSurfaceEnabled } from '../../lib/tasteIntelligence/featureFlags';

const CLAIM_BADGE: Record<ClaimType, string> = {
  observed: 'Observed',
  inferred: 'Inferred',
  speculative: 'Speculative',
  user_confirmed: 'Confirmed',
  user_rejected: 'Rejected',
};

const WEIGHTS: UserWeight[] = ['low', 'medium', 'high', 'signature'];

interface PatternGraphScreenProps {
  clusters: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    frequency: number;
    confidence: number;
    userStatus: string;
    userWeight: UserWeight;
    userAnnotation?: string;
    observationIds: string[];
    supportingEvidenceNodeIds: string[];
    possibleInterpretations: string[];
    claimType: ClaimType;
  }>;
  evidence: EvidenceNode[];
  observations: Observation[];
  laws?: CreativeLaw[];
  projectId?: string;
  editorUserId?: string;
  onCurate: (
    clusterId: string,
    action: 'accepted' | 'rejected' | 'renamed',
    annotation?: string,
    weight?: UserWeight,
    name?: string,
  ) => void;
  onContinue: () => void;
  tasteSnapshot?: TasteModelSnapshot | null;
  tasteLoading?: boolean;
  tasteStale?: boolean;
  onRecompileTasteModel?: () => void;
  onTasteSnapshotChange?: (snapshot: TasteModelSnapshot) => void;
}

export const PatternGraphScreen: React.FC<PatternGraphScreenProps> = ({
  clusters,
  evidence,
  observations,
  laws = [],
  projectId,
  editorUserId,
  onCurate,
  onContinue,
  tasteSnapshot,
  tasteLoading,
  tasteStale,
  onRecompileTasteModel,
  onTasteSnapshotChange,
}) => {
  const { user } = useUser();
  const isNarrow = useIsNarrow();
  const [expanded, setExpanded] = useState<string | null>(clusters[0]?.id ?? null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    clusters[0] ? `pattern_cluster:${clusters[0].id}` : null,
  );
  const [refineOpen, setRefineOpen] = useState(false);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [draftWeights, setDraftWeights] = useState<Record<string, UserWeight>>({});
  const [localSnapshot, setLocalSnapshot] = useState<TasteModelSnapshot | null>(
    tasteSnapshot ?? null,
  );

  React.useEffect(() => {
    if (tasteSnapshot) setLocalSnapshot(tasteSnapshot);
  }, [tasteSnapshot]);

  const activeSnapshot = localSnapshot ?? tasteSnapshot ?? null;
  const scopeLabel = projectId ? `Project ${projectId}` : 'Global taste';

  const signalEditor = useTasteSignalEditor({
    userId: editorUserId ?? user?.uid,
    projectId,
    snapshot: activeSnapshot,
    onSnapshotChange: (snapshot) => {
      setLocalSnapshot(snapshot);
      onTasteSnapshotChange?.(snapshot);
    },
  });
  const mergeSplitEnabled = isTasteIntelligenceSurfaceEnabled('tasteGraphMergeSplit');

  const evidenceMap = useMemo(() => Object.fromEntries(evidence.map((e) => [e.id, e])), [evidence]);
  const acceptedCount = clusters.filter((cluster) => cluster.userStatus === 'accepted' || cluster.userStatus === 'renamed').length;
  const rejectedCount = clusters.filter((cluster) => cluster.userStatus === 'rejected').length;

  const clusterIndex = useMemo(() => {
    if (!selectedFeatureId?.startsWith('pattern_cluster:')) return -1;
    const clusterId = selectedFeatureId.replace('pattern_cluster:', '');
    return clusters.findIndex((c) => c.id === clusterId);
  }, [clusters, selectedFeatureId]);

  const selectedFeature = useMemo(() => {
    if (!activeSnapshot || !selectedFeatureId) return null;
    return activeSnapshot.featureWeights.find((f) => f.featureId === selectedFeatureId) ?? null;
  }, [activeSnapshot, selectedFeatureId]);

  const neighborFeatures = useMemo(() => {
    if (!activeSnapshot || !selectedFeatureId) return [];
    const related = new Set<string>();
    for (const rule of activeSnapshot.interactionRules) {
      if (rule.featureIds.includes(selectedFeatureId)) {
        rule.featureIds.forEach((id) => related.add(id));
      }
    }
    for (const refusal of signalEditor.refusals) {
      if (refusal.featureIds.includes(selectedFeatureId)) {
        refusal.featureIds.forEach((id) => related.add(id));
      }
    }
    related.delete(selectedFeatureId);
    return [...related]
      .map((id) => activeSnapshot.featureWeights.find((f) => f.featureId === id))
      .filter(Boolean) as NonNullable<typeof selectedFeature>[];
  }, [activeSnapshot, selectedFeatureId, signalEditor.refusals]);

  const handleExpand = (clusterId: string, isOpen: boolean) => {
    setExpanded(isOpen ? null : clusterId);
    setSelectedFeatureId(`pattern_cluster:${clusterId}`);
  };

  const selectClusterByIndex = useCallback(
    (index: number) => {
      const cluster = clusters[index];
      if (!cluster) return;
      setSelectedFeatureId(`pattern_cluster:${cluster.id}`);
      setExpanded(cluster.id);
    },
    [clusters],
  );

  const handleRefine = async (option: SignalRefineOption, secondaryFeatureId?: string) => {
    if (!selectedFeatureId) return;
    await signalEditor.refineSignal(selectedFeatureId, option, { secondaryFeatureId });
  };

  const handleRename = async (nextLabel: string) => {
    if (!selectedFeatureId || !activeSnapshot) return;
    const feature = activeSnapshot.featureWeights.find((f) => f.featureId === selectedFeatureId);
    await signalEditor.applyModelEdit({
      operation: 'rename',
      targetIds: [selectedFeatureId],
      before: { label: feature?.label ?? '' },
      after: { label: nextLabel },
      rationale: 'Creator rename',
    });
    const clusterId = selectedFeatureId.replace('pattern_cluster:', '');
    if (clusters.some((c) => c.id === clusterId)) {
      onCurate(clusterId, 'renamed', undefined, undefined, nextLabel);
    }
  };

  const handleDisconnect = async (otherFeatureId: string) => {
    if (!selectedFeatureId || !activeSnapshot) return;
    await signalEditor.applyModelEdit({
      operation: 'disconnect',
      targetIds: [selectedFeatureId, otherFeatureId],
      before: { connected: true },
      after: { connected: false },
      rationale: 'Creator disconnected relationship',
    });
  };

  const handleMerge = async (otherFeatureId: string, mergedLabel: string) => {
    if (!selectedFeatureId || !activeSnapshot) return;
    const survivor = activeSnapshot.featureWeights.find(
      (f) => f.featureId === selectedFeatureId,
    );
    const absorbed = activeSnapshot.featureWeights.find(
      (f) => f.featureId === otherFeatureId,
    );
    if (!survivor || !absorbed) return;
    await signalEditor.applyModelEdit({
      operation: 'merge',
      targetIds: [selectedFeatureId, otherFeatureId],
      before: { survivor, absorbed },
      after: { label: mergedLabel },
      rationale: 'Creator merged signals',
    });
  };

  const handleSplit = async (splitLabel: string) => {
    if (!selectedFeatureId || !activeSnapshot) return;
    const parent = activeSnapshot.featureWeights.find(
      (f) => f.featureId === selectedFeatureId,
    );
    if (!parent) return;
    const newFeatureId = `${selectedFeatureId}:split:${Date.now()}`;
    await signalEditor.applyModelEdit({
      operation: 'split',
      targetIds: [selectedFeatureId],
      before: { parent, newFeatureId },
      after: { newFeatureId, label: splitLabel },
      rationale: 'Creator split signal',
    });
    setSelectedFeatureId(newFeatureId);
  };

  const mergeCandidates = useMemo(() => {
    if (!activeSnapshot || !selectedFeatureId) return [];
    return activeSnapshot.featureWeights
      .filter((f) => f.featureId !== selectedFeatureId)
      .map((f) => ({ featureId: f.featureId, label: f.label }));
  }, [activeSnapshot, selectedFeatureId]);

  const inspector = (
    <TasteModelInspector
      snapshot={activeSnapshot}
      selectedFeatureId={selectedFeatureId}
      refusals={signalEditor.refusals}
      laws={laws}
      lastEdit={signalEditor.lastEdit}
      lastDelta={signalEditor.lastDelta}
      loading={tasteLoading || signalEditor.loading}
      stale={tasteStale}
      scopeLabel={scopeLabel}
      onRecompile={onRecompileTasteModel}
      onRefine={() => setRefineOpen(true)}
      onRename={handleRename}
      onDisconnect={handleDisconnect}
      onMerge={mergeSplitEnabled ? handleMerge : undefined}
      onSplit={mergeSplitEnabled ? handleSplit : undefined}
      mergeCandidates={mergeCandidates}
      mergeSplitEnabled={mergeSplitEnabled}
      onUndo={() => void signalEditor.undoLastEdit()}
      canUndo={Boolean(signalEditor.lastEdit)}
    />
  );

  const selectedClusterCard = clusterIndex >= 0 ? clusters[clusterIndex] : null;

  return (
    <div className="max-w-7xl mx-auto" data-testid="pattern-graph-screen">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 px-4 sm:px-6 py-8 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Pattern Graph</p>
          <h2 className="font-serif text-2xl text-nous-text mb-2">
            Curate the evidence before it becomes taste memory
          </h2>
          <p className="text-sm text-nous-subtle mb-4">
            Mimi separates observations from interpretation. Refine signals, set refusals, and edit
            the graph before saving into the Taste Graph.
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-mimi-stone">
            <span className="border border-mimi-hairline/30 px-2 py-1">{scopeLabel}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedFeatureId(null);
                setExpanded(null);
              }}
              className="min-h-[44px] border border-mimi-hairline/30 px-3 py-2"
            >
              Reset selection
            </button>
          </div>

          {activeSnapshot && (
            <div className="mb-6">
              <TasteTrajectorySummary
                snapshot={activeSnapshot}
                onSelectFeature={(fid) => {
                  setSelectedFeatureId(fid);
                  const clusterId = fid.replace('pattern_cluster:', '');
                  if (clusters.some((c) => c.id === clusterId)) setExpanded(clusterId);
                }}
                compact
              />
            </div>
          )}

          {isNarrow && selectedClusterCard && (
            <div className="mb-6 border border-mimi-hairline/30 p-4 bg-mimi-field/40">
              <div className="flex items-center justify-between gap-2 mb-3">
                <button
                  type="button"
                  disabled={clusterIndex <= 0}
                  onClick={() => selectClusterByIndex(clusterIndex - 1)}
                  className="min-h-[44px] min-w-[44px] border border-mimi-hairline/30 flex items-center justify-center disabled:opacity-40"
                  aria-label="Previous signal"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-center flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-mimi-stone">
                    {CLAIM_BADGE[selectedClusterCard.claimType]}
                  </p>
                  <p className="font-display text-lg text-mimi-ink">{selectedClusterCard.name}</p>
                </div>
                <button
                  type="button"
                  disabled={clusterIndex >= clusters.length - 1}
                  onClick={() => selectClusterByIndex(clusterIndex + 1)}
                  className="min-h-[44px] min-w-[44px] border border-mimi-hairline/30 flex items-center justify-center disabled:opacity-40"
                  aria-label="Next signal"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <p className="text-sm text-mimi-stone mb-3">{selectedClusterCard.description}</p>
              <button
                type="button"
                onClick={() => setRefineOpen(true)}
                className="w-full min-h-[44px] text-[10px] uppercase tracking-wider border border-mimi-cobalt/40 text-mimi-cobalt"
              >
                Refine this signal
              </button>
              {activeSnapshot && selectedFeatureId && (
                <div className="mt-4">
                  <TasteSignalGraphView
                    snapshot={activeSnapshot}
                    selectedFeatureId={selectedFeatureId}
                    refusals={signalEditor.refusals}
                    onSelectFeature={setSelectedFeatureId}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {!isNarrow && activeSnapshot && (
            <div className="mb-8">
              <TasteSignalGraphView
                snapshot={activeSnapshot}
                selectedFeatureId={selectedFeatureId}
                refusals={signalEditor.refusals}
                onSelectFeature={(fid) => {
                  setSelectedFeatureId(fid);
                  const clusterId = fid.replace('pattern_cluster:', '');
                  if (clusters.some((c) => c.id === clusterId)) setExpanded(clusterId);
                }}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="border border-nous-border/30 p-4">
              <p className="text-[10px] uppercase tracking-wider text-nous-subtle">References</p>
              <p className="font-serif text-3xl text-nous-text">{evidence.length}</p>
            </div>
            <div className="border border-nous-border/30 p-4">
              <p className="text-[10px] uppercase tracking-wider text-nous-subtle">Accepted / renamed</p>
              <p className="font-serif text-3xl text-nous-text">{acceptedCount}</p>
            </div>
            <div className="border border-nous-border/30 p-4">
              <p className="text-[10px] uppercase tracking-wider text-nous-subtle">Rejected</p>
              <p className="font-serif text-3xl text-nous-text">{rejectedCount}</p>
            </div>
          </div>

          <div className={`space-y-4 mb-10 ${isNarrow ? 'hidden' : ''}`}>
            {clusters.map((cluster) => {
              const isOpen = expanded === cluster.id;
              const supporting = cluster.supportingEvidenceNodeIds.map((id) => evidenceMap[id]).filter(Boolean);
              const relatedObs = observations.filter((o) => cluster.observationIds?.includes(o.id));
              const nameDraft = draftNames[cluster.id] ?? cluster.name;
              const noteDraft = draftNotes[cluster.id] ?? cluster.userAnnotation ?? '';
              const weightDraft = draftWeights[cluster.id] ?? cluster.userWeight ?? 'medium';

              return (
                <div key={cluster.id} className="border border-nous-border/40 bg-[#FDFBF7]/40 dark:bg-[#0A0A0A]/30">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => handleExpand(cluster.id, isOpen)}
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-nous-subtle mr-2">
                        {CLAIM_BADGE[cluster.claimType]}
                      </span>
                      <span className="text-sm font-medium text-nous-text">{cluster.name}</span>
                      <span className="ml-2 text-xs text-nous-subtle">×{cluster.frequency}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-nous-subtle">{cluster.userStatus}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums">{Math.round(cluster.confidence * 100)}%</span>
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-nous-border/20 pt-4 space-y-5">
                      <p className="text-sm text-nous-subtle">{cluster.description}</p>

                      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-nous-subtle mb-2">Observed evidence</p>
                          <div className="space-y-2">
                            {relatedObs.length ? relatedObs.map((observation) => (
                              <div key={observation.id} className="border border-nous-border/20 p-3 text-xs">
                                <div className="flex justify-between gap-3 mb-1">
                                  <span className="font-medium text-nous-text">{observation.label}</span>
                                  <span className="uppercase tracking-wider text-nous-subtle">{CLAIM_BADGE[observation.claimType]}</span>
                                </div>
                                <p className="text-nous-subtle">{observation.description}</p>
                              </div>
                            )) : (
                              <p className="text-xs text-nous-subtle">No observation rows are linked to this signal yet.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-nous-subtle mb-2">Supporting references</p>
                          <div className="flex gap-2 flex-wrap">
                            {supporting.map((e) => (
                              <figure key={e.id} className="w-20">
                                <div className="w-20 h-20 border border-nous-border/30 overflow-hidden bg-nous-border/10">
                                  {e.thumbnailUrl && <img src={e.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <figcaption className="mt-1 text-[9px] text-nous-subtle truncate">{e.title}</figcaption>
                              </figure>
                            ))}
                          </div>
                        </div>
                      </div>

                      {cluster.possibleInterpretations.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-nous-subtle mb-1">Possible interpretations</p>
                          <ul className="text-xs space-y-1 text-nous-subtle">
                            {cluster.possibleInterpretations.map((p) => (
                              <li key={p}>· {p}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-[1fr_0.7fr]">
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-wider text-nous-subtle">Rename signal</span>
                          <input
                            value={nameDraft}
                            onChange={(e) => setDraftNames((prev) => ({ ...prev, [cluster.id]: e.target.value }))}
                            className="mt-1 w-full border border-nous-border/30 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-nous-text/40"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-wider text-nous-subtle">Weight</span>
                          <select
                            value={weightDraft}
                            onChange={(e) => setDraftWeights((prev) => ({ ...prev, [cluster.id]: e.target.value as UserWeight }))}
                            className="mt-1 w-full border border-nous-border/30 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-nous-text/40"
                          >
                            {WEIGHTS.map((weight) => <option key={weight} value={weight}>{weight}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-nous-subtle">Your correction or note</span>
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setDraftNotes((prev) => ({ ...prev, [cluster.id]: e.target.value }))}
                          rows={2}
                          className="mt-1 w-full border border-nous-border/30 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:border-nous-text/40"
                          placeholder="Why this matters, or why Mimi misread it."
                        />
                      </label>

                      <ProofMode
                        confidence={cluster.confidence >= 0.8 ? 'High' : cluster.confidence >= 0.5 ? 'Medium' : 'Exploratory'}
                        basedOn={supporting.map((e) => e.title)}
                        reasoning={relatedObs.slice(0, 3).map((o) => o.label)}
                        onSteer={(action) => {
                          if (action === 'accept') onCurate(cluster.id, 'accepted', noteDraft, weightDraft);
                          if (action === 'reject') onCurate(cluster.id, 'rejected', noteDraft, weightDraft);
                        }}
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onCurate(cluster.id, 'accepted', noteDraft, weightDraft)}
                          className={`text-xs px-4 py-2 min-h-[44px] border ${cluster.userStatus === 'accepted' ? 'bg-nous-text text-[#FDFBF7]' : 'border-nous-border/40'}`}
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={() => onCurate(cluster.id, 'rejected', noteDraft, weightDraft)}
                          className={`text-xs px-4 py-2 min-h-[44px] border ${cluster.userStatus === 'rejected' ? 'bg-red-900/20 border-red-300' : 'border-nous-border/40'}`}
                        >
                          Not why I like it
                        </button>
                        <button
                          type="button"
                          onClick={() => onCurate(cluster.id, 'renamed', noteDraft, weightDraft, nameDraft)}
                          className={`text-xs px-4 py-2 min-h-[44px] border ${cluster.userStatus === 'renamed' ? 'bg-nous-text text-[#FDFBF7]' : 'border-nous-border/40'}`}
                        >
                          Save rename / weight
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3 min-h-[44px] bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em]"
          >
            Save curated signals and continue to Creative Laws
          </button>
        </div>

        <div className={`${isNarrow ? 'border-t' : 'lg:w-80 xl:w-96 shrink-0'} border-mimi-hairline/40`}>
          {inspector}
        </div>
      </div>

      <SignalRefineSheet
        open={refineOpen}
        onClose={() => setRefineOpen(false)}
        feature={selectedFeature}
        neighborFeatures={neighborFeatures}
        scopeLabel={scopeLabel}
        onRefine={(option, secondaryFeatureId) => void handleRefine(option, secondaryFeatureId)}
        loading={signalEditor.loading}
      />

      {signalEditor.error && (
        <p className="px-6 pb-4 text-sm text-red-700" role="alert">
          {signalEditor.error}
        </p>
      )}
    </div>
  );
};

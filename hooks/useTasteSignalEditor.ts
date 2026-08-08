import { useCallback, useEffect, useState } from "react";
import type { TasteModelSnapshot } from "../lib/tasteModel/contracts";
import type {
  TasteModelEdit,
  TasteRefusal,
} from "../schemas/tasteIntelligenceContracts";
import type { TasteModelDelta } from "../lib/tasteIntelligence/computeModelDelta";
import type { SignalRefineOption } from "../lib/tasteIntelligence/signalRefine";
import {
  buildModelEditForRefineOption,
  buildRefusalForRefineOption,
} from "../lib/tasteIntelligence/signalRefine";
import {
  createTasteRefusal,
  listTasteRefusals,
  submitTasteModelEdit,
  undoTasteModelEdit,
} from "../services/tasteIntelligenceClient";
import type { TasteModelEditOperation } from "../schemas/tasteIntelligenceContracts";
import { isTasteIntelligenceSurfaceEnabled } from "../lib/tasteIntelligence/featureFlags";

export interface UseTasteSignalEditorOptions {
  userId: string | null | undefined;
  projectId?: string;
  snapshot: TasteModelSnapshot | null;
  onSnapshotChange?: (snapshot: TasteModelSnapshot) => void;
}

export function useTasteSignalEditor(opts: UseTasteSignalEditorOptions) {
  const { userId, projectId, snapshot, onSnapshotChange } = opts;
  const [refusals, setRefusals] = useState<TasteRefusal[]>([]);
  const [lastEdit, setLastEdit] = useState<TasteModelEdit | null>(null);
  const [lastDelta, setLastDelta] = useState<TasteModelDelta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = isTasteIntelligenceSurfaceEnabled("tasteNegativeModel");

  const refreshRefusals = useCallback(async () => {
    if (!userId || !enabled) return;
    try {
      const res = await listTasteRefusals(projectId);
      setRefusals(res.refusals);
    } catch {
      /* optional during migration */
    }
  }, [userId, projectId, enabled]);

  useEffect(() => {
    void refreshRefusals();
  }, [refreshRefusals]);

  const refineSignal = useCallback(
    async (
      featureId: string,
      option: SignalRefineOption,
      extras?: { secondaryFeatureId?: string; rationale?: string },
    ) => {
      if (!userId || !snapshot || !enabled) return null;
      setLoading(true);
      setError(null);
      try {
        const feature = snapshot.featureWeights.find(
          (f) => f.featureId === featureId,
        );
        const beforeState = {
          label: feature?.label,
          signedWeight: feature?.signedWeight,
          userWeight: feature?.signedWeight >= 1 ? "high" : "medium",
          scope: feature?.contextScopes[0] ?? "persistent",
        };

        const refusal = buildRefusalForRefineOption({
          ownerId: userId,
          projectId,
          featureIds: [featureId],
          option,
          scope: projectId ? "project" : "persistent",
          sourceIds: feature?.sourceIds ?? [],
          secondaryFeatureId: extras?.secondaryFeatureId,
        });

        if (refusal) {
          const res = await createTasteRefusal({
            featureIds: refusal.featureIds,
            refusalType: refusal.refusalType,
            projectId: refusal.projectId,
            scope: refusal.scope,
            signedWeight: refusal.signedWeight,
            confidence: refusal.confidence,
            sourceIds: refusal.sourceIds,
            snapshot,
          });
          if (res.snapshot) onSnapshotChange?.(res.snapshot);
          setLastDelta(res.modelDelta);
          await refreshRefusals();
          return res;
        }

        const editPayload = buildModelEditForRefineOption({
          ownerId: userId,
          projectId,
          featureId,
          option,
          before: beforeState,
          rationale: extras?.rationale,
        });
        if (!editPayload) return null;

        const res = await submitTasteModelEdit({
          ...editPayload,
          projectId,
          rationale: extras?.rationale,
          snapshot,
        });
        setLastEdit(res.edit);
        setLastDelta(res.modelDelta);
        onSnapshotChange?.(res.snapshot);
        return res;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refine failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId, snapshot, projectId, enabled, onSnapshotChange, refreshRefusals],
  );

  const applyModelEdit = useCallback(
    async (input: {
      operation: TasteModelEditOperation;
      targetIds: string[];
      before: Record<string, unknown>;
      after: Record<string, unknown>;
      rationale?: string;
    }) => {
      if (!userId || !snapshot || !enabled) return null;
      setLoading(true);
      setError(null);
      try {
        const res = await submitTasteModelEdit({
          ...input,
          projectId,
          snapshot,
        });
        setLastEdit(res.edit);
        setLastDelta(res.modelDelta);
        onSnapshotChange?.(res.snapshot);
        return res;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Edit failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId, snapshot, projectId, enabled, onSnapshotChange],
  );

  const undoLastEdit = useCallback(async () => {
    if (!userId || !snapshot || !lastEdit || !enabled) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await undoTasteModelEdit({
        editId: lastEdit.id,
        projectId,
        snapshot,
      });
      setLastEdit(res.edit);
      setLastDelta(res.modelDelta);
      onSnapshotChange?.(res.snapshot);
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Undo failed");
      return null;
    } finally {
      setLoading(false);
      setLastEdit(null);
    }
  }, [userId, snapshot, lastEdit, projectId, enabled, onSnapshotChange]);

  return {
    enabled,
    refusals,
    lastEdit,
    lastDelta,
    loading,
    error,
    refineSignal,
    applyModelEdit,
    undoLastEdit,
    refreshRefusals,
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TasteCandidateInput, TasteCandidateScore, TasteModelSnapshot } from '../lib/tasteModel';
import {
  compileAndSaveTasteModel,
  getTasteModelSnapshot,
  rebuildTasteModel,
  scoreCandidateAgainstStoredModel,
} from '../services/tasteModelService';

export interface UseTasteModelOptions {
  userId: string | null | undefined;
  projectId?: string;
  autoLoad?: boolean;
}

export interface UseTasteModelResult {
  globalSnapshot: TasteModelSnapshot | null;
  projectSnapshot: TasteModelSnapshot | null;
  activeSnapshot: TasteModelSnapshot | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  refresh: () => Promise<void>;
  recompile: () => Promise<void>;
  scoreCandidate: (
    candidate: TasteCandidateInput,
  ) => Promise<TasteCandidateScore>;
}

export function useTasteModel(opts: UseTasteModelOptions): UseTasteModelResult {
  const { userId, projectId, autoLoad = true } = opts;
  const [globalSnapshot, setGlobalSnapshot] = useState<TasteModelSnapshot | null>(null);
  const [projectSnapshot, setProjectSnapshot] = useState<TasteModelSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || userId === 'ghost' || userId.startsWith('local_')) {
      setGlobalSnapshot(null);
      setProjectSnapshot(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [global, project] = await Promise.all([
        getTasteModelSnapshot(userId, 'global'),
        projectId
          ? getTasteModelSnapshot(userId, { projectId })
          : Promise.resolve(null),
      ]);
      setGlobalSnapshot(global);
      setProjectSnapshot(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load taste model');
    } finally {
      setLoading(false);
    }
  }, [userId, projectId]);

  const recompile = useCallback(async () => {
    if (!userId || userId === 'ghost') return;
    setLoading(true);
    setError(null);
    try {
      const result = await rebuildTasteModel(userId, projectId);
      if (result.global) setGlobalSnapshot(result.global);
      if (result.project) setProjectSnapshot(result.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recompilation failed');
    } finally {
      setLoading(false);
    }
  }, [userId, projectId]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const scoreCandidate = useCallback(
    async (candidate: TasteCandidateInput): Promise<TasteCandidateScore> => {
      if (!userId) {
        return {
          fitScore: 0,
          confidence: 0,
          verdict: 'uncertain',
          components: {
            semanticAffinity: 0,
            ruleFit: 0,
            contextFit: 0,
            trajectoryFit: 0,
            noveltyFit: 0,
            aversionPenalty: 0,
            saturationPenalty: 0,
          },
          explanation: {
            topPositiveFactors: [],
            topNegativeFactors: [],
            contradictions: [],
            unknowns: ['Not signed in'],
          },
        };
      }
      return scoreCandidateAgainstStoredModel(userId, candidate, { projectId });
    },
    [userId, projectId],
  );

  useEffect(() => {
    if (autoLoad) {
      void load();
    }
  }, [autoLoad, load]);

  const activeSnapshot = projectSnapshot ?? globalSnapshot;
  const stale = Boolean(activeSnapshot?.stale);

  return useMemo(
    () => ({
      globalSnapshot,
      projectSnapshot,
      activeSnapshot,
      loading,
      error,
      stale,
      refresh,
      recompile,
      scoreCandidate,
    }),
    [
      globalSnapshot,
      projectSnapshot,
      activeSnapshot,
      loading,
      error,
      stale,
      refresh,
      recompile,
      scoreCandidate,
    ],
  );
}

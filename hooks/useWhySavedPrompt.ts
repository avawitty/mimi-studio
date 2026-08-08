import { useCallback, useRef, useState } from "react";
import type { SavedReasonHypothesis } from "../schemas/tasteIntelligenceContracts";
import {
  proposeSavedReasonHypotheses,
  reviewSavedReasonHypothesis,
} from "../services/tasteIntelligenceClient";

export interface WhySavedPromptState {
  artifactId: string;
  tags?: string[];
}

export interface QueuedWhySavedArtifact {
  artifactId: string;
  tags?: string[];
}

function isEligibleUser(userId: string | null | undefined): userId is string {
  return Boolean(userId && userId !== "ghost" && !userId.startsWith("local_"));
}

export function useWhySavedPrompt(userId: string | null | undefined) {
  const queueRef = useRef<QueuedWhySavedArtifact[]>([]);
  const processingRef = useRef(false);
  const reviewingIdsRef = useRef<Set<string>>(new Set());

  const [prompt, setPrompt] = useState<WhySavedPromptState | null>(null);
  const [hypotheses, setHypotheses] = useState<SavedReasonHypothesis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotAvailable, setSnapshotAvailable] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(() => new Set());
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});

  const syncQueueMeta = useCallback(() => {
    setQueueLength(queueRef.current.length);
  }, []);

  const loadArtifact = useCallback(
    async (item: QueuedWhySavedArtifact, index: number) => {
      if (!isEligibleUser(userId)) return;

      processingRef.current = true;
      setPrompt({ artifactId: item.artifactId, tags: item.tags });
      setQueueIndex(index);
      setLoading(true);
      setError(null);
      setReviewErrors({});
      setReviewingIds(new Set());
      reviewingIdsRef.current = new Set();
      setHypotheses([]);

      try {
        const res = await proposeSavedReasonHypotheses({
          artifactId: item.artifactId,
          tags: item.tags,
        });
        setHypotheses(res.hypotheses);
        setSnapshotAvailable(res.snapshotAvailable);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load hypotheses");
        setHypotheses([]);
      } finally {
        setLoading(false);
        processingRef.current = false;
      }
    },
    [userId],
  );

  const processQueueHead = useCallback(async () => {
    if (!isEligibleUser(userId) || processingRef.current) return;
    const head = queueRef.current[0];
    if (!head) {
      setPrompt(null);
      setQueueIndex(0);
      syncQueueMeta();
      return;
    }
    await loadArtifact(head, 0);
  }, [userId, loadArtifact, syncQueueMeta]);

  const enqueueArtifacts = useCallback(
    (items: QueuedWhySavedArtifact[]) => {
      if (!isEligibleUser(userId) || items.length === 0) return;
      const wasIdle = queueRef.current.length === 0 && !processingRef.current;
      queueRef.current = [...queueRef.current, ...items];
      syncQueueMeta();
      if (wasIdle) {
        void processQueueHead();
      }
    },
    [userId, processQueueHead, syncQueueMeta],
  );

  const enqueueForArtifact = useCallback(
    (artifactId: string, tags?: string[]) => {
      enqueueArtifacts([{ artifactId, tags }]);
    },
    [enqueueArtifacts],
  );

  /** Backdrop / Escape — advance to next queued artifact when available. */
  const dismiss = useCallback(() => {
    if (queueRef.current.length > 0) {
      queueRef.current = queueRef.current.slice(1);
      syncQueueMeta();
    }
    if (queueRef.current.length > 0) {
      void loadArtifact(queueRef.current[0]!, 0);
    } else {
      setPrompt(null);
      setHypotheses([]);
      setError(null);
      setReviewErrors({});
      setReviewingIds(new Set());
      reviewingIdsRef.current = new Set();
      setQueueIndex(0);
    }
  }, [loadArtifact, syncQueueMeta]);

  /** Done — exit the queue without reviewing remaining artifacts. */
  const done = useCallback(() => {
    queueRef.current = [];
    setPrompt(null);
    setHypotheses([]);
    setError(null);
    setReviewErrors({});
    setReviewingIds(new Set());
    reviewingIdsRef.current = new Set();
    setQueueLength(0);
    setQueueIndex(0);
  }, []);

  const review = useCallback(
    async (
      hypothesis: SavedReasonHypothesis,
      action: "confirm" | "reject" | "edit" | "skip",
      editedText?: string,
    ) => {
      if (reviewingIdsRef.current.has(hypothesis.id)) return;

      reviewingIdsRef.current.add(hypothesis.id);
      setReviewingIds(new Set(reviewingIdsRef.current));
      setReviewErrors((prev) => {
        const next = { ...prev };
        delete next[hypothesis.id];
        return next;
      });

      try {
        const res = await reviewSavedReasonHypothesis({
          hypothesis,
          action,
          editedText,
        });
        setHypotheses((prev) =>
          prev.map((h) => (h.id === hypothesis.id ? res.hypothesis : h)),
        );
      } catch (err) {
        setReviewErrors((prev) => ({
          ...prev,
          [hypothesis.id]:
            err instanceof Error ? err.message : "Review failed",
        }));
      } finally {
        reviewingIdsRef.current.delete(hypothesis.id);
        setReviewingIds(new Set(reviewingIdsRef.current));
      }
    },
    [],
  );

  const isReviewing = useCallback(
    (hypothesisId: string) => reviewingIds.has(hypothesisId),
    [reviewingIds],
  );

  return {
    prompt,
    hypotheses,
    loading,
    error,
    snapshotAvailable,
    queueLength,
    queueIndex,
    queuePosition: prompt ? queueIndex + 1 : 0,
    reviewErrors,
    isReviewing,
    enqueueForArtifact,
    enqueueArtifacts,
    /** @deprecated Prefer enqueueForArtifact — kept for single-artifact callers. */
    openForArtifact: enqueueForArtifact,
    dismiss,
    done,
    review,
  };
}

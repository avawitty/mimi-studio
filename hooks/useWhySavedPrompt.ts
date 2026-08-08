import { useCallback, useState } from "react";
import type { SavedReasonHypothesis } from "../schemas/tasteIntelligenceContracts";
import {
  proposeSavedReasonHypotheses,
  reviewSavedReasonHypothesis,
} from "../services/tasteIntelligenceClient";

export interface WhySavedPromptState {
  artifactId: string;
  tags?: string[];
}

const SOURCE_LABELS: Record<SavedReasonHypothesis["source"], string> = {
  model_proposed: "Inferred",
  rule_based: "Observed",
  creator_authored: "Creator confirmed",
};

export function useWhySavedPrompt(userId: string | null | undefined) {
  const [prompt, setPrompt] = useState<WhySavedPromptState | null>(null);
  const [hypotheses, setHypotheses] = useState<SavedReasonHypothesis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotAvailable, setSnapshotAvailable] = useState(true);

  const openForArtifact = useCallback(
    async (artifactId: string, tags?: string[]) => {
      if (!userId || userId === "ghost" || userId.startsWith("local_")) return;
      setPrompt({ artifactId, tags });
      setLoading(true);
      setError(null);
      try {
        const res = await proposeSavedReasonHypotheses({ artifactId, tags });
        setHypotheses(res.hypotheses);
        setSnapshotAvailable(res.snapshotAvailable);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load hypotheses");
        setHypotheses([]);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  const close = useCallback(() => {
    setPrompt(null);
    setHypotheses([]);
    setError(null);
  }, []);

  const review = useCallback(
    async (
      hypothesis: SavedReasonHypothesis,
      action: "confirm" | "reject" | "edit" | "skip",
      editedText?: string,
    ) => {
      setLoading(true);
      setError(null);
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
        setError(err instanceof Error ? err.message : "Review failed");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    prompt,
    hypotheses,
    loading,
    error,
    snapshotAvailable,
    sourceLabel: SOURCE_LABELS,
    openForArtifact,
    close,
    review,
  };
}

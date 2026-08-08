/**
 * Taste State Service
 *
 * Core intelligence service — assembles a compact TasteState from:
 *   - TasteAssertions (directional preference relationships)
 *   - TasteConcepts (named concepts with contextual strength)
 *   - EvidenceAtoms (source material relevant to current context)
 *
 * getTasteState(userId, context?) is the primary interface between
 * the Taste Intelligence layer and generative features.
 * Generation tools must NOT independently reconstruct the user's taste.
 */
import type {
  TasteScope,
  TasteState,
} from "../../types";
import { partitionAssertions, scoreAssertion } from "../../lib/taste/tasteStateLogic";
import { tasteStateToPromptContext } from "../../lib/taste/tastePromptContext";
import { getAssertionsForUser } from "./tasteAssertionService";
import { getConceptsForUser } from "./tasteConceptService";
import { queryEvidenceAtoms } from "./evidenceAtomService";

const ONE_WEEK_MS = 7 * 86_400_000;

export interface TasteStateOptions {
  maxEvidence?: number;
  maxAssertions?: number;
}

/**
 * Compute and return a compact TasteState for a user + optional context.
 */
export async function getTasteState(
  userId: string,
  context?: TasteScope,
  options: TasteStateOptions = {},
): Promise<TasteState> {
  const { maxEvidence = 12, maxAssertions = 20 } = options;

  if (!userId || userId === "ghost") {
    return emptyTasteState(userId, context);
  }

  const [allAssertions, allConcepts, recentAtoms] = await Promise.all([
    getAssertionsForUser(userId, { maxResults: 200 }),
    getConceptsForUser(userId),
    queryEvidenceAtoms(userId, {
      tasteImpact: true,
      ...(context ? { contextScope: context } : {}),
      maxResults: maxEvidence,
    }),
  ]);

  const currentExplorations = allConcepts
    .filter((c) => c.contexts.some((ctx) => ctx.trend === "rising"))
    .slice(0, 10);

  const { stablePreferences, emergingPreferences, negativePreferences } =
    partitionAssertions(allAssertions, context, maxAssertions);

  const scoredAssertions = allAssertions
    .filter((a) => a.claimType !== "user_rejected")
    .map((assertion) => ({ assertion, score: scoreAssertion(assertion, context) }))
    .sort((a, b) => b.score - a.score);

  const likedConcepts = new Set(stablePreferences.map((a) => a.conceptA));
  const dislikedConcepts = new Set(negativePreferences.map((a) => a.conceptA));
  const tensions: TasteState["tensions"] = [];

  for (const liked of likedConcepts) {
    const tensionPairs = stablePreferences
      .filter((a) => a.conceptA === liked && a.conceptB && dislikedConcepts.has(a.conceptB))
      .map((a) => ({
        conceptA: a.conceptA,
        conceptB: a.conceptB!,
        note: undefined as string | undefined,
      }));
    tensions.push(...tensionPairs);
  }

  const topScores = scoredAssertions.slice(0, 10).map((s) => s.score);
  const overallConfidence =
    topScores.length > 0 ? topScores.reduce((a, b) => a + b, 0) / topScores.length : 0;

  const cutoff = Date.now() - ONE_WEEK_MS;
  const recentChanges: TasteState["recentChanges"] = allAssertions
    .filter((a) => a.updatedAt >= cutoff && a.userCorrection !== undefined)
    .slice(0, 5)
    .map((a) => ({
      label: a.conceptA,
      direction: a.userCorrection!,
      at: a.updatedAt,
    }));

  return {
    userId,
    context,
    stablePreferences,
    negativePreferences,
    emergingPreferences,
    currentExplorations,
    tensions: tensions.slice(0, 8),
    inferredAxes: [],
    relevantEvidence: recentAtoms,
    confidence: Math.min(1, overallConfidence),
    recentChanges,
    generatedAt: Date.now(),
  };
}

function emptyTasteState(userId: string, context?: TasteScope): TasteState {
  return {
    userId,
    context,
    stablePreferences: [],
    negativePreferences: [],
    emergingPreferences: [],
    currentExplorations: [],
    tensions: [],
    inferredAxes: [],
    relevantEvidence: [],
    confidence: 0,
    recentChanges: [],
    generatedAt: Date.now(),
  };
}

export { tasteStateToPromptContext } from "../../lib/taste/tastePromptContext";

/**
 * Return a human-readable signal label for display in the UI.
 */
export function tasteConfidenceLabel(
  confidence: number,
): "STRONG SIGNAL" | "EMERGING" | "PERSISTENT" | "CHANGING" | "CONTEXTUAL" | "UNCERTAIN" {
  if (confidence >= 0.85) return "STRONG SIGNAL";
  if (confidence >= 0.7) return "PERSISTENT";
  if (confidence >= 0.55) return "EMERGING";
  if (confidence >= 0.4) return "CONTEXTUAL";
  if (confidence >= 0.25) return "CHANGING";
  return "UNCERTAIN";
}

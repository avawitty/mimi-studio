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
 *
 * Temporal weighting strategy:
 *   confidence × recency × confirmationBoost × contextRelevance
 *
 * This is intentionally a first-pass implementation — the weighting strategy
 * is designed to be replaceable without changing the calling interface.
 */
import type {
  EvidenceAtom,
  TasteAssertion,
  TasteConcept,
  TasteScope,
  TasteState,
} from "../../types";
import { getAssertionsForUser } from "./tasteAssertionService";
import { getConceptsForUser, getExplorationConcepts } from "./tasteConceptService";
import { queryEvidenceAtoms } from "./evidenceAtomService";

// ─── Temporal Weighting ───────────────────────────────────────────────────────

const ONE_DAY_MS = 86_400_000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;

/**
 * Recency decay factor: 1.0 for today, fading to ~0.5 at 30 days, ~0.2 at 90 days.
 * Designed to suppress old inferences without deleting them.
 */
function recencyFactor(updatedAt: number): number {
  const ageMs = Date.now() - updatedAt;
  if (ageMs < ONE_DAY_MS) return 1.0;
  if (ageMs < ONE_WEEK_MS) return 0.85;
  if (ageMs < ONE_MONTH_MS) return 0.65;
  return 0.4;
}

/**
 * Boost for explicit user confirmation (vs AI inference).
 */
function confirmationBoost(claimType: TasteAssertion["claimType"]): number {
  switch (claimType) {
    case "user_confirmed":
      return 1.3;
    case "observed":
      return 1.1;
    case "inferred":
      return 0.8;
    case "speculative":
      return 0.6;
    case "user_rejected":
      return 0.0; // excluded from positive preferences
  }
}

/**
 * Context relevance: how well does the assertion's context match the requested scope?
 */
function contextRelevanceFactor(
  assertionContext: TasteScope | undefined,
  requestedContext: TasteScope | undefined,
): number {
  if (!assertionContext || assertionContext === "global") return 1.0;
  if (!requestedContext) return 1.0;
  if (assertionContext === requestedContext) return 1.2;
  return 0.7; // different context — still relevant but de-prioritized
}

/**
 * Compute a weighted score for an assertion given the requested context.
 */
function assertionScore(
  assertion: TasteAssertion,
  context: TasteScope | undefined,
): number {
  return (
    assertion.confidence *
    recencyFactor(assertion.updatedAt) *
    confirmationBoost(assertion.claimType) *
    contextRelevanceFactor(assertion.context, context)
  );
}

// ─── Confidence Thresholds ────────────────────────────────────────────────────

/** Assertions at or above this score are classified as stable preferences. */
const STABLE_THRESHOLD = 0.65;
/** Assertions between this and STABLE are emerging. */
const EMERGING_THRESHOLD = 0.35;

// ─── Main ─────────────────────────────────────────────────────────────────────

export interface TasteStateOptions {
  /** Maximum number of evidence atoms to include */
  maxEvidence?: number;
  /** Maximum number of assertions per category */
  maxAssertions?: number;
}

/**
 * Compute and return a compact TasteState for a user + optional context.
 *
 * This is computed on demand — it is not stored.
 * Generation tools should call this and pass the result as context.
 *
 * The returned TasteState includes:
 *   - stablePreferences: high-confidence positive assertions
 *   - negativePreferences: DISLIKES / rejected assertions
 *   - emergingPreferences: lower-confidence or recent positive assertions
 *   - currentExplorations: concepts with rising trend
 *   - tensions: pairs of concepts that appear in opposition
 *   - relevantEvidence: recent taste-impacting atoms for the context
 *   - confidence: overall system confidence (mean of top assertion scores)
 *   - recentChanges: assertions updated in the last 7 days
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

  // Fetch data in parallel
  const [allAssertions, allConcepts, explorations, recentAtoms] = await Promise.all([
    getAssertionsForUser(userId, { maxResults: 200 }),
    getConceptsForUser(userId),
    getExplorationConcepts(userId),
    queryEvidenceAtoms(userId, {
      tasteImpact: true,
      contextScope: context,
      maxResults: maxEvidence,
    }),
  ]);

  // Score and partition assertions
  const scoredAssertions = allAssertions
    .filter((a) => a.claimType !== "user_rejected")
    .map((a) => ({ assertion: a, score: assertionScore(a, context) }))
    .sort((a, b) => b.score - a.score);

  const positiveRelations = new Set<TasteAssertion["relation"]>([
    "LIKES",
    "PREFERS_OVER",
    "ASSOCIATES",
    "LIKES_ONLY_IN",
  ]);
  const negativeRelations = new Set<TasteAssertion["relation"]>(["DISLIKES"]);

  const stablePreferences: TasteAssertion[] = [];
  const emergingPreferences: TasteAssertion[] = [];
  const negativePreferences: TasteAssertion[] = [];

  for (const { assertion, score } of scoredAssertions) {
    if (negativeRelations.has(assertion.relation)) {
      negativePreferences.push(assertion);
      continue;
    }

    if (!positiveRelations.has(assertion.relation)) continue;

    if (score >= STABLE_THRESHOLD) {
      if (stablePreferences.length < maxAssertions) stablePreferences.push(assertion);
    } else if (score >= EMERGING_THRESHOLD) {
      if (emergingPreferences.length < maxAssertions) emergingPreferences.push(assertion);
    }
  }

  // Tensions: concepts that appear in both LIKES and DISLIKES assertions for the same user
  const likedConcepts = new Set(stablePreferences.map((a) => a.conceptA));
  const dislikedConcepts = new Set(negativePreferences.map((a) => a.conceptA));
  const tensions: TasteState["tensions"] = [];

  for (const liked of likedConcepts) {
    // Look for assertions where this concept is opposed by a disliked concept
    const tensions_ = stablePreferences
      .filter((a) => a.conceptA === liked && a.conceptB && dislikedConcepts.has(a.conceptB))
      .map((a) => ({ conceptA: a.conceptA, conceptB: a.conceptB!, note: undefined as string | undefined }));
    tensions.push(...tensions_);
  }

  // Overall confidence: mean score of top 10 assertions
  const topScores = scoredAssertions.slice(0, 10).map((s) => s.score);
  const overallConfidence =
    topScores.length > 0 ? topScores.reduce((a, b) => a + b, 0) / topScores.length : 0;

  // Recent changes (last 7 days)
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
    negativePreferences: negativePreferences.slice(0, maxAssertions),
    emergingPreferences,
    currentExplorations: explorations.slice(0, 10),
    tensions: tensions.slice(0, 8),
    inferredAxes: [], // Phase 7
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

/**
 * Format a TasteState as a concise prompt segment for generation context.
 * Used to inject taste intelligence into AI prompts without exposing raw data.
 */
export function tasteStateToPromptContext(state: TasteState): string {
  const lines: string[] = [];

  if (state.stablePreferences.length > 0) {
    lines.push("CONFIRMED PREFERENCES:");
    for (const a of state.stablePreferences.slice(0, 5)) {
      const concept = a.conceptB
        ? `${a.conceptA} ${a.relation} ${a.conceptB}`
        : `${a.conceptA}`;
      lines.push(`  • ${concept} (confidence: ${(a.confidence * 100).toFixed(0)}%)`);
    }
  }

  if (state.negativePreferences.length > 0) {
    lines.push("AVOIDANCES:");
    for (const a of state.negativePreferences.slice(0, 5)) {
      lines.push(`  • DISLIKES ${a.conceptA} (confidence: ${(a.confidence * 100).toFixed(0)}%)`);
    }
  }

  if (state.emergingPreferences.length > 0) {
    lines.push("EMERGING SIGNALS:");
    for (const a of state.emergingPreferences.slice(0, 3)) {
      lines.push(`  • ${a.conceptA} (signal strength: ${(a.confidence * 100).toFixed(0)}%)`);
    }
  }

  if (state.currentExplorations.length > 0) {
    lines.push(
      "CURRENT EXPLORATIONS: " + state.currentExplorations.map((c) => c.label).join(", "),
    );
  }

  if (state.tensions.length > 0) {
    lines.push("TENSIONS:");
    for (const t of state.tensions.slice(0, 3)) {
      lines.push(`  • ${t.conceptA} ↔ ${t.conceptB}`);
    }
  }

  if (lines.length === 0) return "";
  return lines.join("\n");
}

/**
 * Return a human-readable signal label for display in the UI.
 * Avoids exposing raw percentages — uses editorial language instead.
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

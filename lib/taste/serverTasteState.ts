/**
 * Server-side TasteState assembly (Firebase Admin).
 * Mirrors client getTasteState() without the browser Firestore SDK.
 */
import type {
  EvidenceAtom,
  TasteAssertion,
  TasteConcept,
  TasteScope,
  TasteState,
} from "../../types";
import { partitionAssertions, scoreAssertion } from "./tasteStateLogic";
import { tasteStateToPromptContext } from "./tastePromptContext";
import { searchEvidenceAtomsSemantic } from "./evidenceAtomRetrieval";

const ONE_WEEK_MS = 7 * 86_400_000;

type AdminDb = {
  collection: (path: string) => any;
};

async function loadAssertions(db: AdminDb, userId: string): Promise<TasteAssertion[]> {
  try {
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("tasteAssertions")
      .orderBy("updatedAt", "desc")
      .limit(200)
      .get();
    return snap.docs.map((d: { data: () => unknown }) => d.data() as TasteAssertion);
  } catch {
    return [];
  }
}

async function loadConcepts(db: AdminDb, userId: string): Promise<TasteConcept[]> {
  try {
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("tasteConcepts")
      .orderBy("confidence", "desc")
      .limit(100)
      .get();
    return snap.docs.map((d: { data: () => unknown }) => d.data() as TasteConcept);
  } catch {
    return [];
  }
}

async function loadEvidenceAtoms(
  db: AdminDb,
  userId: string,
  context: TasteScope | undefined,
  maxEvidence: number,
): Promise<EvidenceAtom[]> {
  try {
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("evidenceAtoms")
      .orderBy("createdAt", "desc")
      .limit(Math.max(maxEvidence, 24))
      .get();
    return snap.docs
      .map((d: { data: () => unknown }) => d.data() as EvidenceAtom)
      .filter((a: EvidenceAtom) => a.tasteImpact !== false)
      .filter(
        (a: EvidenceAtom) =>
          !context ||
          !a.contextScope ||
          a.contextScope === context ||
          a.contextScope === "global",
      )
      .slice(0, maxEvidence);
  } catch {
    return [];
  }
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

export async function getServerTasteState(
  db: AdminDb,
  userId: string,
  context?: TasteScope,
  options: {
    maxEvidence?: number;
    maxAssertions?: number;
    queryText?: string;
    apiKey?: string;
    projectId?: string;
  } = {},
): Promise<TasteState> {
  const { maxEvidence = 12, maxAssertions = 20, queryText, apiKey, projectId } = options;

  if (!userId || userId === "ghost") {
    return emptyTasteState(userId, context);
  }

  const loadRecentEvidence = () => loadEvidenceAtoms(db, userId, context, maxEvidence);

  let relevantEvidence: EvidenceAtom[];
  if (queryText?.trim() && apiKey) {
    const ranked = await searchEvidenceAtomsSemantic(db, userId, queryText, apiKey, {
      context,
      projectId,
      maxResults: maxEvidence,
    });
    relevantEvidence = ranked.map((entry) => entry.atom);
    if (!relevantEvidence.length) {
      relevantEvidence = await loadRecentEvidence();
    }
  } else {
    relevantEvidence = await loadRecentEvidence();
  }

  const [allAssertions, allConcepts] = await Promise.all([
    loadAssertions(db, userId),
    loadConcepts(db, userId),
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
    relevantEvidence,
    confidence: Math.min(1, overallConfidence),
    recentChanges,
    generatedAt: Date.now(),
  };
}

/** Prompt segment for generation routes — empty when no taste signal exists. */
export async function getServerTastePromptContext(
  db: AdminDb,
  userId: string,
  context?: TasteScope,
  options: {
    queryText?: string;
    apiKey?: string;
    projectId?: string;
  } = {},
): Promise<string> {
  const state = await getServerTasteState(db, userId, context, {
    queryText: options.queryText,
    apiKey: options.apiKey,
    projectId: options.projectId,
  });
  const block = tasteStateToPromptContext(state);
  if (!block) return "";
  return `TASTE INTELLIGENCE (approved / inferred — do not invent beyond this):\n${block}`;
}

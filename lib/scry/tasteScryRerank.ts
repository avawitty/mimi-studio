/**
 * Bridge Scry evidence lanes to Taste Intelligence hybrid reranking.
 */
import type { TasteRefusal } from "../../schemas/tasteIntelligenceContracts.js";
import type {
  ResearchResult,
  ScryLaneId,
  ScryRun,
} from "../../schemas/scryContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import {
  rerankTasteSearchResults,
  type TasteSearchCandidate,
  type TasteSearchMatchReason,
} from "../tasteIntelligence/tasteSearch.js";

export type ScryWhyMatched = TasteSearchMatchReason & {
  linkedFeatureLabels?: string[];
};

const RERANKABLE_LANES: ScryLaneId[] = [
  "personalMemory",
  "web",
  "shadowMemory",
];

function scryLaneToTasteLane(
  lane: ScryLaneId,
): TasteSearchCandidate["lane"] {
  switch (lane) {
    case "personalMemory":
      return "archive";
    case "shadowMemory":
      return "shadow_memory";
    case "web":
      return "web";
    case "generatedReading":
      return "reading";
    default: {
      const _exhaustive: never = lane;
      return _exhaustive;
    }
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

export function lexicalOverlapScore(query: string, ...parts: (string | undefined)[]): number {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;
  const haystack = tokenize(parts.filter(Boolean).join(" "));
  if (haystack.length === 0) return 0;
  let hits = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) hits += 1;
  }
  return hits / queryTokens.size;
}

function embeddingScoreFor(result: ResearchResult, lexical: number): number {
  if (typeof result.similarity === "number") return result.similarity;
  if (typeof result.relevanceScore === "number") {
    return result.relevanceScore > 1
      ? Math.min(1, result.relevanceScore / 100)
      : result.relevanceScore;
  }
  return lexical;
}

export function extractFeatureIdsFromText(
  snapshot: TasteModelSnapshot | null,
  ...parts: (string | undefined)[]
): string[] {
  if (!snapshot) return [];
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack.trim()) return [];
  const matched: string[] = [];
  for (const fw of snapshot.featureWeights) {
    const label = fw.label.trim().toLowerCase();
    if (label.length < 3) continue;
    if (haystack.includes(label)) matched.push(fw.featureId);
  }
  return matched;
}

export function researchResultToTasteCandidate(
  result: ResearchResult,
  query: string,
  snapshot: TasteModelSnapshot | null,
): TasteSearchCandidate {
  const lexical = lexicalOverlapScore(
    query,
    result.title,
    result.snippet,
    result.content_preview,
    result.relevance,
  );
  const featureIds = extractFeatureIdsFromText(
    snapshot,
    result.title,
    result.snippet,
    result.content_preview,
    result.relevance,
  );

  return {
    id: result.id || result.title,
    lane: scryLaneToTasteLane(result.sourceLane),
    embeddingScore: embeddingScoreFor(result, lexical),
    lexicalScore: lexical,
    memoryMatchScore: result.sourceLane === "personalMemory" ? 0.65 : 0.35,
    graphProximityScore: featureIds.length > 0 ? 0.55 : 0.25,
    projectRelevanceScore: lexical,
    recencyScore: 0.5,
    featureIds,
    evidenceIds: result.id ? [result.id] : [],
    label: result.title,
  };
}

function featureLabelMap(snapshot: TasteModelSnapshot | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!snapshot) return map;
  for (const fw of snapshot.featureWeights) {
    map.set(fw.featureId, fw.label);
  }
  return map;
}

function attachRerankToResult(
  result: ResearchResult,
  whyMatched: ScryWhyMatched,
  tasteScore: number,
): ResearchResult {
  return {
    ...result,
    tasteScore,
    whyMatched,
  };
}

function rerankLane(
  hits: ResearchResult[],
  query: string,
  snapshot: TasteModelSnapshot | null,
  refusals: TasteRefusal[],
  labels: Map<string, string>,
): ResearchResult[] {
  if (hits.length === 0) return hits;

  const candidates = hits.map((hit) =>
    researchResultToTasteCandidate(hit, query, snapshot),
  );
  const ranked = rerankTasteSearchResults({
    snapshot,
    refusals,
    saturationStates: [],
    candidates,
  });
  const byId = new Map(
    hits.map((hit) => [hit.id || hit.title, hit] as const),
  );

  return ranked
    .map(({ candidate, finalScore, whyMatched }) => {
      const original = byId.get(candidate.id);
      if (!original) return null;
      const linkedFeatureLabels = whyMatched.linkedFeatureIds
        .map((id) => labels.get(id))
        .filter((label): label is string => Boolean(label));
      return attachRerankToResult(original, {
        ...whyMatched,
        linkedFeatureLabels,
      }, finalScore);
    })
    .filter((hit): hit is ResearchResult => hit !== null);
}

export interface TasteScryRerankInput {
  snapshot: TasteModelSnapshot | null;
  refusals?: TasteRefusal[];
}

/** Apply taste-aware reranking per evidence lane; preserves lane buckets on the run. */
export function applyTasteRerankToScryRun(
  run: ScryRun,
  input: TasteScryRerankInput,
): ScryRun {
  const refusals = input.refusals ?? [];
  const labels = featureLabelMap(input.snapshot);

  return {
    ...run,
    sources: {
      ...run.sources,
      personalMemory: rerankLane(
        run.sources.personalMemory,
        run.query,
        input.snapshot,
        refusals,
        labels,
      ),
      web: rerankLane(
        run.sources.web,
        run.query,
        input.snapshot,
        refusals,
        labels,
      ),
      shadowMemory: rerankLane(
        run.sources.shadowMemory,
        run.query,
        input.snapshot,
        refusals,
        labels,
      ),
    },
  };
}

/** Merge rerankable lanes sorted by taste score (falls back to lane order). */
export function mergeTasteRankedHits(run: ScryRun): ResearchResult[] {
  const merged = [
    ...run.sources.personalMemory,
    ...run.sources.web,
    ...run.sources.shadowMemory,
  ];
  const hasTaste = merged.some((hit) => typeof hit.tasteScore === "number");
  if (!hasTaste) return merged;
  return [...merged].sort(
    (a, b) => (b.tasteScore ?? 0) - (a.tasteScore ?? 0),
  );
}

export function scryRunHasTasteRanking(run: ScryRun): boolean {
  return (
    run.sources.personalMemory.some((hit) => typeof hit.tasteScore === "number") ||
    run.sources.web.some((hit) => typeof hit.tasteScore === "number") ||
    run.sources.shadowMemory.some((hit) => typeof hit.tasteScore === "number")
  );
}

/**
 * Scry evidence contracts — typed lanes so archive / web / reading / shadow
 * never overwrite each other. Confidence is real or absent (never costume).
 */
import type { TasteSearchMatchReason } from "../lib/tasteIntelligence/tasteSearch.js";

export type ScryWhyMatched = TasteSearchMatchReason & {
  linkedFeatureLabels?: string[];
};

export type ResultStatus =
  | "success"
  | "partial"
  | "empty"
  | "failed"
  | "simulated"
  | "speculative";

export type ScryLaneId =
  | "personalMemory"
  | "web"
  | "generatedReading"
  | "shadowMemory";

export interface ProviderFailure {
  provider: string;
  lane: ScryLaneId | "trend" | "narrative";
  message: string;
  at: number;
}

export interface ResearchResult {
  id?: string;
  type?: string;
  title: string;
  snippet?: string;
  url?: string;
  relevance?: string;
  relevanceScore?: number;
  similarity?: number;
  display_image?: string;
  content_preview?: string;
  content?: { prompt?: string; title?: string; [key: string]: unknown };
  sourceLane: ScryLaneId;
  /** Present when Taste Intelligence reranking ran on this hit. */
  tasteScore?: number;
  whyMatched?: ScryWhyMatched;
}

export interface GeneratedReading {
  text: string;
  model?: string;
  via: "gateway" | "gemini" | "fallback";
}

export interface ResultEnvelope<T> {
  status: ResultStatus;
  data?: T;
  error?: string;
  model?: string;
  latencyMs?: number;
}

export interface ScryRun {
  id: string;
  query: string;
  /** Original user query before curiosity enrichment. */
  rawQuery?: string;
  curiosityIds?: string[];
  customCuriosity?: string;
  curiosityRecordId?: string;
  celestialEnabled?: boolean;
  startedAt: number;
  completedAt?: number;
  sources: {
    personalMemory: ResearchResult[];
    web: ResearchResult[];
    generatedReading?: GeneratedReading;
    shadowMemory: ResearchResult[];
  };
  laneStatus: Record<ScryLaneId, ResultStatus>;
  failures: ProviderFailure[];
  /** Present only when derived from real lane outcomes — never Math.random. */
  confidence?: {
    kind: "coverage";
    /** 0–1 fraction of lanes that returned success/partial with data */
    score: number;
    label: string;
  };
  latencyMs?: number;
  /** Web lane provider chain outcome — honest labeling for specimen feed. */
  webSourceMode?: "you.com" | "apify" | "gateway-synthesis" | "local-demo" | "gemini-search";
  webNotice?: string;
  /**
   * When shadow docs exist but sit in a different embedding width than the
   * current query (legacy Gemini vs Gateway OpenAI), Scry can offer reindex.
   */
  shadowIndexHint?: {
    needsReindex: boolean;
    incompatible: number;
    missingVector: number;
    /** Broken docs that have embeddable text (actionable re-index count). */
    reindexable: number;
    searchable: number;
    shadowDocs: number;
    referenceDims: number | null;
    referenceModel?: string | null;
  };
}

export interface TrendCluster {
  name: string;
  position: { x: number; y: number };
  historicalPrecedent: string;
  contradictoryAesthetic: string;
}

export interface TrendCurationMap {
  thesis: string;
  trendClusters: TrendCluster[];
  biaxialMapDescription: string;
  sources: { title: string; url: string }[];
  status: ResultStatus;
  model?: string;
}

export function createEmptyScryRun(query: string): ScryRun {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `scry-${Date.now()}`;
  return {
    id,
    query,
    startedAt: Date.now(),
    sources: {
      personalMemory: [],
      web: [],
      shadowMemory: [],
    },
    laneStatus: {
      personalMemory: "empty",
      web: "empty",
      generatedReading: "empty",
      shadowMemory: "empty",
    },
    failures: [],
  };
}

/** Coverage confidence from completed lane statuses — explainable, not random. */
export function assessScryCoverage(run: ScryRun): ScryRun["confidence"] {
  const lanes: ScryLaneId[] = [
    "personalMemory",
    "web",
    "generatedReading",
    "shadowMemory",
  ];
  const live = lanes.filter((lane) => {
    const status = run.laneStatus[lane];
    return status === "success" || status === "partial";
  }).length;
  if (live === 0) return undefined;
  const score = live / lanes.length;
  return {
    kind: "coverage",
    score,
    label: `${live} of ${lanes.length} evidence lanes returned`,
  };
}

/** Honest toast / status copy — never claim "complete" when no lane returned evidence. */
export function describeScryOutcome(run: ScryRun): string {
  if (run.confidence?.label) return run.confidence.label;
  const lanes: ScryLaneId[] = [
    "personalMemory",
    "web",
    "generatedReading",
    "shadowMemory",
  ];
  const failed = lanes.filter((lane) => run.laneStatus[lane] === "failed").length;
  if (failed > 0) {
    return `Scry finished — no live evidence (${failed} lane${failed === 1 ? "" : "s"} failed).`;
  }
  return "Scry finished — no evidence returned.";
}

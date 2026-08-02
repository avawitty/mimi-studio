/**
 * Scry orchestration — one ScryRun with four distinct evidence lanes.
 * Synthesis (reading / narrative) prefers AI Gateway via /api/mimi/generate-text.
 * Web / trend grounding keeps Gemini Google Search (gateway chat drops tools).
 */

import { auth } from "./firebaseInit";
import { searchGrounding } from "./searchService";
import { scryShadowMemory } from "./vectorSearch";
import {
  scryWebSignals,
  generateScribeReading,
  generateOracleResearch,
} from "./geminiService";
import type { UserProfile } from "../types";
import {
  assessScryCoverage,
  createEmptyScryRun,
  type GeneratedReading,
  type ResearchResult,
  type ResultStatus,
  type ScryRun,
  type TrendCurationMap,
} from "../schemas/scryContracts";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
    if (token) headers["x-user-token"] = `Bearer ${token}`;
  } catch {
    // anonymous / offline — funded gateway may still deny; we fall back
  }
  return headers;
}

/**
 * Plain-text synthesis through AI Gateway (funded or personal key).
 * Returns null when gateway is unavailable so callers can fall back.
 */
export async function generateViaGateway(options: {
  prompt: string;
  system?: string;
  role?: "textFast" | "textDeep";
  temperature?: number;
}): Promise<{ text: string; model: string } | null> {
  try {
    const res = await fetch("/api/mimi/generate-text", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        prompt: options.prompt,
        system: options.system,
        role: options.role ?? "textFast",
        temperature: options.temperature ?? 0.7,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; model?: string };
    if (!data.text?.trim()) return null;
    return { text: data.text.trim(), model: data.model || "gateway" };
  } catch {
    return null;
  }
}

function mapArchiveHits(raw: unknown[]): ResearchResult[] {
  return (raw || []).slice(0, 12).map((item: any, index) => ({
    id: item?.id || `archive-${index}`,
    type: item?.type || "archive",
    title: item?.title || item?.content?.title || item?.content?.prompt || "Archive specimen",
    snippet: item?.snippet || item?.content_preview || "",
    relevanceScore: item?.relevanceScore,
    content_preview: item?.content_preview,
    content: item?.content,
    display_image: item?.display_image,
    sourceLane: "personalMemory" as const,
  }));
}

function mapWebHits(raw: unknown[], groundingChunks: unknown[] = []): ResearchResult[] {
  const fromResults = (raw || []).slice(0, 12).map((item: any, index) => ({
    id: item?.url || `web-${index}`,
    type: "web",
    title: item?.title || "Web signal",
    snippet: item?.snippet || item?.relevance || "",
    url: item?.url,
    relevance: item?.relevance,
    sourceLane: "web" as const,
  }));
  const fromGrounding = (groundingChunks || []).slice(0, 8).map((chunk: any, index) => ({
    id: chunk?.web?.uri || `ground-${index}`,
    type: "grounding",
    title: chunk?.web?.title || "Grounded insight",
    snippet: chunk?.web?.title || "Grounded in live search",
    url: chunk?.web?.uri,
    sourceLane: "web" as const,
  }));
  const seen = new Set<string>();
  return [...fromResults, ...fromGrounding].filter((hit) => {
    const key = hit.url || hit.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapShadowHits(raw: unknown[]): ResearchResult[] {
  return (raw || []).slice(0, 12).map((item: any, index) => ({
    id: item?.id || `shadow-${index}`,
    type: item?.type || "shadow",
    title:
      item?.content?.prompt ||
      item?.title ||
      item?.content?.title ||
      "Shadow memory hit",
    snippet: item?.content_preview || item?.snippet || "",
    similarity: item?.similarity,
    display_image: item?.display_image,
    content_preview: item?.content_preview,
    content: item?.content,
    sourceLane: "shadowMemory" as const,
  }));
}

async function laneReading(
  profile: UserProfile | null,
  query: string,
  geminiKey?: string,
): Promise<{ reading?: GeneratedReading; status: ResultStatus; failure?: string }> {
  const draft = profile?.tailorDraft;
  const gateway = await generateViaGateway({
    role: "textFast",
    system:
      'You are "The Scribe", an editorial oracle for Mimi. Reply with one powerful paragraph only — poetic, specific to the query and aesthetic context. No JSON, no preamble.',
    prompt: `Aesthetic context: ${JSON.stringify({
      aestheticCore: draft?.positioningCore?.aestheticCore,
      narrativeVoice: draft?.expressionEngine?.narrativeVoice,
      tags: draft?.positioningCore?.aestheticCore?.tags?.slice?.(0, 8),
    }).slice(0, 1200)}\n\nQuery: ${query}`,
    temperature: 0.85,
  });
  if (gateway) {
    return {
      reading: { text: gateway.text, model: gateway.model, via: "gateway" },
      status: "success",
    };
  }

  try {
    const text = await generateScribeReading(profile, query, geminiKey);
    if (!text || text === "The mirror remains dark.") {
      return { status: "empty", failure: "Scribe returned no reading" };
    }
    return {
      reading: { text, via: "gemini" },
      status: "success",
    };
  } catch (err) {
    return {
      status: "failed",
      failure: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runSpecimenScry(options: {
  query: string;
  profile: UserProfile | null;
  geminiKey?: string;
  signal?: AbortSignal;
}): Promise<ScryRun> {
  const { query, profile, geminiKey } = options;
  const run = createEmptyScryRun(query);
  const started = performance.now();

  const settleLane = async <T>(
    lane: keyof ScryRun["laneStatus"],
    work: () => Promise<T>,
  ): Promise<{ ok: true; value: T } | { ok: false; error: string }> => {
    if (options.signal?.aborted) {
      return { ok: false, error: "Aborted" };
    }
    try {
      return { ok: true, value: await work() };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const [archiveSettled, webSettled, readingSettled, shadowSettled] =
    await Promise.all([
      settleLane("personalMemory", () => searchGrounding(query)),
      settleLane("web", () => scryWebSignals(query)),
      settleLane("generatedReading", () => laneReading(profile, query, geminiKey)),
      settleLane("shadowMemory", () => scryShadowMemory(query)),
    ]);

  if (archiveSettled.ok === true) {
    const data = archiveSettled.value as {
      results?: unknown[];
      summary?: string;
    };
    const hits = mapArchiveHits(data.results || []);
    run.sources.personalMemory = hits;
    run.laneStatus.personalMemory = hits.length > 0 ? "success" : "empty";
  } else {
    run.laneStatus.personalMemory = "failed";
    run.failures.push({
      provider: "searchGrounding",
      lane: "personalMemory",
      message: archiveSettled.ok === false ? archiveSettled.error : "Unknown archive failure",
      at: Date.now(),
    });
  }

  if (webSettled.ok === true) {
    const data = webSettled.value as {
      results?: unknown[];
      groundingChunks?: unknown[];
    };
    const hits = mapWebHits(data.results || [], data.groundingChunks || []);
    run.sources.web = hits;
    run.laneStatus.web = hits.length > 0 ? "success" : "empty";
  } else {
    run.laneStatus.web = "failed";
    run.failures.push({
      provider: "scryWebSignals",
      lane: "web",
      message: webSettled.ok === false ? webSettled.error : "Unknown web failure",
      at: Date.now(),
    });
  }

  if (readingSettled.ok === true) {
    const data = readingSettled.value as Awaited<ReturnType<typeof laneReading>>;
    run.laneStatus.generatedReading = data.status;
    if (data.reading) run.sources.generatedReading = data.reading;
    if (data.failure) {
      run.failures.push({
        provider: data.reading?.via || "scribe",
        lane: "generatedReading",
        message: data.failure,
        at: Date.now(),
      });
    }
  } else {
    run.laneStatus.generatedReading = "failed";
    run.failures.push({
      provider: "scribe",
      lane: "generatedReading",
      message: readingSettled.ok === false ? readingSettled.error : "Unknown reading failure",
      at: Date.now(),
    });
  }

  if (shadowSettled.ok === true) {
    const hits = mapShadowHits(shadowSettled.value as unknown[]);
    run.sources.shadowMemory = hits;
    run.laneStatus.shadowMemory = hits.length > 0 ? "success" : "empty";
  } else {
    run.laneStatus.shadowMemory = "failed";
    run.failures.push({
      provider: "scryShadowMemory",
      lane: "shadowMemory",
      message: shadowSettled.ok === false ? shadowSettled.error : "Unknown shadow failure",
      at: Date.now(),
    });
  }

  run.completedAt = Date.now();
  run.latencyMs = Math.floor(performance.now() - started);
  run.confidence = assessScryCoverage(run);
  return run;
}

export async function runTrendScry(options: {
  keyword: string;
  profile: UserProfile | null;
}): Promise<TrendCurationMap> {
  try {
    const researchData = await generateOracleResearch(options.keyword, options.profile);
    if (!researchData) {
      return {
        thesis: "",
        trendClusters: [],
        biaxialMapDescription: "",
        sources: [],
        status: "empty",
      };
    }
    return {
      thesis: researchData.thesis || "",
      trendClusters: researchData.trendClusters || [],
      biaxialMapDescription: researchData.biaxialMapDescription || "",
      sources: researchData.sources || [],
      status:
        (researchData.trendClusters?.length || 0) > 0 ? "success" : "partial",
      model: "gemini+search",
    };
  } catch (err) {
    return {
      thesis: "",
      trendClusters: [],
      biaxialMapDescription: "",
      sources: [],
      status: "failed",
      model: undefined,
    };
  }
}

export async function compileTrendNarrative(options: {
  keyword: string;
  curation: TrendCurationMap;
  profile: UserProfile | null;
}): Promise<{ draft: string; via: "gateway" | "local"; model?: string } | null> {
  const { keyword, curation, profile } = options;
  if (!curation.thesis && curation.trendClusters.length === 0) return null;

  const clusterLines = curation.trendClusters
    .map(
      (c) =>
        `- ${c.name}: ${c.historicalPrecedent} vs ${c.contradictoryAesthetic} @ (${c.position.x.toFixed(2)}, ${c.position.y.toFixed(2)})`,
    )
    .join("\n");

  const prompt = `Write an editorial zine draft (markdown) analyzing the trend "${keyword}".

Thesis: ${curation.thesis}
Map: ${curation.biaxialMapDescription}
Clusters:
${clusterLines}

Voice: chic, structural, specific — no generic AI praise. Include a short strategic takeaway.`;

  const gateway = await generateViaGateway({
    role: "textDeep",
    system:
      "You are Mimi Scribe. Produce polished markdown editorial drafts from evidence. Do not invent sources or URLs.",
    prompt,
    temperature: 0.75,
  });
  if (gateway) {
    return { draft: gateway.text, via: "gateway", model: gateway.model };
  }

  // Honest local scaffold from evidence only — labeled, not costume research.
  const local =
    `### ${keyword}\n\n` +
    `*Compiled locally — AI Gateway unavailable. ${new Date().toLocaleDateString()}*\n\n` +
    `**Thesis:** ${curation.thesis || "No thesis returned."}\n\n` +
    `**Clusters**\n${clusterLines || "- (none)"}\n\n` +
    `**Map:** ${curation.biaxialMapDescription || "—"}\n\n` +
    (profile?.tailorDraft?.expressionEngine?.narrativeVoice?.voiceNotes
      ? `_Voice note from Tailor: ${String(profile.tailorDraft.expressionEngine.narrativeVoice.voiceNotes).slice(0, 200)}_\n`
      : "");

  return { draft: local, via: "local" };
}

/**
 * Intel Hub adapter — reusable residue intelligence object + handoff helpers.
 * Does not rewrite IntelHub UI; produces structured objects Hub can store/open.
 */

import { z } from "zod";
import {
  createIntelProjectRun,
  updateIntelProjectRun,
  type IntelEvidenceItem,
  type IntelProjectRun,
} from "../../../lib/intelHubWorkflow";
import { adaptResidueToIntelligenceReport } from "./intelligenceReportAdapter";
import { toMeanMedianMode } from "./meanMedianModeAdapter";
import { createMemoryResidueStore } from "../storage/residueStore";
import type {
  CulturalResidueResult,
  EmotionalResidueResult,
  ResidueClaim,
} from "../validation";

export const RESIDUE_INTEL_HUB_KEY = "mimi_residue_intel_hub_runs";
export const RESIDUE_INTEL_HUB_CHANGED = "mimi:residue-intel-hub-changed";

export const residueIntelHubObjectSchema = z.object({
  version: z.literal(1),
  intelId: z.string().min(1),
  runId: z.string().min(1),
  mode: z.enum(["cultural", "emotional"]),
  topic: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  pinned: z.boolean(),
  schemaVersion: z.string(),
  promptVersion: z.string(),
  status: z.enum(["queued", "running", "partial", "complete", "failed"]),
  sourceCount: z.number().int().min(0),
  evidenceCount: z.number().int().min(0),
  claimCount: z.number().int().min(0),
  confidenceOverall: z.number().min(0).max(1),
  strongestEvidenceLayer: z.enum(["A", "B", "C", "D"]),
  tags: z.array(z.string()),
  summary: z.string(),
  usedContextCount: z.number().int().min(0),
  safetyNotice: z.string().optional(),
  /** Destination hints — consumers decide whether to open those modules. */
  availableOutputs: z.array(
    z.enum([
      "intelligence-report",
      "zine",
      "the-edit",
      "forecast",
      "mean-median-mode",
      "memory-atoms",
      "taste-graph",
    ]),
  ),
  /** Compact inspection indexes (full result stored separately / by runId). */
  sourceIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  claimIds: z.array(z.string()),
  pinnedFindingIds: z.array(z.string()).default([]),
});

export type ResidueIntelHubObject = z.infer<typeof residueIntelHubObjectSchema>;

export type ResidueHubSource = CulturalResidueResult | EmotionalResidueResult;

export function adaptResidueToIntelHubObject(
  result: ResidueHubSource,
  options?: { intelId?: string; pinned?: boolean; pinnedFindingIds?: string[] },
): ResidueIntelHubObject {
  const isCultural = result.metadata.mode === "cultural";
  const cultural = result as CulturalResidueResult;
  const emotional = result as EmotionalResidueResult;
  const topic = isCultural ? cultural.query : emotional.normalizedExperience;
  const claims = collectClaims(result);
  const now = new Date().toISOString();

  return residueIntelHubObjectSchema.parse({
    version: 1,
    intelId: options?.intelId ?? `intel_${result.metadata.runId}`,
    runId: result.metadata.runId,
    mode: result.metadata.mode,
    topic,
    title: isCultural
      ? `Cultural Residue · ${cultural.query}`
      : `Emotional Residue · interpretive map`,
    createdAt: result.metadata.createdAt,
    updatedAt: now,
    pinned: options?.pinned ?? false,
    schemaVersion: result.metadata.schemaVersion,
    promptVersion: result.metadata.promptVersion,
    status: result.metadata.status ?? "complete",
    sourceCount: result.sources.length,
    evidenceCount: result.evidence.length,
    claimCount: claims.length,
    confidenceOverall: result.confidenceSummary.overallConfidence,
    strongestEvidenceLayer: result.confidenceSummary.strongestEvidenceLayer,
    tags: [
      result.metadata.mode,
      `layer-${result.confidenceSummary.strongestEvidenceLayer}`,
      ...(isCultural
        ? cultural.culturalCodes.slice(0, 3).map((c) => c.category)
        : emotional.interpretiveNeighborhoods.slice(0, 3).map((n) => n.label)),
    ],
    summary: isCultural
      ? cultural.definition.statement
      : emotional.interpretiveNeighborhoods
          .slice(0, 2)
          .map((n) => n.label)
          .join(" · ") || emotional.safetyNotice,
    usedContextCount: result.usedContext.length,
    safetyNotice: isCultural ? undefined : emotional.safetyNotice,
    availableOutputs: [
      "intelligence-report",
      "mean-median-mode",
      "zine",
      "the-edit",
      "forecast",
      "memory-atoms",
      "taste-graph",
    ],
    sourceIds: result.sources.map((s) => s.sourceId),
    evidenceIds: result.evidence.map((e) => e.evidenceId),
    claimIds: claims.map((c) => c.claimId),
    pinnedFindingIds: options?.pinnedFindingIds ?? [],
  });
}

export function filterResidueIntelHubObjects(
  items: ResidueIntelHubObject[],
  filters?: { mode?: "cultural" | "emotional"; topicIncludes?: string; pinnedOnly?: boolean },
): ResidueIntelHubObject[] {
  return items.filter((item) => {
    if (filters?.mode && item.mode !== filters.mode) return false;
    if (filters?.pinnedOnly && !item.pinned) return false;
    if (
      filters?.topicIncludes &&
      !item.topic.toLowerCase().includes(filters.topicIncludes.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

export function pinFindingOnIntelObject(
  item: ResidueIntelHubObject,
  findingId: string,
): ResidueIntelHubObject {
  const pinnedFindingIds = item.pinnedFindingIds.includes(findingId)
    ? item.pinnedFindingIds
    : [...item.pinnedFindingIds, findingId];
  return residueIntelHubObjectSchema.parse({
    ...item,
    pinned: true,
    pinnedFindingIds,
    updatedAt: new Date().toISOString(),
  });
}

/** Map residue evidence/claims into existing IntelEvidenceItem shape for Hub review lists. */
export function residueToIntelEvidenceItems(result: ResidueHubSource): IntelEvidenceItem[] {
  const items: IntelEvidenceItem[] = result.evidence.map((e) => ({
    id: e.evidenceId,
    kind: e.evidenceLayer === "D" ? "inference" : "evidence",
    title: e.claimSupported.slice(0, 80),
    content: e.excerpt || e.claimSupported,
    source: e.sourceId,
    confidence: e.relevanceScore,
    tags: [e.evidenceLayer, e.evidenceStrength, result.metadata.mode],
  }));

  for (const claim of collectClaims(result)) {
    items.push({
      id: claim.claimId,
      kind: claim.status === "observed" || claim.status === "reported" ? "evidence" : "inference",
      title: claim.statement.slice(0, 80),
      content: claim.statement,
      source: claim.evidenceIds[0] || "unattached",
      confidence: claim.confidence,
      tags: [claim.status, result.metadata.mode, ...claim.evidenceLayers],
    });
  }
  return items;
}

/**
 * Bridge into the existing Intel project-run shape without replacing Hub UI.
 * Residue-specific details remain in ResidueIntelHubObject / report adapters.
 */
export function createIntelProjectRunFromResidue(
  result: ResidueHubSource,
  now = Date.now(),
): IntelProjectRun {
  const topic =
    result.metadata.mode === "cultural"
      ? (result as CulturalResidueResult).query
      : "Emotional Residue";
  const base = createIntelProjectRun(`Residue · ${topic}`, result.evidence.length, now);
  return updateIntelProjectRun(
    base,
    {
      sourceUrl: result.sources.find((s) => s.url)?.url,
      selectedReviewCount: 0,
      approvedContextCount: result.usedContext.filter((u) => u.usage === "evidence").length,
      reusableRuleCount: result.metadata.mode === "cultural"
        ? (result as CulturalResidueResult).culturalCodes.length
        : (result as EmotionalResidueResult).interpretiveNeighborhoods.length,
      artifactPackId: result.metadata.runId,
      pressStatus: "not_started",
    },
    now,
  );
}

export function buildResidueHubBundle(result: ResidueHubSource) {
  const intel = adaptResidueToIntelHubObject(result);
  const report = adaptResidueToIntelligenceReport(result);
  const meanMedianMode = toMeanMedianMode(result);
  const projectRun = createIntelProjectRunFromResidue(result);
  const evidenceItems = residueToIntelEvidenceItems(result);
  return { intel, report, meanMedianMode, projectRun, evidenceItems };
}

/** In-memory / localStorage registry for residue intel objects (Hub history). */
export function createResidueIntelHubRegistry(storage?: StorageLike) {
  const mem = new Map<string, ResidueIntelHubObject>();
  const results = new Map<string, ResidueHubSource>();

  const readAll = (): ResidueIntelHubObject[] => {
    if (!storage) return [...mem.values()];
    try {
      const raw = storage.getItem(RESIDUE_INTEL_HUB_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ResidueIntelHubObject[];
      return parsed.map((p) => residueIntelHubObjectSchema.parse(p));
    } catch {
      return [];
    }
  };

  const writeAll = (items: ResidueIntelHubObject[]) => {
    if (!storage) {
      mem.clear();
      for (const item of items) mem.set(item.intelId, item);
      return;
    }
    storage.setItem(RESIDUE_INTEL_HUB_KEY, JSON.stringify(items));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(RESIDUE_INTEL_HUB_CHANGED));
    }
  };

  return {
    save(result: ResidueHubSource, opts?: { pinned?: boolean }) {
      const intel = adaptResidueToIntelHubObject(result, { pinned: opts?.pinned });
      const all = readAll().filter((x) => x.intelId !== intel.intelId);
      all.unshift(intel);
      writeAll(all);
      results.set(result.metadata.runId, result);
      return intel;
    },
    list(filters?: Parameters<typeof filterResidueIntelHubObjects>[1]) {
      return filterResidueIntelHubObjects(readAll(), filters);
    },
    get(intelId: string) {
      return readAll().find((x) => x.intelId === intelId) ?? null;
    },
    getResult(runId: string) {
      return results.get(runId) ?? null;
    },
    pinFinding(intelId: string, findingId: string) {
      const all = readAll();
      const idx = all.findIndex((x) => x.intelId === intelId);
      if (idx < 0) return null;
      all[idx] = pinFindingOnIntelObject(all[idx], findingId);
      writeAll(all);
      return all[idx];
    },
    compare(intelIdA: string, intelIdB: string) {
      const a = readAll().find((x) => x.intelId === intelIdA);
      const b = readAll().find((x) => x.intelId === intelIdB);
      if (!a || !b) return null;
      return {
        modes: [a.mode, b.mode],
        topics: [a.topic, b.topic],
        confidenceDelta: a.confidenceOverall - b.confidenceOverall,
        sourceCountDelta: a.sourceCount - b.sourceCount,
        evidenceCountDelta: a.evidenceCount - b.evidenceCount,
        sharedSourceIds: a.sourceIds.filter((id) => b.sourceIds.includes(id)),
        schemaVersions: [a.schemaVersion, b.schemaVersion],
        promptVersions: [a.promptVersion, b.promptVersion],
      };
    },
  };
}

/** Persist report artifact beside a run without deleting the run on artifact delete. */
export async function persistReportArtifactForRun(input: {
  ownerUid: string;
  result: ResidueHubSource;
  store?: ReturnType<typeof createMemoryResidueStore>;
}) {
  const store = input.store ?? createMemoryResidueStore();
  const report = adaptResidueToIntelligenceReport(input.result);
  await store.saveArtifact(input.ownerUid, {
    artifactId: report.reportId,
    runId: input.result.metadata.runId,
    kind: "intelligence-report",
    payload: report,
  });
  return report;
}

function collectClaims(result: ResidueHubSource): ResidueClaim[] {
  if (result.metadata.mode === "cultural") {
    const c = result as CulturalResidueResult;
    return [
      c.definition,
      ...c.origins,
      ...c.descendants,
      ...c.survivingMeanings,
      ...c.lostMeanings,
      ...c.computationallyIntroducedMeanings,
      ...c.commercialAbsorption,
      ...c.counterSignals,
    ];
  }
  const e = result as EmotionalResidueResult;
  return [
    ...e.neighboringFeelings,
    ...e.commonTriggers,
    ...e.commonInterpretations,
    ...e.alternativeInterpretations,
    ...e.communityPatterns,
    ...e.cognitivePatterns,
    ...e.therapeuticModels,
  ];
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

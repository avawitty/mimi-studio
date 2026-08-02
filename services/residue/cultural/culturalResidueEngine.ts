/**
 * Cultural Residue Engine — Phase 3 staged pipeline.
 *
 * Offline-first (deterministic heuristics) for CI / verify, matching the
 * mimi.rip thin-slice pattern. Optional AI Gateway enrichment via
 * generateGatewayObject when llm.apiKey is provided.
 */

import { ManualSourceProvider } from "../acquisition/providers/manualSourceProvider";
import {
  RESIDUE_PROMPT_VERSION,
  RESIDUE_SCHEMA_VERSION,
} from "../constants";
import {
  culturalNormalizeLlmSchema,
  culturalEvidenceLlmSchema,
  culturalSynthesisLlmSchema,
  generateResidueObject,
  type ResidueLlmOptions,
} from "../llm";
import {
  buildSourceManifest,
  buildUsedContext,
  createRunMetadata,
  hashResidueInput,
} from "../provenance";
import {
  buildCulturalNormalizePrompt,
  buildCulturalEvidencePrompt,
  buildCulturalSynthesisPrompt,
  CULTURAL_RESIDUE_SYSTEM_PROMPT,
} from "../prompts/culturalResiduePrompt";
import {
  buildConfidenceSummary,
  claimConfidenceFromEvidence,
  sourceQualityScore,
} from "../scoring";
import { extractEvidenceOffline } from "../shared/extractEvidence";
import { normalizeSources } from "../shared/normalizeSources";
import type { PipelinePartialState, PipelineStageError } from "../types";
import { flagsForClaim } from "../uncertainty";
import {
  culturalResidueInputSchema,
  culturalResidueResultSchema,
  type CulturalResidueInput,
  type CulturalResidueResult,
  type EvidenceRecord,
  type ResidueClaim,
  type SourceReference,
} from "../validation";
import {
  buildCulturalLineageOffline,
  detectCommercialAbsorptionOffline,
  detectComputationalResidueOffline,
  detectCulturalCodesOffline,
  detectLostAndSurvivingMeaningOffline,
  findCounterSignalsOffline,
  generateAssociationsOffline,
} from "./culturalHeuristics";

export interface CulturalResidueRunOptions {
  runId?: string;
  llm?: ResidueLlmOptions;
  /** Pre-normalized sources (skips URL acquisition). */
  sources?: SourceReference[];
  now?: string;
}

export interface CulturalResidueEngineOutput {
  result: CulturalResidueResult;
  partial: PipelinePartialState;
  sourceManifest: ReturnType<typeof buildSourceManifest>;
  usedLlm: boolean;
}

export async function runCulturalResidue(
  rawInput: CulturalResidueInput,
  options: CulturalResidueRunOptions = {},
): Promise<CulturalResidueEngineOutput> {
  const input = culturalResidueInputSchema.parse(rawInput);
  const now = options.now ?? new Date().toISOString();
  const runId = options.runId ?? `residue_cultural_${Date.now().toString(36)}`;
  const completedStages: PipelinePartialState["completedStages"] = [];
  const failedStages: PipelineStageError[] = [];
  const warnings: string[] = [];
  let usedLlm = false;
  let modelName: string | undefined;

  // 1) Normalize inquiry (optional LLM)
  let normalizedQuery = input.query.trim();
  const normalizeLlm = await generateResidueObject({
    schema: culturalNormalizeLlmSchema,
    system: CULTURAL_RESIDUE_SYSTEM_PROMPT,
    prompt: buildCulturalNormalizePrompt({
      query: input.query,
      researchQuestion: input.researchQuestion,
      userNotes: input.userNotes,
      sourceUrls: input.sourceUrls,
    }),
    llm: options.llm,
  });
  if (normalizeLlm.object) {
    normalizedQuery = normalizeLlm.object.normalizedQuery;
    usedLlm = true;
    modelName = normalizeLlm.model;
    warnings.push(...normalizeLlm.object.warnings);
    completedStages.push("normalize-inquiry");
  } else {
    completedStages.push("normalize-inquiry");
    if (normalizeLlm.error) {
      failedStages.push({
        stageId: "normalize-inquiry",
        message: "LLM normalize failed; using raw query.",
        recoverable: true,
        detail: normalizeLlm.error,
      });
    }
  }

  // 2) Acquire / normalize sources
  let acquiredSources = options.sources;
  if (!acquiredSources) {
    const manual = new ManualSourceProvider();
    const acquisition = await manual.acquire({
      inquiry: normalizedQuery,
      mode: "cultural",
      sourceUrls: input.sourceUrls,
      maxItems: input.analysisDepth === "deep" ? 40 : input.analysisDepth === "quick" ? 10 : 25,
    });
    warnings.push(...acquisition.warnings);
    acquiredSources = normalizeSources({
      acquired: acquisition.sources,
      sourceUrls: undefined,
      userNotes: input.userNotes,
      accessedAt: now,
    });
  } else if (input.userNotes?.length) {
    acquiredSources = [
      ...acquiredSources,
      ...normalizeSources({ userNotes: input.userNotes, accessedAt: now }),
    ];
  }
  completedStages.push("normalize-sources");

  // 3) Evidence extraction
  let evidence = extractEvidenceOffline({
    query: normalizedQuery,
    sources: acquiredSources,
  });
  const evidenceLlm = await generateResidueObject({
    schema: culturalEvidenceLlmSchema,
    system: CULTURAL_RESIDUE_SYSTEM_PROMPT,
    prompt: buildCulturalEvidencePrompt({
      query: normalizedQuery,
      sourcesBlock: acquiredSources
        .map((s) => `[${s.sourceId}] (${s.sourceType}) ${s.title || ""} :: ${s.excerpt || ""}`)
        .join("\n"),
    }),
    llm: options.llm,
  });
  if (evidenceLlm.object?.evidence?.length) {
    usedLlm = true;
    modelName = evidenceLlm.model || modelName;
    const byId = new Map(acquiredSources.map((s) => [s.sourceId, s]));
    const llmEvidence: EvidenceRecord[] = [];
    for (const [index, row] of evidenceLlm.object.evidence.entries()) {
      const source = byId.get(row.sourceId);
      if (!source) {
        warnings.push(`Dropped LLM evidence with unknown sourceId ${row.sourceId}`);
        continue;
      }
      llmEvidence.push({
        evidenceId: `ev_llm_${index}`,
        sourceId: row.sourceId,
        claimSupported: row.claimSupported,
        excerpt: row.excerpt,
        evidenceStrength: row.evidenceStrength,
        sourceQualityScore: sourceQualityScoreFor(source, row.evidenceStrength),
        relevanceScore: row.relevanceScore,
        limitations: row.limitations,
        evidenceLayer: source.evidenceLayer || "B",
      });
    }
    if (llmEvidence.length) evidence = llmEvidence;
    completedStages.push("extract-evidence");
  } else {
    completedStages.push("extract-evidence");
    if (evidenceLlm.error) {
      failedStages.push({
        stageId: "extract-evidence",
        message: "LLM evidence extraction failed; using offline extractor.",
        recoverable: true,
        detail: evidenceLlm.error,
      });
    }
  }

  // 4–8) Cultural synthesis (offline baseline, optional LLM overlay)
  let lineage = buildCulturalLineageOffline({ query: normalizedQuery, evidence });
  let culturalCodes = detectCulturalCodesOffline({ query: normalizedQuery, evidence });
  let associations = generateAssociationsOffline({ query: normalizedQuery, evidence });
  let commercialAbsorption = detectCommercialAbsorptionOffline(evidence);
  let computationallyIntroducedMeanings = detectComputationalResidueOffline(evidence);
  const meaning = detectLostAndSurvivingMeaningOffline({ query: normalizedQuery, evidence });
  let survivingMeanings = meaning.surviving;
  let lostMeanings = meaning.lost;
  let counterSignals = findCounterSignalsOffline(evidence);
  let descendants: ResidueClaim[] = [];
  let origins: ResidueClaim[] = [];
  let evidenceGaps = [
    evidence.length === 0 ? "No extractable evidence in the provided corpus." : "",
    acquiredSources.every((s) => s.sourceType === "user-note")
      ? "Corpus is user-note heavy; add journalism/archive sources for chronology."
      : "",
  ].filter(Boolean);

  let definition = makeDefinitionClaim(normalizedQuery, evidence);

  const synthesisLlm = await generateResidueObject({
    schema: culturalSynthesisLlmSchema,
    system: CULTURAL_RESIDUE_SYSTEM_PROMPT,
    prompt: buildCulturalSynthesisPrompt({
      query: normalizedQuery,
      researchQuestion: input.researchQuestion,
      evidenceBlock: evidence
        .map((e) => `[${e.evidenceId}] src=${e.sourceId} :: ${e.claimSupported}`)
        .join("\n"),
    }),
    llm: options.llm,
  });

  if (synthesisLlm.object) {
    usedLlm = true;
    modelName = synthesisLlm.model || modelName;
    const syn = synthesisLlm.object;
    definition = claimFromText({
      claimId: "claim_definition",
      statement: syn.definition,
      status: evidence.length ? "interpretive" : "model-proposed",
      evidence,
    });
    origins = syn.origins.map((statement, i) =>
      claimFromText({
        claimId: `claim_origin_${i}`,
        statement,
        status: "historical",
        evidence,
      }),
    );
    lineage = syn.lineage.map((row, i) => ({
      stageId: `lineage_llm_${i}`,
      label: row.label,
      stage: row.stage,
      startYear: row.startYear,
      endYear: row.endYear,
      description: row.description,
      evidenceIds: evidenceIdsForSourceIds(row.evidenceSourceIds, evidence),
      confidence: row.confidence,
    }));
    culturalCodes = syn.culturalCodes.map((row, i) => ({
      codeId: `code_llm_${i}`,
      category: row.category,
      label: row.label,
      description: row.description,
      evidenceIds: evidenceIdsForSourceIds(row.evidenceSourceIds, evidence),
      confidence: row.confidence,
    }));
    descendants = syn.descendants.map((statement, i) =>
      claimFromText({
        claimId: `claim_desc_${i}`,
        statement,
        status: "interpretive",
        evidence,
      }),
    );
    survivingMeanings = syn.survivingMeanings.map((statement, i) =>
      claimFromText({
        claimId: `claim_surv_${i}`,
        statement,
        status: "interpretive",
        evidence,
      }),
    );
    lostMeanings = syn.lostMeanings.map((statement, i) =>
      claimFromText({
        claimId: `claim_lost_${i}`,
        statement,
        status: statement.toLowerCase().includes("model") ? "model-proposed" : "interpretive",
        evidence,
      }),
    );
    computationallyIntroducedMeanings = syn.computationallyIntroducedMeanings.map((statement, i) =>
      claimFromText({
        claimId: `claim_comp_${i}`,
        statement,
        status: "model-proposed",
        evidence,
      }),
    );
    commercialAbsorption = syn.commercialAbsorption.map((statement, i) =>
      claimFromText({
        claimId: `claim_comm_${i}`,
        statement,
        status: "interpretive",
        evidence,
      }),
    );
    counterSignals = syn.counterSignals.map((statement, i) =>
      claimFromText({
        claimId: `claim_counter_${i}`,
        statement,
        status: /no clear|not found/i.test(statement) ? "model-proposed" : "reported",
        evidence,
      }),
    );
    associations = syn.associations.map((row, i) => ({
      associationId: `assoc_llm_${i}`,
      originNodeId: row.origin,
      targetNodeId: row.target,
      relationship: row.relationship,
      description: row.description,
      evidenceIds: evidenceIdsForSourceIds(row.evidenceSourceIds, evidence),
      confidence: row.status === "model-proposed" ? Math.min(row.confidence, 0.35) : row.confidence,
      status: row.evidenceSourceIds.length === 0 ? "model-proposed" : row.status,
    }));
    evidenceGaps = syn.evidenceGaps;
    completedStages.push(
      "generate-associations",
      "label-claim-status",
      "find-counter-signals",
      "group-findings",
      "synthesize",
    );
  } else {
    completedStages.push(
      "generate-associations",
      "label-claim-status",
      "find-counter-signals",
      "group-findings",
      "synthesize",
    );
    if (synthesisLlm.error) {
      failedStages.push({
        stageId: "synthesize",
        message: "LLM synthesis failed; using offline cultural heuristics.",
        recoverable: true,
        detail: synthesisLlm.error,
      });
    } else if (!options.llm?.apiKey || options.llm.offline) {
      warnings.push("Offline cultural heuristics used (no AI Gateway key / offline mode).");
    }
  }

  const confidenceSummary = buildConfidenceSummary({
    evidence,
    sources: acquiredSources,
    primaryClaims: [definition, ...origins, ...survivingMeanings],
    counterClaims: counterSignals.filter((c) => c.status !== "model-proposed" || c.evidenceIds.length > 0),
  });
  completedStages.push("calibrate-confidence");

  const usedContext = buildUsedContext({
    sources: acquiredSources,
    evidence,
    counterEvidenceIds: counterSignals.flatMap((c) => c.evidenceIds),
    userNotes: input.userNotes,
  });
  completedStages.push("validate");

  const metadata = createRunMetadata({
    runId,
    mode: "cultural",
    inputHash: hashResidueInput([
      normalizedQuery,
      input.researchQuestion,
      input.sourceUrls,
      input.userNotes,
      RESIDUE_SCHEMA_VERSION,
      RESIDUE_PROMPT_VERSION,
    ]),
    sourceCount: acquiredSources.length,
    warnings: [
      ...warnings,
      ...(failedStages.length
        ? [`Partial pipeline: ${failedStages.map((f) => f.stageId).join(", ")}`]
        : []),
    ],
    model: modelName,
    createdAt: now,
    status: failedStages.length ? "partial" : "complete",
    retention: input.retention,
    consentToStore: input.consentToStore,
  });

  const result = culturalResidueResultSchema.parse({
    metadata,
    query: normalizedQuery,
    definition,
    origins,
    lineage,
    descendants,
    culturalCodes,
    associations,
    survivingMeanings,
    lostMeanings,
    computationallyIntroducedMeanings,
    commercialAbsorption,
    counterSignals,
    evidence,
    sources: acquiredSources,
    usedContext,
    confidenceSummary,
    evidenceGaps,
  });
  completedStages.push("persist");

  return {
    result,
    partial: { completedStages, failedStages, warnings: result.metadata.warnings },
    sourceManifest: buildSourceManifest(acquiredSources),
    usedLlm,
  };
}

function makeDefinitionClaim(query: string, evidence: EvidenceRecord[]): ResidueClaim {
  return claimFromText({
    claimId: "claim_definition",
    statement: evidence.length
      ? `"${query}" denotes a circulating cultural formation described across the available source corpus.`
      : `"${query}" is queued for cultural residue mapping, but the corpus lacks extractable evidence.`,
    status: evidence.length ? "interpretive" : "model-proposed",
    evidence,
  });
}

function claimFromText(input: {
  claimId: string;
  statement: string;
  status: ResidueClaim["status"];
  evidence: EvidenceRecord[];
}): ResidueClaim {
  // Prefer evidence that lexically overlaps the statement; else keep status honesty.
  const overlapped = input.evidence.filter((e) =>
    input.statement.toLowerCase().split(/\s+/).some((token) => token.length > 4 && e.claimSupported.toLowerCase().includes(token)),
  );
  const evid = overlapped.length ? overlapped.slice(0, 4) : input.status === "model-proposed" ? [] : input.evidence.slice(0, 2);
  const status = evid.length === 0 ? "model-proposed" : input.status;
  return {
    claimId: input.claimId,
    statement: input.statement,
    status,
    evidenceIds: evid.map((e) => e.evidenceId),
    counterEvidenceIds: [],
    confidence: claimConfidenceFromEvidence(evid, status),
    uncertaintyFlags: flagsForClaim({ status, evidence: evid }),
    evidenceLayers: [...new Set(evid.map((e) => e.evidenceLayer))],
  };
}

function evidenceIdsForSourceIds(sourceIds: string[], evidence: EvidenceRecord[]): string[] {
  const set = new Set(sourceIds);
  const ids = evidence.filter((e) => set.has(e.sourceId)).map((e) => e.evidenceId);
  return ids.length ? ids : evidence.slice(0, 1).map((e) => e.evidenceId);
}

function sourceQualityScoreFor(
  source: SourceReference,
  strength: EvidenceRecord["evidenceStrength"],
): number {
  return sourceQualityScore(source.sourceType, strength);
}

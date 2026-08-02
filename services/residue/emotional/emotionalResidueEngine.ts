/**
 * Emotional Residue Engine — Phase 4 staged pipeline.
 *
 * Offline-first computational phenomenology. Optional AI Gateway enrichment.
 * Non-diagnostic: multiple neighborhoods, research ≠ community, safety notice.
 */

import { acquireResidueSources } from "../acquisition/composeAcquisition";
import type { SourceAcquisitionProvider } from "../acquisition/SourceAcquisitionProvider";
import {
  EMOTIONAL_SAFETY_NOTICE,
  RESIDUE_PROMPT_VERSION,
  RESIDUE_SCHEMA_VERSION,
} from "../constants";
import {
  emotionalEvidenceLlmSchema,
  emotionalNormalizeLlmSchema,
  emotionalSynthesisLlmSchema,
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
  buildEmotionalEvidencePrompt,
  buildEmotionalNormalizePrompt,
  buildEmotionalSynthesisPrompt,
  EMOTIONAL_RESIDUE_SYSTEM_PROMPT,
} from "../prompts/emotionalResiduePrompt";
import {
  buildConfidenceSummary,
  claimConfidenceFromEvidence,
  sourceQualityScore,
} from "../scoring";
import { extractEvidenceOffline } from "../shared/extractEvidence";
import { normalizeSources } from "../shared/normalizeSources";
import type { PipelinePartialState, PipelineStageError } from "../types";
import {
  collectRunUncertaintyFlags,
  flagsForClaim,
  redactSensitiveText,
  sanitizeEmotionalStatement,
} from "../uncertainty";
import {
  emotionalResidueInputSchema,
  emotionalResidueResultSchema,
  type EmotionalResidueInput,
  type EmotionalResidueResult,
  type EvidenceRecord,
  type InterpretiveNeighborhood,
  type ReportedResponsePattern,
  type ResidueClaim,
  type SourceReference,
} from "../validation";
import {
  buildInterpretiveNeighborhoodsOffline,
  classifyReportedResponsesOffline,
  mapTypicalClaimBucketsOffline,
  normalizeExperienceOffline,
  separateResearchFromCommunityReports,
} from "./emotionalHeuristics";
import { emotionalSafetyNotice } from "./emotionalSafety";

export interface EmotionalResidueRunOptions {
  runId?: string;
  llm?: ResidueLlmOptions;
  sources?: SourceReference[];
  /** When true and APIFY_TOKEN is available (Node), merge Apify-acquired sources. */
  useApify?: boolean;
  /** Injectable Apify provider (tests / custom clients). */
  apifyProvider?: SourceAcquisitionProvider;
  now?: string;
}

export interface EmotionalResidueEngineOutput {
  result: EmotionalResidueResult;
  partial: PipelinePartialState;
  sourceManifest: ReturnType<typeof buildSourceManifest>;
  usedLlm: boolean;
}

export async function runEmotionalResidue(
  rawInput: EmotionalResidueInput,
  options: EmotionalResidueRunOptions = {},
): Promise<EmotionalResidueEngineOutput> {
  const input = emotionalResidueInputSchema.parse(rawInput);
  const now = options.now ?? new Date().toISOString();
  const runId = options.runId ?? `residue_emotional_${Date.now().toString(36)}`;
  const completedStages: PipelinePartialState["completedStages"] = [];
  const failedStages: PipelineStageError[] = [];
  const warnings: string[] = [];
  let usedLlm = false;
  let modelName: string | undefined;

  let normalizedExperience = normalizeExperienceOffline(input.experience);
  const normalizeLlm = await generateResidueObject({
    schema: emotionalNormalizeLlmSchema,
    system: EMOTIONAL_RESIDUE_SYSTEM_PROMPT,
    prompt: buildEmotionalNormalizePrompt({
      experience: input.experience,
      userNotes: input.userNotes,
    }),
    llm: options.llm,
  });
  if (normalizeLlm.object) {
    usedLlm = true;
    modelName = normalizeLlm.model;
    normalizedExperience = sanitizeEmotionalStatement(
      normalizeLlm.object.normalizedExperience,
    );
    warnings.push(...normalizeLlm.object.warnings);
  } else if (normalizeLlm.error) {
    failedStages.push({
      stageId: "normalize-inquiry",
      message: "LLM normalize failed; using offline normalization.",
      recoverable: true,
      detail: normalizeLlm.error,
    });
  }
  completedStages.push("normalize-inquiry");

  let sources = options.sources;
  if (!sources) {
    const acquisition = await acquireResidueSources({
      // Do not send raw emotional text to external acquisition providers.
      inquiry: redactSensitiveText(input.experience, 0),
      mode: "emotional",
      sourceUrls: input.sourceUrls,
      userNotes: input.userNotes,
      maxItems: input.analysisDepth === "deep" ? 40 : input.analysisDepth === "quick" ? 10 : 25,
      useApify: options.useApify,
      apifyProvider: options.apifyProvider,
      now,
    });
    warnings.push(...acquisition.warnings);
    sources = acquisition.sources;
  } else if (input.userNotes?.length) {
    sources = [
      ...sources,
      ...normalizeSources({ userNotes: input.userNotes, accessedAt: now }),
    ];
  }

  // Filter by include flags
  sources = sources.filter((s) => {
    const layer = s.evidenceLayer || "C";
    if (!input.includeResearchSources && layer === "A") return false;
    if (!input.includeCommunitySources && layer === "C") return false;
    if (
      !input.includeMemoirAndLiterature &&
      (s.sourceType === "memoir" || s.sourceType === "literature" || s.sourceType === "philosophy")
    ) {
      return false;
    }
    return true;
  });
  completedStages.push("normalize-sources");

  let evidence = extractEvidenceOffline({
    query: normalizedExperience,
    sources,
  }).map((e) => ({
    ...e,
    claimSupported: sanitizeEmotionalStatement(e.claimSupported),
    limitations: [
      ...e.limitations,
      e.evidenceLayer === "C"
        ? "Community-reported experience language — not objective proof about a person."
        : "",
    ].filter(Boolean),
  }));

  const evidenceLlm = await generateResidueObject({
    schema: emotionalEvidenceLlmSchema,
    system: EMOTIONAL_RESIDUE_SYSTEM_PROMPT,
    prompt: buildEmotionalEvidencePrompt({
      experience: normalizedExperience,
      sourcesBlock: sources
        .map((s) => `[${s.sourceId}] (${s.sourceType}/${s.evidenceLayer}) ${s.excerpt || s.title || ""}`)
        .join("\n"),
    }),
    llm: options.llm,
  });
  if (evidenceLlm.object?.evidence?.length) {
    usedLlm = true;
    modelName = evidenceLlm.model || modelName;
    const byId = new Map(sources.map((s) => [s.sourceId, s]));
    const llmEvidence: EvidenceRecord[] = [];
    for (const [index, row] of evidenceLlm.object.evidence.entries()) {
      const source = byId.get(row.sourceId);
      if (!source) {
        warnings.push(`Dropped LLM evidence with unknown sourceId ${row.sourceId}`);
        continue;
      }
      llmEvidence.push({
        evidenceId: `ev_em_llm_${index}`,
        sourceId: row.sourceId,
        claimSupported: sanitizeEmotionalStatement(row.claimSupported),
        excerpt: row.excerpt,
        evidenceStrength: row.evidenceStrength,
        sourceQualityScore: sourceQualityScore(source.sourceType, row.evidenceStrength),
        relevanceScore: row.relevanceScore,
        limitations: row.limitations,
        evidenceLayer: source.evidenceLayer || "C",
      });
    }
    if (llmEvidence.length) evidence = llmEvidence;
  } else if (evidenceLlm.error) {
    failedStages.push({
      stageId: "extract-evidence",
      message: "LLM evidence extraction failed; using offline extractor.",
      recoverable: true,
      detail: evidenceLlm.error,
    });
  }
  completedStages.push("extract-evidence");

  const separated = separateResearchFromCommunityReports({ sources, evidence });
  let neighborhoods = buildInterpretiveNeighborhoodsOffline({
    experience: normalizedExperience,
    evidence,
    researchEvidence: separated.researchEvidence,
    communityEvidence: separated.communityEvidence,
  });
  let responses = classifyReportedResponsesOffline({
    evidence,
    researchEvidence: separated.researchEvidence,
    communityEvidence: separated.communityEvidence,
  });
  let buckets = mapTypicalClaimBucketsOffline({
    experience: normalizedExperience,
    evidence,
    researchEvidence: separated.researchEvidence,
    communityEvidence: separated.communityEvidence,
  });
  let evidenceGaps = [
    evidence.length === 0 ? "No extractable evidence in the provided corpus." : "",
    separated.researchEvidence.length === 0
      ? "No Layer A research sources in corpus — neighborhoods lean descriptive/community."
      : "",
    separated.communityEvidence.length === 0
      ? "No community-report sources — internet expression patterns may be thin."
      : "",
  ].filter(Boolean);
  let uncertaintyFlags = collectRunUncertaintyFlags({
    claims: [
      ...buckets.neighboringFeelings,
      ...buckets.commonInterpretations,
      ...buckets.alternativeInterpretations,
    ],
    evidence,
    sourceTypeCount: new Set(sources.map((s) => s.sourceType)).size,
    hasCounterSignals: buckets.alternativeInterpretations.length > 0,
    partialPipeline: failedStages.length > 0,
    emotionalMode: true,
  });

  const synthesisLlm = await generateResidueObject({
    schema: emotionalSynthesisLlmSchema,
    system: EMOTIONAL_RESIDUE_SYSTEM_PROMPT,
    prompt: buildEmotionalSynthesisPrompt({
      experience: normalizedExperience,
      evidenceBlock: evidence
        .map((e) => `[${e.evidenceId}] layer=${e.evidenceLayer} :: ${e.claimSupported}`)
        .join("\n"),
    }),
    llm: options.llm,
  });

  if (synthesisLlm.object) {
    usedLlm = true;
    modelName = synthesisLlm.model || modelName;
    const syn = synthesisLlm.object;
    neighborhoods = syn.interpretiveNeighborhoods.map((row, i) =>
      sanitizeNeighborhood({
        neighborhoodId: `nb_llm_${i}`,
        label: row.label,
        description: row.description,
        relevanceScore: row.relevanceScore,
        scoreMeaning: row.scoreMeaning,
        status: row.evidenceSourceIds.length === 0 ? "model-proposed" : row.status,
        evidenceIds: evidenceIdsForSourceIds(row.evidenceSourceIds, evidence),
        distinctions: [
          ...row.distinctions,
          "Score reflects semantic/evidence relevance — not diagnostic likelihood.",
        ],
        uncertaintyFlags: row.uncertaintyFlags,
      }),
    );
    if (neighborhoods.length < 2) {
      neighborhoods = buildInterpretiveNeighborhoodsOffline({
        experience: normalizedExperience,
        evidence,
        researchEvidence: separated.researchEvidence,
        communityEvidence: separated.communityEvidence,
      });
      warnings.push("LLM returned fewer than 2 neighborhoods; offline neighborhoods restored.");
    }
    buckets = {
      neighboringFeelings: syn.neighboringFeelings.map((s, i) =>
        claimFromText(`claim_nb_${i}`, s, "interpretive", evidence),
      ),
      commonTriggers: syn.commonTriggers.map((s, i) =>
        claimFromText(`claim_trig_${i}`, s, "reported", evidence),
      ),
      commonInterpretations: syn.commonInterpretations.map((s, i) =>
        claimFromText(`claim_interp_${i}`, s, "reported", evidence),
      ),
      alternativeInterpretations: syn.alternativeInterpretations.map((s, i) =>
        claimFromText(`claim_alt_${i}`, s, "model-proposed", evidence),
      ),
      bodilySensations: syn.bodilySensations.map((s, i) =>
        claimFromText(`claim_body_${i}`, s, "reported", separated.communityEvidence),
      ),
      commonBehaviors: syn.commonBehaviors.map((s, i) =>
        claimFromText(`claim_beh_${i}`, s, "reported", evidence),
      ),
      internetExpressions: syn.internetExpressions.map((s, i) =>
        claimFromText(`claim_net_${i}`, s, "reported", separated.communityEvidence),
      ),
      historicalExpressions: syn.historicalExpressions.map((s, i) =>
        claimFromText(`claim_hist_${i}`, s, "historical", separated.interpretiveEvidence),
      ),
      therapeuticModels: syn.therapeuticModels.map((s, i) =>
        claimFromText(`claim_tx_${i}`, s, "interpretive", separated.researchEvidence),
      ),
      communityPatterns: syn.communityPatterns.map((s, i) =>
        claimFromText(`claim_com_${i}`, s, "reported", separated.communityEvidence),
      ),
      cognitivePatterns: syn.cognitivePatterns.map((s, i) =>
        claimFromText(`claim_cog_${i}`, s, "interpretive", evidence),
      ),
    };
    responses = {
      adaptive: syn.adaptiveResponses.map((row, i) => sanitizeResponse(`resp_ad_${i}`, row, evidence)),
      unhelpful: syn.potentiallyUnhelpfulResponses.map((row, i) =>
        sanitizeResponse(`resp_un_${i}`, row, evidence),
      ),
    };
    evidenceGaps = syn.evidenceGaps;
    uncertaintyFlags = [
      ...new Set([
        ...uncertaintyFlags,
        ...syn.uncertaintyFlags,
        ...collectRunUncertaintyFlags({
          claims: buckets.alternativeInterpretations,
          evidence,
          sourceTypeCount: new Set(sources.map((s) => s.sourceType)).size,
          hasCounterSignals: true,
          emotionalMode: true,
        }),
      ]),
    ];
    completedStages.push(
      "generate-associations",
      "label-claim-status",
      "group-findings",
      "synthesize",
    );
  } else {
    completedStages.push(
      "generate-associations",
      "label-claim-status",
      "group-findings",
      "synthesize",
    );
    if (synthesisLlm.error) {
      failedStages.push({
        stageId: "synthesize",
        message: "LLM synthesis failed; using offline emotional heuristics.",
        recoverable: true,
        detail: synthesisLlm.error,
      });
    } else if (!options.llm?.apiKey || options.llm.offline) {
      warnings.push("Offline emotional heuristics used (no AI Gateway key / offline mode).");
    }
  }

  const confidenceSummary = buildConfidenceSummary({
    evidence,
    sources,
    primaryClaims: [
      ...buckets.commonInterpretations,
      ...buckets.neighboringFeelings,
    ],
    counterClaims: buckets.alternativeInterpretations,
    summary: [
      `Synthesis confidence reflects evidence coverage for interpretive neighborhoods (not a diagnostic likelihood).`,
      `Research sources: ${separated.researchEvidence.length}; community sources: ${separated.communityEvidence.length}.`,
    ].join(" "),
  });
  completedStages.push("calibrate-confidence");

  const usedContext = buildUsedContext({
    sources,
    evidence,
    userNotes: input.userNotes?.map((n) => redactSensitiveText(n, 80)),
  });
  completedStages.push("validate");

  const metadata = createRunMetadata({
    runId,
    mode: "emotional",
    inputHash: hashResidueInput([
      // Hash raw experience privately; do not put raw text into stored query field.
      hashResidueInput([input.experience]),
      input.sourceUrls,
      RESIDUE_SCHEMA_VERSION,
      RESIDUE_PROMPT_VERSION,
    ]),
    sourceCount: sources.length,
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

  const result = emotionalResidueResultSchema.parse({
    metadata: {
      ...metadata,
      // Keep run label non-sensitive in exports that mirror queryOrExperience patterns.
    },
    inputExperience: input.retention === "persisted" && input.consentToStore
      ? input.experience
      : redactSensitiveText(input.experience, 0),
    normalizedExperience,
    interpretiveNeighborhoods: neighborhoods,
    ...buckets,
    adaptiveResponses: responses.adaptive,
    potentiallyUnhelpfulResponses: responses.unhelpful,
    uncertaintyFlags,
    evidence,
    sources,
    usedContext,
    confidenceSummary,
    evidenceGaps,
    safetyNotice: emotionalSafetyNotice() || EMOTIONAL_SAFETY_NOTICE,
  });
  completedStages.push("persist");

  return {
    result,
    partial: { completedStages, failedStages, warnings: result.metadata.warnings },
    sourceManifest: buildSourceManifest(sources),
    usedLlm,
  };
}

function claimFromText(
  claimId: string,
  statement: string,
  status: ResidueClaim["status"],
  evidence: EvidenceRecord[],
): ResidueClaim {
  const safe = sanitizeEmotionalStatement(statement);
  const use = evidence.slice(0, 3);
  const finalStatus = use.length === 0 ? "model-proposed" : status;
  return {
    claimId,
    statement: safe,
    status: finalStatus,
    evidenceIds: use.map((e) => e.evidenceId),
    counterEvidenceIds: [],
    confidence: claimConfidenceFromEvidence(use, finalStatus),
    uncertaintyFlags: flagsForClaim({ status: finalStatus, evidence: use }),
    evidenceLayers: [...new Set(use.map((e) => e.evidenceLayer))],
  };
}

function sanitizeNeighborhood(n: InterpretiveNeighborhood): InterpretiveNeighborhood {
  return {
    ...n,
    label: sanitizeEmotionalStatement(n.label),
    description: sanitizeEmotionalStatement(n.description),
    distinctions: n.distinctions.map((d) => sanitizeEmotionalStatement(d)),
  };
}

function sanitizeResponse(
  responseId: string,
  row: {
    label: string;
    description: string;
    category: ReportedResponsePattern["category"];
    commonlyReportedOutcomes: string[];
    researchSummary?: string;
    communitySentimentSummary?: string;
    evidenceSourceIds: string[];
    evidenceStrength: ReportedResponsePattern["evidenceStrength"];
    caveats: string[];
  },
  evidence: EvidenceRecord[],
): ReportedResponsePattern {
  return {
    responseId,
    label: sanitizeEmotionalStatement(row.label),
    description: sanitizeEmotionalStatement(row.description),
    category: row.category,
    commonlyReportedOutcomes: row.commonlyReportedOutcomes.map((o) =>
      sanitizeEmotionalStatement(o),
    ),
    researchSummary: row.researchSummary
      ? sanitizeEmotionalStatement(row.researchSummary)
      : undefined,
    communitySentimentSummary: row.communitySentimentSummary
      ? sanitizeEmotionalStatement(row.communitySentimentSummary)
      : undefined,
    evidenceIds: evidenceIdsForSourceIds(row.evidenceSourceIds, evidence),
    evidenceStrength: row.evidenceStrength,
    caveats: [
      ...row.caveats.map((c) => sanitizeEmotionalStatement(c)),
      "Not a treatment instruction.",
    ],
  };
}

function evidenceIdsForSourceIds(sourceIds: string[], evidence: EvidenceRecord[]): string[] {
  const set = new Set(sourceIds);
  const ids = evidence.filter((e) => set.has(e.sourceId)).map((e) => e.evidenceId);
  return ids.length ? ids : evidence.slice(0, 1).map((e) => e.evidenceId);
}

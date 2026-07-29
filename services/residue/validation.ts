/**
 * Mimi Residue Engine — Zod schemas (runtime source of truth).
 * Phase 2: shared + cultural + emotional result contracts.
 */

import { z } from "zod";
import {
  EMOTIONAL_SAFETY_NOTICE,
  RESIDUE_PROMPT_VERSION,
  RESIDUE_SCHEMA_VERSION,
} from "./constants";

const nonEmpty = z.string().trim().min(1);
const score01 = z.number().min(0).max(1);
const isoDateTime = z.string().datetime();
const optionalYear = z.number().int().min(0).max(3000).optional();

export const residueModeSchema = z.enum(["cultural", "emotional"]);

export const sourceTypeSchema = z.enum([
  "academic-research",
  "clinical-guidance",
  "journalism",
  "archive",
  "social-post",
  "forum",
  "reddit",
  "memoir",
  "literature",
  "philosophy",
  "product-page",
  "trend-data",
  "user-note",
  "uploaded-document",
  "model-proposed",
]);

export const evidenceStrengthSchema = z.enum([
  "strong",
  "moderate",
  "weak",
  "speculative",
]);

export const claimStatusSchema = z.enum([
  "observed",
  "reported",
  "historical",
  "interpretive",
  "causal-hypothesis",
  "model-proposed",
]);

export const evidenceLayerSchema = z.enum(["A", "B", "C", "D"]);

export const analysisDepthSchema = z.enum(["quick", "standard", "deep"]);

export const residueOutputTypeSchema = z.enum([
  "structured-result",
  "zine",
  "intelligence-report",
  "intel-hub",
  "the-edit",
  "forecast",
  "mean-median-mode",
  "memory-atoms",
  "taste-graph",
  "markdown",
  "json",
]);

export const associationRelationshipSchema = z.enum([
  "resembles",
  "descends-from",
  "reacts-against",
  "commercializes",
  "absorbs",
  "translates-into",
  "co-occurs-with",
  "is-commonly-interpreted-as",
  "is-alternatively-interpreted-as",
  "may-lead-to",
  "is-distinct-from",
]);

export const usedContextUsageSchema = z.enum([
  "evidence",
  "background",
  "comparison",
  "counter-signal",
  "user-context",
]);

export const retentionPolicySchema = z.enum(["temporary", "persisted"]);

export const runStatusSchema = z.enum([
  "queued",
  "running",
  "partial",
  "complete",
  "failed",
]);

export const sourceReferenceSchema = z.object({
  sourceId: nonEmpty,
  title: z.string().optional(),
  author: z.string().optional(),
  url: z.string().optional(),
  sourceType: sourceTypeSchema,
  publishedAt: z.string().optional(),
  accessedAt: isoDateTime,
  excerpt: z.string().optional(),
  evidenceLayer: evidenceLayerSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const evidenceRecordSchema = z.object({
  evidenceId: nonEmpty,
  sourceId: nonEmpty,
  claimSupported: nonEmpty,
  excerpt: z.string().optional(),
  evidenceStrength: evidenceStrengthSchema,
  sourceQualityScore: score01,
  relevanceScore: score01,
  limitations: z.array(z.string()),
  evidenceLayer: evidenceLayerSchema,
});

export const residueClaimSchema = z.object({
  claimId: nonEmpty,
  statement: nonEmpty,
  status: claimStatusSchema,
  evidenceIds: z.array(nonEmpty),
  counterEvidenceIds: z.array(nonEmpty).default([]),
  confidence: score01,
  uncertaintyFlags: z.array(z.string()),
  evidenceLayers: z.array(evidenceLayerSchema).default([]),
  modelReasoningSummary: z.string().optional(),
});

export const residueAssociationSchema = z.object({
  associationId: nonEmpty,
  originNodeId: nonEmpty,
  targetNodeId: nonEmpty,
  relationship: associationRelationshipSchema,
  description: nonEmpty,
  evidenceIds: z.array(nonEmpty),
  confidence: score01,
  status: claimStatusSchema,
});

export const residueUsedContextEntrySchema = z.object({
  contextId: nonEmpty,
  sourceId: z.string().optional(),
  memoryAtomId: z.string().optional(),
  label: nonEmpty,
  excerpt: z.string().optional(),
  usage: usedContextUsageSchema,
  evidenceLayer: evidenceLayerSchema.optional(),
});

export const confidenceSummarySchema = z.object({
  overallConfidence: score01,
  evidenceCoverage: score01,
  sourceDiversity: score01,
  counterSignalCoverage: score01,
  strongestEvidenceLayer: evidenceLayerSchema,
  summary: nonEmpty,
});

export const residueRunMetadataSchema = z.object({
  runId: nonEmpty,
  mode: residueModeSchema,
  createdAt: isoDateTime,
  model: z.string().optional(),
  promptVersion: z.string().default(RESIDUE_PROMPT_VERSION),
  schemaVersion: z.string().default(RESIDUE_SCHEMA_VERSION),
  inputHash: nonEmpty,
  sourceCount: z.number().int().min(0),
  warnings: z.array(z.string()),
  status: runStatusSchema.optional(),
  retention: retentionPolicySchema.optional(),
  consentToStore: z.boolean().optional(),
});

// --- Cultural ---

export const culturalLineageStageKindSchema = z.enum([
  "prehistory",
  "emergence",
  "amplification",
  "commercialization",
  "fatigue",
  "counter-signal",
  "revival",
  "absorption",
]);

export const culturalCodeCategorySchema = z.enum([
  "visual",
  "linguistic",
  "behavioral",
  "commercial",
  "infrastructural",
]);

export const culturalResidueInputSchema = z.object({
  query: nonEmpty,
  researchQuestion: z.string().optional(),
  sourceUrls: z.array(z.string()).optional(),
  uploadedSourceIds: z.array(z.string()).optional(),
  userNotes: z.array(z.string()).optional(),
  startYear: optionalYear,
  endYear: optionalYear,
  analysisDepth: analysisDepthSchema.default("standard"),
  requestedOutputs: z.array(residueOutputTypeSchema).optional(),
  retention: retentionPolicySchema.default("temporary"),
  consentToStore: z.boolean().default(false),
});

export const culturalLineageStageSchema = z.object({
  stageId: nonEmpty,
  label: nonEmpty,
  stage: culturalLineageStageKindSchema,
  startYear: optionalYear,
  endYear: optionalYear,
  description: nonEmpty,
  evidenceIds: z.array(nonEmpty),
  confidence: score01,
});

export const culturalCodeSchema = z.object({
  codeId: nonEmpty,
  category: culturalCodeCategorySchema,
  label: nonEmpty,
  description: nonEmpty,
  evidenceIds: z.array(nonEmpty),
  confidence: score01,
});

export const culturalResidueResultSchema = z.object({
  metadata: residueRunMetadataSchema,
  query: nonEmpty,
  definition: residueClaimSchema,
  origins: z.array(residueClaimSchema),
  lineage: z.array(culturalLineageStageSchema),
  descendants: z.array(residueClaimSchema),
  culturalCodes: z.array(culturalCodeSchema),
  associations: z.array(residueAssociationSchema),
  survivingMeanings: z.array(residueClaimSchema),
  lostMeanings: z.array(residueClaimSchema),
  computationallyIntroducedMeanings: z.array(residueClaimSchema),
  commercialAbsorption: z.array(residueClaimSchema),
  counterSignals: z.array(residueClaimSchema),
  evidence: z.array(evidenceRecordSchema),
  sources: z.array(sourceReferenceSchema),
  usedContext: z.array(residueUsedContextEntrySchema),
  confidenceSummary: confidenceSummarySchema,
  evidenceGaps: z.array(z.string()),
});

// --- Emotional ---

export const neighborhoodStatusSchema = z.enum([
  "common-description",
  "research-supported",
  "community-reported",
  "historical-framework",
  "therapeutic-framework",
  "model-proposed",
]);

export const scoreMeaningSchema = z.enum([
  "semantic-proximity",
  "pattern-frequency",
  "evidence-supported-relevance",
]);

export const responseCategorySchema = z.enum([
  "behavioral",
  "relational",
  "cognitive",
  "creative",
  "avoidant",
  "reflective",
  "support-seeking",
]);

export const emotionalResidueInputSchema = z.object({
  experience: nonEmpty,
  sourceUrls: z.array(z.string()).optional(),
  uploadedSourceIds: z.array(z.string()).optional(),
  userNotes: z.array(z.string()).optional(),
  includeCommunitySources: z.boolean().default(true),
  includeResearchSources: z.boolean().default(true),
  includeMemoirAndLiterature: z.boolean().default(true),
  analysisDepth: analysisDepthSchema.default("standard"),
  requestedOutputs: z.array(residueOutputTypeSchema).optional(),
  retention: retentionPolicySchema.default("temporary"),
  consentToStore: z.boolean().default(false),
});

export const interpretiveNeighborhoodSchema = z.object({
  neighborhoodId: nonEmpty,
  label: nonEmpty,
  description: nonEmpty,
  relevanceScore: score01,
  scoreMeaning: scoreMeaningSchema,
  status: neighborhoodStatusSchema,
  evidenceIds: z.array(nonEmpty),
  distinctions: z.array(z.string()),
  uncertaintyFlags: z.array(z.string()),
});

export const reportedResponsePatternSchema = z.object({
  responseId: nonEmpty,
  label: nonEmpty,
  description: nonEmpty,
  category: responseCategorySchema,
  commonlyReportedOutcomes: z.array(z.string()),
  researchSummary: z.string().optional(),
  communitySentimentSummary: z.string().optional(),
  evidenceIds: z.array(nonEmpty),
  evidenceStrength: evidenceStrengthSchema,
  caveats: z.array(z.string()),
});

export const emotionalResidueResultSchema = z.object({
  metadata: residueRunMetadataSchema,
  inputExperience: nonEmpty,
  normalizedExperience: nonEmpty,
  interpretiveNeighborhoods: z.array(interpretiveNeighborhoodSchema),
  neighboringFeelings: z.array(residueClaimSchema),
  commonTriggers: z.array(residueClaimSchema),
  commonInterpretations: z.array(residueClaimSchema),
  alternativeInterpretations: z.array(residueClaimSchema),
  bodilySensations: z.array(residueClaimSchema),
  commonBehaviors: z.array(residueClaimSchema),
  internetExpressions: z.array(residueClaimSchema),
  historicalExpressions: z.array(residueClaimSchema),
  therapeuticModels: z.array(residueClaimSchema),
  communityPatterns: z.array(residueClaimSchema),
  cognitivePatterns: z.array(residueClaimSchema),
  adaptiveResponses: z.array(reportedResponsePatternSchema),
  potentiallyUnhelpfulResponses: z.array(reportedResponsePatternSchema),
  uncertaintyFlags: z.array(z.string()),
  evidence: z.array(evidenceRecordSchema),
  sources: z.array(sourceReferenceSchema),
  usedContext: z.array(residueUsedContextEntrySchema),
  confidenceSummary: confidenceSummarySchema,
  evidenceGaps: z.array(z.string()),
  safetyNotice: z.string().default(EMOTIONAL_SAFETY_NOTICE),
});

// --- Mean / Median / Mode ---

export const meanMedianModeResultSchema = z.object({
  subject: nonEmpty,
  analysisKind: z.enum(["literal-statistical", "interpretive-metaphor"]),
  mean: z.object({
    synthesis: nonEmpty,
    contributingSignalIds: z.array(nonEmpty),
    caveats: z.array(z.string()),
    numericValue: z.number().optional(),
  }),
  median: z.object({
    centralPosition: nonEmpty,
    excludedOrDownweightedOutliers: z.array(z.string()),
    contributingSignalIds: z.array(nonEmpty),
    numericValue: z.number().optional(),
  }),
  mode: z.object({
    dominantPattern: nonEmpty,
    frequency: z.number().optional(),
    contributingSignalIds: z.array(nonEmpty),
  }),
  outliers: z.array(residueClaimSchema),
  counterMode: z.array(residueClaimSchema),
  spread: z.object({
    level: z.enum(["low", "medium", "high"]),
    description: nonEmpty,
  }),
  confidence: confidenceSummarySchema,
});

// --- Acquisition (Apify-agnostic) ---

export const sourceAcquisitionRequestSchema = z.object({
  inquiry: nonEmpty,
  mode: residueModeSchema,
  sourceUrls: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  searchTerms: z.array(z.string()).optional(),
  allowedSourceTypes: z.array(sourceTypeSchema).optional(),
  maxItems: z.number().int().min(1).max(500).default(25),
  startYear: optionalYear,
  endYear: optionalYear,
  jobId: z.string().optional(),
});

export const acquiredSourceSchema = z.object({
  uri: z.string().optional(),
  platform: z.string().optional(),
  capturedAt: isoDateTime,
  title: z.string().optional(),
  text: z.string().optional(),
  author: z.string().optional(),
  sourceType: sourceTypeSchema,
  mediaRefs: z.array(z.string()).optional(),
  engagement: z.record(z.string(), z.unknown()).optional(),
  rawRef: z.string().optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
  rights: z.string().optional(),
  checksum: z.string().optional(),
});

export const sourceAcquisitionResultSchema = z.object({
  status: z.enum(["success", "partial", "empty", "failed", "disabled"]),
  sources: z.array(acquiredSourceSchema),
  providerRuns: z.array(z.record(z.string(), z.unknown())).default([]),
  failures: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

// --- Storage envelope ---

export const residueRunDocumentSchema = z.object({
  runId: nonEmpty,
  ownerUid: nonEmpty,
  mode: residueModeSchema,
  status: runStatusSchema,
  retention: retentionPolicySchema,
  consentToStore: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  inputHash: nonEmpty,
  schemaVersion: z.string(),
  promptVersion: z.string(),
  queryOrExperience: nonEmpty,
  sourceCount: z.number().int().min(0),
  warnings: z.array(z.string()),
  confidenceSummary: confidenceSummarySchema.optional(),
  /** Redacted label for emotional runs in logs — never raw emotional text. */
  sensitive: z.boolean().default(false),
  errorSummary: z.string().optional(),
});

export type ResidueMode = z.infer<typeof residueModeSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type EvidenceStrength = z.infer<typeof evidenceStrengthSchema>;
export type ClaimStatus = z.infer<typeof claimStatusSchema>;
export type ResidueOutputType = z.infer<typeof residueOutputTypeSchema>;
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type ResidueClaim = z.infer<typeof residueClaimSchema>;
export type ResidueAssociation = z.infer<typeof residueAssociationSchema>;
export type ResidueUsedContextEntry = z.infer<typeof residueUsedContextEntrySchema>;
export type ConfidenceSummary = z.infer<typeof confidenceSummarySchema>;
export type ResidueRunMetadata = z.infer<typeof residueRunMetadataSchema>;
export type CulturalResidueInput = z.infer<typeof culturalResidueInputSchema>;
export type CulturalLineageStage = z.infer<typeof culturalLineageStageSchema>;
export type CulturalCode = z.infer<typeof culturalCodeSchema>;
export type CulturalResidueResult = z.infer<typeof culturalResidueResultSchema>;
export type EmotionalResidueInput = z.infer<typeof emotionalResidueInputSchema>;
export type InterpretiveNeighborhood = z.infer<typeof interpretiveNeighborhoodSchema>;
export type ReportedResponsePattern = z.infer<typeof reportedResponsePatternSchema>;
export type EmotionalResidueResult = z.infer<typeof emotionalResidueResultSchema>;
export type MeanMedianModeResult = z.infer<typeof meanMedianModeResultSchema>;
export type SourceAcquisitionRequest = z.infer<typeof sourceAcquisitionRequestSchema>;
export type AcquiredSource = z.infer<typeof acquiredSourceSchema>;
export type SourceAcquisitionResult = z.infer<typeof sourceAcquisitionResultSchema>;
export type ResidueRunDocument = z.infer<typeof residueRunDocumentSchema>;
export type RetentionPolicy = z.infer<typeof retentionPolicySchema>;
export type AnalysisDepth = z.infer<typeof analysisDepthSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;

export function parseCulturalResidueResult(data: unknown): CulturalResidueResult {
  return culturalResidueResultSchema.parse(data);
}

export function parseEmotionalResidueResult(data: unknown): EmotionalResidueResult {
  return emotionalResidueResultSchema.parse(data);
}

export function safeParseCulturalResidueResult(data: unknown) {
  return culturalResidueResultSchema.safeParse(data);
}

export function safeParseEmotionalResidueResult(data: unknown) {
  return emotionalResidueResultSchema.safeParse(data);
}

export function safeParseMeanMedianModeResult(data: unknown) {
  return meanMedianModeResultSchema.safeParse(data);
}

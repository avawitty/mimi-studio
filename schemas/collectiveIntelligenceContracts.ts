/**
 * Collective intelligence contracts — Mean Median Mode / Observatory.
 * Distinct from Residue per-run MeanMedianModeResult.
 */

import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const collectiveSignalCategorySchema = z.enum([
  "query",
  "topic",
  "motif",
  "mood",
  "tension",
  "reference",
  "material",
  "silhouette",
  "color",
  "technology",
  "social_condition",
  "assistance_type",
  "artifact_form",
  "expressive_mode",
]);

export const cyclePositionSchema = z.enum([
  "Latent",
  "Emergent",
  "Coalescing",
  "Saturated",
  "Fragmenting",
  "Residual",
  "Recurrent",
]);

export const confidenceLabelSchema = z.enum([
  "insufficient",
  "tentative",
  "moderate",
  "strong",
]);

export const centralTendencyUnitSchema = z.enum([
  "occurrences_per_day",
  "share_of_artifacts",
  "normalized_intensity",
]);

export const skewHintSchema = z.enum([
  "mean_above_median",
  "aligned",
  "median_above_mean",
]);

export const modalitySchema = z.enum([
  "unimodal",
  "bimodal",
  "multimodal",
  "insufficient",
]);

export const summationInterpretationSchema = z.enum([
  "spike_driven",
  "broadly_shared",
  "contested",
  "insufficient_evidence",
]);

export const centralTendencyProfileSchema = z.object({
  signalId: nonEmpty,
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  unit: centralTendencyUnitSchema,
  mean: z.number().finite(),
  median: z.number().finite(),
  mode: z.object({
    label: nonEmpty,
    count: z.number().int().nonnegative(),
    share: z.number().min(0).max(1),
  }),
  summation: z.object({
    combinedIndex: z.number().finite(),
    skewHint: skewHintSchema,
    modality: modalitySchema,
    interpretation: summationInterpretationSchema,
  }),
  sampleSize: z.number().int().nonnegative(),
  uniqueArtifactCount: z.number().int().nonnegative(),
  uniqueContributorBand: nonEmpty,
  methodologyVersion: nonEmpty,
});

export const collectiveSignalSchema = z.object({
  id: nonEmpty,
  canonicalLabel: nonEmpty,
  aliases: z.array(z.string()),
  category: collectiveSignalCategorySchema,
  sourceArtifactId: nonEmpty,
  sourceType: z.enum([
    "public_zine",
    "public_scry",
    "proscenium_transmission",
    "public_remix",
    "rss",
    "approved_external_source",
  ]),
  observedAt: z.number().finite(),
  extractedAt: z.number().finite(),
  extractionMethod: z.enum([
    "user_tagged",
    "rule_based",
    "model_proposed",
    "human_approved",
  ]),
  confidence: z.number().min(0).max(1).optional(),
  /** Never shown in public MMM readout. */
  contextExcerpt: z.string().optional(),
  /**
   * Opaque stable contributor key for banding (never a raw uid in UI).
   * Aggregation uses this so multiple artifacts from one creator count as one contributor.
   */
  opaqueContributorKey: nonEmpty.optional(),
  publicContributionAllowed: z.boolean(),
  anonymizationStatus: z.enum(["pending", "eligible", "excluded"]),
  sensitivityFlags: z.array(z.string()),
  provenance: z.object({
    sourceId: nonEmpty,
    sourceKind: nonEmpty,
    modelRunId: z.string().optional(),
    extractorVersion: nonEmpty,
  }),
});

export const contributionReceiptSchema = z.object({
  artifactId: nonEmpty,
  contributedSignalIds: z.array(nonEmpty),
  excludedSignals: z.array(nonEmpty),
  exclusionReasons: z.array(z.string()),
  aggregationWindows: z.array(nonEmpty),
  createdAt: z.number().finite(),
});

export const prosceniumPublishConsentSchema = z.object({
  artifactId: nonEmpty,
  stagedPublicly: z.literal(true),
  contributeToMeanMedianMode: z.boolean(),
  disclosedAt: z.number().finite(),
  disclosureVersion: nonEmpty,
});

export const methodologyRecordSchema = z.object({
  version: nonEmpty,
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  sampleSize: z.number().int().nonnegative(),
  uniqueArtifactCount: z.number().int().nonnegative(),
  limitations: z.array(z.string()),
  exclusions: z.array(z.string()),
  lastUpdated: z.number().finite(),
});

export const meanMedianModeReportSchema = z.object({
  runId: nonEmpty,
  status: z.enum(["success", "partial", "empty", "failed", "demonstration"]),
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  profiles: z.array(centralTendencyProfileSchema),
  presentAtmosphere: z.string(),
  seekingModes: z.array(
    z.object({
      label: nonEmpty,
      share: z.number().min(0).max(1),
      sampleSize: z.number().int().nonnegative(),
    }),
  ),
  cycleNotes: z.array(
    z.object({
      signalId: nonEmpty,
      position: cyclePositionSchema,
      evidence: z.array(z.string()),
    }),
  ),
  methodologyVersion: nonEmpty,
  limitations: z.array(z.string()),
  whatMayBeMissing: z.array(z.string()).min(1),
  lastUpdated: z.number().finite(),
  demonstration: z.boolean().optional(),
  methodology: methodologyRecordSchema.optional(),
});

/** Phase 6 — weak signals below Mean Median Mode promotion thresholds. */
export const mesopicModeSchema = z.enum(["starry_eyed", "shadow_fields"]);

export const mesopicFindingSchema = z.object({
  id: nonEmpty,
  mode: mesopicModeSchema,
  canonicalLabel: nonEmpty,
  category: collectiveSignalCategorySchema,
  /** Why this is faint — never presented as certainty. */
  faintnessReason: nonEmpty,
  sampleSize: z.number().int().nonnegative(),
  uniqueContributorBand: nonEmpty,
  relatedSignalIds: z.array(nonEmpty),
  evidenceNotes: z.array(z.string()).min(1),
  observedAt: z.number().finite(),
  methodologyVersion: nonEmpty,
  demonstration: z.boolean().optional(),
});

export const mesopicReportSchema = z.object({
  runId: nonEmpty,
  status: z.enum(["success", "partial", "empty", "failed", "demonstration"]),
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  findings: z.array(mesopicFindingSchema),
  whatMayBeMissing: z.array(z.string()).min(1),
  lastUpdated: z.number().finite(),
  demonstration: z.boolean().optional(),
});

/** Phase 7 — approved RSS/Atom freshness spine for Forecast (not Keep Tabs). */
export const approvedFeedSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  url: z.string().url(),
  approvedAt: z.number().finite(),
  approvedBy: nonEmpty,
  topics: z.array(z.string()),
  active: z.boolean(),
  notes: z.string().optional(),
});

export const feedEntrySchema = z.object({
  id: nonEmpty,
  feedId: nonEmpty,
  title: nonEmpty,
  url: z.string().url(),
  publishedAt: z.number().finite().optional(),
  fetchedAt: z.number().finite(),
  summary: z.string().optional(),
});

/**
 * Phase 8 — Forecast consumes observed MMM profiles + external research + optional RSS.
 * Distinct from Residue per-run forecastAdapter scenarios.
 */
export const forecastTrajectorySchema = z.object({
  id: nonEmpty,
  label: nonEmpty,
  hypothesis: nonEmpty,
  /** Derived from observed change or provider fields — never costume. */
  velocityHint: z.enum(["Surging", "Rising", "Decaying", "Unknown"]),
  basedOnSignalIds: z.array(nonEmpty),
  citations: z.array(
    z.object({
      title: nonEmpty,
      url: z.string().url().optional(),
    }),
  ),
});

export const forecastReportSchema = z.object({
  runId: nonEmpty,
  status: z.enum(["success", "partial", "empty", "failed", "speculative", "demonstration"]),
  evidenceWindowStart: z.number().finite(),
  evidenceWindowEnd: z.number().finite(),
  observed: z.array(centralTendencyProfileSchema),
  external: z
    .object({
      synthesis: z.string(),
      provider: nonEmpty,
      trendCount: z.number().int().nonnegative(),
      simulated: z.boolean().optional(),
    })
    .optional(),
  feedEntryCount: z.number().int().nonnegative(),
  trajectories: z.array(forecastTrajectorySchema),
  contradictions: z.array(z.string()),
  methodologyVersion: nonEmpty,
  whatMayBeMissing: z.array(z.string()).min(1),
  lastUpdated: z.number().finite(),
  demonstration: z.boolean().optional(),
});

export type CollectiveSignalCategory = z.infer<typeof collectiveSignalCategorySchema>;
export type CyclePosition = z.infer<typeof cyclePositionSchema>;
export type CentralTendencyProfile = z.infer<typeof centralTendencyProfileSchema>;
export type CollectiveSignal = z.infer<typeof collectiveSignalSchema>;
export type ContributionReceipt = z.infer<typeof contributionReceiptSchema>;
export type ProsceniumPublishConsent = z.infer<typeof prosceniumPublishConsentSchema>;
export type MethodologyRecord = z.infer<typeof methodologyRecordSchema>;
export type MeanMedianModeReport = z.infer<typeof meanMedianModeReportSchema>;
export type MesopicMode = z.infer<typeof mesopicModeSchema>;
export type MesopicFinding = z.infer<typeof mesopicFindingSchema>;
export type MesopicReport = z.infer<typeof mesopicReportSchema>;
export type ApprovedFeed = z.infer<typeof approvedFeedSchema>;
export type FeedEntry = z.infer<typeof feedEntrySchema>;
export type ForecastTrajectory = z.infer<typeof forecastTrajectorySchema>;
export type ForecastReport = z.infer<typeof forecastReportSchema>;

export function safeParseCentralTendencyProfile(data: unknown) {
  return centralTendencyProfileSchema.safeParse(data);
}

export function safeParseMeanMedianModeReport(data: unknown) {
  return meanMedianModeReportSchema.safeParse(data);
}

export function safeParseProsceniumPublishConsent(data: unknown) {
  return prosceniumPublishConsentSchema.safeParse(data);
}

export function safeParseMesopicReport(data: unknown) {
  return mesopicReportSchema.safeParse(data);
}

export function safeParseForecastReport(data: unknown) {
  return forecastReportSchema.safeParse(data);
}

export function safeParseApprovedFeed(data: unknown) {
  return approvedFeedSchema.safeParse(data);
}

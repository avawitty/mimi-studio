/**
 * Intelligence Report adapter — formal structured report from a residue run.
 */

import { toMeanMedianMode } from "./meanMedianModeAdapter";
import { buildSourceManifest } from "../provenance";
import type {
  ConfidenceSummary,
  CulturalResidueResult,
  EmotionalResidueResult,
  MeanMedianModeResult,
  ResidueClaim,
  ResidueUsedContextEntry,
  SourceReference,
} from "../validation";
import { z } from "zod";

export const intelligenceReportSchema = z.object({
  reportId: z.string().min(1),
  mode: z.enum(["cultural", "emotional"]),
  title: z.string().min(1),
  dek: z.string().min(1),
  executiveSummary: z.string().min(1),
  researchQuestion: z.string().min(1),
  sourceCorpus: z.object({
    sourceCount: z.number().int().min(0),
    byType: z.record(z.string(), z.number()),
    byLayer: z.record(z.string(), z.number()),
    sources: z.array(z.custom<SourceReference>()),
  }),
  majorFindings: z.array(z.custom<ResidueClaim>()),
  culturalOrInterpretiveMap: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      summary: z.string(),
      kind: z.string(),
      confidence: z.number().min(0).max(1).optional(),
    }),
  ),
  timeline: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      summary: z.string(),
      startYear: z.number().optional(),
      endYear: z.number().optional(),
    }),
  ),
  meanMedianMode: z.custom<MeanMedianModeResult>(),
  implications: z.array(z.string()),
  opportunities: z.array(z.string()),
  risks: z.array(z.string()),
  uncertainty: z.array(z.string()),
  evidenceAudit: z.object({
    evidenceCount: z.number().int().min(0),
    modelProposedClaimCount: z.number().int().min(0),
    strongestLayer: z.enum(["A", "B", "C", "D"]),
    gaps: z.array(z.string()),
  }),
  sourceManifest: z.object({
    total: z.number(),
    byType: z.record(z.string(), z.number()),
    byLayer: z.record(z.string(), z.number()),
  }),
  recommendedNextResearchQuestions: z.array(z.string()),
  usedContext: z.array(z.custom<ResidueUsedContextEntry>()),
  confidence: z.custom<ConfidenceSummary>(),
  safetyNotice: z.string().optional(),
  schemaVersion: z.string(),
  promptVersion: z.string(),
  runId: z.string(),
  createdAt: z.string(),
});

export type IntelligenceReport = z.infer<typeof intelligenceReportSchema>;

export type ResidueReportSource = CulturalResidueResult | EmotionalResidueResult;

export function adaptResidueToIntelligenceReport(
  result: ResidueReportSource,
  options?: { reportId?: string; researchQuestion?: string },
): IntelligenceReport {
  const manifest = buildSourceManifest(result.sources);
  const mmm = toMeanMedianMode(result);
  const isCultural = result.metadata.mode === "cultural";
  const cultural = result as CulturalResidueResult;
  const emotional = result as EmotionalResidueResult;

  const title = isCultural
    ? `Cultural Residue Report — ${cultural.query}`
    : `Emotional Residue Report — interpretive map`;

  const researchQuestion =
    options?.researchQuestion ||
    (isCultural
      ? `How did “${cultural.query}” travel through society across platforms, communities, and markets?`
      : `What have humans meant when they reported experiences resembling “${emotional.normalizedExperience}”?`);

  const majorFindings = isCultural
    ? [
        cultural.definition,
        ...cultural.origins.slice(0, 2),
        ...cultural.survivingMeanings.slice(0, 2),
        ...cultural.commercialAbsorption.slice(0, 2),
        ...cultural.counterSignals.slice(0, 2),
      ]
    : [
        ...emotional.commonInterpretations.slice(0, 2),
        ...emotional.alternativeInterpretations.slice(0, 2),
        ...emotional.neighboringFeelings.slice(0, 2),
        ...emotional.communityPatterns.slice(0, 1),
      ];

  const map = isCultural
    ? [
        ...cultural.lineage.map((s) => ({
          id: s.stageId,
          label: s.label,
          summary: s.description,
          kind: `lineage:${s.stage}`,
          confidence: s.confidence,
        })),
        ...cultural.culturalCodes.map((c) => ({
          id: c.codeId,
          label: c.label,
          summary: c.description,
          kind: `code:${c.category}`,
          confidence: c.confidence,
        })),
      ]
    : emotional.interpretiveNeighborhoods.map((n) => ({
        id: n.neighborhoodId,
        label: n.label,
        summary: n.description,
        kind: `neighborhood:${n.status}`,
        confidence: n.relevanceScore,
      }));

  const timeline = isCultural
    ? cultural.lineage.map((s) => ({
        id: s.stageId,
        label: s.label,
        summary: s.description,
        startYear: s.startYear,
        endYear: s.endYear,
      }))
    : [
        {
          id: "timeline_present",
          label: "Present interpretive window",
          summary:
            "Emotional Residue maps reported-experience neighborhoods in the current corpus; it is not a clinical timeline.",
        },
      ];

  const modelProposedClaimCount = countModelProposed(result);
  const executiveSummary = isCultural
    ? [
        `Residue analysis of “${cultural.query}” across ${result.sources.length} source(s) and ${result.evidence.length} evidence record(s).`,
        cultural.definition.statement,
        `Strongest evidence layer: ${result.confidenceSummary.strongestEvidenceLayer}. ${result.confidenceSummary.summary}`,
      ].join(" ")
    : [
        `Interpretive neighborhood map for a reported experience (non-diagnostic).`,
        `Neighborhoods: ${emotional.interpretiveNeighborhoods.map((n) => n.label).join("; ") || "thin corpus"}.`,
        emotional.safetyNotice,
        result.confidenceSummary.summary,
      ].join(" ");

  const implications = isCultural
    ? [
        "Platform amplification and retail absorption may diverge from earlier niche meanings.",
        "Model-proposed antecedents require archival corroboration before historical claims.",
      ]
    : [
        "Multiple interpretive neighborhoods should remain visible — avoid collapsing to one label.",
        "Community reports describe language and patterns; they do not validate personal beliefs.",
      ];

  const opportunities = isCultural
    ? [
        "Trace a countersignal cohort before saturation peaks.",
        "Compare visual vs infrastructural codes for editorial differentiation.",
      ]
    : [
        "Pair research-layer sources with community language for balanced reflection prompts.",
        "Use alternative interpretations as friction against single-story readings.",
      ];

  const risks = isCultural
    ? [
        "Over-trusting thin social evidence as historical fact.",
        "Treating commercial lookbooks as origin rather than absorption.",
      ]
    : [
        "Diagnostic overreach or fake clinical precision.",
        "Confirming unsupported mind-reading beliefs from community consensus.",
      ];

  const uncertainty = [
    ...result.metadata.warnings,
    ...result.evidenceGaps,
    ...(isCultural ? [] : emotional.uncertaintyFlags),
  ];

  const recommendedNextResearchQuestions = isCultural
    ? [
        `Which primary archives document pre-platform uses of “${cultural.query}?`,
        "What disconfirming countersignals appear outside English-language retail media?",
        "Where does computational recommendation language enter the corpus explicitly?",
      ]
    : [
        "Which Layer A sources address neighboring constructs without diagnosing individuals?",
        "How do memoir/literature framings differ from forum narratives for this experience cluster?",
        "What response patterns are described as helpful vs intensifying — with what caveats?",
      ];

  return intelligenceReportSchema.parse({
    reportId: options?.reportId ?? `report_${result.metadata.runId}`,
    mode: result.metadata.mode,
    title,
    dek: isCultural
      ? "Structured cultural travel map with provenance and uncertainty."
      : "Non-diagnostic interpretive neighborhood map with evidence separation.",
    executiveSummary,
    researchQuestion,
    sourceCorpus: {
      sourceCount: manifest.total,
      byType: manifest.byType,
      byLayer: manifest.byLayer,
      sources: result.sources,
    },
    majorFindings,
    culturalOrInterpretiveMap: map,
    timeline,
    meanMedianMode: mmm,
    implications,
    opportunities,
    risks,
    uncertainty,
    evidenceAudit: {
      evidenceCount: result.evidence.length,
      modelProposedClaimCount,
      strongestLayer: result.confidenceSummary.strongestEvidenceLayer,
      gaps: result.evidenceGaps,
    },
    sourceManifest: {
      total: manifest.total,
      byType: manifest.byType,
      byLayer: manifest.byLayer,
    },
    recommendedNextResearchQuestions,
    usedContext: result.usedContext,
    confidence: result.confidenceSummary,
    safetyNotice: isCultural ? undefined : emotional.safetyNotice,
    schemaVersion: result.metadata.schemaVersion,
    promptVersion: result.metadata.promptVersion,
    runId: result.metadata.runId,
    createdAt: result.metadata.createdAt,
  });
}

function countModelProposed(result: ResidueReportSource): number {
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
    ].filter((x) => x.status === "model-proposed").length;
  }
  const e = result as EmotionalResidueResult;
  return [
    ...e.neighboringFeelings,
    ...e.commonInterpretations,
    ...e.alternativeInterpretations,
    ...e.therapeuticModels,
  ].filter((x) => x.status === "model-proposed").length;
}

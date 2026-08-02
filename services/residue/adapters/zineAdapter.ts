/**
 * Zine adapter — structured page specs from a residue run (no LLM generation).
 */

import { z } from "zod";
import type { ZinePageSpec } from "../../../types";
import {
  collectResidueClaims,
  topicOf,
  type ResidueAdapterSource,
} from "./sharedClaims";
import type { CulturalResidueResult, EmotionalResidueResult } from "../validation";

export const residueZineArtifactSchema = z.object({
  artifactId: z.string().min(1),
  runId: z.string().min(1),
  mode: z.enum(["cultural", "emotional"]),
  title: z.string().min(1),
  dek: z.string().min(1),
  pages: z.array(
    z.object({
      pageNumber: z.number().int().min(1),
      headline: z.string().min(1),
      bodyCopy: z.string().min(1),
      supportingText: z.string().optional(),
      imagePrompt: z.string().min(1),
      pageType: z.enum(["standard", "thread_timeline"]).optional(),
    }),
  ),
  sourceClaimIds: z.array(z.string()),
  confidenceOverall: z.number().min(0).max(1),
  safetyNotice: z.string().optional(),
  schemaVersion: z.string(),
  promptVersion: z.string(),
  createdAt: z.string(),
});

export type ResidueZineArtifact = z.infer<typeof residueZineArtifactSchema>;

export function adaptResidueToZinePages(
  result: ResidueAdapterSource,
  options?: { artifactId?: string; pageCount?: number },
): ResidueZineArtifact {
  const isCultural = result.metadata.mode === "cultural";
  const cultural = result as CulturalResidueResult;
  const emotional = result as EmotionalResidueResult;
  const topic = topicOf(result);
  const maxPages = Math.max(3, Math.min(options?.pageCount ?? 6, 10));

  const draftPages: Array<Omit<ZinePageSpec, "image_url" | "threadData">> = [];

  if (isCultural) {
    draftPages.push({
      pageNumber: 1,
      headline: topic,
      bodyCopy: cultural.definition.statement,
      supportingText: `Evidence layer ${result.confidenceSummary.strongestEvidenceLayer}`,
      imagePrompt: `Editorial still life evoking “${topic}” cultural residue, flash photography mood, archival texture`,
      pageType: "standard",
    });
    for (const stage of cultural.lineage.slice(0, 2)) {
      draftPages.push({
        pageNumber: draftPages.length + 1,
        headline: stage.label,
        bodyCopy: stage.description,
        supportingText: stage.startYear ? `c. ${stage.startYear}` : undefined,
        imagePrompt: `Timeline plate for “${stage.label}” — ${stage.stage} stage of ${topic}`,
        pageType: "thread_timeline",
      });
    }
    for (const code of cultural.culturalCodes.slice(0, 2)) {
      draftPages.push({
        pageNumber: draftPages.length + 1,
        headline: code.label,
        bodyCopy: code.description,
        supportingText: `Code · ${code.category}`,
        imagePrompt: `Visual code study: ${code.label} (${code.category})`,
        pageType: "standard",
      });
    }
    for (const counter of cultural.counterSignals.slice(0, 1)) {
      draftPages.push({
        pageNumber: draftPages.length + 1,
        headline: "Countersignal",
        bodyCopy: counter.statement,
        imagePrompt: `Contrasting plate against mainstream absorption of “${topic}”`,
        pageType: "standard",
      });
    }
  } else {
    draftPages.push({
      pageNumber: 1,
      headline: "Interpretive neighborhoods",
      bodyCopy:
        emotional.interpretiveNeighborhoods
          .map((n) => `${n.label}: ${n.description}`)
          .join(" ") || emotional.safetyNotice,
      supportingText: "Non-diagnostic map",
      imagePrompt: "Soft abstract mapping of emotional neighborhoods, no clinical iconography",
      pageType: "standard",
    });
    for (const n of emotional.interpretiveNeighborhoods.slice(0, 3)) {
      draftPages.push({
        pageNumber: draftPages.length + 1,
        headline: n.label,
        bodyCopy: n.description,
        supportingText: n.status,
        imagePrompt: `Quiet reflective image for neighborhood “${n.label}”`,
        pageType: "standard",
      });
    }
    for (const alt of emotional.alternativeInterpretations.slice(0, 1)) {
      draftPages.push({
        pageNumber: draftPages.length + 1,
        headline: "Another reading",
        bodyCopy: alt.statement,
        imagePrompt: "Split-page metaphor for alternate interpretations",
        pageType: "standard",
      });
    }
  }

  const pages = draftPages.slice(0, maxPages).map((p, i) => ({
    ...p,
    pageNumber: i + 1,
  }));

  // Ensure minimum page count with evidence/gaps filler if corpus is thin
  while (pages.length < 3) {
    pages.push({
      pageNumber: pages.length + 1,
      headline: "Evidence gap",
      bodyCopy: result.evidenceGaps[0] || "Corpus is thin; treat synthesis as provisional.",
      imagePrompt: `Sparse archival grid acknowledging uncertainty around “${topic}”`,
      pageType: "standard",
    });
  }

  const claims = collectResidueClaims(result);

  return residueZineArtifactSchema.parse({
    artifactId: options?.artifactId ?? `zine_${result.metadata.runId}`,
    runId: result.metadata.runId,
    mode: result.metadata.mode,
    title: isCultural ? `Residue Zine · ${topic}` : `Residue Zine · interpretive map`,
    dek: isCultural
      ? "Structured cultural travel pages with provenance-aware copy."
      : "Non-diagnostic neighborhood pages — not a clinical story.",
    pages,
    sourceClaimIds: claims.map((c) => c.claimId).slice(0, 24),
    confidenceOverall: result.confidenceSummary.overallConfidence,
    safetyNotice: isCultural ? undefined : emotional.safetyNotice,
    schemaVersion: result.metadata.schemaVersion,
    promptVersion: result.metadata.promptVersion,
    createdAt: result.metadata.createdAt,
  });
}

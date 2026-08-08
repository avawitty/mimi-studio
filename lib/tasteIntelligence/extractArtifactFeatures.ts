/**
 * Two-layer feature extraction from generated artifacts.
 * Layer A: deterministic lexical / layout / metadata extraction.
 * Layer B: optional AI-assisted structured claims (server-only).
 */
import { z } from "zod";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import type { TasteCandidateInput } from "../tasteModel/contracts.js";
import type {
  GeneratedArtifactForTasteCritique,
  GeneratedArtifactMedium,
} from "./generatedArtifact.js";
import { isCritiquableArtifact } from "./generatedArtifact.js";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "we",
  "our",
  "you",
  "your",
  "he",
  "she",
  "his",
  "her",
]);

export type FeatureClaimSource = "text" | "layout" | "image" | "metadata";

export interface ExtractedFeatureClaim {
  label: string;
  confidence: number;
  source: FeatureClaimSource;
}

export type ExtractionCompleteness = "full" | "partial" | "failed";

export interface FeatureExtractionProvenance {
  source: "deterministic" | "ai";
  provider?: string;
  model?: string;
  featureCount: number;
}

export interface ArtifactFeatureExtraction {
  featureIds: string[];
  labels: string[];
  tags: string[];
  evidenceIds: string[];
  claims: ExtractedFeatureClaim[];
  completeness: ExtractionCompleteness;
  partialReason?: string;
  provenance: FeatureExtractionProvenance[];
  lexical: {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    repeatedTerms: string[];
    density: number;
  };
  layout: {
    pageCount: number;
    pagesWithText: number;
    pagesWithImages: number;
    textImageRatio: number;
  };
}

export interface ExtractArtifactFeaturesInput {
  artifact: GeneratedArtifactForTasteCritique;
  snapshot: TasteModelSnapshot;
  /** When true and gateway key present, run AI-assisted extraction. */
  allowAiExtraction?: boolean;
  apiKey?: string;
}

function collectArtifactText(artifact: GeneratedArtifactForTasteCritique): string {
  const parts: string[] = [];
  if (artifact.text) parts.push(artifact.text);
  for (const page of artifact.pages ?? []) {
    if (page.text) parts.push(page.text);
  }
  return parts.join("\n").trim();
}

function analyzeLexical(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const repeatedTerms = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term]) => term);

  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = wordCount / sentenceCount;
  const density = wordCount / Math.max(text.length / 100, 1);

  return {
    wordCount,
    sentenceCount,
    avgSentenceLength,
    repeatedTerms,
    density,
  };
}

function analyzeLayout(artifact: GeneratedArtifactForTasteCritique) {
  const pages = artifact.pages ?? [];
  const pagesWithText = pages.filter((p) => p.text?.trim()).length;
  const pagesWithImages = pages.filter((p) => p.imageRef).length;
  const pageCount = pages.length;
  const textImageRatio =
    pageCount > 0 ? pagesWithText / Math.max(pagesWithImages, 1) : 0;

  return { pageCount, pagesWithText, pagesWithImages, textImageRatio };
}

function matchSnapshotFeatures(
  terms: string[],
  snapshot: TasteModelSnapshot,
): {
  featureIds: string[];
  labels: string[];
  evidenceIds: string[];
  claims: ExtractedFeatureClaim[];
} {
  const featureIds: string[] = [];
  const labels: string[] = [];
  const evidenceIds: string[] = [];
  const claims: ExtractedFeatureClaim[] = [];
  const termSet = new Set(terms.map((t) => t.toLowerCase()));

  for (const fw of snapshot.featureWeights) {
    const labelLower = fw.label.toLowerCase();
    const matched =
      termSet.has(labelLower) ||
      [...termSet].some(
        (t) => labelLower.includes(t) || t.includes(labelLower),
      );
    if (matched) {
      featureIds.push(fw.featureId);
      labels.push(fw.label);
      evidenceIds.push(...fw.sourceIds);
      claims.push({
        label: fw.label,
        confidence: fw.confidence,
        source: "text",
      });
    }
  }

  return {
    featureIds: [...new Set(featureIds)],
    labels: [...new Set(labels)],
    evidenceIds: [...new Set(evidenceIds)],
    claims,
  };
}

function extractMetadataMotifs(
  artifact: GeneratedArtifactForTasteCritique,
): string[] {
  const motifs: string[] = [];
  const meta = artifact.generationMetadata ?? {};
  if (Array.isArray(meta.tastePalette)) {
    motifs.push(...meta.tastePalette.map(String));
  }
  if (meta.tasteArchetype) motifs.push(String(meta.tasteArchetype));
  if (meta.theme) motifs.push(String(meta.theme));
  if (meta.intent) motifs.push(String(meta.intent));
  return motifs.map((m) => m.toLowerCase());
}

const aiFeatureSchema = z.object({
  features: z.array(
    z.object({
      label: z.string(),
      confidence: z.number().min(0).max(1),
      source: z.enum(["text", "layout", "image", "metadata"]),
    }),
  ),
});

async function extractAiFeatures(
  artifact: GeneratedArtifactForTasteCritique,
  text: string,
  apiKey?: string,
): Promise<{
  claims: ExtractedFeatureClaim[];
  provenance: FeatureExtractionProvenance;
} | null> {
  const key = apiKey ?? process.env.AI_GATEWAY_API_KEY ?? process.env.AI_GATEWAY_KEY;
  if (!key || !text.trim()) return null;

  try {
    const { generateGatewayObject } = await import("../ai/generate.js");
    const result = await generateGatewayObject({
      prompt: `Extract aesthetic and editorial feature claims from this generated artifact output. Return only observable features — motifs, tone, density, composition patterns, palette cues. Do not infer sensitive personal traits. Do not repeat prompt tags unless clearly present in the output text.

Medium: ${artifact.medium}
Output text (truncated):
${text.slice(0, 4000)}`,
      system:
        "You are a taste feature extractor. Return structured feature claims with confidence 0-1. No chain-of-thought.",
      schema: aiFeatureSchema,
      role: "textFast",
      temperature: 0.2,
      apiKey: key,
    });

    const claims: ExtractedFeatureClaim[] = result.object.features.map((f) => ({
      label: f.label,
      confidence: f.confidence,
      source: f.source,
    }));

    return {
      claims,
      provenance: {
        source: "ai",
        provider: "vercel-ai-gateway",
        model: result.model,
        featureCount: claims.length,
      },
    };
  } catch {
    return null;
  }
}

export function extractDeterministicArtifactFeatures(
  artifact: GeneratedArtifactForTasteCritique,
  snapshot: TasteModelSnapshot,
): ArtifactFeatureExtraction {
  const text = collectArtifactText(artifact);
  const lexical = analyzeLexical(text || " ");
  const layout = analyzeLayout(artifact);

  const terms = [
    ...lexical.repeatedTerms,
    ...extractMetadataMotifs(artifact),
    ...text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w))
      .slice(0, 80),
  ];

  const matched = matchSnapshotFeatures(terms, snapshot);
  const tags = [
    ...matched.labels.map((l) => l.toLowerCase()),
    ...lexical.repeatedTerms,
    ...extractMetadataMotifs(artifact),
  ];

  const claims: ExtractedFeatureClaim[] = [...matched.claims];

  if (layout.pageCount > 0) {
    claims.push({
      label: `${layout.pageCount}-page layout`,
      confidence: 1,
      source: "layout",
    });
  }
  if (layout.textImageRatio > 1.5) {
    claims.push({
      label: "text-dominant composition",
      confidence: 0.85,
      source: "layout",
    });
  } else if (layout.textImageRatio < 0.5 && layout.pagesWithImages > 0) {
    claims.push({
      label: "image-dominant composition",
      confidence: 0.85,
      source: "layout",
    });
  }
  if (lexical.avgSentenceLength > 25) {
    claims.push({
      label: "long-form sentences",
      confidence: 0.8,
      source: "text",
    });
  } else if (lexical.avgSentenceLength < 12 && lexical.sentenceCount > 2) {
    claims.push({
      label: "short punchy sentences",
      confidence: 0.8,
      source: "text",
    });
  }

  const hasImages = (artifact.imageRefs?.length ?? 0) > 0;
  const completeness: ExtractionCompleteness =
    !text.trim() && !hasImages
      ? "failed"
      : hasImages && layout.pagesWithImages < layout.pageCount
        ? "partial"
        : "full";

  const partialReason =
    completeness === "partial"
      ? "Mimi could evaluate text and layout metadata but not the generated imagery."
      : completeness === "failed"
        ? "No extractable text or image references in generated output."
        : undefined;

  return {
    featureIds: matched.featureIds,
    labels: [...new Set([...matched.labels, ...claims.map((c) => c.label)])],
    tags: [...new Set(tags)],
    evidenceIds: matched.evidenceIds,
    claims,
    completeness,
    partialReason,
    provenance: [
      {
        source: "deterministic",
        featureCount: claims.length,
      },
    ],
    lexical,
    layout,
  };
}

export async function extractArtifactFeatures(
  input: ExtractArtifactFeaturesInput,
): Promise<ArtifactFeatureExtraction> {
  const { artifact, snapshot, allowAiExtraction, apiKey } = input;

  if (!isCritiquableArtifact(artifact)) {
    return {
      featureIds: [],
      labels: [],
      tags: [],
      evidenceIds: [],
      claims: [],
      completeness: "failed",
      partialReason: "No extractable content in generated artifact.",
      provenance: [],
      lexical: {
        wordCount: 0,
        sentenceCount: 0,
        avgSentenceLength: 0,
        repeatedTerms: [],
        density: 0,
      },
      layout: {
        pageCount: 0,
        pagesWithText: 0,
        pagesWithImages: 0,
        textImageRatio: 0,
      },
    };
  }

  const base = extractDeterministicArtifactFeatures(artifact, snapshot);
  const text = collectArtifactText(artifact);

  const needsAi =
    allowAiExtraction &&
    (base.completeness === "partial" ||
      base.labels.length < 3 ||
      text.length > 200);

  if (!needsAi) return base;

  const aiResult = await extractAiFeatures(artifact, text, apiKey);
  if (!aiResult) return base;

  const aiMatched = matchSnapshotFeatures(
    aiResult.claims.map((c) => c.label.toLowerCase()),
    snapshot,
  );

  return {
    ...base,
    featureIds: [...new Set([...base.featureIds, ...aiMatched.featureIds])],
    labels: [
      ...new Set([
        ...base.labels,
        ...aiResult.claims.map((c) => c.label),
      ]),
    ],
    tags: [
      ...new Set([
        ...base.tags,
        ...aiResult.claims.map((c) => c.label.toLowerCase()),
      ]),
    ],
    evidenceIds: [...new Set([...base.evidenceIds, ...aiMatched.evidenceIds])],
    claims: [...base.claims, ...aiResult.claims],
    provenance: [...base.provenance, aiResult.provenance],
    completeness:
      base.completeness === "partial" ? "partial" : base.completeness,
  };
}

export function artifactExtractionToCandidate(
  artifact: GeneratedArtifactForTasteCritique,
  extraction: ArtifactFeatureExtraction,
): TasteCandidateInput {
  return {
    id: artifact.id,
    featureIds: extraction.featureIds,
    tags: extraction.tags,
  };
}

export function mediumFromArtifact(
  medium: GeneratedArtifactMedium,
): GeneratedArtifactMedium {
  return medium;
}

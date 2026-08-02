/**
 * Evidence extraction — offline heuristic + optional LLM merge.
 */

import { layerForSourceType, sourceQualityScore } from "../scoring";
import type { EvidenceRecord, EvidenceStrength, SourceReference } from "../validation";

export function extractEvidenceOffline(input: {
  query: string;
  sources: SourceReference[];
}): EvidenceRecord[] {
  const evidence: EvidenceRecord[] = [];
  const q = input.query.toLowerCase();

  for (const source of input.sources) {
    const text =
      (typeof source.metadata?.fullText === "string" && source.metadata.fullText) ||
      source.excerpt ||
      source.title ||
      "";
    if (!text.trim()) {
      evidence.push({
        evidenceId: `ev_${source.sourceId}_meta`,
        sourceId: source.sourceId,
        claimSupported: `Source registered for "${input.query}" without extractable body text.`,
        evidenceStrength: "speculative",
        sourceQualityScore: sourceQualityScore(source.sourceType, "speculative"),
        relevanceScore: 0.25,
        limitations: ["No body text available at acquisition time."],
        evidenceLayer: source.evidenceLayer ?? layerForSourceType(source.sourceType),
      });
      continue;
    }

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 28)
      .slice(0, 4);

    const candidates = sentences.length > 0 ? sentences : [text.slice(0, 240)];
    candidates.forEach((sentence, index) => {
      const relevance = clamp01(
        (sentence.toLowerCase().includes(q) ? 0.35 : 0.15) +
          Math.min(sentence.length / 400, 0.4) +
          (source.evidenceLayer === "A" ? 0.2 : source.evidenceLayer === "B" ? 0.1 : 0),
      );
      const strength = strengthFor(source, relevance);
      evidence.push({
        evidenceId: `ev_${source.sourceId}_${index}`,
        sourceId: source.sourceId,
        claimSupported: sentence,
        excerpt: sentence.slice(0, 280),
        evidenceStrength: strength,
        sourceQualityScore: sourceQualityScore(source.sourceType, strength),
        relevanceScore: relevance,
        limitations: limitationsFor(source),
        evidenceLayer: source.evidenceLayer ?? layerForSourceType(source.sourceType),
      });
    });
  }

  return evidence;
}

function strengthFor(source: SourceReference, relevance: number): EvidenceStrength {
  if (source.sourceType === "academic-research" && relevance > 0.5) return "strong";
  if (source.sourceType === "journalism" && relevance > 0.4) return "moderate";
  if (source.sourceType === "reddit" || source.sourceType === "forum" || source.sourceType === "social-post") {
    return relevance > 0.55 ? "moderate" : "weak";
  }
  if (source.sourceType === "user-note") return "weak";
  return relevance > 0.6 ? "moderate" : "weak";
}

function limitationsFor(source: SourceReference): string[] {
  const layer = source.evidenceLayer ?? layerForSourceType(source.sourceType);
  if (layer === "C") {
    return ["Community-reported language; not proof of objective cultural fact."];
  }
  if (layer === "D") return ["Model-adjacent or synthetic source."];
  if (!source.url && source.sourceType !== "user-note") {
    return ["Missing durable URL locator."];
  }
  return [];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

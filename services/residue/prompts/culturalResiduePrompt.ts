import { CULTURAL_RESIDUE_SYSTEM_PROMPT } from "./sharedSystemPrompt";

export { CULTURAL_RESIDUE_SYSTEM_PROMPT };

export function buildCulturalNormalizePrompt(input: {
  query: string;
  researchQuestion?: string;
  userNotes?: string[];
  sourceUrls?: string[];
}): string {
  return [
    `Normalize this cultural inquiry for Residue analysis.`,
    `Query: ${input.query}`,
    input.researchQuestion ? `Research question: ${input.researchQuestion}` : "",
    input.sourceUrls?.length ? `Source URLs:\n${input.sourceUrls.map((u) => `- ${u}`).join("\n")}` : "",
    input.userNotes?.length ? `User notes:\n${input.userNotes.map((n) => `- ${n}`).join("\n")}` : "",
    `Return a concise normalized inquiry, key terms, and analysis angles. Do not invent sources.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCulturalEvidencePrompt(input: {
  query: string;
  sourcesBlock: string;
}): string {
  return [
    `Extract evidence records for cultural residue about "${input.query}".`,
    `Only use the sources below. If a claim is not supported, omit it.`,
    `Sources:\n${input.sourcesBlock}`,
    `For each evidence item: claimSupported, sourceId, excerpt if present, evidenceStrength, limitations.`,
  ].join("\n\n");
}

export function buildCulturalSynthesisPrompt(input: {
  query: string;
  evidenceBlock: string;
  researchQuestion?: string;
}): string {
  return [
    `Synthesize a Cultural Residue result for "${input.query}".`,
    input.researchQuestion ? `Research question: ${input.researchQuestion}` : "",
    `Evidence corpus:\n${input.evidenceBlock}`,
    `Produce definition, origins, lineage stages, cultural codes, descendants, surviving/lost/computational meanings, commercial absorption, countersignals, associations, and evidenceGaps.`,
    `Mark unsupported links as status "model-proposed" with low confidence.`,
    `Never invent source IDs that are not in the evidence corpus.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCounterSignalPrompt(input: {
  query: string;
  thesisBlock: string;
  evidenceBlock: string;
}): string {
  return [
    `Search for countersignals / fatigue / opposition to the cultural thesis for "${input.query}".`,
    `Current thesis material:\n${input.thesisBlock}`,
    `Evidence corpus:\n${input.evidenceBlock}`,
    `Return counter-claims only when grounded in the corpus, otherwise propose cautious model-proposed countersignals labeled as such.`,
  ].join("\n\n");
}

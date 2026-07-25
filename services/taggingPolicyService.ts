const normalizeTag = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

export const mergeTags = (...groups: Array<string[] | undefined>): string[] =>
  Array.from(
    new Set(
      groups
        .flatMap((group) => group ?? [])
        .map(normalizeTag)
        .filter(Boolean),
    ),
  ).slice(0, 16);

export interface DeterministicTagInput {
  objectType: string;
  sourceType?: string;
  resultKind?: string;
  originType?: string;
  projectId?: string;
}

/**
 * Free, explainable tags applied at capture time. These keep every object
 * filterable even when funded generation is unavailable.
 */
export const deriveDeterministicTags = (
  input: DeterministicTagInput,
): string[] =>
  mergeTags([
    "mimi",
    input.objectType,
    input.sourceType ?? "",
    input.resultKind ?? "",
    input.originType ?? "",
    input.projectId ? `project_${input.projectId}` : "",
  ]);

/**
 * Funded semantic tagging is reserved for an explicit save/approval boundary.
 * A failed model call never blocks persistence; deterministic tags remain.
 */
export const generateTagsForSavedArtifact = async (
  content: string,
  deterministicTags: string[],
  mediaItems: Array<Record<string, unknown>> = [],
): Promise<{ tags: string[]; tagSource: "deterministic" | "mixed" }> => {
  try {
    const { generateTagsFromMedia } = await import("./geminiService");
    const generated = await generateTagsFromMedia(content, mediaItems);
    if (generated.length === 0) {
      return { tags: deterministicTags, tagSource: "deterministic" };
    }
    return {
      tags: mergeTags(deterministicTags, generated),
      tagSource: "mixed",
    };
  } catch (error) {
    console.warn(
      "MIMI // Funded tag generation unavailable; deterministic tags retained.",
      error,
    );
    return { tags: deterministicTags, tagSource: "deterministic" };
  }
};

export interface OriginAwareFindingTagInput {
  title: string;
  snippet?: string;
  url?: string;
  query: string;
  originType: string;
  originArtifactTitle?: string;
  originSignalId?: string;
  originLabel?: string;
  deterministicTags: string[];
}

/**
 * Adds the originating zine and search motif to the semantic tagging prompt.
 * Gemini extracts themes only at the creator's explicit Save Finding boundary;
 * deterministic origin tags remain available when funded generation is offline.
 */
export const generateOriginAwareFindingTags = async (
  input: OriginAwareFindingTagInput,
): Promise<{ tags: string[]; tagSource: "deterministic" | "mixed" }> => {
  const originTags = mergeTags(input.deterministicTags, [
    input.originType === "semiotic_signal" ? "grounding_signal" : "",
    input.originArtifactTitle
      ? `origin_zine_${input.originArtifactTitle}`
      : "",
    input.originSignalId ? `origin_signal_${input.originSignalId}` : "",
  ]);
  const context = [
    `Saved finding: ${input.title}`,
    input.snippet ? `Finding evidence: ${input.snippet}` : "",
    input.url ? `Source URL: ${input.url}` : "",
    input.originArtifactTitle
      ? `Originating zine: ${input.originArtifactTitle}`
      : "",
    input.originLabel ? `Origin context: ${input.originLabel}` : "",
    input.originSignalId ? `Origin signal: ${input.originSignalId}` : "",
    `Search motif: ${input.query}`,
    "Extract concise thematic concepts that will make this evidence easy to organize in a creative Build Brief.",
  ]
    .filter(Boolean)
    .join("\n");

  return generateTagsForSavedArtifact(context, originTags);
};

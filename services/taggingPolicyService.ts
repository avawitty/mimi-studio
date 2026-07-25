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

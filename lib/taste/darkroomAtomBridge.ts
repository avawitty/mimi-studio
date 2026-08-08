import type { StyleTreatment } from "../../types";
import type { CreateEvidenceAtomInput } from "./evidenceAtomSchema";

function pickHttpUrl(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return undefined;
}

/** Deterministic EvidenceAtom id for a Darkroom fragment or saved treatment. */
export function darkroomEvidenceAtomId(darkroomItemId: string): string {
  return `darkroom_${darkroomItemId}`;
}

/**
 * Mirror a Darkroom collection fragment (`users/{uid}/darkroom/{id}`).
 */
export function darkroomFragmentToAtomInput(
  darkroomId: string,
  item: Record<string, unknown>,
): CreateEvidenceAtomInput | null {
  const text =
    (typeof item.notes === "string" && item.notes.trim()) ||
    (typeof item.title === "string" && item.title.trim()) ||
    (typeof item.text === "string" && item.text.trim()) ||
    (typeof item.source === "string" && item.source.trim()) ||
    "";

  const assetUrl = pickHttpUrl(
    item.imageUrl,
    item.image,
    item.url,
    item.resultUrl,
    item.thumbnailUrl,
  );

  if (!text && !assetUrl) return null;

  const original = text
    ? text.slice(0, 10_000)
    : `darkroom ${typeof item.type === "string" ? item.type : "fragment"}`;

  return {
    kind: assetUrl ? "image" : "note",
    sourceType: assetUrl ? "image" : "note",
    originalSource: original,
    assetUrl,
    thumbnailUrl: pickHttpUrl(item.thumbnailUrl, item.imageUrl),
    contextScope: "editorial",
    sourceMetadata: {
      darkroomId,
      type: item.type ?? null,
      source: item.source ?? "darkroom",
      ...(item.tags && Array.isArray(item.tags) ? { tags: item.tags } : {}),
    },
    ingestSource: "darkroom",
    tasteImpact: true,
    stabilityClass: "recurring",
  };
}

/**
 * Mirror a saved Darkroom StyleTreatment (profile.savedTreatments).
 */
export function darkroomTreatmentToAtomInput(
  treatment: StyleTreatment,
): CreateEvidenceAtomInput | null {
  const taste = treatment.canonicalTaste;
  const parts = [
    treatment.treatmentName?.trim(),
    ...(taste.motifs ?? []),
    ...(taste.palette ?? []),
    ...(taste.mood ?? []),
    ...(taste.form ?? []),
    ...(taste.era_refs ?? []),
    ...(taste.prompt_fragments ?? []),
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);

  if (parts.length === 0) return null;

  return {
    kind: "generated",
    sourceType: "moodboard",
    originalSource: parts.join("\n").slice(0, 10_000),
    contextScope: "editorial",
    sourceMetadata: {
      styleTreatmentId: treatment.id,
      treatmentName: treatment.treatmentName,
      density: taste.density,
      entropy: taste.entropy,
      noveltyScore: taste.novelty_score,
      ...(treatment.tags?.length ? { tags: treatment.tags } : {}),
    },
    ingestSource: "darkroom",
    tasteImpact: true,
    stabilityClass: "stable",
  };
}

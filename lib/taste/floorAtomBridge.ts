import type { ZineMetadata } from "../../types";
import type { CreateEvidenceAtomInput } from "./evidenceAtomSchema";

export function floorZineEvidenceAtomId(zineId: string): string {
  return `floor_${zineId}`;
}

function pickHttpUrl(url?: string | null): string | undefined {
  return typeof url === "string" && url.startsWith("http") ? url : undefined;
}

/**
 * Mirror a published Stand Floor zine into the canonical EvidenceAtom shape.
 */
export function floorZineToAtomInput(zine: ZineMetadata): CreateEvidenceAtomInput | null {
  if (!zine.isPublic) return null;

  const original = [
    zine.title?.trim(),
    zine.concept?.trim(),
    zine.summary?.trim(),
    zine.theme ? `Theme: ${zine.theme}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 10_000);

  if (!original) return null;

  return {
    kind: "generated",
    sourceType: "moodboard",
    originalSource: original,
    assetUrl: pickHttpUrl(zine.coverImageUrl),
    thumbnailUrl: pickHttpUrl(zine.coverImageUrl),
    contextScope: "editorial",
    sourceMetadata: {
      zineId: zine.id,
      publishedAt: zine.publishedAt ?? zine.timestamp,
      userHandle: zine.userHandle,
      tone: zine.tone,
      floorPublish: true,
    },
    ingestSource: "direct",
    tasteImpact: true,
    stabilityClass: "stable",
  };
}

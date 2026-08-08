import type { EvidenceSourceType, PocketItem } from "../../types";
import type { CreateEvidenceAtomInput } from "./evidenceAtomSchema";

function pocketKindFromType(type: PocketItem["type"]): CreateEvidenceAtomInput["kind"] {
  switch (type) {
    case "image":
    case "moodboard":
    case "zine_card":
      return "image";
    case "video":
      return "film";
    case "link":
      return "url";
    case "text":
    case "voicenote":
    case "script":
    case "analysis_report":
    case "omen":
    case "roadmap":
      return "text";
    default:
      return "note";
  }
}

function sourceTypeFromPocketType(type: PocketItem["type"]): EvidenceSourceType {
  switch (type) {
    case "image":
    case "moodboard":
    case "zine_card":
      return "image";
    case "video":
      return "film";
    case "link":
      return "website";
    case "voicenote":
      return "note";
    default:
      return "note";
  }
}

function originalSourceFromPocket(item: PocketItem): string {
  const content = item.content || {};
  const candidates = [
    content.url,
    content.link,
    content.text,
    content.prompt,
    content.title,
    content.notes,
    item.notes,
    item.tags?.length ? item.tags.join(", ") : "",
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return `${item.type} pocket capture`;
}

function assetUrlFromPocket(item: PocketItem): string | undefined {
  const content = item.content || {};
  const candidates = [
    content.imageUrl,
    content.image,
    ...(Array.isArray(content.mediaUrls) ? content.mediaUrls : []),
    content.thumbnail,
  ];
  for (const url of candidates) {
    if (typeof url === "string" && url.startsWith("http")) return url;
  }
  return undefined;
}

/**
 * Mirror a Pocket item into the canonical EvidenceAtom shape.
 * Non-blocking — callers should fire-and-forget and log failures.
 */
export function pocketItemToAtomInput(item: PocketItem): CreateEvidenceAtomInput {
  const assetUrl = assetUrlFromPocket(item);

  return {
    kind: pocketKindFromType(item.type),
    sourceType: sourceTypeFromPocketType(item.type),
    originalSource: originalSourceFromPocket(item),
    assetUrl,
    thumbnailUrl: assetUrl,
    contextScope: "global",
    sourceMetadata: {
      pocketItemId: item.id,
      pocketType: item.type,
      savedAt: item.savedAt,
      ...(item.tags?.length ? { tags: item.tags } : {}),
      ...(item.stackIds?.length ? { stackIds: item.stackIds } : {}),
      ...(item.treatmentApplied ? { treatmentApplied: item.treatmentApplied } : {}),
    },
    ingestSource: "pocket",
    tasteImpact: true,
    stabilityClass: "recurring",
  };
}

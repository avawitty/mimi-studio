import type { PocketItem } from "../../types";
import type { CreateEvidenceAtomInput } from "./evidenceAtomSchema";

function pocketKind(type: PocketItem["type"]): CreateEvidenceAtomInput["kind"] {
  switch (type) {
    case "image":
    case "video":
    case "zine_card":
    case "moodboard":
      return "image";
    case "link":
      return "url";
    case "script":
    case "analysis_report":
      return "text";
    case "voicenote":
    case "omen":
    case "roadmap":
      return "note";
    default:
      return "note";
  }
}

function pocketSourceType(type: PocketItem["type"]): CreateEvidenceAtomInput["sourceType"] {
  switch (type) {
    case "image":
    case "moodboard":
    case "zine_card":
      return "image";
    case "video":
      return "film";
    case "link":
      return "website";
    case "script":
    case "analysis_report":
      return "note";
    case "voicenote":
      return "music";
    case "text":
      return "note";
    default:
      return "note";
  }
}

function pickHttpUrl(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return undefined;
}

function originalSourceFromPocket(
  type: PocketItem["type"],
  content: Record<string, unknown>,
  title?: string,
): string {
  const text =
    (typeof content.text === "string" && content.text.trim()) ||
    (typeof content.body === "string" && content.body.trim()) ||
    (typeof content.prompt === "string" && content.prompt.trim()) ||
    (typeof content.caption === "string" && content.caption.trim()) ||
    (typeof content.url === "string" && content.url.trim()) ||
    (typeof content.link === "string" && content.link.trim()) ||
    "";

  if (text) return text.slice(0, 10_000);
  if (title?.trim()) return title.trim().slice(0, 10_000);
  return `pocket ${type} capture`;
}

/** Deterministic EvidenceAtom document id for a Pocket item (dedupe on re-save). */
export function pocketEvidenceAtomId(pocketItemId: string): string {
  return `pocket_${pocketItemId}`;
}

/**
 * Mirror a Pocket save into the canonical EvidenceAtom shape.
 * Non-blocking — callers should fire-and-forget and log failures.
 */
export function pocketItemToAtomInput(
  pocketItemId: string,
  type: PocketItem["type"],
  content: Record<string, unknown>,
  title?: string,
): CreateEvidenceAtomInput {
  const mediaUrls = Array.isArray(content.mediaUrls)
    ? (content.mediaUrls as string[])
    : [];
  const assetUrl = pickHttpUrl(
    content.imageUrl,
    content.image,
    content.videoUrl,
    content.thumbnailUrl,
    mediaUrls[0],
  );
  const thumbnailUrl = pickHttpUrl(content.thumbnailUrl, content.imageUrl, mediaUrls[0]);

  return {
    kind: pocketKind(type),
    sourceType: pocketSourceType(type),
    originalSource: originalSourceFromPocket(type, content, title),
    assetUrl,
    thumbnailUrl,
    contextScope: "global",
    sourceMetadata: {
      pocketItemId,
      pocketType: type,
      title: title ?? content.title ?? content.prompt ?? null,
      ...(content.tags && Array.isArray(content.tags) ? { tags: content.tags } : {}),
      ...(content.origin ? { origin: content.origin } : {}),
    },
    ingestSource: "pocket",
    tasteImpact: true,
    stabilityClass: "recurring",
  };
}

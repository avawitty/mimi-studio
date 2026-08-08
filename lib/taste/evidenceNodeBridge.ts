import type { EvidenceNode } from "../../types";
import type { CreateEvidenceAtomInput } from "./evidenceAtomSchema";

function evidenceKindFromNode(node: EvidenceNode): CreateEvidenceAtomInput["kind"] {
  switch (node.sourceType) {
    case "screenshot":
      return "screenshot";
    case "film":
      return "film";
    case "product":
      return "product";
    case "website":
    case "book":
    case "architecture":
    case "music":
      return "url";
    case "fashion":
    case "object":
    case "artwork":
    case "moodboard":
      return "image";
    case "note":
    case "quote":
      return "note";
    case "image":
      return "image";
    default:
      return node.uploadedFileUrl || node.thumbnailUrl ? "image" : "url";
  }
}

function originalSourceFromNode(node: EvidenceNode): string {
  return (
    node.sourceUrl?.trim() ||
    node.uploadedFileUrl?.trim() ||
    node.title?.trim() ||
    node.description?.trim() ||
    "untitled evidence"
  );
}

/**
 * Mirror a Tailor EvidenceNode into the canonical EvidenceAtom shape.
 * Non-blocking — callers should fire-and-forget and log failures.
 */
export function evidenceNodeToAtomInput(
  node: EvidenceNode,
  projectId: string,
): CreateEvidenceAtomInput {
  const assetUrl = node.uploadedFileUrl?.startsWith("http")
    ? node.uploadedFileUrl
    : undefined;

  return {
    kind: evidenceKindFromNode(node),
    sourceType: node.sourceType,
    originalSource: originalSourceFromNode(node),
    assetUrl,
    thumbnailUrl: node.thumbnailUrl,
    projectId,
    contextScope: "project",
    sourceMetadata: {
      tailorEvidenceNodeId: node.id,
      tailorProjectId: projectId,
      title: node.title,
      ...(node.description ? { description: node.description } : {}),
      ...(node.tags?.length ? { tags: node.tags } : {}),
      ...(node.extractedMetadata ?? {}),
    },
    ingestSource: "tailor",
    tasteImpact: true,
    stabilityClass: "project",
  };
}

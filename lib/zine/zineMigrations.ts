import type {
  EditorialDirection,
  MimiZineArtifact,
  ZineLifecycleStatus,
  ZineMetadata,
  ZinePageSpec,
  ZineRevision,
} from "../../types";
import { hydrateZineContentPages, pageHasCustomLayout } from "../zineSpreadLayout";
import { prepareArtifactPages } from "./zineIssuePlanner";

const LIFECYCLE_ORDER: ZineLifecycleStatus[] = [
  "draft",
  "reading",
  "direction-proposed",
  "direction-approved",
  "composing",
  "proof",
  "approved",
  "published",
  "archived",
];

export function lifecycleAtLeast(
  status: ZineLifecycleStatus,
  threshold: ZineLifecycleStatus,
): boolean {
  return LIFECYCLE_ORDER.indexOf(status) >= LIFECYCLE_ORDER.indexOf(threshold);
}

export function inferLegacyLifecycleStatus(
  metadata: ZineMetadata,
  pages: ZinePageSpec[],
): ZineLifecycleStatus {
  if (metadata.lifecycleStatus) return metadata.lifecycleStatus;
  if (metadata.isPublic || metadata.publishedAt) return "published";
  if (metadata.isLocked) return "approved";
  if (pages.length > 0) return "proof";
  if (
    metadata.reading ||
    metadata.content.the_reading ||
    metadata.content.oracular_mirror ||
    metadata.content.vocal_summary_blurb
  ) {
    return "reading";
  }
  return "draft";
}

export function hydrateLegacyZineMetadata(metadata: ZineMetadata): ZineMetadata {
  const hydrated = hydrateZineContentPages(metadata);
  return {
    ...hydrated,
    content: {
      ...hydrated.content,
      pages: [...(hydrated.content.pages || [])],
    },
  };
}

export function serializeZinePages(pages: ZinePageSpec[]): string {
  return JSON.stringify(pages);
}

export function withCanonicalZinePages(
  metadata: ZineMetadata,
  pages: ZinePageSpec[],
  updatedAt = Date.now(),
): ZineMetadata {
  return {
    ...metadata,
    updatedAt,
    content: {
      ...metadata.content,
      pages,
      pagesJson: serializeZinePages(pages),
    },
  };
}

export function artifactRequiresRevision(status: ZineLifecycleStatus): boolean {
  return status === "approved" || status === "published" || status === "archived";
}

export interface CreateArtifactRevisionOptions {
  reason?: string;
  changedPageIds?: string[];
  nextStatus?: ZineLifecycleStatus;
  now?: number;
}

export function createArtifactRevision(
  artifact: MimiZineArtifact,
  options: CreateArtifactRevisionOptions = {},
): MimiZineArtifact {
  const nextRevision = artifact.revision + 1;
  const now = options.now || Date.now();
  const changedPageIds =
    options.changedPageIds ||
    artifact.pages.map((page, index) => page.id || `${artifact.identity.id}:page:${index + 1}`);
  const revision: ZineRevision = {
    revision: nextRevision,
    parentRevision: artifact.revision,
    createdAt: now,
    reason: options.reason,
    changedPageIds: [...new Set(changedPageIds)],
  };

  return {
    ...artifact,
    status:
      options.nextStatus ||
      (artifactRequiresRevision(artifact.status) ? "proof" : artifact.status),
    revision: nextRevision,
    revisions: [...artifact.revisions, revision],
    pages: artifact.pages.map((page) => ({
      ...page,
      revision: nextRevision,
      customLayout: page.customLayout
        ? {
            ...page.customLayout,
            elements: page.customLayout.elements.map((element) => ({
              ...element,
              style: { ...element.style },
            })),
          }
        : undefined,
    })),
    updatedAt: now,
  };
}

export interface ReviseEditorialDirectionOptions {
  reason?: string;
  restageDefaultLayouts?: boolean;
  now?: number;
}

/**
 * Direction revisions preserve every authored custom layout. An explicit restage
 * only recalculates grammar metadata for pages still using deterministic defaults.
 */
export function reviseEditorialDirection(
  artifact: MimiZineArtifact,
  direction: EditorialDirection,
  options: ReviseEditorialDirectionOptions = {},
): MimiZineArtifact {
  const changedPageIds = options.restageDefaultLayouts
    ? artifact.pages
        .filter((page) => !pageHasCustomLayout(page))
        .map((page) => page.id)
        .filter((id): id is string => Boolean(id))
    : [];
  const revised = createArtifactRevision(artifact, {
    reason: options.reason || "Editorial direction revised",
    changedPageIds,
    nextStatus: direction.approved ? "direction-approved" : "direction-proposed",
    now: options.now,
  });

  const pages = options.restageDefaultLayouts
    ? prepareArtifactPages(
        revised.identity.id,
        revised.pages.map((page) =>
          pageHasCustomLayout(page) ? page : { ...page, grammar: undefined },
        ),
      )
    : revised.pages;

  return {
    ...revised,
    direction: {
      ...direction,
      revision: (artifact.direction.revision || 1) + 1,
    },
    pages,
  };
}

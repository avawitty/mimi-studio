import type { ZineMetadata, ZinePageSpec } from "../../types";
import { normalizeZineArtifact } from "./normalizeZineArtifact";
import { prepareArtifactPages } from "./zineIssuePlanner";
import { hydrateLegacyZineMetadata, withCanonicalZinePages } from "./zineMigrations";

/**
 * Stamps generated or freshly saved zines with stable page IDs, section types,
 * grammars, and the additive canonical artifact envelope.
 */
export function stampZineArtifactMetadata(
  metadata: ZineMetadata,
  pages: ZinePageSpec[],
): ZineMetadata {
  const hydrated = hydrateLegacyZineMetadata(metadata);
  const stampedPages = prepareArtifactPages(hydrated.id, pages);
  const withPages = withCanonicalZinePages(hydrated, stampedPages);
  const artifact = normalizeZineArtifact(withPages);

  return {
    ...withPages,
    artifactSchemaVersion: artifact.schemaVersion,
    lifecycleStatus: artifact.status,
    artifactAuthorship: artifact.authorship,
    sourcePacket: artifact.sourcePacket,
    reading: artifact.reading,
    editorialDirection: artifact.direction,
    issueStructure: artifact.issueStructure,
    issuePlan: artifact.issuePlan,
    coverSpec: artifact.cover,
    colophon: artifact.colophon,
    publication: artifact.publication,
    exportState: artifact.exportState,
    revision: artifact.revision,
    revisions: artifact.revisions,
  };
}

import { describe, expect, it } from "vitest";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import {
  buildZineProofDiagnostics,
  summarizeZineProof,
} from "../lib/zine/zineProofDiagnostics";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("zine proof diagnostics", () => {
  it("blocks duplicate numbers, overflow, and invalid reading order", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    artifact.pages[1] = {
      ...artifact.pages[1],
      pageNumber: artifact.pages[0].pageNumber,
      customLayout: {
        ...artifact.pages[1].customLayout!,
        readingOrder: ["headline", "missing"],
        elements: artifact.pages[1].customLayout!.elements.map((element) =>
          element.id === "headline"
            ? {
                ...element,
                style: { ...element.style, left: 90, width: 30 },
              }
            : element,
        ),
      },
    };

    const diagnostics = buildZineProofDiagnostics(artifact);
    const ids = diagnostics.map((diagnostic) => diagnostic.id);

    expect(ids).toContain("duplicate-page-number");
    expect(ids).toContain("text-overflow");
    expect(ids).toContain("invalid-reading-order");
    expect(summarizeZineProof(diagnostics).canApprove).toBe(false);
  });

  it("blocks private context marked for a public colophon", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    artifact.publication.visibility = "public";
    artifact.colophon.publicSourceIds = ["atom-private"];

    expect(
      buildZineProofDiagnostics(artifact).some(
        (diagnostic) => diagnostic.id === "private-context-exposure",
      ),
    ).toBe(true);
  });

  it("warns for export, media, provenance, resolution, and font risks", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    artifact.pages[0] = {
      ...artifact.pages[0],
      image_url: "gs://private-bucket/plate.jpg",
      assetVariants: {
        masterUrl: "gs://private-bucket/plate.jpg",
        width: 600,
        height: 800,
      },
    };
    artifact.pages[1] = {
      ...artifact.pages[1],
      sourceIds: [],
      customLayout: {
        ...artifact.pages[1].customLayout!,
        elements: artifact.pages[1].customLayout!.elements.map((element) => ({
          ...element,
          style: { ...element.style, fontFamily: "Space Mono" },
        })),
      },
    };

    const ids = new Set(
      buildZineProofDiagnostics(artifact).map(
        (diagnostic) => diagnostic.id,
      ),
    );
    expect(ids).toContain("unsupported-image-embedding");
    expect(ids).toContain("low-resolution");
    expect(ids).toContain("absent-provenance");
    expect(ids).toContain("font-substitution");
  });

  it("blocks unresolved reading, identity, and direction", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    artifact.identity.title = "";
    artifact.authorship.creatorHandle = "";
    artifact.reading.centralObservation = "";
    artifact.direction.approved = false;

    const ids = new Set(
      buildZineProofDiagnostics(artifact).map(
        (diagnostic) => diagnostic.id,
      ),
    );
    expect(ids).toContain("missing-title");
    expect(ids).toContain("missing-creator");
    expect(ids).toContain("unresolved-generation");
    expect(ids).toContain("unapproved-direction");
  });
});

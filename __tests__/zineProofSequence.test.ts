import { describe, expect, it } from "vitest";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { buildZineProofSequence } from "../lib/zine/zineIssuePlanner";
import { buildZineProofDiagnostics } from "../lib/zine/zineProofDiagnostics";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("buildZineProofSequence", () => {
  it("materializes derived cover, reading, and colophon pages in section order", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const sequence = buildZineProofSequence(artifact);

    expect(sequence.length).toBe(artifact.issueStructure.totalPages);
    expect(sequence[0].sectionType).toBe("cover");
    expect(sequence[0].grammar).toBe("specimen");
    expect(sequence.at(-1)?.sectionType).toBe("colophon");

    const sectionOrder = sequence.map((page) => page.sectionType);
    expect(sectionOrder.indexOf("cover")).toBeLessThan(
      sectionOrder.indexOf("visual-plate"),
    );
    expect(sectionOrder.indexOf("reading")).toBeLessThan(
      sectionOrder.indexOf("colophon"),
    );
  });

  it("renumbers the proof sequence contiguously", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const sequence = buildZineProofSequence(artifact);
    const pageNumbers = sequence.map((page) => page.pageNumber);

    expect(pageNumbers).toEqual(
      Array.from({ length: sequence.length }, (_, index) => index + 1),
    );
  });

  it("validates canonical and derived proof pages together", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const sequence = buildZineProofSequence(artifact);
    const diagnostics = buildZineProofDiagnostics(artifact, sequence);

    expect(diagnostics.some((entry) => entry.id === "duplicate-page-number")).toBe(
      false,
    );
    expect(sequence.length).toBeGreaterThan(artifact.pages.length);
  });
});

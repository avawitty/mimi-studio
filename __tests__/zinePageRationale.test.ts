import { describe, expect, it } from "vitest";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { buildZineProofSequence } from "../lib/zine/zineIssuePlanner";
import {
  describeZinePageRationale,
  isDerivedProofPage,
  sectionAbbreviation,
} from "../lib/zine/zinePageRationale";
import { stampZineArtifactMetadata } from "../lib/zine/stampZineArtifactMetadata";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("zine page rationale", () => {
  it("explains why derived cover and colophon pages exist", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const sequence = buildZineProofSequence(artifact);
    const cover = sequence[0];
    const colophon = sequence.at(-1)!;

    expect(isDerivedProofPage(cover)).toBe(true);
    expect(describeZinePageRationale(cover, artifact).narrativeFunction).toBe(
      "invitation",
    );
    expect(describeZinePageRationale(colophon, artifact).whyExists).toMatch(
      /provenance/i,
    );
  });

  it("maps section types to stable abbreviations for proof navigation", () => {
    expect(sectionAbbreviation("cover")).toBe("COV");
    expect(sectionAbbreviation("reading")).toBe("RDG");
    expect(sectionAbbreviation("colophon")).toBe("COL");
  });
});

describe("stampZineArtifactMetadata", () => {
  it("persists section-aware pages and artifact envelope on new saves", () => {
    const metadata = makeLegacyZineMetadata();
    const pages = metadata.content.pagesJson
      ? JSON.parse(metadata.content.pagesJson)
      : metadata.content.pages;
    const stamped = stampZineArtifactMetadata(metadata, pages);

    expect(stamped.artifactSchemaVersion).toBe(1);
    expect(stamped.lifecycleStatus).toBe("proof");
    expect(stamped.issueStructure?.totalPages).toBeGreaterThanOrEqual(
      stamped.content.pages?.length || 0,
    );
    expect(stamped.content.pages?.every((page) => page.id && page.sectionType)).toBe(
      true,
    );
  });
});

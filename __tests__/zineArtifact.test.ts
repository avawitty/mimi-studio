import { describe, expect, it } from "vitest";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import {
  safeParseMimiZineArtifact,
} from "../lib/zine/zineArtifactSchema";
import {
  hydrateLegacyZineMetadata,
  withCanonicalZinePages,
} from "../lib/zine/zineMigrations";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("Mimi zine artifact normalization", () => {
  it("hydrates old pagesJson records into the canonical artifact", () => {
    const metadata = makeLegacyZineMetadata();
    const artifact = normalizeZineArtifact(metadata);

    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.pages).toHaveLength(2);
    expect(artifact.pages[1].customLayout?.elements).toHaveLength(2);
    expect(artifact.pages[1].customLayout?.readingOrder).toEqual([
      "headline",
      "body",
    ]);
    expect(artifact.pages[0].originalMediaUrl).toBe(
      "https://cdn.example.test/original-source.jpg",
    );
    expect(artifact.pages[0].image_url).toBe(
      "https://cdn.example.test/developed-master.jpg",
    );
  });

  it("keeps editable cover overlays and the original cover after baking", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());

    expect(artifact.cover.originalImageUrl).toBe(
      "https://cdn.example.test/original-cover.jpg",
    );
    expect(artifact.cover.bakedImageUrl).toBe(
      "data:image/jpeg;base64,baked-cover",
    );
    expect(artifact.cover.overlayBaked).toBe(true);
    expect(artifact.cover.overlays[0]).toMatchObject({
      id: "cover-title",
      type: "text",
      content: "The Handled Archive",
    });
  });

  it("builds a complete section-aware issue structure without rewriting storage", () => {
    const metadata = makeLegacyZineMetadata();
    const artifact = normalizeZineArtifact(metadata);
    const sectionTypes = artifact.issueStructure.sections.map(
      (section) => section.type,
    );

    expect(sectionTypes).toEqual([
      "cover",
      "opening",
      "reading",
      "signal-index",
      "visual-plate",
      "evidence",
      "essay",
      "interlude",
      "roadmap",
      "debris",
      "colophon",
    ]);
    expect(artifact.issueStructure.totalPages).toBeGreaterThanOrEqual(
      artifact.pages.length,
    );
    expect(metadata.content.pages).toEqual([]);
  });

  it("normalizes deterministically and validates the runtime schema", () => {
    const metadata = makeLegacyZineMetadata();
    const first = normalizeZineArtifact(metadata);
    const second = normalizeZineArtifact(metadata);

    expect(first.pages.map((page) => page.id)).toEqual(
      second.pages.map((page) => page.id),
    );
    expect(safeParseMimiZineArtifact(first).success).toBe(true);
  });

  it("synchronizes canonical pages and pagesJson on save", () => {
    const metadata = hydrateLegacyZineMetadata(makeLegacyZineMetadata());
    const pages = metadata.content.pages || [];
    const next = withCanonicalZinePages(metadata, pages, 1_800_000_000_000);

    expect(next.content.pages).toBe(pages);
    expect(JSON.parse(next.content.pagesJson || "[]")).toEqual(pages);
    expect(next.updatedAt).toBe(1_800_000_000_000);
  });
});

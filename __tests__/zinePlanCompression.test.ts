import { describe, expect, it } from "vitest";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { buildZineIssuePlan } from "../lib/zine/buildZineIssuePlan";
import { compressZineIssuePlan } from "../lib/zine/compressZineIssuePlan";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

describe("compressZineIssuePlan", () => {
  it("compresses padded beats on sparse legacy issues", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());

    expect(artifact.issuePlan!.pages.length).toBeLessThan(9);
    expect(artifact.issuePlan!.compression?.removedPageIds.length).toBeGreaterThan(0);
    expect(artifact.issuePlan!.pages.map((page) => page.sectionType)).toEqual([
      "cover",
      "reading",
      "visual-plate",
      "evidence",
      "colophon",
    ]);
    expect(artifact.issuePlan!.evaluation.result).not.toBe("blocked");
  });

  it("does not compress a minimum four-page issue below the floor", () => {
    const metadata = makeLegacyZineMetadata();
    metadata.originalInput = "";
    metadata.content.originalThought = undefined;
    metadata.content.semiotic_signals = [];
    metadata.content.roadmap = undefined as unknown as typeof metadata.content.roadmap;
    metadata.content.meta = {
      ...metadata.content.meta,
      intent: "",
    };

    const artifact = normalizeZineArtifact(metadata);
    expect(artifact.issuePlan!.pages.length).toBeGreaterThanOrEqual(4);
  });

  it("merges duplicate consecutive visual plans", () => {
    const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
    const visual = artifact.issuePlan!.pages.find(
      (page) => page.sectionType === "visual-plate" && !page.derived,
    )!;
    const padded = {
      ...artifact.issuePlan!,
      pages: [
        artifact.issuePlan!.pages[0],
        { ...visual, id: `${visual.id}-a` },
        { ...visual, id: `${visual.id}-b`, pageNumber: visual.pageNumber + 1 },
        artifact.issuePlan!.pages.at(-1)!,
      ],
    };

    const compressed = compressZineIssuePlan(padded);
    expect(compressed.compression?.mergedPageIds).toEqual([`${visual.id}-b`]);
    expect(compressed.pages).toHaveLength(3);
  });
});

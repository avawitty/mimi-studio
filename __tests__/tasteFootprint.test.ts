import { describe, expect, it } from "vitest";
import {
  compileTasteFootprint,
  emptyTasteFootprint,
  footprintCounts,
  preferRicherFootprint,
} from "../lib/tasteFootprint";

describe("compileTasteFootprint", () => {
  it("compiles anchors, embeddings, tags, and clusters from stored streams", () => {
    const footprint = compileTasteFootprint({
      nodes: [
        {
          id: "a1",
          label: "Neo-Brutalist",
          type: "concept",
          weight: 2.5,
          tags: ["brutalism", "grid", "Brutalism"],
        },
        {
          id: "a2",
          label: "Clay Margin",
          type: "motif",
          weight: 1.2,
          tags: ["clay", "grid"],
        },
      ],
      points: [
        {
          id: "e1",
          preview: "Scanline archive",
          type: "image",
          distanceFromCenter: 0.42,
        },
      ],
      clusters: [
        {
          id: "c1",
          label: "Mineral Editorial",
          artifact_ids: ["e1", "e2"],
          updated_at: 100,
        },
        {
          id: "c2",
          label: "Stored Cluster",
          artifactCount: 4,
          updatedAt: 200,
        },
      ],
      dimension: 1536,
      compiledAt: 1234,
      source: "live",
    });

    expect(footprintCounts(footprint)).toEqual({
      plottedAnchors: 2,
      listedEmbeddings: 1,
      retrievedTags: 3,
      patternClusters: 2,
    });
    expect(footprint.retrievedTags).toEqual(["brutalism", "grid", "clay"]);
    expect(footprint.patternClusters[0].artifactCount).toBe(2);
    expect(footprint.patternClusters[1].artifactCount).toBe(4);
    expect(footprint.patternClusters[1].updatedAt).toBe(200);
    expect(footprint.dimension).toBe(1536);
    expect(footprint.compiledAt).toBe(1234);
    expect(footprint.source).toBe("live");
  });

  it("skips blank rows and returns an empty footprint when streams are vacant", () => {
    const footprint = compileTasteFootprint({
      nodes: [{ id: "", label: "" }, { id: "ok", label: "Kept", tags: ["  ", "signal"] }],
      points: [{ id: "" }, { id: "p1", preview: "Point" }],
      clusters: [{ id: "x", label: "" }, { id: "y", label: "Theme" }],
    });
    expect(footprint.plottedAnchors).toHaveLength(1);
    expect(footprint.listedEmbeddings).toHaveLength(1);
    expect(footprint.retrievedTags).toEqual(["signal"]);
    expect(footprint.patternClusters).toHaveLength(1);
    expect(emptyTasteFootprint(99)).toMatchObject({
      plottedAnchors: [],
      listedEmbeddings: [],
      retrievedTags: [],
      patternClusters: [],
      compiledAt: 99,
    });
  });

  it("prefers the richer compiled footprint", () => {
    const sparse = compileTasteFootprint({
      nodes: [{ id: "1", label: "A", tags: ["one"] }],
      compiledAt: 10,
    });
    const rich = compileTasteFootprint({
      nodes: [
        { id: "1", label: "A", tags: ["one", "two"] },
        { id: "2", label: "B" },
      ],
      points: [{ id: "e", preview: "vec" }],
      clusters: [{ id: "c", label: "Cluster", artifactCount: 3 }],
      compiledAt: 1,
    });
    expect(preferRicherFootprint(sparse, rich)).toBe(rich);
    expect(preferRicherFootprint(sparse, { ...sparse, compiledAt: 99 }).compiledAt).toBe(99);
  });
});

import { describe, expect, it } from "vitest";
import {
  mergeContactSheetBatch,
  promoteCoverVariant,
  resolveCoverVariantsFromMetadata,
  stripVariants,
} from "../lib/studioCoverVariants";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import type { ZineMetadata } from "../types";

describe("studioCoverVariants", () => {
  it("promotes a strip variant and demotes the previous main", () => {
    const covers = [
      { url: "a", seed: "s1", prompt: "p1", selected: true },
      { url: "b", seed: "s2", prompt: "p2", selected: false },
    ];
    const next = promoteCoverVariant(covers, "s2");
    expect(next.find((c) => c.seed === "s1")?.selected).toBe(false);
    expect(next.find((c) => c.seed === "s2")?.selected).toBe(true);
  });

  it("merges a contact sheet batch while retaining the selected main", () => {
    const existing = [
      { url: "main", seed: "main", prompt: "main", selected: true },
      { url: "old", seed: "old", prompt: "old", selected: false },
    ];
    const batch = [
      { url: "v1", seed: "v1", prompt: "v1", selected: false },
      { url: "v2", seed: "v2", prompt: "v2", selected: false },
      { url: "v3", seed: "v3", prompt: "v3", selected: false },
      { url: "v4", seed: "v4", prompt: "v4", selected: false },
    ];
    const merged = mergeContactSheetBatch(existing, batch);
    expect(merged.find((c) => c.seed === "main")?.selected).toBe(true);
    expect(stripVariants(merged).length).toBe(4);
    expect(stripVariants(merged).every((c) => !c.selected)).toBe(true);
  });

  it("resolves covers from coverSpec first, then legacy meta", () => {
    const covers = [
      { url: "a", seed: "s1", prompt: "p1", selected: true },
      { url: "b", seed: "s2", prompt: "p2", selected: false },
    ];
    expect(
      resolveCoverVariantsFromMetadata({
        coverSpec: { title: "T", overlays: [], treatment: "editorial", overlayBaked: false, covers },
        content: { meta: { studioCoverVariants: [] } } as ZineMetadata["content"],
      }),
    ).toEqual(covers);

    expect(
      resolveCoverVariantsFromMetadata({
        content: {
          meta: { studioCoverVariants: covers },
        } as ZineMetadata["content"],
      }),
    ).toEqual(covers);
  });

  it("stamps coverSpec.covers from studioCoverVariants on normalize", () => {
    const covers = [
      { url: "v1", seed: "v1", prompt: "p1", selected: false },
      { url: "v2", seed: "v2", prompt: "p2", selected: true },
    ];
    const metadata = {
      id: "zine_test",
      userId: "u1",
      title: "Test Issue",
      tone: "EDITORIAL",
      timestamp: Date.now(),
      likes: 0,
      content: {
        title: "Test Issue",
        meta: { studioCoverVariants: covers },
        pages: [],
      },
      coverImageUrl: "https://example.com/cover.jpg",
    } as ZineMetadata;

    const artifact = normalizeZineArtifact(metadata);
    expect(artifact.cover.covers).toEqual(covers);
  });
});

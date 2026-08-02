import { describe, expect, it } from "vitest";
import { extractTags, matchesHouseQuery, synthesizeReading } from "../../components/house/editor";
import type { Debris } from "../../components/house/types";

function debris(partial: Partial<Debris> & { raw: string; status: Debris["status"] }): Debris {
  return {
    id: partial.id ?? "x",
    kind: partial.kind ?? "text",
    raw: partial.raw,
    tags: partial.tags ?? extractTags(partial.raw),
    status: partial.status,
    ingestedAt: partial.ingestedAt ?? 1,
  };
}

describe("house editor", () => {
  it("extracts lexicon tags from archival debris", () => {
    const tags = extractTags("a vintage film archive catalog with grain");
    expect(tags.some((t) => t.label === "ARCHIVAL")).toBe(true);
    expect(tags[0].intensity).toBeGreaterThan(0.3);
  });

  it("falls back to hashed tags when no lexicon hits", () => {
    const tags = extractTags("xyzzy plugh");
    expect(tags.length).toBeGreaterThanOrEqual(1);
    expect(tags.length).toBeLessThanOrEqual(5);
  });

  it("requires refusal for a healthy reading critique", () => {
    const kept = [
      debris({ raw: "concrete bunker steel", status: "kept" }),
      debris({ raw: "linen paper quiet", status: "kept" }),
      debris({ raw: "moss fern garden", status: "kept" }),
    ];
    const noRefuse = synthesizeReading(kept, []);
    expect(noRefuse.critique).toMatch(/absolute negatives/i);

    const refused = [debris({ raw: "neon chrome cyber", status: "refused" })];
    const reading = synthesizeReading(kept, refused);
    expect(reading.archetype).toMatch(/^The /);
    expect(reading.palette).toHaveLength(5);
    expect(reading.manifesto).toMatch(/refuse/);
  });

  it("matches search across raw and tags", () => {
    const tags = extractTags("salt sea harbor");
    expect(matchesHouseQuery("maritime", "salt sea", tags)).toBe(true);
    expect(matchesHouseQuery("zzz", "salt sea", tags)).toBe(false);
  });
});

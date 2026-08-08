import { describe, expect, it } from "vitest";
import { floorZineEvidenceAtomId, floorZineToAtomInput } from "../lib/taste/floorAtomBridge";
import type { ZineMetadata } from "../types";

const baseZine = (): ZineMetadata => ({
  id: "z1",
  userId: "u1",
  userHandle: "ava",
  title: "Winter spread",
  concept: "Mineral editorial",
  theme: "editorial",
  tone: "editorial",
  timestamp: Date.now(),
  likes: 0,
  fragmentsUsed: [],
  createdAt: Date.now(),
  aestheticVector: {},
  content: {
    meta: { mode: "editorial", intent: "test", timestamp: Date.now() },
    taste_context: { active_archetype: "Archivist", active_palette: [] },
    structure: { hero_prompt: "cover", pages: [] },
    visual_guidance: {
      strict_palette: [],
      negative_prompt: "",
      composition_density: 0.5,
    },
    pages: [],
  },
  isPublic: true,
  publishedAt: Date.now(),
});

describe("floorAtomBridge", () => {
  it("returns null for private zines", () => {
    const zine = { ...baseZine(), isPublic: false };
    expect(floorZineToAtomInput(zine)).toBeNull();
  });

  it("maps public floor zines to generated evidence", () => {
    const input = floorZineToAtomInput(baseZine());
    expect(input?.kind).toBe("generated");
    expect(input?.sourceMetadata?.zineId).toBe("z1");
    expect(input?.sourceMetadata?.floorPublish).toBe(true);
    expect(floorZineEvidenceAtomId("z1")).toBe("floor_z1");
  });
});

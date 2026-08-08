import { describe, expect, it } from "vitest";
import { enrichEditorialPlateContent } from "../lib/zine/enrichEditorialPlateContent";
import type { ZineContent } from "../types";

describe("enrichEditorialPlateContent", () => {
  const base: ZineContent = {
    meta: { mode: "editorial", intent: "test", timestamp: Date.now() },
    taste_context: { active_archetype: "test", active_palette: [] },
    structure: { hero_prompt: "hero", pages: [], sonic_layer: "hum" },
    visual_guidance: {
      strict_palette: [],
      negative_prompt: "",
      composition_density: 0.5,
    },
    pages: [
      {
        pageNumber: 1,
        headline: "Visual",
        bodyCopy: "Body",
        imagePrompt: "scene",
      },
    ],
    screenwrite_excerpt: "INT. ROOM",
  };

  it("backfills snapshots and rebuilds plates for legacy zines", () => {
    const enriched = enrichEditorialPlateContent(base, {
      artifactId: "z1",
      usedContextSnapshots: [
        { atomId: "a1", title: "Atom", content: "Approved" },
      ],
    });
    expect(enriched.used_context_atoms).toHaveLength(1);
    expect(enriched.pages?.some((p) => p.grammar === "used-context")).toBe(true);
  });
});

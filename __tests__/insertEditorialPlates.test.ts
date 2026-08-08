import { describe, expect, it } from "vitest";
import {
  insertEditorialPlates,
  isCalibrationPlate,
} from "../lib/zine/insertEditorialPlates";
import type { ZineContent } from "../types";

describe("insertEditorialPlates", () => {
  const base: ZineContent = {
    meta: { mode: "editorial", intent: "test", timestamp: Date.now() },
    taste_context: { active_archetype: "test", active_palette: [] },
    structure: { hero_prompt: "hero", pages: [], sonic_layer: "Low hum" },
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
        imagePrompt: "A scene",
      },
    ],
    screenwrite_excerpt: "INT. ROOM — NIGHT\n\nSilence.",
    celestial_calibration: "Sun in Gemini",
    semiotic_signals: [
      { motif: "Archival dust", context: "Texture", type: "conceptual" },
    ],
  };

  it("detects calibration grammars", () => {
    expect(isCalibrationPlate({ grammar: "sonic" } as any)).toBe(true);
    expect(isCalibrationPlate({ grammar: "editorial-split" } as any)).toBe(false);
  });

  it("prepends calibration plates before visual pages", () => {
    const merged = insertEditorialPlates(base);
    expect(merged[0].grammar).toBe("screenwrite");
    expect(merged[1].grammar).toBe("celestial");
    expect(merged[2].grammar).toBe("signal-index");
    expect(merged[3].grammar).toBe("sonic");
    expect(merged[4].headline).toBe("Visual");
    expect(merged[2].plateData?.signals).toHaveLength(1);
  });

  it("strips duplicate calibration plates on re-run", () => {
    const first = insertEditorialPlates(base);
    const second = insertEditorialPlates({ ...base, pages: first });
    expect(second.filter((p) => p.grammar === "sonic")).toHaveLength(1);
  });

  it("omits disabled plates when enabledPlates is narrowed", () => {
    const merged = insertEditorialPlates(base, {
      enabledPlates: ["screenwrite", "sonic"],
    });
    expect(merged.some((p) => p.grammar === "celestial")).toBe(false);
    expect(merged.some((p) => p.grammar === "signal-index")).toBe(false);
    expect(merged[0].grammar).toBe("screenwrite");
    expect(merged.some((p) => p.grammar === "sonic")).toBe(true);
  });
});

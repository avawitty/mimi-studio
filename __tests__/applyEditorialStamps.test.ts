import { describe, expect, it } from "vitest";
import {
  applyChromaticPaletteToZine,
  applyOwnerPlatesToZine,
} from "../lib/zine/applyEditorialStamps";

describe("applyEditorialStamps", () => {
  const baseContent = {
    visual_guidance: { strict_palette: ["#111111"], negative_prompt: "", composition_density: 0.5 },
    taste_context: { active_archetype: "test", active_palette: [] },
  } as any;

  it("stamps chromatic palette from tailor draft", () => {
    const stamped = applyChromaticPaletteToZine(baseContent, {
      tailorDraft: {
        expressionEngine: {
          chromaticRegistry: {
            primaryPalette: [{ name: "Ink", hex: "#111111" }],
            baseNeutral: "#FDFBF7",
            accentSignal: "#111111",
          },
        },
      } as any,
    });
    expect(stamped.chromatic_palette?.colors.length).toBeGreaterThan(0);
  });

  it("copies owner plate templates when issue has none", () => {
    const stamped = applyOwnerPlatesToZine(baseContent, {
      ownerPlateTemplates: [{ id: "t1", kind: "text", body: "Template note" }],
    });
    expect(stamped.owner_plates).toHaveLength(1);
  });
});

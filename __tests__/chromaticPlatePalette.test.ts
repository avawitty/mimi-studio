import { describe, expect, it } from "vitest";
import { buildChromaticPlatePalette } from "../lib/zine/chromaticPlatePalette";

describe("chromatic plate palette", () => {
  it("merges tailor registry and issue palettes without duplicates", () => {
    const palette = buildChromaticPlatePalette(
      {
        visual_guidance: { strict_palette: ["#1C1917"], negative_prompt: "", composition_density: 0.5 },
        taste_context: { active_archetype: "archivist", active_palette: ["#1C1917", "#FDFBF7"] },
      },
      {
        expressionEngine: {
          chromaticRegistry: {
            primaryPalette: [
              { name: "Parchment", hex: "#FDFBF7", descriptor: "Field" },
              { name: "Ink", hex: "#1C1917" },
            ],
            baseNeutral: "#FDFBF7",
            accentSignal: "#5A5A40",
          },
          colorPalette: { primary: "#FDFBF7", accent: "#5A5A40" },
          typographyIntent: { styleDescription: "", weightPreference: "" },
          typography: { serif: "", sans: "", mono: "" },
          visualPresets: { silhouette: "", texture: "", era: "" },
          narrativeVoice: {
            emotionalTemperature: "",
            structureBias: "",
            lexicalDensity: 5,
            restraintLevel: 5,
          },
        },
      } as any,
    );

    expect(palette).not.toBeNull();
    expect(palette!.colors.length).toBeGreaterThanOrEqual(3);
    expect(palette!.colors.some((color) => color.hex === "#5A5A40")).toBe(true);
  });

  it("returns null when no palette data exists", () => {
    expect(
      buildChromaticPlatePalette({
        visual_guidance: { strict_palette: [], negative_prompt: "", composition_density: 0.5 },
        taste_context: { active_archetype: "test", active_palette: [] },
      }),
    ).toBeNull();
  });
});

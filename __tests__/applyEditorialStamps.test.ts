import { describe, expect, it } from "vitest";
import {
  applyChromaticPaletteToZine,
  applyContactSheetToZine,
  applyForecastDriftToZine,
  applyMaterialSpecimenToZine,
  applyOwnerPlatesToZine,
  applyUsedContextToZine,
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

  it("stamps used context atoms from generation entries", () => {
    const stamped = applyUsedContextToZine(baseContent, [
      { atomId: "a1", title: "Note", content: "Approved", source: "Scribe" },
    ]);
    expect(stamped.used_context_atoms).toHaveLength(1);
  });

  it("stamps contact sheet frames from intake media", () => {
    const stamped = applyContactSheetToZine(baseContent, [
      { type: "image", url: "https://example.com/ref.jpg" },
    ]);
    expect(stamped.contact_sheet_frames).toHaveLength(1);
  });

  it("stamps material specimen and forecast drift from profile", () => {
    const profile = {
      tailorDraft: {
        positioningCore: {
          aestheticCore: {
            materiality: ["Ceramic"],
            silhouettes: [],
            eraBias: "Analog",
            density: 5,
            entropy: 5,
            tags: [],
          },
        },
        strategicVectors: {
          expansionTolerance: 5,
          fiscalVelocity: "measured",
          desireVectors: { deepen: [], reduce: [], experiment: [], refuse: [] },
          saturationAwareness: {
            oversaturatedClusters: ["Techwear"],
            fragileDifferentiators: [],
          },
        },
        diagnostics: {
          contradictionFlags: [],
          dilutionRisks: [],
          authorityStrengthScore: 50,
          driftVulnerability: 3,
        },
      },
    } as any;
    const material = applyMaterialSpecimenToZine(baseContent, profile);
    const drift = applyForecastDriftToZine(material, profile);
    expect(drift.material_specimen?.materiality).toContain("Ceramic");
    expect(drift.forecast_drift?.oversaturatedClusters).toContain("Techwear");
  });
});

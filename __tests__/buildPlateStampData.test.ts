import { describe, expect, it } from "vitest";
import {
  buildContactSheetFrames,
  buildForecastDriftFromProfile,
  buildMaterialSpecimenFromProfile,
  buildUsedContextAtoms,
} from "../lib/zine/buildPlateStampData";

describe("buildPlateStampData", () => {
  it("maps used context entries to snapshots", () => {
    const atoms = buildUsedContextAtoms([
      { atomId: "a1", title: "Note", content: "Body", source: "Scribe" },
    ]);
    expect(atoms).toHaveLength(1);
    expect(atoms[0]?.title).toBe("Note");
  });

  it("builds contact sheet frames from intake images", () => {
    const frames = buildContactSheetFrames([
      { type: "image", url: "https://example.com/a.jpg", name: "Ref A" },
      { type: "audio", url: "https://example.com/b.mp3" },
    ]);
    expect(frames).toHaveLength(1);
    expect(frames[0]?.label).toBe("Ref A");
  });

  it("builds material specimen from tailor draft", () => {
    const specimen = buildMaterialSpecimenFromProfile({
      tailorDraft: {
        positioningCore: {
          aestheticCore: {
            materiality: ["Paper Grain"],
            silhouettes: ["Architectural"],
            eraBias: "Post-Digital",
            density: 5,
            entropy: 5,
            tags: [],
          },
        },
      } as any,
    });
    expect(specimen?.materiality).toContain("Paper Grain");
  });

  it("builds forecast drift from strategic vectors", () => {
    const drift = buildForecastDriftFromProfile({
      tailorDraft: {
        strategicVectors: {
          expansionTolerance: 6,
          fiscalVelocity: "measured",
          desireVectors: { deepen: [], reduce: [], experiment: [], refuse: [] },
          saturationAwareness: {
            oversaturatedClusters: ["Y2K revival"],
            fragileDifferentiators: ["Archival grain"],
          },
        },
        diagnostics: {
          contradictionFlags: [],
          dilutionRisks: ["Trend dilution"],
          authorityStrengthScore: 50,
          driftVulnerability: 4,
        },
      } as any,
    });
    expect(drift?.oversaturatedClusters).toContain("Y2K revival");
    expect(drift?.isDemonstration).toBe(false);
  });
});

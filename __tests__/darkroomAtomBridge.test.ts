import { describe, expect, it } from "vitest";
import {
  darkroomEvidenceAtomId,
  darkroomFragmentToAtomInput,
  darkroomTreatmentToAtomInput,
} from "../lib/taste/darkroomAtomBridge";
import type { StyleTreatment } from "../types";

describe("darkroomAtomBridge", () => {
  it("maps darkroom fragments with image assets", () => {
    const input = darkroomFragmentToAtomInput("item_1", {
      imageUrl: "https://cdn.example.com/plate.jpg",
      notes: "Contact sheet variant",
      source: "darkroom",
    });

    expect(input?.kind).toBe("image");
    expect(input?.ingestSource).toBe("darkroom");
    expect(input?.assetUrl).toBe("https://cdn.example.com/plate.jpg");
    expect(input?.sourceMetadata?.darkroomId).toBe("item_1");
  });

  it("maps saved style treatments to generated moodboard atoms", () => {
    const treatment: StyleTreatment = {
      id: "trt_1",
      createdAt: Date.now(),
      treatmentName: "Mineral grade",
      canonicalTaste: {
        motifs: ["lace"],
        palette: ["ivory"],
        form: ["grid"],
        mood: ["quiet"],
        era_refs: [],
        density: 0.6,
        entropy: 0.4,
        prompt_fragments: ["soft mineral light"],
        commercial_signals: [],
        novelty_score: 0.5,
      },
    };

    const input = darkroomTreatmentToAtomInput(treatment);
    expect(input?.kind).toBe("generated");
    expect(input?.ingestSource).toBe("darkroom");
    expect(input?.originalSource).toContain("Mineral grade");
    expect(input?.originalSource).toContain("lace");
    expect(input?.sourceMetadata?.styleTreatmentId).toBe("trt_1");
  });

  it("uses deterministic atom ids", () => {
    expect(darkroomEvidenceAtomId("trt_abc")).toBe("darkroom_trt_abc");
  });
});

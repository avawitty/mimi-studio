import { describe, expect, it } from "vitest";
import {
  applyCelestialToZine,
  buildZineCelestialStamp,
} from "../lib/celestial/applyCelestialToZine";
import type { ZineContent } from "../types";

function baseContent(): ZineContent {
  return {
    meta: { mode: "editorial", intent: "test", timestamp: Date.now() },
    taste_context: { active_archetype: "Archivist", active_palette: [] },
    structure: { hero_prompt: "cover", pages: [] },
    visual_guidance: {
      strict_palette: [],
      negative_prompt: "",
      composition_density: 0.5,
    },
    title: "Test",
    celestial_calibration: "Model-invented timing",
  };
}

describe("applyCelestialToZine", () => {
  it("stamps issue-moment sky when calibration is off", () => {
    const stamp = buildZineCelestialStamp({ enabled: false });
    expect(stamp.calibration).toContain("Issue composed under");
    expect(stamp.natal).toBeNull();
    expect(stamp.issueMomentSummary).toBeTruthy();
    expect(stamp.readoutComplete).toBe(false);
  });

  it("prompts for birth date when calibration is on but date is missing", () => {
    const stamp = buildZineCelestialStamp({ enabled: true });
    expect(stamp.readoutComplete).toBe(false);
    expect(stamp.calibration).toContain("Celestial Calibration");
    expect(stamp.missingForFull).toContain("birth date");
    expect(stamp.natal?.enabled).toBe(true);
  });

  it("overrides model celestial_calibration with ephemeris readout", () => {
    const stamped = applyCelestialToZine(baseContent(), {
      enabled: true,
      birthDate: "1990-06-15",
      birthTime: "14:30",
      birthTimezone: "America/New_York",
      birthLatitude: 40.7128,
      birthLongitude: -74.006,
      zodiacLocked: false,
      seasonalAlignment: "High summer clarity",
    });

    expect(stamped.celestial_calibration).not.toBe("Model-invented timing");
    expect(stamped.celestial_calibration).toContain("Tropical Sun");
    expect(stamped.celestial_readout?.natal?.sun?.sign).toBe("gemini");
    expect(stamped.celestial_readout?.issueMomentSummary).toContain(
      "Issue composed under",
    );
  });

  it("persists natal chart bodies from astronomy-engine", () => {
    const stamped = applyCelestialToZine(baseContent(), {
      enabled: true,
      birthDate: "1990-06-15",
      birthTimezone: "UTC",
    });

    const bodies = stamped.celestial_readout?.natal?.chart?.bodies ?? [];
    expect(bodies.some((body) => body.body === "sun")).toBe(true);
    expect(bodies.some((body) => body.body === "moon")).toBe(true);
  });
});

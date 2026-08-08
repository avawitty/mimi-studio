import { describe, expect, it } from "vitest";
import {
  celestialNatalCompletionHint,
  describeCelestialReadoutGaps,
} from "../lib/celestial/celestialReadoutCompleteness";

describe("celestial readout completeness", () => {
  it("flags missing birth date when calibration is enabled", () => {
    const gaps = describeCelestialReadoutGaps({ enabled: true });
    expect(gaps.isNatalComplete).toBe(false);
    expect(gaps.missingForFull).toContain("birth date");
    expect(celestialNatalCompletionHint({ enabled: true })).toContain(
      "birth date",
    );
  });

  it("marks natal complete with birth date only", () => {
    const gaps = describeCelestialReadoutGaps({
      enabled: true,
      birthDate: "1990-06-15",
    });
    expect(gaps.isNatalComplete).toBe(true);
    expect(gaps.missingForFull.some((item) => item.includes("birth time"))).toBe(
      true,
    );
    expect(
      celestialNatalCompletionHint({ enabled: true, birthDate: "1990-06-15" }),
    ).toBeNull();
  });
});

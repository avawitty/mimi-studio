import { describe, expect, it } from "vitest";
import {
  buildForecastSearchQuery,
  hasBrandCalibration,
  hasPersonalCalibration,
  isForecastScopeReady,
  mergeIntakeSnapshot,
} from "../lib/forecastIntake";
import type { UserProfile } from "../types";

const baseProfile = {
  uid: "u1",
  handle: "curator",
  currentSeason: "blooming" as const,
  createdAt: Date.now(),
};

describe("forecastIntake", () => {
  it("detects personal calibration from DNA or intake", () => {
    expect(hasPersonalCalibration(null)).toBe(false);
    expect(
      hasPersonalCalibration({
        ...baseProfile,
        aestheticDNA: { dnaStatement: "test", archetypes: ["archivist"] },
      } as UserProfile),
    ).toBe(true);
    expect(
      hasPersonalCalibration(baseProfile as UserProfile, {
        scope: "personal",
        completedAt: 1,
        personal: { season: "frozen", keywords: ["grain"] },
      }),
    ).toBe(true);
  });

  it("requires brand intake for brand scope readiness", () => {
    expect(
      isForecastScopeReady("brand", baseProfile as UserProfile, null),
    ).toBe(false);
    expect(
      isForecastScopeReady("brand", baseProfile as UserProfile, {
        scope: "brand",
        completedAt: 1,
        brand: { brandName: "Acme", vibe: "editorial brutalism", keywords: [] },
      }),
    ).toBe(true);
  });

  it("builds personalized search queries", () => {
    const personalQuery = buildForecastSearchQuery({
      scope: "personal",
      intake: {
        scope: "personal",
        completedAt: 1,
        personal: {
          season: "burning",
          keywords: ["slow web", "archival"],
          vibe: "tactile monochrome",
        },
      },
      profile: baseProfile as UserProfile,
    });
    expect(personalQuery).toMatch(/slow web/i);
    expect(personalQuery).toMatch(/burning|reinvention/i);

    const brandQuery = buildForecastSearchQuery({
      scope: "brand",
      intake: {
        scope: "brand",
        completedAt: 1,
        brand: {
          brandName: "Acme Studios",
          vibe: "luxury editorial",
          keywords: ["craft"],
        },
      },
      profile: null,
    });
    expect(brandQuery).toMatch(/Acme Studios/i);
    expect(brandQuery).toMatch(/brand positioning/i);
  });

  it("merges intake snapshots per scope without dropping the other scope", () => {
    const merged = mergeIntakeSnapshot(
      {
        scope: "personal",
        completedAt: 1,
        personal: { season: "frozen", keywords: ["ice"] },
      },
      "brand",
      { brandName: "X", vibe: "minimal", keywords: [] },
    );
    expect(merged.personal?.keywords).toEqual(["ice"]);
    expect(merged.brand?.brandName).toBe("X");
    expect(hasBrandCalibration(merged)).toBe(true);
  });
});

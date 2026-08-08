import { describe, expect, it } from "vitest";
import {
  DEFAULT_CELESTIAL_CALIBRATION,
  listEnabledEditorialPlates,
  listEnabledTailorAlgos,
  migrateDisabledAlgos,
  resolveCelestialCalibration,
  toggleEditorialPlateDisabled,
  toggleTailorAlgoDisabled,
} from "../lib/tailor/tailorDefaults";

describe("tailor opt-out defaults", () => {
  it("defaults celestial calibration to enabled", () => {
    expect(DEFAULT_CELESTIAL_CALIBRATION.enabled).toBe(true);
    expect(resolveCelestialCalibration({ enabled: true, zodiac: "leo" }).enabled).toBe(true);
    expect(resolveCelestialCalibration({ enabled: false }).enabled).toBe(false);
    expect(
      resolveCelestialCalibration(undefined as unknown as undefined).enabled,
    ).toBe(true);
  });

  it("enables all tailor algos when nothing is stored", () => {
    expect(listEnabledTailorAlgos(undefined)).toHaveLength(5);
    expect(listEnabledTailorAlgos({})).toHaveLength(5);
  });

  it("migrates legacy enabledAlgos opt-in lists to disabledAlgos", () => {
    expect(
      migrateDisabledAlgos({ enabledAlgos: ["zine_gen", "visual_plates"] }),
    ).toEqual(["scribe_reading", "web_scry", "vocal_note"]);
  });

  it("toggles algos via disabledAlgos opt-out", () => {
    const first = toggleTailorAlgoDisabled(undefined, "zine_gen");
    expect(first).toEqual(["zine_gen"]);
    expect(listEnabledTailorAlgos({ disabledAlgos: first })).not.toContain(
      "zine_gen",
    );
    const restored = toggleTailorAlgoDisabled({ disabledAlgos: first }, "zine_gen");
    expect(restored).toEqual([]);
    expect(listEnabledTailorAlgos({ disabledAlgos: restored })).toHaveLength(5);
  });

  it("enables all editorial plates by default", () => {
    expect(listEnabledEditorialPlates(undefined)).toHaveLength(6);
    expect(listEnabledEditorialPlates({})).toHaveLength(6);
  });

  it("toggles editorial plates via disabledPlates opt-out", () => {
    const first = toggleEditorialPlateDisabled(undefined, "sonic");
    expect(first).toEqual(["sonic"]);
    expect(listEnabledEditorialPlates({ disabledPlates: first })).not.toContain(
      "sonic",
    );
  });

  it("excludes celestial plate when calibration is disabled", () => {
    expect(
      listEnabledEditorialPlates({
        tailorDraft: { celestialCalibration: { enabled: false } } as any,
      }),
    ).not.toContain("celestial");
  });
});

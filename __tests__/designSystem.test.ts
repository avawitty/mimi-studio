import { describe, expect, it } from "vitest";
import {
  chamberFamilyForMode,
  creatorPathIndexForMode,
  isDarkPlateMode,
  isPublicFaceMode,
  isSignalDenseMode,
  cssVar,
} from "../lib/design-system";
import { getRouteEntry, ROUTE_ENTRY_BY_MODE } from "../lib/routes";

describe("design-system chamber helpers", () => {
  it("marks public faces and dark plates", () => {
    expect(isPublicFaceMode("stand")).toBe(true);
    expect(isPublicFaceMode("studio")).toBe(false);
    expect(isDarkPlateMode("mimi-rip")).toBe(true);
    expect(isDarkPlateMode("signature")).toBe(false);
  });

  it("assigns chamber families consistently", () => {
    expect(chamberFamilyForMode("oracle")).toBe("intelligence");
    expect(chamberFamilyForMode("studio")).toBe("orientation");
    expect(chamberFamilyForMode("scribe")).toBe("capture");
    expect(chamberFamilyForMode("tailor")).toBe("identity");
    expect(chamberFamilyForMode("signature")).toBe("identity");
    expect(chamberFamilyForMode("observatory")).toBe("intelligence");
  });

  it("maps creator path steps", () => {
    expect(creatorPathIndexForMode("scribe")).toBe(0);
    expect(creatorPathIndexForMode("the-edit")).toBe(2);
    expect(creatorPathIndexForMode("studio")).toBe(3);
    expect(creatorPathIndexForMode("the-press")).toBe(5);
    expect(creatorPathIndexForMode("oracle")).toBe(-1);
  });

  it("flags signal-dense oracle surfaces", () => {
    expect(isSignalDenseMode("oracle")).toBe(true);
    expect(isSignalDenseMode("editorial-home")).toBe(false);
  });

  it("returns CSS var strings", () => {
    expect(cssVar("cobalt")).toBe("var(--mimi-cobalt)");
    expect(cssVar("periwinkle")).toBe("var(--mimi-periwinkle)");
    expect(cssVar("olive", "#5A5A40")).toBe("var(--mimi-olive, #5A5A40)");
  });
});

describe("routes registry", () => {
  it("exposes canon route entries by mode", () => {
    expect(ROUTE_ENTRY_BY_MODE.studio || getRouteEntry("studio")).toBeTruthy();
    const rip = getRouteEntry("mimi-rip");
    expect(rip?.isPublicFace).toBe(true);
    expect(rip?.isDarkPlate).toBe(true);
    expect(getRouteEntry("chamber-map")?.family).toBe("orientation");
    expect(getRouteEntry("studio")?.phase).toBe("compose");
  });
});

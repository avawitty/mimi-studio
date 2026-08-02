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
    expect(chamberFamilyForMode("oracle")).toBe("reflect");
    expect(chamberFamilyForMode("studio")).toBe("create");
    expect(chamberFamilyForMode("tailor")).toBe("refine");
    expect(chamberFamilyForMode("signature")).toBe("signature");
    expect(chamberFamilyForMode("observatory")).toBe("observe");
  });

  it("maps creator path steps", () => {
    expect(creatorPathIndexForMode("scribe")).toBe(0);
    expect(creatorPathIndexForMode("the-edit")).toBe(1);
    expect(creatorPathIndexForMode("studio")).toBe(2);
    expect(creatorPathIndexForMode("the-press")).toBe(3);
    expect(creatorPathIndexForMode("oracle")).toBe(-1);
  });

  it("flags signal-dense oracle surfaces", () => {
    expect(isSignalDenseMode("oracle")).toBe(true);
    expect(isSignalDenseMode("editorial-home")).toBe(false);
  });

  it("returns CSS var strings", () => {
    expect(cssVar("cobalt")).toBe("var(--mimi-cobalt)");
    expect(cssVar("olive", "#5A5A40")).toBe("var(--mimi-olive, #5A5A40)");
  });
});

describe("routes registry", () => {
  it("exposes canon route entries by mode", () => {
    expect(ROUTE_ENTRY_BY_MODE.studio || getRouteEntry("studio")).toBeTruthy();
    const rip = getRouteEntry("mimi-rip");
    expect(rip?.isPublicFace).toBe(true);
    expect(rip?.isDarkPlate).toBe(true);
  });
});

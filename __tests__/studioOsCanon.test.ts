import { describe, expect, it } from "vitest";
import {
  CANON_MODULES,
  type StudioFamily,
} from "../lib/productCanon";
import {
  resolveChamberIntent,
  routeForChamberIntent,
} from "../lib/chamberIntents";
import { getRouteEntry } from "../lib/routes";

const STUDIO_FAMILIES = new Set<StudioFamily>([
  "orientation",
  "capture",
  "library",
  "identity",
  "production",
  "intelligence",
  "publishing",
  "services",
]);

describe("Studio OS canon", () => {
  it("maps every live canonical route to a screen family", () => {
    for (const module of CANON_MODULES.filter(
      (candidate) => candidate.status === "live",
    )) {
      expect(STUDIO_FAMILIES.has(module.family), module.id).toBe(true);
      expect(getRouteEntry(module.implementedMode ?? module.id)?.family).toBe(
        module.family,
      );
    }
  });

  it("resolves every primary action to a valid route", () => {
    const implementedModes = new Set(
      CANON_MODULES.map((module) => module.implementedMode).filter(Boolean),
    );
    const canonicalRoutes = new Set(
      CANON_MODULES.map((module) => module.canonicalRoute),
    );

    for (const module of CANON_MODULES) {
      expect(
        implementedModes.has(resolveChamberIntent(module.primaryAction.intent)),
        module.id,
      ).toBe(true);
      expect(
        canonicalRoutes.has(
          routeForChamberIntent(module.primaryAction.intent),
        ),
        module.id,
      ).toBe(true);
    }
  });

  it("keeps Scry evidence lanes semantically separate", () => {
    const scry = CANON_MODULES.find((module) => module.id === "scry");
    expect(scry?.generations).toEqual(
      expect.arrayContaining([
        "personal archive grounding",
        "open-web signal retrieval",
        "Scribe reading synthesis",
        "shadow-memory vector hits",
      ]),
    );
    expect(scry?.notes).toMatch(/Lanes stay distinct/);
  });

  it("keeps Pocket provenance in the library contract", () => {
    const pocket = CANON_MODULES.find((module) => module.id === "pocket");
    expect(pocket?.family).toBe("library");
    expect(pocket?.generations).toContain("provenance preservation");
    expect(pocket?.userFlow).toMatch(/provenance/);
    expect(pocket?.notes).toMatch(/IndexedDB/);
  });
});

/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("TailorHub calibration tab", () => {
  it("has exactly one calibrate tab with canonical label and note", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/tailor/TailorHub.tsx"),
      "utf8",
    );

    const calibrateTabMatches = [
      ...source.matchAll(
        /\{\s*id:\s*['"]calibrate['"]\s*,\s*label:\s*['"]([^'"]+)['"]\s*,\s*note:\s*['"]([^'"]+)['"]\s*\}/g,
      ),
    ];

    expect(calibrateTabMatches).toHaveLength(1);
    expect(calibrateTabMatches[0]![1]).toBe("Calibration Lab");
    expect(calibrateTabMatches[0]![2]).toBe("refine");
  });

  it("routes calibrate panel to /tailor/calibrate", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/tailor/TailorHub.tsx"),
      "utf8",
    );
    expect(source).toContain("calibrate: '/tailor/calibrate'");
  });
});

describe("taste calibration documentation", () => {
  it("documents canonical taste intelligence paths", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/taste-calibration-lab.md"),
      "utf8",
    );

    expect(doc).toContain("lib/tasteIntelligence/");
    expect(doc).toContain("domain/tasteIntelligence/repository.ts");
    expect(doc).toContain("infrastructure/database/neon/tasteIntelligenceRepository.ts");
    expect(doc).toContain("/api/mimi/taste-intelligence/calibration/");
    expect(doc).toContain("services/tasteIntelligenceClient.ts");
    expect(doc).toContain("components/tailor/CalibrationLab.tsx");
    expect(doc).toContain("/api/mimi/taste-intelligence/calibration/");
    expect(doc).toMatch(/Do not use.*superseded/i);
  });
});

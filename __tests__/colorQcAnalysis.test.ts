import { describe, expect, it } from "vitest";
import {
  analyzeColorSample,
  deltaE76,
  rgbToHex,
  rgbToLab,
} from "../lib/colorQcAnalysis";

const solidImage = (r: number, g: number, b: number, w = 8, h = 8) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return { data, width: w, height: h };
};

describe("colorQcAnalysis", () => {
  it("formats rgb hex", () => {
    expect(rgbToHex(228, 227, 224)).toBe("#E4E3E0");
  });

  it("reports near-zero ΔE for identical colors", () => {
    const a = rgbToLab(120, 120, 120);
    const b = rgbToLab(120, 120, 120);
    expect(deltaE76(a, b)).toBeLessThan(0.01);
  });

  it("flags warm cast and high ΔE vs cool brand reference", () => {
    const warm = solidImage(220, 180, 120);
    const coolRef = solidImage(120, 140, 200);
    const report = analyzeColorSample({
      ...warm,
      targetColorSpace: "sRGB",
      reference: coolRef,
    });
    expect(report.deltaE).toBeGreaterThan(3);
    expect(report.status === "flagged" || report.status === "failed").toBe(true);
    expect(report.dominance[0]?.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it("forcePass clears issues and caps ΔE", () => {
    const warm = solidImage(240, 160, 80);
    const coolRef = solidImage(80, 120, 200);
    const report = analyzeColorSample({
      ...warm,
      targetColorSpace: "Both",
      reference: coolRef,
      forcePass: true,
    });
    expect(report.status).toBe("passed");
    expect(report.issues).toEqual([]);
    expect(report.deltaE).toBeLessThanOrEqual(1.4);
  });
});

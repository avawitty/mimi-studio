import { describe, expect, it } from "vitest";
import { MAX_BAKE_PLATES } from "../lib/bakeZinePlates";
import {
  DESKTOP_PLATE_CONCURRENCY,
  MAX_PLATE_JOBS,
  editorAssetUrl,
  exportAssetUrl,
  fullFidelityPageIndexes,
  resolvePlateConcurrency,
} from "../lib/zine/zinePerformance";
import { makeLegacyPages } from "./fixtures/zineMetadata";

describe("zine performance budgets", () => {
  it("mounts only the active and adjacent pages at full fidelity", () => {
    expect([...fullFidelityPageIndexes(4, 10)]).toEqual([3, 4, 5]);
    expect([...fullFidelityPageIndexes(0, 10)]).toEqual([0, 1]);
    expect([...fullFidelityPageIndexes(9, 10)]).toEqual([8, 9]);
  });

  it("uses preview assets in the editor and masters in export", () => {
    const page = makeLegacyPages()[0];
    expect(editorAssetUrl(page)).toBe("https://cdn.example.test/preview.jpg");
    expect(exportAssetUrl(page)).toBe("https://cdn.example.test/master.jpg");
  });

  it("bounds plate concurrency and total work", () => {
    expect(resolvePlateConcurrency(99)).toBe(DESKTOP_PLATE_CONCURRENCY);
    expect(resolvePlateConcurrency(99, true)).toBe(2);
    expect(resolvePlateConcurrency(0)).toBe(1);
    expect(resolvePlateConcurrency(undefined, true)).toBe(2);
    expect(MAX_BAKE_PLATES).toBe(24);
    expect(MAX_PLATE_JOBS).toBe(24);
  });
});

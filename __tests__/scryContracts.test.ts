import { describe, expect, it } from "vitest";
import {
  assessScryCoverage,
  createEmptyScryRun,
  type ScryRun,
} from "../schemas/scryContracts";

describe("scryContracts", () => {
  it("creates an empty run with distinct empty lanes", () => {
    const run = createEmptyScryRun("saturation chic");
    expect(run.query).toBe("saturation chic");
    expect(run.sources.personalMemory).toEqual([]);
    expect(run.sources.web).toEqual([]);
    expect(run.sources.shadowMemory).toEqual([]);
    expect(run.sources.generatedReading).toBeUndefined();
    expect(run.laneStatus.personalMemory).toBe("empty");
    expect(run.confidence).toBeUndefined();
  });

  it("assesses coverage from live lanes without random costume scores", () => {
    const run: ScryRun = {
      ...createEmptyScryRun("test"),
      laneStatus: {
        personalMemory: "success",
        web: "failed",
        generatedReading: "success",
        shadowMemory: "empty",
      },
    };
    const confidence = assessScryCoverage(run);
    expect(confidence?.kind).toBe("coverage");
    expect(confidence?.score).toBe(0.5);
    expect(confidence?.label).toContain("2 of 4");
  });

  it("returns undefined confidence when no lane succeeded", () => {
    const run = createEmptyScryRun("void");
    expect(assessScryCoverage(run)).toBeUndefined();
  });

  it("does not treat empty archive lanes as live coverage", () => {
    const run: ScryRun = {
      ...createEmptyScryRun("signed out"),
      laneStatus: {
        personalMemory: "empty",
        web: "empty",
        generatedReading: "empty",
        shadowMemory: "empty",
      },
    };
    expect(assessScryCoverage(run)).toBeUndefined();
  });

  it("counts partial as live but not empty/failed", () => {
    const partialOnly: ScryRun = {
      ...createEmptyScryRun("partial"),
      laneStatus: {
        personalMemory: "partial",
        web: "empty",
        generatedReading: "failed",
        shadowMemory: "empty",
      },
    };
    expect(assessScryCoverage(partialOnly)?.score).toBe(0.25);

    const emptyAndFailed: ScryRun = {
      ...createEmptyScryRun("miss"),
      laneStatus: {
        personalMemory: "empty",
        web: "failed",
        generatedReading: "empty",
        shadowMemory: "empty",
      },
    };
    expect(assessScryCoverage(emptyAndFailed)).toBeUndefined();
  });
});

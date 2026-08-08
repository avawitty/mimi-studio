import { describe, expect, it } from "vitest";
import {
  assessScryCoverage,
  createEmptyScryRun,
  describeScryOutcome,
  type ScryRun,
} from "../schemas/scryContracts";
import {
  asUnknownArray,
  mapArchiveHits,
  mapShadowHits,
  mapWebHits,
  mapYouSearchHits,
} from "../services/scryService";

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

  it("describeScryOutcome never claims complete with zero live lanes", () => {
    const empty = createEmptyScryRun("void");
    expect(describeScryOutcome(empty)).toMatch(/no evidence/i);
    expect(describeScryOutcome(empty)).not.toMatch(/complete/i);

    const failed: ScryRun = {
      ...createEmptyScryRun("miss"),
      laneStatus: {
        personalMemory: "failed",
        web: "failed",
        generatedReading: "empty",
        shadowMemory: "empty",
      },
    };
    expect(describeScryOutcome(failed)).toMatch(/failed/i);
    expect(describeScryOutcome(failed)).not.toMatch(/complete/i);

    const live: ScryRun = {
      ...createEmptyScryRun("hit"),
      laneStatus: {
        personalMemory: "success",
        web: "empty",
        generatedReading: "empty",
        shadowMemory: "empty",
      },
      confidence: {
        kind: "coverage",
        score: 0.25,
        label: "1 of 4 evidence lanes returned",
      },
    };
    expect(describeScryOutcome(live)).toBe("1 of 4 evidence lanes returned");
  });
});

describe("scry lane payload coercion", () => {
  it("treats truthy non-arrays as empty instead of throwing", () => {
    expect(asUnknownArray({ results: [] })).toEqual([]);
    expect(asUnknownArray("nope")).toEqual([]);
    expect(asUnknownArray(null)).toEqual([]);
    expect(mapArchiveHits({ not: "an array" })).toEqual([]);
    expect(mapWebHits({ title: "x" }, { web: {} })).toEqual([]);
    expect(mapArchiveHits([{ id: "1", title: "Ok" }])).toHaveLength(1);
  });

  it("maps shadow hits with similarity onto the shadowMemory lane", () => {
    const hits = mapShadowHits([
      { id: "s1", content_preview: "mineral light", similarity: 0.81, type: "shard" },
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0].sourceLane).toBe("shadowMemory");
    expect(hits[0].similarity).toBe(0.81);
  });

  it("maps you-search deep research into web-lane feed cards with mini write-ups", () => {
    const hits = mapYouSearchHits(
      [
        {
          sourceUrl: "https://vogue.com/article/taste",
          title: "Communicating taste in editorial systems",
          summary: "A field guide to articulating personal style without flattening it.",
          domain: "vogue.com",
          graphType: "web_reference",
          confidence: 0.8,
          aestheticSignals: {
            keywords: ["editorial", "taste", "systems"],
            references: ["Vogue"],
            tone: "elevated / editorial",
          },
        },
      ],
      "you.com",
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].sourceLane).toBe("web");
    expect(hits[0].snippet).toContain("articulating personal style");
    expect(hits[0].url).toBe("https://vogue.com/article/taste");
    expect(hits[0].relevance).toContain("elevated / editorial");
  });
});

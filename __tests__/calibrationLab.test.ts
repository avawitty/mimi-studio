/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { deriveCalibrationCandidates } from "../components/tailor/CalibrationLab";
import { compileTasteModel } from "../lib/tasteModel/compileTasteModel";
import {
  calibrationSessionMatchesScope,
  capCalibrationTargetCount,
  maxUniqueCalibrationPairs,
} from "../lib/tasteIntelligence/calibrationSession";
import type { PatternCluster } from "../types";

const NOW = Date.now();

function cluster(id: string, name: string): PatternCluster {
  return {
    id,
    userId: "u1",
    projectId: "p1",
    name,
    description: "Test",
    category: "visual",
    observationIds: [],
    supportingEvidenceNodeIds: [`ev-${id}`],
    frequency: 2,
    confidence: 0.7,
    possibleInterpretations: [],
    claimType: "inferred",
    userStatus: "accepted",
    userWeight: "medium",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function snapshotWithClusters(clusters: PatternCluster[]) {
  return compileTasteModel({
    userId: "u1",
    scope: "global",
    evidence: [],
    observations: [],
    clusters,
    laws: [],
    events: [],
  });
}

describe("deriveCalibrationCandidates", () => {
  it("prefers external candidates when at least two are provided", () => {
    const external = [
      { id: "a", featureIds: ["f1"], label: "A" },
      { id: "b", featureIds: ["f2"], label: "B" },
    ];
    const result = deriveCalibrationCandidates(
      snapshotWithClusters([cluster("c1", "Soft contrast"), cluster("c2", "Brass hardware")]),
      external,
    );
    expect(result).toEqual(external);
  });

  it("derives paired candidates from taste snapshot feature weights", () => {
    const snapshot = snapshotWithClusters([
      cluster("c1", "Soft contrast"),
      cluster("c2", "Brass hardware"),
      cluster("c3", "Editorial restraint"),
    ]);
    const result = deriveCalibrationCandidates(snapshot);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]?.label).toBeTruthy();
    expect(result[0]?.featureIds.length).toBeGreaterThan(0);
  });

  it("returns empty when snapshot has fewer than two features", () => {
    expect(deriveCalibrationCandidates(snapshotWithClusters([cluster("c1", "only one")]))).toEqual(
      [],
    );
    expect(deriveCalibrationCandidates(null)).toEqual([]);
  });
});

describe("calibration session scope", () => {
  it("global requests match only sessions without project_id", () => {
    expect(calibrationSessionMatchesScope(undefined, undefined)).toBe(true);
    expect(calibrationSessionMatchesScope(null, undefined)).toBe(true);
    expect(calibrationSessionMatchesScope("project-a", undefined)).toBe(false);
  });

  it("project requests never reuse global sessions", () => {
    expect(calibrationSessionMatchesScope(undefined, "project-a")).toBe(false);
    expect(calibrationSessionMatchesScope(null, "project-a")).toBe(false);
    expect(calibrationSessionMatchesScope("project-a", "project-a")).toBe(true);
    expect(calibrationSessionMatchesScope("project-b", "project-a")).toBe(false);
  });

  it("isolates one active project session from a global calibration request", () => {
    const activeProjectSession = { projectId: "project-a", status: "active" as const };
    const globalQueryProjectId: string | undefined = undefined;
    const projectQueryProjectId = "project-a";

    expect(
      calibrationSessionMatchesScope(
        activeProjectSession.projectId,
        globalQueryProjectId,
      ),
    ).toBe(false);
    expect(
      calibrationSessionMatchesScope(
        activeProjectSession.projectId,
        projectQueryProjectId,
      ),
    ).toBe(true);
  });
});

describe("calibration pair exhaustion", () => {
  it("computes max unique pairs as n * (n - 1) / 2", () => {
    expect(maxUniqueCalibrationPairs(2)).toBe(1);
    expect(maxUniqueCalibrationPairs(3)).toBe(3);
    expect(maxUniqueCalibrationPairs(5)).toBe(10);
  });

  it("caps target question count to available pairs", () => {
    expect(capCalibrationTargetCount(2, 12)).toBe(1);
    expect(capCalibrationTargetCount(3, 12)).toBe(3);
    expect(capCalibrationTargetCount(5, 12)).toBe(10);
    expect(capCalibrationTargetCount(5, 4)).toBe(4);
  });
});

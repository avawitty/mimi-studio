/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { deriveCalibrationCandidates } from "../components/tailor/CalibrationLab";
import { compileTasteModel } from "../lib/tasteModel/compileTasteModel";
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

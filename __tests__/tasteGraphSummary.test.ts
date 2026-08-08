import { describe, expect, it } from "vitest";
import {
  computeTasteGraphReadiness,
  pickRicherGraph,
  projectSnapshotToUiGraph,
} from "../lib/taste/tasteGraphSummary";
import type { TasteState } from "../types";
import type { TasteModelSnapshot } from "../lib/tasteModel/contracts";

const emptyState = (userId = "u1"): TasteState => ({
  userId,
  stablePreferences: [],
  negativePreferences: [],
  emergingPreferences: [],
  currentExplorations: [],
  tensions: [],
  inferredAxes: [],
  relevantEvidence: [],
  confidence: 0,
  recentChanges: [],
  generatedAt: Date.now(),
});

describe("tasteGraphSummary", () => {
  it("prefers snapshot projection when signal is stronger", () => {
    const projected = {
      nodes: [{ id: "f1", label: "Editorial serif", type: "concept" as const, weight: 2.5 }],
      edges: [] as Array<{ source: string; target: string; strength: number; type: "relates_to" }>,
    };
    const legacy = {
      nodes: [{ id: "n1", label: "Old node", type: "motif" as const, weight: 0.5 }],
      edges: [] as Array<{ source: string; target: string; strength: number; type: "relates_to" }>,
    };
    const picked = pickRicherGraph(projected, legacy);
    expect(picked.source).toBe("snapshot");
    expect(picked.nodes[0].label).toBe("Editorial serif");
  });

  it("computes readiness gaps for empty taste", () => {
    const readiness = computeTasteGraphReadiness(emptyState(), null, []);
    expect(readiness.canInformGeneration).toBe(false);
    expect(readiness.gaps.length).toBeGreaterThan(0);
    expect(readiness.score).toBeLessThan(40);
  });

  it("projects snapshot features to UI nodes with explanations", () => {
    const snapshot: TasteModelSnapshot = {
      schemaVersion: 1,
      modelVersion: "mimi-taste-model-v1",
      id: "snap_1",
      userId: "u1",
      scope: "global",
      compiledAt: Date.now(),
      featureWeights: [
        {
          featureId: "visual:fw1",
          label: "Warm mineral",
          category: "color",
          sourceType: "pattern_cluster",
          signedWeight: 0.8,
          confidence: 0.72,
          trend: "strengthening",
          sourceIds: ["ev1"],
          contextScopes: ["global"],
          evidenceMass: 1,
          explicitMass: 0.5,
          implicitMass: 0.5,
        },
      ],
      interactionRules: [],
      trajectory: {
        emergingFeatureIds: [],
        strengtheningFeatureIds: ["visual:fw1"],
        stableFeatureIds: [],
        decliningFeatureIds: [],
      },
      sourceWindow: {
        oldestEventAt: Date.now() - 86_400_000,
        newestEventAt: Date.now(),
      },
      diagnostics: {
        evidenceCount: 1,
        eventCount: 1,
        explicitEventCount: 0,
        contradictionCount: 0,
        lowConfidenceFeatureIds: [],
        missingDataWarnings: [],
      },
    };
    const { nodes } = projectSnapshotToUiGraph(snapshot);
    expect(nodes.length).toBe(1);
    expect(nodes[0].explanation).toContain("72%");
    expect(nodes[0].label).toBe("Warm mineral");
  });
});

/**
 * Dev/E2E fixture for Pattern Graph negative-taste flows.
 * Activated via ?e2e=patterns on /tailor/evidence (dev server only).
 */
import type {
  PatternCluster,
  TailorProject,
  EvidenceNode,
  Observation,
} from "../../types";
import { compileTasteModel } from "../tasteModel/compileTasteModel";
import type { TasteModelSnapshot } from "../tasteModel/contracts";

const NOW = Date.now();

export const E2E_TAILOR_QUERY = "e2e";

export function isE2eTailorPatternsFixture(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(E2E_TAILOR_QUERY) === "patterns";
}

export const E2E_TAILOR_PROJECT: TailorProject = {
  id: "e2e-tailor-project",
  userId: "e2e-user",
  title: "E2E negative taste fixture",
  intent: "brand",
  blurb: "E2E negative taste fixture",
  evidenceCount: 2,
  readConfidence: "strong",
  analysisStatus: "analyzed",
  createdAt: NOW,
  updatedAt: NOW,
};

export const E2E_PATTERN_CLUSTERS: PatternCluster[] = [
  {
    id: "cluster-a",
    userId: "e2e-user",
    projectId: E2E_TAILOR_PROJECT.id,
    name: "Soft contrast",
    description: "Muted tonal separation between figure and field.",
    category: "visual",
    observationIds: ["obs-1"],
    supportingEvidenceNodeIds: ["ev-1"],
    frequency: 3,
    confidence: 0.82,
    possibleInterpretations: ["editorial restraint"],
    claimType: "inferred",
    userStatus: "accepted",
    userWeight: "medium",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cluster-b",
    userId: "e2e-user",
    projectId: E2E_TAILOR_PROJECT.id,
    name: "Brass hardware",
    description: "Warm metal accents on utilitarian forms.",
    category: "material",
    observationIds: ["obs-2"],
    supportingEvidenceNodeIds: ["ev-2"],
    frequency: 2,
    confidence: 0.74,
    possibleInterpretations: ["industrial warmth"],
    claimType: "inferred",
    userStatus: "accepted",
    userWeight: "medium",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const E2E_EVIDENCE: EvidenceNode[] = [
  {
    id: "ev-1",
    userId: "e2e-user",
    projectId: E2E_TAILOR_PROJECT.id,
    sourceType: "image",
    title: "Fixture plate A",
    analysisStatus: "analyzed",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "ev-2",
    userId: "e2e-user",
    projectId: E2E_TAILOR_PROJECT.id,
    sourceType: "image",
    title: "Fixture plate B",
    analysisStatus: "analyzed",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const E2E_OBSERVATIONS: Observation[] = [
  {
    id: "obs-1",
    userId: "e2e-user",
    projectId: E2E_TAILOR_PROJECT.id,
    evidenceNodeId: "ev-1",
    category: "compositional",
    label: "Soft contrast",
    description: "Low-contrast layering reads intentional, not flat.",
    confidence: 0.8,
    claimType: "inferred",
    userStatus: "accepted",
    createdAt: NOW,
  },
  {
    id: "obs-2",
    userId: "e2e-user",
    projectId: E2E_TAILOR_PROJECT.id,
    evidenceNodeId: "ev-2",
    category: "material",
    label: "Brass hardware",
    description: "Brass pulls repeat across fittings.",
    confidence: 0.75,
    claimType: "inferred",
    userStatus: "accepted",
    createdAt: NOW,
  },
];

export function buildE2eTasteSnapshot(): TasteModelSnapshot {
  const snapshot = compileTasteModel({
    userId: "e2e-user",
    projectId: E2E_TAILOR_PROJECT.id,
    scope: "project",
    evidence: E2E_EVIDENCE,
    observations: E2E_OBSERVATIONS,
    clusters: E2E_PATTERN_CLUSTERS,
    laws: [],
    events: [],
  });
  snapshot.interactionRules = [
    {
      id: "e2e-interaction-1",
      featureIds: ["pattern_cluster:cluster-a", "pattern_cluster:cluster-b"],
      relation: "reinforces",
      signedWeight: 0.7,
      supportCount: 2,
      confidence: 0.8,
      contextScopes: ["persistent"],
      sourceIds: ["e2e-evidence"],
    },
  ];
  return snapshot;
}

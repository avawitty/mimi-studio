/**
 * Unified Taste Graph summary assembly — canonical read path for chambers.
 */
import type {
  EvidenceAtom,
  TasteGraphEdge,
  TasteGraphNode,
  TasteScope,
  TasteState,
  UsedContextEntry,
} from "../../types";
import type {
  TasteModelGraphEdge,
  TasteModelGraphNode,
  TasteModelSnapshot,
} from "../tasteModel/contracts";
import { projectTasteModelToGraph } from "../tasteModel/projectTasteModelToGraph";

export type TasteGraphProjectionSource = "snapshot" | "legacy" | "empty";

export interface TasteGraphReadiness {
  score: number;
  canInformGeneration: boolean;
  evidenceCount: number;
  assertionCount: number;
  hasSnapshot: boolean;
  gaps: string[];
}

export interface TasteGraphSummary {
  state: TasteState;
  snapshot: TasteModelSnapshot | null;
  evidence: EvidenceAtom[];
  graph: {
    nodes: TasteGraphNode[];
    edges: TasteGraphEdge[];
    source: TasteGraphProjectionSource;
  };
  readiness: TasteGraphReadiness;
  usedContext: UsedContextEntry[];
  generatedAt: number;
}

export function tasteModelGraphNodeToUiNode(node: TasteModelGraphNode): TasteGraphNode {
  const trendNote =
    node.trend !== "stable" && node.trend !== "uncertain" ? ` · ${node.trend}` : "";
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    weight: node.weight,
    explanation: `${node.category} · ${Math.round(node.confidence * 100)}% confidence${trendNote} · ${node.sourceCount} source(s)`,
    tags: [node.category, node.trend],
    claimType: "inferred",
    userStatus: "suggested",
  };
}

export function tasteModelGraphEdgeToUiEdge(edge: TasteModelGraphEdge): TasteGraphEdge {
  return {
    source: edge.source,
    target: edge.target,
    strength: edge.strength,
    type: edge.type,
  };
}

export function projectSnapshotToUiGraph(snapshot: TasteModelSnapshot): {
  nodes: TasteGraphNode[];
  edges: TasteGraphEdge[];
} {
  const projection = projectTasteModelToGraph(snapshot);
  return {
    nodes: projection.nodes.map(tasteModelGraphNodeToUiNode),
    edges: projection.edges.map(tasteModelGraphEdgeToUiEdge),
  };
}

function graphSignalScore(nodes: TasteGraphNode[]): number {
  if (nodes.length === 0) return 0;
  return nodes.reduce((sum, n) => sum + Math.abs(n.weight), 0);
}

export function pickRicherGraph(
  projected: { nodes: TasteGraphNode[]; edges: TasteGraphEdge[] },
  legacy: { nodes: TasteGraphNode[]; edges: TasteGraphEdge[] },
): { nodes: TasteGraphNode[]; edges: TasteGraphEdge[]; source: TasteGraphProjectionSource } {
  const projectedScore = graphSignalScore(projected.nodes);
  const legacyScore = graphSignalScore(legacy.nodes);

  if (projected.nodes.length > 0 && projectedScore >= legacyScore) {
    return { ...projected, source: "snapshot" };
  }
  if (legacy.nodes.length > 0) {
    return { ...legacy, source: "legacy" };
  }
  if (projected.nodes.length > 0) {
    return { ...projected, source: "snapshot" };
  }
  return { nodes: [], edges: [], source: "empty" };
}

export function computeTasteGraphReadiness(
  state: TasteState,
  snapshot: TasteModelSnapshot | null,
  evidence: EvidenceAtom[],
): TasteGraphReadiness {
  const gaps: string[] = [];
  const evidenceCount = evidence.length;
  const assertionCount =
    state.stablePreferences.length +
    state.emergingPreferences.length +
    state.negativePreferences.length;

  if (evidenceCount === 0) {
    gaps.push("Capture references in Pocket or Tailor to seed taste evidence.");
  } else if (evidenceCount < 3) {
    gaps.push("Add more varied evidence — three or more atoms unlock stronger pattern reads.");
  }

  if (assertionCount === 0) {
    gaps.push("Approve patterns in Tailor or correct evidence atoms to form stable preferences.");
  }

  if (!snapshot || snapshot.featureWeights.length === 0) {
    gaps.push("Curate Tailor patterns or save Pocket items to compile a taste model snapshot.");
  }

  if (state.confidence < 0.35) {
    gaps.push("Low overall confidence — confirm or reject inferred signals in the Intel Memo.");
  }

  let score = 0;
  score += Math.min(35, evidenceCount * 8);
  score += Math.min(25, assertionCount * 5);
  score += snapshot ? Math.min(25, snapshot.featureWeights.length * 4) : 0;
  score += Math.round(state.confidence * 15);

  const canInformGeneration =
    evidenceCount > 0 &&
    (assertionCount > 0 || (snapshot?.featureWeights.length ?? 0) > 0 || state.confidence > 0.2);

  return {
    score: Math.min(100, score),
    canInformGeneration,
    evidenceCount,
    assertionCount,
    hasSnapshot: Boolean(snapshot && snapshot.featureWeights.length > 0),
    gaps,
  };
}

export function buildTasteGraphSummary(input: {
  state: TasteState;
  snapshot: TasteModelSnapshot | null;
  evidence: EvidenceAtom[];
  legacyNodes: TasteGraphNode[];
  legacyEdges: TasteGraphEdge[];
  usedContext: UsedContextEntry[];
  context?: TasteScope;
}): TasteGraphSummary {
  const projected = input.snapshot
    ? projectSnapshotToUiGraph(input.snapshot)
    : { nodes: [], edges: [] };

  const graph = pickRicherGraph(projected, {
    nodes: input.legacyNodes,
    edges: input.legacyEdges,
  });

  const readiness = computeTasteGraphReadiness(
    input.state,
    input.snapshot,
    input.evidence,
  );

  return {
    state: input.state,
    snapshot: input.snapshot,
    evidence: input.evidence,
    graph,
    readiness,
    usedContext: input.usedContext,
    generatedAt: Date.now(),
  };
}

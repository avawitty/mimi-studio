import type {
  TasteModelGraphEdge,
  TasteModelGraphNode,
  TasteModelGraphProjection,
  TasteModelSnapshot,
} from './contracts';

/**
 * Project a TasteModelSnapshot into graph nodes/edges compatible with TasteGraph UI.
 * This is a presentation projection — not canonical taste data.
 */
export function projectTasteModelToGraph(
  snapshot: TasteModelSnapshot,
): TasteModelGraphProjection {
  const nodes: TasteModelGraphNode[] = snapshot.featureWeights.map((fw) => ({
    id: fw.featureId,
    label: fw.label,
    type: mapCategoryToNodeType(fw.category),
    weight: Math.abs(fw.signedWeight),
    signedStrength: fw.signedWeight,
    confidence: fw.confidence,
    trend: fw.trend,
    sourceCount: fw.sourceIds.length,
    contextScope: fw.contextScopes[0] ?? 'persistent',
    sourceIds: fw.sourceIds,
    featureId: fw.featureId,
    category: fw.category,
  }));

  const edges: TasteModelGraphEdge[] = snapshot.interactionRules.map((rule) => ({
    source: rule.featureIds[0],
    target: rule.featureIds[1],
    strength: Math.abs(rule.signedWeight),
    type: mapRelationToEdgeType(rule.relation),
    relation: rule.relation,
    confidence: rule.confidence,
  }));

  return { nodes, edges };
}

function mapCategoryToNodeType(
  category: string,
): TasteModelGraphNode['type'] {
  switch (category) {
    case 'historical':
      return 'era';
    case 'visual':
    case 'compositional':
    case 'texture':
    case 'color':
      return 'motif';
    case 'principle':
      return 'concept';
    default:
      return 'concept';
  }
}

function mapRelationToEdgeType(
  relation: string,
): TasteModelGraphEdge['type'] {
  switch (relation) {
    case 'contrasts':
    case 'rejects_when_combined':
      return 'contrasts_with';
    case 'reinforces':
      return 'relates_to';
    case 'contextual_only':
      return 'evolves_from';
    default:
      return 'relates_to';
  }
}

/**
 * Merge model projection with existing graph node positions.
 * Preserves position data from existing nodes when feature IDs match.
 */
export function mergeGraphPositions<T extends { id: string; x?: number; y?: number }>(
  projected: TasteModelGraphNode[],
  existing: T[],
): Array<TasteModelGraphNode & { x?: number; y?: number }> {
  const positionMap = new Map(existing.map((n) => [n.id, { x: n.x, y: n.y }]));
  return projected.map((node) => {
    const pos = positionMap.get(node.id);
    return pos ? { ...node, ...pos } : node;
  });
}

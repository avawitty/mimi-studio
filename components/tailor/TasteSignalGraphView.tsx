import React, { useMemo, useRef } from "react";
import type {
  TasteFeatureWeight,
  TasteInteractionRule,
  TasteModelSnapshot,
} from "../../lib/tasteModel/contracts";
import type { TasteRefusal } from "../../schemas/tasteIntelligenceContracts";
import {
  mergeGraphPositions,
  projectTasteModelToGraph,
} from "../../lib/tasteModel/projectTasteModelToGraph";

const EDGE_STYLES: Record<
  string,
  { strokeDasharray?: string; label: string; icon: string; description: string }
> = {
  reinforces: {
    label: "Reinforces",
    icon: "+",
    description: "Positive co-occurrence relationship",
  },
  contrasts: {
    strokeDasharray: "6 4",
    label: "Contrasts",
    icon: "↔",
    description: "Contrasting relationship",
  },
  rejects_when_combined: {
    strokeDasharray: "2 4",
    label: "Refusal",
    icon: "⊘",
    description: "Negative or refusal relationship when combined",
  },
  contextual_only: {
    strokeDasharray: "8 6",
    label: "Contextual",
    icon: "◎",
    description: "Contextual relationship — applies in specific scope",
  },
  evolves_from: {
    strokeDasharray: "10 3 2 3",
    label: "Evolves from",
    icon: "→",
    description: "Trajectory link between earlier and current signal",
  },
  relates_to: {
    label: "Related",
    icon: "·",
    description: "Related signal",
  },
  contrasts_with: {
    strokeDasharray: "6 4",
    label: "Contrasts",
    icon: "↔",
    description: "Contrasting relationship",
  },
};

function refusalEdge(
  refusal: TasteRefusal,
  features: Map<string, TasteFeatureWeight>,
): { source: string; target: string; meta: (typeof EDGE_STYLES)[string] } | null {
  if (refusal.featureIds.length < 2) return null;
  const [source, target] = refusal.featureIds;
  if (!features.has(source) || !features.has(target)) return null;
  return {
    source,
    target,
    meta: {
      strokeDasharray: "2 4",
      label: "Refusal",
      icon: "⊘",
      description:
        refusal.refusalType === "only_when_combined"
          ? "Conditional refusal — applies only when both appear together"
          : "Active refusal relationship",
    },
  };
}

interface TasteSignalGraphViewProps {
  snapshot: TasteModelSnapshot;
  selectedFeatureId: string | null;
  refusals?: TasteRefusal[];
  onSelectFeature: (featureId: string) => void;
  compact?: boolean;
}

export const TasteSignalGraphView: React.FC<TasteSignalGraphViewProps> = ({
  snapshot,
  selectedFeatureId,
  refusals = [],
  onSelectFeature,
  compact,
}) => {
  const positionRef = useRef<
    Array<{ id: string; x?: number; y?: number }>
  >([]);

  const featureMap = useMemo(
    () => new Map(snapshot.featureWeights.map((f) => [f.featureId, f])),
    [snapshot.featureWeights],
  );

  const nodes = useMemo(() => {
    const projected = projectTasteModelToGraph(snapshot).nodes;
    const withPositions = projected.map((node, index) => {
      const cols = compact ? 2 : 3;
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        ...node,
        x: col * (compact ? 120 : 140) + 40,
        y: row * (compact ? 90 : 110) + 30,
      };
    });
    const merged = mergeGraphPositions(withPositions, positionRef.current);
    positionRef.current = merged.map((n) => ({ id: n.id, x: n.x, y: n.y }));
    return merged;
  }, [snapshot, compact]);

  const edges = useMemo(() => {
    const base = snapshot.interactionRules.map((rule) => ({
      source: rule.featureIds[0],
      target: rule.featureIds[1],
      relation: rule.relation,
      rule,
    }));
    const refusalEdges = refusals
      .map((r) => refusalEdge(r, featureMap))
      .filter(Boolean) as Array<{
      source: string;
      target: string;
      meta: (typeof EDGE_STYLES)[string];
    }>;
    return { base, refusalEdges };
  }, [snapshot.interactionRules, refusals, featureMap]);

  const neighborhood = useMemo(() => {
    if (!selectedFeatureId) return [];
    const related = new Set<string>();
    for (const edge of edges.base) {
      if (edge.source === selectedFeatureId) related.add(edge.target);
      if (edge.target === selectedFeatureId) related.add(edge.source);
    }
    for (const edge of edges.refusalEdges) {
      if (edge.source === selectedFeatureId) related.add(edge.target);
      if (edge.target === selectedFeatureId) related.add(edge.source);
    }
    return [...related]
      .map((id) => featureMap.get(id))
      .filter(Boolean) as TasteFeatureWeight[];
  }, [selectedFeatureId, edges, featureMap]);

  if (compact) {
    return (
      <div className="space-y-3" aria-label="Related signals">
        <p className="text-[10px] uppercase tracking-wider text-mimi-stone">
          Neighborhood
        </p>
        {neighborhood.length === 0 ? (
          <p className="text-xs text-mimi-stone">No linked signals yet.</p>
        ) : (
          <ul className="space-y-2">
            {neighborhood.map((n) => (
              <li key={n.featureId}>
                <button
                  type="button"
                  onClick={() => onSelectFeature(n.featureId)}
                  className="w-full min-h-[44px] border border-mimi-hairline/30 px-3 py-2 text-left text-sm text-mimi-ink"
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const width = Math.max(...nodes.map((n) => (n.x ?? 0) + 80), 320);
  const height = Math.max(...nodes.map((n) => (n.y ?? 0) + 60), 200);

  return (
    <div className="border border-mimi-hairline/30 bg-mimi-field/30 p-3 overflow-x-auto">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Taste signal relationship graph"
        className="min-w-full"
      >
        {edges.base.map((edge) => {
          const source = nodes.find((n) => n.id === edge.source);
          const target = nodes.find((n) => n.id === edge.target);
          if (!source || !target) return null;
          const meta = EDGE_STYLES[edge.relation] ?? EDGE_STYLES.relates_to;
          return (
            <g key={`${edge.source}-${edge.target}-${edge.relation}`}>
              <title>{meta.description}</title>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="var(--mimi-stone)"
                strokeWidth={edge.rule.signedWeight < 0 ? 2 : 1.5}
                strokeDasharray={meta.strokeDasharray}
                opacity={0.7}
              />
              <text
                x={(source.x! + target.x!) / 2}
                y={(source.y! + target.y!) / 2}
                fontSize={9}
                fill="var(--mimi-stone)"
                textAnchor="middle"
              >
                {meta.icon} {meta.label}
              </text>
            </g>
          );
        })}
        {edges.refusalEdges.map((edge) => {
          const source = nodes.find((n) => n.id === edge.source);
          const target = nodes.find((n) => n.id === edge.target);
          if (!source || !target) return null;
          return (
            <g key={`refusal-${edge.source}-${edge.target}`}>
              <title>{edge.meta.description}</title>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="var(--mimi-olive)"
                strokeWidth={2}
                strokeDasharray={edge.meta.strokeDasharray}
              />
              <text
                x={(source.x! + target.x!) / 2}
                y={(source.y! + target.y!) / 2}
                fontSize={9}
                fill="var(--mimi-olive)"
                textAnchor="middle"
              >
                {edge.meta.icon} {edge.meta.label}
              </text>
            </g>
          );
        })}
        {nodes.map((node) => {
          const selected = node.id === selectedFeatureId;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}, ${selected ? "selected" : "select signal"}`}
              onClick={() => onSelectFeature(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectFeature(node.id);
                }
              }}
              className="cursor-pointer"
            >
              <circle
                r={selected ? 14 : 10}
                fill={selected ? "var(--mimi-cobalt)" : "var(--mimi-field)"}
                stroke="var(--mimi-ink)"
                strokeWidth={selected ? 2 : 1}
              />
              <text
                y={24}
                fontSize={10}
                fill="var(--mimi-ink)"
                textAnchor="middle"
              >
                {node.label.length > 14
                  ? `${node.label.slice(0, 12)}…`
                  : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export function describeInteractionRule(rule: TasteInteractionRule): string {
  const meta = EDGE_STYLES[rule.relation] ?? EDGE_STYLES.relates_to;
  return `${meta.label}: ${meta.description}`;
}

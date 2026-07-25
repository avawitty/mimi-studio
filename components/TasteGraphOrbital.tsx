import React, { Suspense, lazy, useMemo } from "react";
import { Loader2, Orbit, Crosshair } from "lucide-react";
import type { TasteEmbeddingPoint } from "../hooks/useTasteGravity";
import type { ThemeNode } from "../services/clusteringService";
import type { TasteGraphNode } from "../types";

const TasteGraphOrbitalScene = lazy(() =>
  import("./TasteGraphOrbitalScene").then((m) => ({ default: m.TasteGraphOrbitalScene })),
);

interface TasteGraphOrbitalProps {
  points: TasteEmbeddingPoint[];
  clusters: ThemeNode[];
  nodes: TasteGraphNode[];
  centerOfGravity: number[] | null;
  loading: boolean;
  isDark: boolean;
  onSelectNode?: (node: TasteGraphNode) => void;
}

function projectTo3D(vector: number[], scale = 8): [number, number, number] {
  if (vector.length < 3) {
    return [0, 0, 0];
  }
  const x = (vector[0] ?? 0) * scale;
  const y = (vector[1] ?? 0) * scale;
  const z = (vector[2] ?? 0) * scale;
  const mag = Math.sqrt(x * x + y * y + z * z) || 1;
  const norm = Math.min(mag, scale * 2) / mag;
  return [x * norm, y * norm, z * norm];
}

export const TasteGraphOrbital: React.FC<TasteGraphOrbitalProps> = ({
  points,
  clusters,
  nodes,
  centerOfGravity,
  loading,
  isDark,
  onSelectNode,
}) => {
  const sceneData = useMemo(() => {
    const artifactPositions = points.slice(0, 80).map((p, i) => ({
      id: p.id,
      label: p.preview.slice(0, 32),
      position: projectTo3D(p.vector),
      distance: p.distanceFromCenter,
      orbitRadius: 2 + (p.distanceFromCenter % 4),
      orbitSpeed: 0.15 + (i % 5) * 0.04,
      color: isDark ? "#a8b79f" : "#10b981",
    }));

    const clusterPositions = clusters.slice(0, 8).map((c, i) => ({
      id: c.id,
      label: c.label,
      position: projectTo3D(c.centroid_vector, 10),
      artifactCount: c.artifact_ids.length,
      color: ["#8b5cf6", "#3b82f6", "#f59e0b", "#ec4899", "#06b6d4"][i % 5],
      orbitRadius: 5 + i * 0.8,
    }));

    const nodePositions = nodes.slice(0, 40).map((n, i) => {
      const hash = n.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
      const angle = (hash % 360) * (Math.PI / 180);
      const r = 3 + (n.weight ?? 0.5) * 4;
      return {
        node: n,
        position: [
          Math.cos(angle) * r,
          (hash % 7) - 3,
          Math.sin(angle) * r,
        ] as [number, number, number],
        color:
          n.type === "concept"
            ? "#10b981"
            : n.type === "motif"
              ? "#3b82f6"
              : n.type === "era"
                ? "#f59e0b"
                : "#8b5cf6",
      };
    });

    return { artifactPositions, clusterPositions, nodePositions };
  }, [points, clusters, nodes, isDark]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-60">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
          Calibrating orbital coordinates...
        </p>
      </div>
    );
  }

  if (points.length === 0 && nodes.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-50 text-center px-8">
        <Orbit size={32} className="text-emerald-500/60" />
        <p className="font-serif italic text-xl">No vectors to orbit</p>
        <p className="font-mono text-[10px] uppercase tracking-widest max-w-sm">
          Extract taste embeddings to populate the 3D gravity field.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 ${isDark ? "bg-[#070707]" : "bg-[#0a0a0a]"}`}
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        }
      >
        <TasteGraphOrbitalScene
          centerOfGravity={centerOfGravity}
          artifacts={sceneData.artifactPositions}
          clusters={sceneData.clusterPositions}
          graphNodes={sceneData.nodePositions}
          isDark={isDark}
          onSelectNode={onSelectNode}
        />
      </Suspense>

      <div className="absolute top-6 left-6 pointer-events-none select-none z-10 flex flex-col gap-0.5 font-mono text-[8px] uppercase tracking-widest text-emerald-400/80 border-l border-current pl-3">
        <div className="flex items-center gap-1.5 font-bold">
          <Crosshair size={10} className="animate-pulse" /> ORBITAL GRAVITY FIELD
        </div>
        <div>ARTIFACTS: {points.length.toString().padStart(3, "0")}</div>
        <div>CLUSTERS: {clusters.length.toString().padStart(2, "0")}</div>
        <div>NODES: {nodes.length.toString().padStart(3, "0")}</div>
      </div>

      <div className="absolute bottom-6 right-6 pointer-events-none select-none z-10 font-mono text-[8px] uppercase tracking-[0.25em] text-white/35">
        Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
};

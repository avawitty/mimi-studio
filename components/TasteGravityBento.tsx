import React from "react";
import { motion } from "motion/react";
import {
  Crosshair,
  Loader2,
  Orbit,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import type { ThemeNode } from "../services/clusteringService";
import type { TasteEmbeddingPoint } from "../hooks/useTasteGravity";

interface TasteGravityBentoProps {
  loading: boolean;
  error: string | null;
  dimension: number;
  pointCount: number;
  clusters: ThemeNode[];
  nearestPoints: TasteEmbeddingPoint[];
  onRefresh: () => void;
  onSelectCluster?: (cluster: ThemeNode) => void;
}

export const TasteGravityBento: React.FC<TasteGravityBentoProps> = ({
  loading,
  error,
  dimension,
  pointCount,
  clusters,
  nearestPoints,
  onRefresh,
  onSelectCluster,
}) => {
  const recentClusters = clusters.slice(0, 6);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 md:p-6 border-b border-nous-border bg-nous-surface/30">
      {/* Center of Gravity hero tile */}
      <motion.div
        layout
        className="col-span-2 row-span-2 border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col justify-between min-h-[140px]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair size={14} className="text-emerald-500 animate-pulse" />
            <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-black">
              Center of Gravity
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
            title="Recalculate gravity"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 opacity-60">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-mono text-[9px] uppercase tracking-widest">
              Mapping latent vectors...
            </span>
          </div>
        ) : error ? (
          <p className="font-mono text-[9px] text-red-500/80 py-4">{error}</p>
        ) : pointCount === 0 ? (
          <p className="font-serif italic text-sm text-nous-subtle py-4">
            No embedding vectors yet. Generate zines or extract from artifacts to
            plot your aesthetic center.
          </p>
        ) : (
          <>
            <div className="space-y-1 py-2">
              <p className="font-serif italic text-lg leading-tight">
                {pointCount} artifacts orbiting a {dimension}D centroid
              </p>
              <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                Mean embedding · euclidean anchor
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="font-mono text-[7px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 uppercase tracking-wider">
                VECTORS: {pointCount.toString().padStart(3, "0")}
              </span>
              <span className="font-mono text-[7px] bg-stone-100 dark:bg-stone-800 text-stone-500 px-1.5 py-0.5 uppercase tracking-wider">
                DIM: {dimension}D
              </span>
            </div>
          </>
        )}
      </motion.div>

      {/* Cluster tiles */}
      {recentClusters.length > 0 ? (
        recentClusters.map((cluster) => (
          <button
            key={cluster.id}
            type="button"
            onClick={() => onSelectCluster?.(cluster)}
            className="border border-nous-border bg-white/60 dark:bg-stone-900/60 p-3 text-left hover:border-purple-500/40 transition-colors group"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Orbit size={10} className="text-purple-500" />
              <span className="font-mono text-[7px] uppercase tracking-widest text-purple-600 dark:text-purple-400">
                Cluster
              </span>
            </div>
            <p className="font-serif italic text-sm leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-2">
              {cluster.label}
            </p>
            <p className="font-mono text-[7px] text-nous-subtle mt-2 uppercase tracking-wider">
              {cluster.artifact_ids.length} artifacts
            </p>
          </button>
        ))
      ) : (
        <div className="col-span-2 border border-dashed border-nous-border p-4 flex flex-col justify-center items-center text-center opacity-60">
          <Sparkles size={16} className="mb-2 text-nous-subtle" />
          <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
            Run cluster extraction to populate taste tiles
          </p>
        </div>
      )}

      {/* Nearest-to-center artifacts */}
      {nearestPoints.slice(0, 4).map((point) => (
        <div
          key={point.id}
          className="border border-nous-border bg-nous-base/50 p-3 flex flex-col gap-1"
        >
          <div className="flex items-center gap-1.5">
            <Target size={9} className="text-[#a8b79f]" />
            <span className="font-mono text-[7px] uppercase tracking-widest text-nous-subtle">
              Core orbit
            </span>
          </div>
          <p className="font-mono text-[9px] font-bold truncate uppercase tracking-tight">
            {point.preview.slice(0, 48)}
          </p>
          <p className="font-mono text-[7px] text-emerald-600 dark:text-emerald-400">
            Δ {point.distanceFromCenter.toFixed(3)}
          </p>
        </div>
      ))}
    </div>
  );
};

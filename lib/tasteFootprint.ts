/**
 * Taste Footprint — compiled summary of the four map-side ledger streams:
 * plotted anchors, listed embeddings, retrieved tags, pattern clusters.
 *
 * Pure compile helpers live here so UI and persistence share one contract.
 */

export interface FootprintAnchor {
  id: string;
  label: string;
  type: string;
  weight: number;
}

export interface FootprintEmbedding {
  id: string;
  preview: string;
  type?: string;
  distanceFromCenter: number;
}

export interface FootprintCluster {
  id: string;
  label: string;
  artifactCount: number;
  updatedAt?: number;
}

export interface TasteFootprint {
  plottedAnchors: FootprintAnchor[];
  listedEmbeddings: FootprintEmbedding[];
  retrievedTags: string[];
  patternClusters: FootprintCluster[];
  dimension: number;
  compiledAt: number;
  source: "live" | "stored";
}

export interface CompileTasteFootprintInput {
  nodes?: Array<{
    id?: string;
    label?: string;
    type?: string;
    weight?: number;
    tags?: string[] | null;
  }>;
  points?: Array<{
    id?: string;
    preview?: string;
    type?: string;
    distanceFromCenter?: number;
  }>;
  clusters?: Array<{
    id?: string;
    label?: string;
    artifact_ids?: string[] | null;
    artifactCount?: number;
    updated_at?: number;
    updatedAt?: number;
  }>;
  dimension?: number;
  compiledAt?: number;
  source?: "live" | "stored";
  tagLimit?: number;
  embeddingLimit?: number;
  anchorLimit?: number;
  clusterLimit?: number;
}

function uniqueTags(nodes: CompileTasteFootprintInput["nodes"], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const node of nodes || []) {
    if (!Array.isArray(node.tags)) continue;
    for (const raw of node.tags) {
      const tag = String(raw || "").trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Compile a Taste Footprint from stored graph / gravity / cluster streams. */
export function compileTasteFootprint(input: CompileTasteFootprintInput): TasteFootprint {
  const tagLimit = input.tagLimit ?? 36;
  const embeddingLimit = input.embeddingLimit ?? 48;
  const anchorLimit = input.anchorLimit ?? 64;
  const clusterLimit = input.clusterLimit ?? 32;

  const plottedAnchors: FootprintAnchor[] = (input.nodes || [])
    .filter((n) => n && String(n.id || "").trim() && String(n.label || "").trim())
    .slice(0, anchorLimit)
    .map((n) => ({
      id: String(n.id),
      label: String(n.label),
      type: String(n.type || "concept"),
      weight: typeof n.weight === "number" && Number.isFinite(n.weight) ? n.weight : 1,
    }));

  const listedEmbeddings: FootprintEmbedding[] = (input.points || [])
    .filter((p) => p && String(p.id || "").trim())
    .slice(0, embeddingLimit)
    .map((p) => ({
      id: String(p.id),
      preview: String(p.preview || "Untitled artifact"),
      type: p.type ? String(p.type) : undefined,
      distanceFromCenter:
        typeof p.distanceFromCenter === "number" && Number.isFinite(p.distanceFromCenter)
          ? p.distanceFromCenter
          : 0,
    }));

  const patternClusters: FootprintCluster[] = (input.clusters || [])
    .filter((c) => c && String(c.id || "").trim() && String(c.label || "").trim())
    .slice(0, clusterLimit)
    .map((c) => {
      const fromIds = Array.isArray(c.artifact_ids) ? c.artifact_ids.length : 0;
      const fromCount =
        typeof c.artifactCount === "number" && Number.isFinite(c.artifactCount)
          ? c.artifactCount
          : 0;
      const updatedAt =
        typeof c.updated_at === "number"
          ? c.updated_at
          : typeof c.updatedAt === "number"
            ? c.updatedAt
            : undefined;
      return {
        id: String(c.id),
        label: String(c.label),
        artifactCount: fromIds || fromCount,
        updatedAt,
      };
    });

  return {
    plottedAnchors,
    listedEmbeddings,
    retrievedTags: uniqueTags(input.nodes, tagLimit),
    patternClusters,
    dimension:
      typeof input.dimension === "number" && Number.isFinite(input.dimension)
        ? input.dimension
        : 0,
    compiledAt: input.compiledAt ?? Date.now(),
    source: input.source ?? "live",
  };
}

export function footprintCounts(footprint: TasteFootprint): {
  plottedAnchors: number;
  listedEmbeddings: number;
  retrievedTags: number;
  patternClusters: number;
} {
  return {
    plottedAnchors: footprint.plottedAnchors.length,
    listedEmbeddings: footprint.listedEmbeddings.length,
    retrievedTags: footprint.retrievedTags.length,
    patternClusters: footprint.patternClusters.length,
  };
}

export function emptyTasteFootprint(compiledAt = Date.now()): TasteFootprint {
  return {
    plottedAnchors: [],
    listedEmbeddings: [],
    retrievedTags: [],
    patternClusters: [],
    dimension: 0,
    compiledAt,
    source: "live",
  };
}

export function footprintSignalScore(f: TasteFootprint): number {
  return (
    f.plottedAnchors.length +
    f.listedEmbeddings.length +
    f.retrievedTags.length +
    f.patternClusters.length
  );
}

/** Prefer the richer of two footprints (by total signal count, then fresher compile). */
export function preferRicherFootprint(a: TasteFootprint, b: TasteFootprint): TasteFootprint {
  const sa = footprintSignalScore(a);
  const sb = footprintSignalScore(b);
  if (sa !== sb) return sa > sb ? a : b;
  return a.compiledAt >= b.compiledAt ? a : b;
}

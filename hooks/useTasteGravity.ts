import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseInit";
import { getClusterAnchors, ThemeNode } from "../services/clusteringService";

export interface TasteEmbeddingPoint {
  id: string;
  preview: string;
  type?: string;
  tone?: string | null;
  vector: number[];
  distanceFromCenter: number;
}

export interface TasteGravityState {
  centerOfGravity: number[] | null;
  dimension: number;
  points: TasteEmbeddingPoint[];
  clusters: ThemeNode[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function meanVector(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const sum = Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      sum[i] += vec[i] ?? 0;
    }
  }
  return sum.map((v) => v / vectors.length);
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function isEmbeddingDoc(data: Record<string, unknown>): data is {
  embedding_field: number[];
  content_preview?: string;
  type?: string;
  tone?: string | null;
} {
  const field = data.embedding_field;
  return Array.isArray(field) && field.length > 0 && typeof field[0] === "number";
}

export function useTasteGravity(userId?: string | null): TasteGravityState {
  const [centerOfGravity, setCenterOfGravity] = useState<number[] | null>(null);
  const [dimension, setDimension] = useState(0);
  const [points, setPoints] = useState<TasteEmbeddingPoint[]>([]);
  const [clusters, setClusters] = useState<ThemeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || userId === "ghost") {
      setCenterOfGravity(null);
      setPoints([]);
      setClusters([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const memorySnap = await getDocs(collection(db, "users", userId, "memory"));
      const embeddingDocs = memorySnap.docs
        .map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))
        .filter((item): item is { id: string; data: { embedding_field: number[]; content_preview?: string; type?: string; tone?: string | null } } => isEmbeddingDoc(item.data));

      const vectors = embeddingDocs.map(({ data }) => data.embedding_field);
      const center = meanVector(vectors);

      if (center) {
        setCenterOfGravity(center);
        setDimension(center.length);
      } else {
        setCenterOfGravity(null);
        setDimension(0);
      }

      const scoredPoints: TasteEmbeddingPoint[] = embeddingDocs.map(({ id, data }) => ({
        id,
        preview: String(data.content_preview ?? "Untitled artifact"),
        type: data.type,
        tone: data.tone ?? null,
        vector: data.embedding_field,
        distanceFromCenter: center
          ? euclideanDistance(data.embedding_field, center)
          : 0,
      }));

      scoredPoints.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
      setPoints(scoredPoints);

      const themeNodes = await getClusterAnchors();
      setClusters(themeNodes);
    } catch (e) {
      console.error("MIMI // useTasteGravity failed:", e);
      setError(e instanceof Error ? e.message : "Failed to load taste vectors");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    centerOfGravity,
    dimension,
    points,
    clusters,
    loading,
    error,
    refresh,
  };
}

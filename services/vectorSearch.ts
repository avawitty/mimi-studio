import { Product } from '../types';
import { auth, db } from "./firebaseInit";
import { signInAnonymously } from "firebase/auth";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { getClient, getEmbeddingWithMeta } from "./geminiService";
import { cosineSimilarity, embeddingsCompatible } from "../lib/embeddingMath";
import {
  auditShadowEmbeddings,
  selectDocsForReindex,
  textForShadowEmbed,
  type ShadowEmbeddingAudit,
  type ShadowMemoryDoc,
} from "../lib/shadowMemoryIndex";

export type { ShadowEmbeddingAudit, ShadowMemoryDoc };

const getAiClient = () => {
    try {
        const { ai } = getClient();
        return ai;
    } catch (e) {
        return null;
    }
};

export const findSimilarProducts = async (tasteVector: number[], limit: number = 2): Promise<Product[]> => {
  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    
    return products
      .filter(product => embeddingsCompatible(tasteVector, product.embedding))
      .map(product => ({
        product,
        similarity: cosineSimilarity(tasteVector, product.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.product);
  } catch (e) {
    console.error("MIMI // Failed to find similar products:", e);
    return [];
  }
};

const ensureAnonymousAuth = async () => {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const res = await signInAnonymously(auth);
    return res.user.uid;
  } catch (error: any) {
    // If anonymous auth is restricted/disabled, fallback to the local profile ID or local fallback
    try {
      const stored = localStorage.getItem('mimi_local_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.uid) {
          return parsed.uid;
        }
      }
    } catch (e) {}
    // If no local profile found, fall back to a generic/stable local visitor ID or 'ghost'
    return 'ghost';
  }
};

/**
 * Bulk shadow writes must use a real Firebase uid — never the shared `ghost`
 * / local-profile fallback (cross-client overwrite risk).
 */
const requireFirebaseUidForShadowWrite = async (): Promise<string | null> => {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const res = await signInAnonymously(auth);
    return res.user.uid;
  } catch (error: any) {
    console.warn(
      "MIMI // Shadow write refused: Firebase auth unavailable (no shared ghost namespace)",
      error?.message || error,
    );
    return null;
  }
};

const buildEmbedText = (item: any): string => {
  if (item.content?.pages) {
    return `${item.title} ${item.content?.oracular_mirror || ""} ${item.content?.poetic_interpretation || ""} ${item.tone || ""}`;
  }
  return `${item.content?.prompt || ""} ${item.notes || ""} ${item.type || ""}`;
};

export const syncToShadowMemory = async (item: any) => {
  try {
    const ai = getAiClient();
    if (!ai) return;

    const uid = await ensureAnonymousAuth();
    let textToEmbed = buildEmbedText(item);

    if (!textToEmbed.trim()) return;

    // OPTIMIZATION: Truncate text strictly to avoid token bloat (Embedding models often have 2048/8192 limits)
    // 2000 chars is safe for almost all embedding models
    if (textToEmbed.length > 2000) textToEmbed = textToEmbed.slice(0, 2000);

    const { values: embedding, model: embeddingModel } = await getEmbeddingWithMeta([{ text: textToEmbed }]);
    if (embedding?.length) {
      await setDoc(doc(db, `users/${uid}/memory`, item.id), {
        kind: 'embedding_shadow',
        originalId: item.id,
        type: item.content?.pages ? 'zine' : 'shard',
        content_preview: textToEmbed.slice(0, 200),
        embed_text: textToEmbed,
        display_image: item.coverImageUrl || item.content?.imageUrl || null,
        synced_at: Date.now(),
        embedding_field: embedding,
        embedding_dims: embedding.length,
        embedding_model: embeddingModel,
        tone: item.tone || null
      }, { merge: true });
    }
  } catch (e: any) {
    console.warn("MIMI // Shadow Sync Failed:", e.message);
  }
};

export const deleteFromShadowMemory = async (itemId: string) => {
  try {
    const uid = await ensureAnonymousAuth();
    await deleteDoc(doc(db, `users/${uid}/memory`, itemId));
  } catch (e: any) {
    console.warn("MIMI // Shadow De-anchor Failed:", e.message);
  }
};

export const getAllShadowMemory = async (): Promise<ShadowMemoryDoc[]> => {
  try {
    const uid = await ensureAnonymousAuth();
    const memoryCollection = collection(db, `users/${uid}/memory`);
    const snapshot = await getDocs(memoryCollection);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ShadowMemoryDoc));
  } catch (e: any) {
    console.warn("MIMI // Shadow Fetch Failed:", e.message);
    return [];
  }
};

export const auditUserShadowMemory = async (
  referenceDims?: number | null,
): Promise<ShadowEmbeddingAudit> => {
  const docs = await getAllShadowMemory();
  return auditShadowEmbeddings(docs, referenceDims);
};

export type ShadowReindexResult = {
  attempted: number;
  updated: number;
  skipped: number;
  failed: number;
  auditBefore: ShadowEmbeddingAudit;
  auditAfter: ShadowEmbeddingAudit;
  model?: string;
  dims?: number;
  /** True when reindex did not run (AI/auth missing) — keep prior needsReindex hint. */
  aborted?: boolean;
  abortReason?: "ai_unavailable" | "auth_required";
};

/**
 * Re-embed shadow docs that are missing vectors or live in a different width
 * than the current query/provider space (e.g. legacy 768 vs Gateway 1536).
 */
export const reindexShadowMemoryEmbeddings = async (options: {
  referenceDims?: number | null;
  referenceModel?: string | null;
  limit?: number;
  onProgress?: (done: number, total: number) => void;
} = {}): Promise<ShadowReindexResult> => {
  const docsForAudit = async () => getAllShadowMemory();

  const ai = getAiClient();
  if (!ai) {
    const docs = await docsForAudit();
    const audit = auditShadowEmbeddings(
      docs,
      options.referenceDims,
      options.referenceModel,
    );
    return {
      attempted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      auditBefore: audit,
      auditAfter: audit,
      aborted: true,
      abortReason: "ai_unavailable",
    };
  }

  const uid = await requireFirebaseUidForShadowWrite();
  if (!uid) {
    const docs = await docsForAudit();
    const audit = auditShadowEmbeddings(
      docs,
      options.referenceDims,
      options.referenceModel,
    );
    return {
      attempted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      auditBefore: audit,
      auditAfter: audit,
      aborted: true,
      abortReason: "auth_required",
    };
  }

  const docs = await getAllShadowMemory();
  const auditBefore = auditShadowEmbeddings(
    docs,
    options.referenceDims,
    options.referenceModel,
  );
  const candidates = selectDocsForReindex(
    docs,
    options.referenceDims,
    options.referenceModel,
  ).slice(0, Math.max(1, options.limit ?? 80));

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let lastModel: string | undefined;
  let lastDims: number | undefined;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const text = textForShadowEmbed(candidate);
    if (!text) {
      skipped += 1;
      options.onProgress?.(i + 1, candidates.length);
      continue;
    }
    try {
      const { values, model } = await getEmbeddingWithMeta([{ text }]);
      if (!values?.length) {
        failed += 1;
        options.onProgress?.(i + 1, candidates.length);
        continue;
      }
      lastModel = model;
      lastDims = values.length;
      // Preserve original synced_at for timeRange age; record reindex separately.
      await setDoc(
        doc(db, `users/${uid}/memory`, candidate.id),
        {
          kind: "embedding_shadow",
          embed_text: text,
          content_preview: text.slice(0, 200),
          embedding_field: values,
          embedding_dims: values.length,
          embedding_model: model,
          reindexed_at: Date.now(),
        },
        { merge: true },
      );
      updated += 1;
    } catch (e: any) {
      console.warn("MIMI // Shadow reindex failed for", candidate.id, e?.message || e);
      failed += 1;
    }
    options.onProgress?.(i + 1, candidates.length);
  }

  const docsAfter = await getAllShadowMemory();
  const auditAfter = auditShadowEmbeddings(
    docsAfter,
    lastDims ?? options.referenceDims ?? auditBefore.referenceDims,
    lastModel ?? options.referenceModel ?? auditBefore.referenceModel,
  );

  return {
    attempted: candidates.length,
    updated,
    skipped,
    failed,
    auditBefore,
    auditAfter,
    model: lastModel,
    dims: lastDims,
  };
};

export type ShadowScryHit = Record<string, unknown> & {
  id: string;
  similarity: number;
  _incompatible?: boolean;
};

export type ShadowScryLaneResult = {
  hits: ShadowScryHit[];
  audit: ShadowEmbeddingAudit;
};

export const scryShadowMemoryLane = async (
  userQuery: string,
  options: { filterType?: string; timeRange?: string } = {},
): Promise<ShadowScryLaneResult> => {
  const emptyAudit = auditShadowEmbeddings([]);
  try {
    const ai = getAiClient();
    if (!ai) return { hits: [], audit: emptyAudit };

    const uid = await ensureAnonymousAuth();
    const memoryCollection = collection(db, `users/${uid}/memory`);
    const snapshot = await getDocs(memoryCollection);
    const docs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ShadowMemoryDoc));

    // Audit even when the query embed fails so width/model drift still surfaces.
    const { values: queryVector, model: queryModel } = await getEmbeddingWithMeta([
      { text: userQuery.slice(0, 2000) },
    ]);
    const audit = auditShadowEmbeddings(
      docs,
      queryVector?.length ?? null,
      queryModel || null,
    );
    if (!queryVector) return { hits: [], audit };

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const queryModelId = String(queryModel || "").trim();

    const hits = snapshot.docs
      .map((d) => {
        const data = d.data() as any;
        const field = data.embedding_field as number[] | undefined;
        const docModel = String(data.embedding_model || "").trim();
        const modelMismatch = Boolean(queryModelId && docModel && docModel !== queryModelId);
        if (!embeddingsCompatible(queryVector, field) || modelMismatch) {
          return { ...data, id: d.id, similarity: 0, _incompatible: true } as ShadowScryHit;
        }
        return {
          ...data,
          id: d.id,
          similarity: cosineSimilarity(queryVector, field),
          _incompatible: false,
        } as ShadowScryHit;
      })
      .filter((r) => {
        if (r._incompatible) return false;
        if (r.similarity < 0.3) return false;

        if (options.filterType && options.filterType !== "all") {
          if (r.type !== options.filterType) return false;
        }

        if (options.timeRange && options.timeRange !== "all") {
          const age = now - (Number(r.synced_at) || 0);
          if (options.timeRange === "week" && age > oneWeek) return false;
          if (options.timeRange === "month" && age > oneMonth) return false;
        }

        return true;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 30);

    return { hits, audit };
  } catch (error: any) {
    if (error?.code !== "auth/api-key-expired" && !(error?.message && error.message.includes("api-key-expired"))) {
      console.error("MIMI // Shadow Scry Error:", error);
    }
    return { hits: [], audit: emptyAudit };
  }
};

/** Back-compat: hits only (zine generator / older callers). */
export const scryShadowMemory = async (
  userQuery: string,
  options: { filterType?: string; timeRange?: string } = {},
) => {
  const { hits } = await scryShadowMemoryLane(userQuery, options);
  return hits;
};

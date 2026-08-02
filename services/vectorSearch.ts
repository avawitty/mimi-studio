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

/**
 * Shared / client-forged namespaces must never hold shadow memory — especially
 * full `embed_text`. Only real Firebase Auth UIDs (registered or anonymous).
 */
const isSharedShadowNamespace = (uid: string | null | undefined): boolean => {
  if (!uid) return true;
  if (uid === "ghost") return true;
  if (uid.startsWith("local_")) return true;
  return false;
};

/**
 * Resolve a Firebase Auth UID for shadow memory. Never falls back to local
 * profile IDs or the shared `ghost` path (cross-user privacy risk).
 */
const requireFirebaseUidForShadow = async (): Promise<string | null> => {
  if (auth.currentUser?.uid && !isSharedShadowNamespace(auth.currentUser.uid)) {
    return auth.currentUser.uid;
  }
  try {
    const res = await signInAnonymously(auth);
    const uid = res.user?.uid;
    if (!uid || isSharedShadowNamespace(uid)) return null;
    return uid;
  } catch (error: any) {
    console.warn(
      "MIMI // Shadow memory: Firebase auth unavailable (refusing shared ghost namespace)",
      error?.message || error,
    );
    return null;
  }
};

const fetchShadowMemoryForUid = async (uid: string): Promise<ShadowMemoryDoc[]> => {
  if (isSharedShadowNamespace(uid)) return [];
  const memoryCollection = collection(db, `users/${uid}/memory`);
  const snapshot = await getDocs(memoryCollection);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ShadowMemoryDoc));
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

    // Full embed_text must never land under shared ghost / local-profile paths.
    const uid = await requireFirebaseUidForShadow();
    if (!uid) return;

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
    const uid = await requireFirebaseUidForShadow();
    if (!uid) return;
    await deleteDoc(doc(db, `users/${uid}/memory`, itemId));
  } catch (e: any) {
    console.warn("MIMI // Shadow De-anchor Failed:", e.message);
  }
};

export const getAllShadowMemory = async (): Promise<ShadowMemoryDoc[]> => {
  try {
    const uid = await requireFirebaseUidForShadow();
    if (!uid) return [];
    return await fetchShadowMemoryForUid(uid);
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
  const emptyAudit = (reason: "ai_unavailable" | "auth_required"): ShadowReindexResult => {
    const audit = auditShadowEmbeddings([], options.referenceDims, options.referenceModel);
    return {
      attempted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      auditBefore: audit,
      auditAfter: audit,
      aborted: true,
      abortReason: reason,
    };
  };

  const ai = getAiClient();
  if (!ai) return emptyAudit("ai_unavailable");

  // Pin one Firebase UID for every read + write — never mix ghost/local fetch
  // with a real-uid write (wrong namespace + false shadowIndexHint clears).
  const uid = await requireFirebaseUidForShadow();
  if (!uid) return emptyAudit("auth_required");

  const docs = await fetchShadowMemoryForUid(uid);
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

  const docsAfter = await fetchShadowMemoryForUid(uid);
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

    const uid = await requireFirebaseUidForShadow();
    if (!uid) return { hits: [], audit: emptyAudit };

    const docs = await fetchShadowMemoryForUid(uid);

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

    const hits = docs
      .map((data) => {
        const field = data.embedding_field as number[] | undefined;
        const docModel = String(data.embedding_model || "").trim();
        const modelMismatch = Boolean(queryModelId && docModel && docModel !== queryModelId);
        if (!embeddingsCompatible(queryVector, field) || modelMismatch) {
          return { ...data, id: data.id, similarity: 0, _incompatible: true } as ShadowScryHit;
        }
        return {
          ...data,
          id: data.id,
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

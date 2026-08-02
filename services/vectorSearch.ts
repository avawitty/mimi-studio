import { Product } from '../types';
import { auth, db } from "./firebaseInit";
import { signInAnonymously } from "firebase/auth";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { embeddingModelId, getClient, getEmbedding } from "./geminiService";
import { cosineSimilarity, embeddingsCompatible } from "../lib/embeddingMath";

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


export const syncToShadowMemory = async (item: any) => {
  try {
    const ai = getAiClient();
    if (!ai) return;

    const uid = await ensureAnonymousAuth();
    let textToEmbed = "";
    
    if (item.content?.pages) {
        // It's a Zine
        textToEmbed = `${item.title} ${item.content?.oracular_mirror || ""} ${item.content?.poetic_interpretation || ""} ${item.tone || ""}`;
    } else {
        // It's a Shard
        textToEmbed = `${item.content?.prompt || ""} ${item.notes || ""} ${item.type || ""}`;
    }

    if (!textToEmbed.trim()) return;

    // OPTIMIZATION: Truncate text strictly to avoid token bloat (Embedding models often have 2048/8192 limits)
    // 2000 chars is safe for almost all embedding models
    if (textToEmbed.length > 2000) textToEmbed = textToEmbed.slice(0, 2000);

    const embedding = await getEmbedding([{ text: textToEmbed }]);
    if (embedding?.length) {
      await setDoc(doc(db, `users/${uid}/memory`, item.id), {
        kind: 'embedding_shadow',
        originalId: item.id,
        type: item.content?.pages ? 'zine' : 'shard',
        content_preview: textToEmbed.slice(0, 200),
        display_image: item.coverImageUrl || item.content?.imageUrl || null,
        synced_at: Date.now(),
        embedding_field: embedding,
        embedding_dims: embedding.length,
        // Requested Gemini role model; gateway proxy may substitute openai/text-embedding-3-small.
        embedding_model: embeddingModelId(),
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

export const getAllShadowMemory = async () => {
  try {
    const uid = await ensureAnonymousAuth();
    const memoryCollection = collection(db, `users/${uid}/memory`);
    const snapshot = await getDocs(memoryCollection);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (e: any) {
    console.warn("MIMI // Shadow Fetch Failed:", e.message);
    return [];
  }
};

export const scryShadowMemory = async (userQuery: string, options: { filterType?: string, timeRange?: string } = {}) => {
  try {
    const ai = getAiClient();
    if (!ai) return [];

    const uid = await ensureAnonymousAuth();
    
    // Generate embedding for the query
    const queryVector = await getEmbedding([{ text: userQuery.slice(0, 2000) }]);
    if (!queryVector) return [];

    // Fetch memory collection
    const memoryCollection = collection(db, `users/${uid}/memory`);
    const snapshot = await getDocs(memoryCollection);
    
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const results = snapshot.docs.map(d => {
        const data = d.data() as any;
        const field = data.embedding_field as number[] | undefined;
        // Skip legacy / cross-provider vectors whose width does not match the query space.
        if (!embeddingsCompatible(queryVector, field)) {
          return { ...data, id: d.id, similarity: 0, _incompatible: true };
        }
        return { 
          ...data, 
          id: d.id, 
          similarity: cosineSimilarity(queryVector, field),
          _incompatible: false,
        };
    })
    .filter(r => {
        if (r._incompatible) return false;

        // 1. Minimum relevance threshold
        if (r.similarity < 0.3) return false;

        // 2. Type filtering
        if (options.filterType && options.filterType !== 'all') {
            if (r.type !== options.filterType) return false;
        }

        // 3. Time filtering
        if (options.timeRange && options.timeRange !== 'all') {
            const age = now - (r.synced_at || 0);
            if (options.timeRange === 'week' && age > oneWeek) return false;
            if (options.timeRange === 'month' && age > oneMonth) return false;
        }

        return true;
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 30);

    return results;
  } catch (error: any) {
    if (error?.code !== 'auth/api-key-expired' && !(error?.message && error.message.includes('api-key-expired'))) {
        console.error("MIMI // Shadow Scry Error:", error);
    }
    return [];
  }
};

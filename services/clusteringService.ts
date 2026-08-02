import { collection, doc, setDoc, getDocs, query, where, deleteDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import { getClient } from "./geminiService";
import { getAllShadowMemory } from "./vectorSearch";
import { handleFirestoreError, OperationType } from "./firebaseUtils";
import { partitionByEmbeddingWidth } from "../lib/embeddingMath";
import { cosineSimilarity } from "../lib/embeddingMath";

export interface ThemeNode {
  id: string;
  label: string;
  centroid_vector: number[];
  artifact_ids: string[];
  created_at: number;
  updated_at: number;
}

// Simple K-Means implementation for browser
function kMeans(vectors: number[][], k: number, maxIterations = 50) {
  if (vectors.length === 0 || k === 0) return { centroids: [], assignments: [] };
  
  // Initialize centroids randomly from existing vectors
  let centroids = [];
  let usedIndices = new Set();
  while (centroids.length < k && centroids.length < vectors.length) {
    let idx = Math.floor(Math.random() * vectors.length);
    if (!usedIndices.has(idx)) {
      centroids.push([...vectors[idx]]);
      usedIndices.add(idx);
    }
  }

  let assignments = new Array(vectors.length).fill(0);
  let changed = true;
  let iterations = 0;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Assign vectors to nearest centroid (using cosine distance)
    for (let i = 0; i < vectors.length; i++) {
      let bestDist = -Infinity; // We want max cosine similarity
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        let sim = cosineSimilarity(vectors[i], centroids[c]);
        if (sim > bestDist) {
          bestDist = sim;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    // Update centroids
    let newCentroids = Array(k).fill(0).map(() => Array(vectors[0].length).fill(0));
    let counts = Array(k).fill(0);

    for (let i = 0; i < vectors.length; i++) {
      let cluster = assignments[i];
      counts[cluster]++;
      for (let d = 0; d < vectors[i].length; d++) {
        newCentroids[cluster][d] += vectors[i][d];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < newCentroids[c].length; d++) {
          newCentroids[c][d] /= counts[c];
        }
      } else {
        // Handle empty cluster by picking a random vector
        newCentroids[c] = [...vectors[Math.floor(Math.random() * vectors.length)]];
      }
    }
    centroids = newCentroids;
  }

  return { centroids, assignments };
}

export const generateClusterAnchors = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const memories = await getAllShadowMemory();
    const embeddable = memories.filter(
      (m: any) => Array.isArray(m.embedding_field) && m.embedding_field.length > 0,
    );
    if (embeddable.length < 5) {
      console.log("MIMI // Not enough embedded artifacts to form clusters.");
      return;
    }

    const { ai } = getClient();
    if (!ai) return;

    const newThemes: ThemeNode[] = [];
    const widthGroups = partitionByEmbeddingWidth(embeddable, (m: any) => m.embedding_field);

    // Run k-means per embedding width — mixed Gemini (768) and Gateway (1536) vectors
    // must never share a centroid space.
    for (const [, group] of widthGroups) {
      if (group.length < 2) continue;

      const k = Math.max(2, Math.min(8, Math.floor(Math.sqrt(group.length / 2))));
      const vectors = group.map((m: any) => m.embedding_field);
      const { centroids, assignments } = kMeans(vectors, k);

      for (let c = 0; c < k; c++) {
        const clusterMemories = group.filter((_, i) => assignments[i] === c);
        if (clusterMemories.length === 0) continue;

        clusterMemories.sort((a: any, b: any) => {
          const simA = cosineSimilarity(a.embedding_field, centroids[c]);
          const simB = cosineSimilarity(b.embedding_field, centroids[c]);
          return simB - simA;
        });

        const topItems = clusterMemories.slice(0, 5);
        const textToAnalyze = topItems.map((m: any) => m.content_preview).join("\n\n");

        const prompt = `You are Mimi, an aesthetic intelligence system. Analyze the following artifacts which have been clustered together based on semantic similarity.
      
Artifacts:
${textToAnalyze}

What is the underlying aesthetic, emotional, or thematic thread connecting these items? 
Provide ONLY a short, poetic, 2-4 word label for this cluster (e.g., "Late Night Introspection", "Digital Brutalism", "Ethereal Nostalgia"). Do not include quotes or any other text.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
        });

        const label = response.text?.trim().replace(/["']/g, '') || "Unknown Cluster";

        const themeId = `theme_${Date.now()}_${newThemes.length}`;
        const theme: ThemeNode = {
          id: themeId,
          label,
          centroid_vector: centroids[c],
          artifact_ids: clusterMemories.map((m: any) => m.id),
          created_at: Date.now(),
          updated_at: Date.now()
        };

        newThemes.push(theme);
      }
    }

    if (newThemes.length === 0) {
      console.log("MIMI // Not enough same-width embedded artifacts to form clusters.");
      return;
    }

    // Save themes to Firestore
    const themesCollection = collection(db, `users/${uid}/themes`);
    const batch = writeBatch(db);
    
    // Clear old themes first
    try {
      const oldThemesSnap = await getDocs(themesCollection);
      oldThemesSnap.docs.forEach(d => batch.delete(d.ref));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/themes`);
    }

    // Prepare new themes
    newThemes.forEach(t => {
      batch.set(doc(themesCollection, t.id), t);
    });

    // Commit batch
    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${uid}/themes`);
    }

    console.log(`MIMI // Generated ${newThemes.length} Cluster Anchors.`);
    return newThemes;

  } catch (error) {
    console.error("MIMI // Clustering Error:", error);
  }
};

export const getClusterAnchors = async (): Promise<ThemeNode[]> => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const themesCollection = collection(db, `users/${uid}/themes`);
    const snapshot = await getDocs(themesCollection);
    return snapshot.docs.map(d => d.data() as ThemeNode);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/themes`);
    return [];
  }
};

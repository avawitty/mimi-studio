import { collection, doc, setDoc, getDocs, query, where, deleteDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import { getClient } from "./geminiService";
import { getAllShadowMemory } from "./vectorSearch";
import { handleFirestoreError, OperationType } from "./firebaseUtils";

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

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA); magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

export const generateClusterAnchors = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const memories = await getAllShadowMemory();
    if (memories.length < 5) {
      console.log("MIMI // Not enough artifacts to form clusters.");
      return;
    }

    // Determine K (number of clusters)
    // Rule of thumb: sqrt(n/2) or just a fixed number for now
    const k = Math.max(2, Math.min(8, Math.floor(Math.sqrt(memories.length / 2))));

    const vectors = memories.map((m: any) => m.embedding_field);
    const { centroids, assignments } = kMeans(vectors, k);

    const { ai } = getClient();
    if (!ai) return;

    const newThemes: ThemeNode[] = [];

    // For each cluster, find the top items and ask Gemini for a label
    for (let c = 0; c < k; c++) {
      const clusterMemories = memories.filter((_, i) => assignments[i] === c);
      if (clusterMemories.length === 0) continue;

      // Sort by distance to centroid
      clusterMemories.sort((a: any, b: any) => {
        const simA = cosineSimilarity(a.embedding_field, centroids[c]);
        const simB = cosineSimilarity(b.embedding_field, centroids[c]);
        return simB - simA; // Descending
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

      const themeId = `theme_${Date.now()}_${c}`;
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

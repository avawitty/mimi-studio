import { GoogleGenAI, Type } from "@google/genai";
import { PocketItem, UserProfile, TasteReflection, TailorLogicDraft } from "../types";
import { getClient } from './geminiService';

// --- TASTE FIELD GEOMETRY (EMBEDDINGS & CLUSTERS) ---

/**
 * Step 1: Extract an Aesthetic Manifest.
 * If we just embed a raw URL or random text, the vector space becomes noisy.
 * We use Gemini Flash to distill the raw signal into a dense, structured string
 * of aesthetic properties (Materiality, Silhouette, Era, Mood, Brand Context).
 */
export interface AestheticManifestResult {
  manifest: string;
  title: string;
  url: string;
  thumbnail?: string;
}

export const generateAestheticManifest = async (rawContent: string, apiKey?: string): Promise<AestheticManifestResult> => {
  const { ai } = getClient(apiKey);
  if (!ai) return { manifest: rawContent, title: 'Untitled', url: rawContent };

  let safeRawContent = rawContent;
  if (safeRawContent.length > 5000) {
    safeRawContent = safeRawContent.substring(0, 5000) + '... [TRUNCATED]';
  }

  const prompt = `You are the Thimble Extraction Engine.
Analyze the following raw artifact (which might be a URL, a thought, or a description).
1. Extract its core aesthetic properties into a dense, comma-separated list of keywords.
   Focus ONLY on: Materiality, Silhouette, Era, Mood, Color, and Brand Context.
2. Extract the title, URL, and if possible, a thumbnail URL.
   If it's a URL, use the search tool to find the page title and a representative image URL.

Raw Artifact:
"${safeRawContent}"

Return a JSON object:
{
  "manifest": "dense keyword string",
  "title": "string",
  "url": "string",
  "thumbnail": "string (optional)"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    const text = response.text?.trim();
    if (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("MIMI // Manifest JSON Parse Failed:", e);
      }
    }
    return { manifest: rawContent, title: 'Untitled', url: rawContent };
  } catch (e) {
    console.error("MIMI // Manifest Extraction Failed:", e);
    return { manifest: rawContent, title: 'Untitled', url: rawContent };
  }
};

/**
 * Step 2: Embed the Manifest.
 * We convert the dense aesthetic string into a 768-dimensional vector.
 */
export const embedTasteSignal = async (manifest: string, apiKey?: string): Promise<number[]> => {
  const { ai } = getClient(apiKey);
  if (!ai) return [];

  let safeManifest = manifest;
  if (safeManifest.length > 5000) {
    safeManifest = safeManifest.substring(0, 5000) + '... [TRUNCATED]';
  }

  try {
    const result = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: [safeManifest],
    });
    return result.embeddings?.[0]?.values || [];
  } catch (e) {
    console.error("MIMI // Embedding Failed:", e);
    return [];
  }
};

/**
 * Step 3: Calculate Center of Gravity (Taste Profile)
 * The user's taste identity is simply the mean of all their signal embeddings.
 */
export const calculateCenterOfGravity = (embeddings: number[][]): number[] => {
  if (!embeddings.length) return [];
  const dimensions = embeddings[0].length;
  const center = new Array(dimensions).fill(0);
  
  for (const vec of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      center[i] += vec[i];
    }
  }
  
  for (let i = 0; i < dimensions; i++) {
    center[i] /= embeddings.length;
  }
  
  return center;
};

/**
 * Math: Cosine Similarity
 * Measures how closely aligned two vectors are (1 = identical, -1 = opposite).
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Step 4: Derive Clusters dynamically.
 * We don't store clusters; we compute them from the signal cloud.
 * This is a simple radius-based clustering algorithm.
 */
export interface ComputedCluster {
  id: string;
  center: number[];
  items: PocketItem[];
  label?: string; // We can ask the LLM to label this later
}

export const deriveClusters = (items: PocketItem[], similarityThreshold = 0.85): ComputedCluster[] => {
  const clusters: ComputedCluster[] = [];
  const embeddedItems = items.filter(item => item.embedding && item.embedding.length > 0);

  for (const item of embeddedItems) {
    let assigned = false;
    for (const cluster of clusters) {
      const sim = cosineSimilarity(item.embedding!, cluster.center);
      if (sim >= similarityThreshold) {
        cluster.items.push(item);
        // Recalculate cluster center
        cluster.center = calculateCenterOfGravity(cluster.items.map(i => i.embedding!));
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.push({
        id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        center: item.embedding!,
        items: [item]
      });
    }
  }

  // Filter out noise (clusters with only 1 item) if we have enough data
  if (embeddedItems.length > 5) {
    return clusters.filter(c => c.items.length > 1);
  }
  return clusters;
};

// --- EXISTING TASTE ENGINE LOGIC ---

export const transmuteThought = async (thought: string, apiKey?: string): Promise<string> => {
  const { ai } = getClient(apiKey);
  if (!ai) return "The uplink is silent. I cannot hear you.";

  let safeThought = thought;
  if (safeThought.length > 2000) {
    safeThought = safeThought.substring(0, 2000) + '... [TRUNCATED]';
  }

  const prompt = `You are Mimi, an aesthetic savant, style curator, and an ultra chic aesthetic Superintelligence system.
The user has provided a raw thought, perhaps a "bad thought" or just a random musing.
Your task is to perform "Daoist thought alchemy" on this thought.
Turn it into a paradoxical insight. We don't know if it's good or bad, it just *is*.
Keep it concise, slightly cryptic, highly aesthetic, and deeply insightful.
Speak directly to the user.

User's thought: "${safeThought}"

Return ONLY the paradoxical insight as a plain string.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    
    return response.text?.trim() || "The thought dissolves before it can be transmuted.";
  } catch (e) {
    console.error("MIMI // Thought Transmutation Failed:", e);
    return "The acoustic uplink experienced interference. Try again.";
  }
};

export const analyzeTasteLanguage = async (recentItems: PocketItem[], profile: UserProfile, apiKey?: string): Promise<string[]> => {
  const { ai } = getClient(apiKey);
  if (!ai) return [];

  // Limit to the 50 most recent items to avoid token limits
  const itemsToAnalyze = recentItems.slice(-50);
  
  const itemContext = itemsToAnalyze.map(item => {
    let safeContent = item.content;
    if (typeof safeContent === 'string' && safeContent.startsWith('data:image')) {
      safeContent = '[BASE64_IMAGE_DATA_OMITTED]';
    } else if (typeof safeContent === 'object' && safeContent !== null) {
      // Create a shallow copy to avoid mutating the original
      safeContent = { ...safeContent };
      for (const key in safeContent) {
        if (typeof safeContent[key] === 'string' && safeContent[key].startsWith('data:image')) {
          safeContent[key] = '[BASE64_IMAGE_DATA_OMITTED]';
        }
      }
    }
    // Also limit the overall length of the stringified content
    let stringifiedContent = JSON.stringify(safeContent);
    if (stringifiedContent.length > 1000) {
      stringifiedContent = stringifiedContent.substring(0, 1000) + '... [TRUNCATED]';
    }
    let tagsString = item.tags?.join(', ') || '';
    if (tagsString.length > 200) {
      tagsString = tagsString.substring(0, 200) + '...';
    }
    return `Type: ${item.type}, Content: ${stringifiedContent}, Tags: ${tagsString}`;
  }).join('\n');
  
  let profileString = JSON.stringify(profile.tailorDraft?.positioningCore?.aestheticCore);
  if (profileString && profileString.length > 2000) {
    profileString = profileString.substring(0, 2000) + '...';
  }

  const prompt = `You are The Thimble Language Engine. Analyze the user's recent creative assembly and extract the current "Language of their Taste".
  
  User Aesthetic Profile: ${profileString}
  
  Recent Assemblies:
  ${itemContext}
  
  Generate 5 evocative, concise, and precise aesthetic tags or concepts that define the user's current taste evolution. Return as a JSON array of strings.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("MIMI // Taste Engine Analysis Failed:", e);
    return [];
  }
};

export const analyzeArtifact = async (artifactContent: string, draft: TailorLogicDraft, apiKey?: string): Promise<TasteReflection | null> => {
  const { ai } = getClient(apiKey);
  if (!ai) return null;

  let safeArtifactContent = artifactContent;
  if (safeArtifactContent.length > 5000) {
    safeArtifactContent = safeArtifactContent.substring(0, 5000) + '... [TRUNCATED]';
  }

  const prompt = `You are The Thimble Intelligence Layer. Analyze the following artifact (a link, description, or thought) against the user's Taste DNA (Tailor Profile).
  
  User Taste DNA:
  - Silhouettes: ${draft.positioningCore.aestheticCore.silhouettes.join(', ')}
  - Materiality: ${draft.positioningCore.aestheticCore.materiality.join(', ')}
  - Era Bias: ${draft.positioningCore.aestheticCore.eraBias}
  - Palette: ${draft.expressionEngine.chromaticRegistry.primaryPalette.map(p => p.name).join(', ')}
  - Exclusions: ${draft.positioningCore.exclusionPrinciples.join(', ')}
  - Preferred Density: ${draft.positioningCore.aestheticCore.density}/10 (amount of visual information)
  - Preferred Entropy: ${draft.positioningCore.aestheticCore.entropy}/10 (randomness vs order)
  
  Artifact to Analyze:
  "${safeArtifactContent}"
  
  Extract the fashion/aesthetic signals from the artifact, compare it to the Taste DNA, and generate a Taste Reflection Card.
  
  CRITICAL: Evaluate the artifact using Density and Entropy.
  - Density (0-10): How much visual information is present? (Low = few elements, negative space; High = layered, complex, busy).
  - Entropy (0-10): How ordered or predictable is it? (Low = symmetrical, uniform, minimal; High = chaotic, mixed textures, asymmetric).
  
  For both metrics, explain which visual signals contributed to those scores. Reference composition, number of elements, textures, palette variation, silhouette complexity, and structural order.
  Then, provide an 'attractionAnalysis' explaining how the density and entropy of this artifact influence why it might feel visually appealing to the user based on their preferred Density and Entropy bands.
  
  Return a JSON object matching this schema:
  {
    "alignmentScore": number (0-100),
    "analysis": {
      "pros": ["string (why it fits)"],
      "cons": ["string (why it might clash or diverge)"]
    },
    "prediction": "string (how it integrates into their capsule/life)",
    "evolution": {
      "reinforces": "string (what existing taste it strengthens)",
      "introduces": "string (what new element it brings)",
      "trajectory": "string (where their taste might be heading based on this)"
    },
    "extractedSignals": {
      "brand": "string (optional)",
      "silhouette": "string (optional)",
      "palette": ["string"],
      "category": "string (optional)",
      "material": "string (optional)",
      "tags": ["string"]
    },
    "metrics": {
      "density": {
        "score": number,
        "signals": "string (visual features detected)",
        "reasoning": "string (explanation of the score)"
      },
      "entropy": {
        "score": number,
        "signals": "string (visual features detected)",
        "reasoning": "string (explanation of the score)"
      },
      "attractionAnalysis": "string (why this appeals to the user based on their density/entropy preferences)"
    }
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alignmentScore: { type: Type.INTEGER },
            analysis: {
              type: Type.OBJECT,
              properties: {
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            prediction: { type: Type.STRING },
            evolution: {
              type: Type.OBJECT,
              properties: {
                reinforces: { type: Type.STRING },
                introduces: { type: Type.STRING },
                trajectory: { type: Type.STRING }
              }
            },
            extractedSignals: {
              type: Type.OBJECT,
              properties: {
                brand: { type: Type.STRING },
                silhouette: { type: Type.STRING },
                palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                category: { type: Type.STRING },
                material: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            metrics: {
              type: Type.OBJECT,
              properties: {
                density: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    signals: { type: Type.STRING },
                    reasoning: { type: Type.STRING }
                  }
                },
                entropy: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    signals: { type: Type.STRING },
                    reasoning: { type: Type.STRING }
                  }
                },
                attractionAnalysis: { type: Type.STRING }
              }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text || 'null');
  } catch (e) {
    console.error("MIMI // Artifact Analysis Failed:", e);
    return null;
  }
};

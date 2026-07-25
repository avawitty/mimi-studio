import { GoogleGenAI } from "@google/genai";
import { getClient } from "./geminiClient";
import { AestheticVector, ThimbleTasteEvent } from "../types";

export const extractVector = async (input: string): Promise<{ vector: AestheticVector; description: string }> => {
  const { ai } = getClient();
  const prompt = `
You are a feature extraction system for aesthetic analysis.

Analyze the provided input (image, product, or text reference). Do NOT describe the subject matter. Do NOT use metaphor or emotional language.

Evaluate ONLY visual and stylistic properties using the following axes, each on a scale from 0.0 to 1.0:

- entropy (minimal → complex)
- density (light/airy → dense/layered)
- silhouette (fluid → structured)
- texture (smooth → coarse)
- contrast (tonal → high contrast)
- temporalSignal (timeless → time-specific)
- expressiveness (restrained → expressive)
- novelty (expected → surprising)
- tension (harmonious → conflicting)

Return ONLY valid JSON in this format:

{
  "vector": {
    "entropy": number,
    "density": number,
    "silhouette": number,
    "texture": number,
    "contrast": number,
    "temporalSignal": number,
    "expressiveness": number,
    "novelty": number,
    "tension": number
  },
  "description": "Two sentences explaining relationships between axes only."
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts: [{ text: input }, { text: prompt }] },
    config: { responseMimeType: "application/json" },
  });

  const json = JSON.parse(response.text!);
  return { vector: json.vector, description: json.description };
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

export const calculateTrajectory = (similarity: number, novelty: number): ThimbleTasteEvent['trajectoryLabel'] => {
  if (similarity > 0.8) return 'aligned';
  if (similarity > 0.5) return 'adjacent';
  if (similarity <= 0.5 && novelty > 0.6) return 'latent';
  return 'divergent';
};

export const generateInterpretation = async (
  userVector: AestheticVector,
  artifactVector: AestheticVector,
  artifactDescription: string
): Promise<string> => {
  const prompt = `
Given:

User aesthetic vector: ${JSON.stringify(userVector)}
Artifact vector: ${JSON.stringify(artifactVector)}
Artifact description: ${artifactDescription}

Prioritize the most significant differences between the user and artifact vectors.

Identify:
1. What is most different (e.g., "This piece is much denser and more structured than your baseline")
2. Whether that difference suggests attraction, rejection, or expansion of the user's taste.
3. What this implies about the user's evolving taste.

Be specific. Avoid generic phrasing. No metaphors.
`;

  const { ai } = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  return response.text!;
};

export const calculateConfidence = (vector: AestheticVector): number => {
  const values = Object.values(vector);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - 0.5, 2), 0) / values.length;
  // Simple heuristic: higher variance from 0.5 means more "decisive" values
  return Math.min(1, variance * 4);
};

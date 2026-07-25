import { Type } from "@google/genai";
import { Fragment } from "../types";
import { withResilience } from "./geminiService";

export async function analyzeFragment(fragment: Fragment): Promise<{ tags: string[], aestheticVector: Record<string, number> }> {
  return await withResilience(async (ai) => {
    // Construct prompt based on fragment type
    let prompt = `Analyze this creative fragment and provide:
    1. A list of 5-10 descriptive, classic AI tags suitable for SEO and categorization (e.g., "minimalist", "brutalist", "vintage", "high-contrast", "cinematic").
    2. An aesthetic vector (a JSON object with keys: "density", "entropy", "warmth", "serenity", "chaos", "structure", each value 0-1).
    
    Fragment content: ${JSON.stringify(fragment.content)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            aestheticVector: {
              type: Type.OBJECT,
              properties: {
                density: { type: Type.NUMBER },
                entropy: { type: Type.NUMBER },
                warmth: { type: Type.NUMBER },
                serenity: { type: Type.NUMBER },
                chaos: { type: Type.NUMBER },
                structure: { type: Type.NUMBER },
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      tags: result.tags || [],
      aestheticVector: result.aestheticVector || {}
    };
  });
}

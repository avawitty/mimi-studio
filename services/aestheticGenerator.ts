import { Type } from "@google/genai";
import { withResilience } from "./geminiService";

export const generateAestheticOutput = async (input: string, references: string[]) => {
  return await withResilience(async (ai) => {
    const prompt = `
      Analyze the following input and references to generate a structured aesthetic output.
      Input: ${input}
      References: ${references.join(", ")}
      
      Generate a JSON object representing an aesthetic moodboard, including:
      - colorPalette: Array of hex codes (include complementary, analogous, or triadic relationships based on color theory)
      - typography: { serif: string, sans: string, mono: string }
      - layoutStyle: string (e.g., "brutalist", "minimalist", "editorial")
      - moodKeywords: string[]
      - gestaltPrinciples: Array of principles applied (e.g., "proximity", "similarity", "continuity", "closure", "figure-ground")
      - colorTheoryRationale: String explaining the color theory nuances used (e.g., saturation, value, harmony)
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
            typography: { 
              type: Type.OBJECT, 
              properties: { 
                serif: { type: Type.STRING },
                sans: { type: Type.STRING },
                mono: { type: Type.STRING }
              }
            },
            layoutStyle: { type: Type.STRING },
            moodKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            gestaltPrinciples: { type: Type.ARRAY, items: { type: Type.STRING } },
            colorTheoryRationale: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
};

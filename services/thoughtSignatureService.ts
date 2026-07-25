import { GoogleGenAI, Type } from "@google/genai";
import { getClient } from "./geminiService";

export const generateProfoundSignature = async (rawInput: string) => {
    const { ai } = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Analyze the following user input and generate a "thought signature" that captures its underlying mythological or philosophical essence. 
        
        Input: "${rawInput}"
        
        The signature should be a short, evocative phrase (e.g., "The Icarus Paradox", "Sisyphus in the Digital Void", "The Alchemist's Algorithm").
        
        Output strictly valid JSON with key: "signature" (string).`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                required: ["signature"],
                properties: {
                    signature: { type: Type.STRING }
                }
            }
        }
    });
    
    try {
        const parsed = JSON.parse(response.text || '{}');
        return parsed.signature || "The Silent Observer";
    } catch (e) {
        return "The Silent Observer";
    }
};

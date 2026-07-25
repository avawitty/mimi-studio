import { ZineMetadata, AestheticSignature, TailorLogicDraft } from "../types";
import { withResilience, generateTagsFromMedia } from "./geminiService";

export const generateSignature = async (zines: ZineMetadata[], tailorDraft: TailorLogicDraft | null = null): Promise<AestheticSignature> => {
  const zineSummaries = [];
  for (const z of zines.slice(0, 10)) {
    let tags = z.tags;
    if (!tags || tags.length === 0) {
      tags = await generateTagsFromMedia(z.content.vocal_summary_blurb || z.content.poetic_provocation || "", []);
    }
    zineSummaries.push({
      title: z.title,
      tone: z.tone,
      content: z.content.vocal_summary_blurb || z.content.poetic_provocation || "",
      tags: tags || []
    });
  }

  let prompt = `You are Mimi, an aesthetic editor.\n`;
  if (tailorDraft) {
    prompt += `Analyze the user's recent generated zines alongside their explicit Tailor Logic Directives (provided below). The zines represent manifested artifacts, while the Tailor Logic represents their deliberate brand positioning. Fuse these two signals to generate an Aesthetic Signature that bridges their output with their intent. Tailor Logic: ${JSON.stringify(tailorDraft)}\n\n`;
  } else {
    prompt += `Analyze the user's recent zines to generate their "Aesthetic Signature":\n`;
  }
  
  prompt += `Recent Zines:\n${JSON.stringify(zineSummaries)}

Return a JSON object with:
- primaryAxis (string)
- secondaryAxis (string)
- motifs (array of 4 strings)
- moodCluster (string)
- influenceLineage (array of objects: {artist: string, movement: string, connectionStrength: number})
- creativeCycles (array of objects: {period: string, mood: string, motifSpikes: string[], outputCount: number})
- motifEvolution (array of objects: {motif: string, frequency: number, date: number})
- paletteExtraction (array of 4-6 hex codes representing the aesthetic's color palette)
- tactileBias (object: {dominant: string, secondary: string} representing physical textures like "Brushed Aluminum")
- typographicPairing (object: {serif: string, sans: string} representing exact font stacks like "Editorial New")
- promptMatrix (array of 3-4 pre-engineered, copy-pasteable text prompts tailored to generate their exact signature across AI models)

Ensure the output is strictly JSON.`;

  try {
    return await withResilience(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      if (response.text) {
        let text = response.text;
        if (text.startsWith('```json')) {
          text = text.replace(/```json\n?/, '').replace(/```$/, '');
        }
        const signature = JSON.parse(text.trim());
        return { ...signature, generatedAt: Date.now() };
      }
      throw new Error("Empty response");
    });
  } catch (e) {
    console.error("MIMI // Signature Generation Error:", e);
  }

  return {
    primaryAxis: "Unknown",
    secondaryAxis: "Unknown",
    motifs: [],
    moodCluster: "Unknown",
    influenceLineage: [],
    creativeCycles: [],
    motifEvolution: [],
    paletteExtraction: ["#000000", "#FFFFFF", "#888888", "#444444"],
    tactileBias: { dominant: "Unknown", secondary: "Unknown" },
    typographicPairing: { serif: "Unknown", sans: "Unknown" },
    promptMatrix: [],
    generatedAt: Date.now()
  };
};

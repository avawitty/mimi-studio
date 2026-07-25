
// @ts-nocheck
import { GoogleGenAI, Type } from "@google/genai";
import { PocketItem, UserProfile, AgentEnrichment } from "../types";
import { updatePocketItem } from "./firebaseUtils";
import { withResilience, ORACLE_PERSONA } from "./geminiService";

export interface AgentConfig {
  curatorEnabled: boolean;
  sentinelEnabled: boolean;
  curatorThinkingBudget: number;
  sentinelThinkingBudget: number;
}

/**
 * THE CURATOR
 * Systemic Mandate: Analyze incoming debris (images/text) and enrich it with 
 * high-fidelity metadata, connecting it to broader cultural canons.
 */
export const runCuratorAgent = async (item: PocketItem, profile: UserProfile | null, config?: AgentConfig) => {
    if (config && !config.curatorEnabled) return null;
    console.info("MIMI // AGENT: The Curator is observing...");
    
    return await withResilience(async (ai) => {
        const model = "gemini-3.1-pro-preview"; // Thinking model required for deep semiotic analysis
        const budget = config?.curatorThinkingBudget || 1024;

        let promptParts = [];
        if (item.type === 'image' && item.content.imageUrl) {
            const base64 = item.content.imageUrl.split(',')[1];
            promptParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
            promptParts.push({ text: "Analyze this shard." });
        } else if (item.type === 'text' || item.type === 'voicenote') {
            promptParts.push({ text: `Analyze this shard: "${item.content.prompt || item.content.transcript || item.content.text}"` });
        } else {
            return null; // Curator only handles raw debris
        }

        const response = await ai.models.generateContent({
            model,
            contents: { parts: promptParts },
            config: {
                systemInstruction: `
                    ${ORACLE_PERSONA}
                    MANDATE: Analyze the input shard (image or text). Determine its specific aesthetic era, cultural provenance, and semiotic weight.
                    THINKING PROCESS:
                    1. Observe the visual/textual data.
                    2. Cross-reference with high-fashion, art history, and internet subculture canons.
                    3. Determine if it aligns with the user's known taste (if provided).
                    4. Output structured enrichment data.
                    CONTEXT: User Identity: ${profile?.handle || "Anonymous"}. Known Era: ${profile?.tasteProfile?.inspirations || "Undefined"}.
                `,
                tools: [{ googleSearch: {} }], // Anchor to reality
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: budget }, 
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        autoTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        detectedEra: { type: Type.STRING },
                        culturalReference: { type: Type.STRING, description: "Specific designer, movie, or movement this references." },
                        visualSemiotics: { type: Type.STRING, description: "A concise, pretentious analysis of the visual language." }
                    }
                }
            }
        });

        const enrichment: AgentEnrichment = JSON.parse(response.text || "{}");
        enrichment.lastAgentUpdate = Date.now();

        // Silent Database Update
        await updatePocketItem(item.id, { agentEnrichment: enrichment });
        
        console.info("MIMI // AGENT: The Curator has filed the shard.", enrichment);
        return enrichment;
    });
};

/**
 * THE SENTINEL
 * Systemic Mandate: Monitor the user's accumulation of debris against their 
 * stated 'Tailor' profile. Detect drift or dissonance.
 */
export const runSentinelAgent = async (recentItems: PocketItem[], profile: UserProfile, config?: AgentConfig) => {
    if (config && !config.sentinelEnabled) return null;
    if (!profile.tailorDraft || recentItems.length < 3) return null;
    
    console.info("MIMI // AGENT: The Sentinel is auditing...");

    return await withResilience(async (ai) => {
        const model = "gemini-3.1-pro-preview";
        const budget = config?.sentinelThinkingBudget || 1024;

        const shardSummaries = recentItems.map(i => i.content.prompt || i.content.name || i.agentEnrichment?.visualSemiotics || "Visual Shard").join("; ");
        const manifesto = JSON.stringify(profile.tailorDraft);

        const response = await ai.models.generateContent({
            model,
            contents: { 
                parts: [{ text: `Recent Debris: ${shardSummaries}\n\nStated Manifesto: ${manifesto}` }] 
            },
            config: {
                systemInstruction: `
                    ${ORACLE_PERSONA}
                    MANDATE: Compare the user's recent behavior (Debris) against their stated intent (Manifesto).
                    GOAL: Detect "Drift". Are they accumulating debris that contradicts their aesthetic core?
                    OUTPUT: A silent report. If drift is high, provide a warning and explanation.
                `,
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: budget },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        driftScore: { type: Type.NUMBER, description: "0-100. 100 is total misalignment." },
                        observation: { type: Type.STRING, description: "Clinical observation of the divergence." },
                        isUrgent: { type: Type.BOOLEAN }
                    }
                }
            }
        });

        const audit = JSON.parse(response.text || "{}");
        console.info("MIMI // AGENT: The Sentinel Report.", audit);
        return audit;
    });
};

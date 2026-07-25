
import { UserProfile } from "../types";

/**
 * Semiotic Modulation Algorithm
 * 
 * This algorithm modulates user inputs and profile data into a set of 
 * "Semiotic Touchpoints" and "Visual Reads" that are conceptually adjacent 
 * rather than literally mapped.
 */

export interface SemioticModulation {
    vibeRead: string;
    touchpoints: {
        motif: string;
        resonance: number; // 0-1
        culturalNode: string;
        visualDirective: string;
    }[];
    chromaticModulation: string[];
}

export const modulateSemioticContext = (
    input: string, 
    profile: UserProfile | null,
    tone?: string
): string => {
    if (!profile) return "Neutral Modulation";

    const archetypes = profile.tasteProfile?.dominant_archetypes || [];
    const interests = profile.tailorDraft?.positioningCore?.anchors?.culturalReferences || [];
    const scryDirectives = profile.lastAuditReport?.aestheticDirectives || [];
    const desireVectors = profile.tailorDraft?.strategicVectors?.desireVectors;
    
    const isContrary = tone?.toUpperCase() === 'CONTRARY';
    
    // We create a "Modulation Matrix" instruction for the AI
    return `
    SEMIOTIC MODULATION MATRIX:
    - Primary Archetypes: ${archetypes?.join(', ') || 'N/A'}
    - Interest Nodes: ${interests?.join(', ') || 'N/A'}
    - Scry Directives (Aesthetic Rules): ${scryDirectives?.join('; ') || 'N/A'}
    - Desire Vectors: Deepen ${desireVectors?.deepen?.join(', ') || 'N/A'}, Reduce ${desireVectors?.reduce?.join(', ') || 'N/A'}
    - Applied Tone: ${tone || 'Standard'}
    - Input Frequency: "${input.slice(0, 100)}..."
    
    ALGORITHM DIRECTIVES (REFERENTIAL LOGIC):
    1. EXTRACT THE VIBE: Analyze the "Scry Directives" and "Desire Vectors" to extract the underlying aesthetic "vibe" and "philosophical anchor".
    2. MISCELLANEOUS USAGE: Do not map every input directly. Use the profile data as a background "vibe" or "referential anchor" to suggest NEW, adjacent concepts.
    3. ANALOGY MODULATION: Do not seek 1:1 mappings. If the user mentions "nature", return "Glacial Brutalism" or "Photosynthetic Architecture".
    4. SEMIOTIC TOUCHPOINTS: Populate touchpoints that act as "accurate semiotic touch points" for the vibe, not just the subject.
    5. VISUAL READ: Generate a "vibe read" that informs image prompts with specific textures, lighting, and desaturated palettes.
    
    ${isContrary ? `
    SPECIAL DIRECTIVE: CONTRARY MODE (INVERTED LOGIC)
    - This is an "Absurdist / Inverted" mode. 
    - Take the user's input and profile anchors and apply a "Contrary" lens.
    - If they seek comfort, provide "Chic Discomfort". 
    - If they seek clarity, provide "Aesthetic Obfuscation".
    - Use "Inverted Logic" to challenge their stated beliefs or thought states with an absurdist, high-theory twist.
    - The goal is to represent "Intrusive Thoughts" as a high-fashion editorial artifact.
    ` : ''}
    `;
};

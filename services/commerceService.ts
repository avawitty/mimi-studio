import { Product, EditIssue, TasteProfile } from '../types';
import { withResilience, ORACLE_PERSONA } from './geminiService';
import { Type } from '@google/genai';
import { CodexState } from './codexService';

// Mock product database
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Sculptural Leather Harness',
    brand: 'AvantBrand',
    image: 'https://picsum.photos/seed/harness/400/400',
    price: 450,
    affiliateLink: 'https://example.com/p1',
    embedding: [0.1, 0.2, 0.3],
    category: 'Accessories',
    tags: ['sculptural', 'leather', 'matte', 'avant-garde', 'brutalism']
  },
  {
    id: 'p2',
    name: 'Organic Moss Knit',
    brand: 'NatureCore',
    image: 'https://picsum.photos/seed/knit/400/400',
    price: 280,
    affiliateLink: 'https://example.com/p2',
    embedding: [0.4, 0.5, 0.6],
    category: 'Apparel',
    tags: ['organic', 'moss', 'knit', 'earthy', 'natural']
  },
  {
    id: 'p3',
    name: 'Chrome Visor Sunglasses',
    brand: 'CyberOptics',
    image: 'https://picsum.photos/seed/visor/400/400',
    price: 320,
    affiliateLink: 'https://example.com/p3',
    embedding: [0.7, 0.8, 0.9],
    category: 'Accessories',
    tags: ['chrome', 'cyberpunk', 'futuristic', 'synthetic']
  },
  {
    id: 'p4',
    name: 'Deconstructed Linen Blazer',
    brand: 'WabiSabi',
    image: 'https://picsum.photos/seed/blazer/400/400',
    price: 550,
    affiliateLink: 'https://example.com/p4',
    embedding: [0.2, 0.3, 0.4],
    category: 'Apparel',
    tags: ['deconstructed', 'linen', 'minimalist', 'wabi-sabi', 'neutral']
  },
  {
    id: 'p5',
    name: 'Lucite Platform Heels',
    brand: 'Y2K_Revival',
    image: 'https://picsum.photos/seed/heels/400/400',
    price: 190,
    affiliateLink: 'https://example.com/p5',
    embedding: [0.8, 0.1, 0.5],
    category: 'Footwear',
    tags: ['lucite', 'platform', 'y2k', 'nostalgia', 'plastic']
  }
];

export const getPersonalizedEdit = async (
  userId: string, 
  userTasteVector: number[],
  codexState: CodexState,
  tasteProfile?: TasteProfile,
  thimbleFingerprints?: { aestheticTags: string[]; eraAffinity: string; brandDNA: string[] }[]
): Promise<EditIssue> => {
  // Mock vector similarity search - now passing all products to let Gemini choose
  const matchedProducts = MOCK_PRODUCTS; 
  
  const archetypeWeights = tasteProfile?.archetype_weights || {};
  const dominantArchetypes = Object.entries(archetypeWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([archetype]) => archetype)
    .join(', ');

  const fingerprintContext = thimbleFingerprints && thimbleFingerprints.length > 0
    ? `User's current Thimble signal: ${[
        ...new Set(thimbleFingerprints.flatMap(f => f.aestheticTags))
      ].slice(0, 8).join(', ')}. Dominant era affinity: ${
        thimbleFingerprints[0]?.eraAffinity || 'undetected'
      }. Brand DNA clusters: ${[
        ...new Set(thimbleFingerprints.flatMap(f => f.brandDNA))
      ].slice(0, 4).join(', ')}.`
    : '';

  return await withResilience(async (ai) => {
    const prompt = `Generate an editorial "Edit" issue.
    
    User Taste Vector: ${JSON.stringify(userTasteVector)}
    Dominant Archetypes: ${dominantArchetypes || 'Unknown'}
    ${fingerprintContext}

    Codex State:
    - Entropy: ${codexState.entropy.toFixed(2)} (${codexState.entropy > 0.6 ? 'exploratory' : 'focused'})
    - Density: ${codexState.density.toFixed(2)} (${codexState.density > 0.6 ? 'concentrated' : 'diffuse'})
    - Velocity: ${codexState.velocity.toFixed(2)} (${codexState.velocity > 0.5 ? 'rapid shift' : 'stable'})
    - Thimble: ${codexState.thimbleSummary || 'No Thimble data.'}

    Interpretation:
    - High entropy → juxtaposition, surprise
    - High density → cohesion, archival restraint
    - High velocity → acknowledge transition, frame as movement

    Targeted Ad Selection:
    Based on the user's Dominant Archetypes and Taste Vector, select products that resonate with their specific aesthetic sectors. For example, if they lean heavily into "Anti-Design" or brutalism, select avant-garde products.

    Matched Products Pool: ${JSON.stringify(matchedProducts.map(p => ({ id: p.id, name: p.name, brand: p.brand, tags: p.tags })))}
    
    Write a narrative that reflects BOTH identity and state.
    Use a tone that is chic, percipient, and slightly mysterious. 
    Frame this as an exclusive "Edit" issue.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: ORACLE_PERSONA,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["trajectoryId", "thesis", "codexReading", "sequence"],
          properties: {
            trajectoryId: { type: Type.STRING },
            thesis: { type: Type.STRING },
            codexReading: { type: Type.STRING },
            sequence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["productId", "caption", "placement"],
                properties: {
                  productId: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  placement: { type: Type.STRING, enum: ['hero', 'supporting', 'footnote'] }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      trajectoryId: result.trajectoryId || 'UNKNOWN-TRAJECTORY',
      thesis: result.thesis || 'A curated selection based on your taste.',
      codexReading: result.codexReading || 'Your taste is evolving.',
      sequence: result.sequence || matchedProducts.map(p => ({ productId: p.id, caption: 'A resonant selection.', placement: 'supporting' }))
    };
  });
};

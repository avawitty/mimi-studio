import { PressIssue } from './types';
import { GoogleGenAI, Type } from '@google/genai';

// Mock product database
export const MOCK_PRODUCTS = [
  {
    id: 'p1',
    name: 'Sculptural Leather Harness',
    brand: 'AvantBrand',
    image: 'https://picsum.photos/seed/harness/400/400',
    price: 450,
    affiliateLink: '#',
    embedding: [0.1, 0.2, 0.3],
    category: 'Accessories',
    tags: ['sculptural', 'leather', 'matte']
  },
  {
    id: 'p2',
    name: 'Organic Moss Knit',
    brand: 'NatureCore',
    image: 'https://picsum.photos/seed/knit/400/400',
    price: 280,
    affiliateLink: '#',
    embedding: [0.4, 0.5, 0.6],
    category: 'Apparel',
    tags: ['organic', 'moss', 'knit']
  }
];

export const getPersonalizedEdit = async (userId: string, userTasteVector: number[]): Promise<PressIssue> => {
  const matchedProducts = MOCK_PRODUCTS.slice(0, 2); 
  
  // Use Admin SDK for Gemini or a separate service
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `Generate an editorial narrative for a personalized "Edit" issue.
    
    User Taste Vector: ${JSON.stringify(userTasteVector)}
    Matched Products: ${JSON.stringify(matchedProducts.map(p => ({ name: p.name, brand: p.brand, tags: p.tags })))}
    
    Write a 100-word narrative that explains why these specific products resonate with the user's taste. 
    Use a tone that is chic, percipient, and slightly mysterious. 
    Frame this as an exclusive "Edit" issue.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "narrative"],
          properties: {
            title: { type: Type.STRING },
            narrative: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      id: 'issue_' + Date.now(),
      title: result.title || 'Personalized Edit',
      narrative: result.narrative || 'A curated selection based on your taste.',
      matchedProductIds: matchedProducts.map(p => p.id),
      createdAt: Date.now(),
      userId,
      signalStrength: '98%',
      trajectoryId: 'TRJ.MKT.001'
    };
};

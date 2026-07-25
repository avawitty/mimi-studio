"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonalizedEdit = exports.MOCK_PRODUCTS = void 0;
const genai_1 = require("@google/genai");
// Mock product database
exports.MOCK_PRODUCTS = [
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
const getPersonalizedEdit = async (userId, userTasteVector) => {
    const matchedProducts = exports.MOCK_PRODUCTS.slice(0, 2);
    // Use Admin SDK for Gemini or a separate service
    const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
                type: genai_1.Type.OBJECT,
                required: ["title", "narrative"],
                properties: {
                    title: { type: genai_1.Type.STRING },
                    narrative: { type: genai_1.Type.STRING }
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
exports.getPersonalizedEdit = getPersonalizedEdit;
//# sourceMappingURL=commerceService.js.map
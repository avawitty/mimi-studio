const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services/geminiService.ts');
let content = fs.readFileSync(filePath, 'utf8');

const editImageFunction = `
export const editImage = async (base64Image: string, mimeType: string, prompt: string, profile?: any) => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
        });
        
        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("MIMI // Image Edit Failed: No candidate returned.");

        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                return \`data:\${part.inlineData.mimeType || 'image/jpeg'};base64,\${part.inlineData.data}\`;
            }
        }
        
        throw new Error("MIMI // Image Edit Failed: No image returned.");
    }, apiKey);
};
`;

content = content.replace(
  /export const generateImage = async \([\s\S]*?\}, apiKey\);\n\};\n/,
  match => match + editImageFunction
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added editImage function');

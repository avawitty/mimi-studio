import { GoogleGenAI, Modality, Type } from "@google/genai";

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const sessionPromise = ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      callbacks: {
        onopen: () => console.log("Opened"),
        onmessage: (m) => console.log("Message", m),
        onerror: (e) => console.error("Error", e),
        onclose: () => console.log("Closed"),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        systemInstruction: `
CORE IDENTITY
You are Mimi, an aesthetic savant, and superintelligence AI. You are an Omniscient Temporal Editor, bridging past archives with future aesthetic singularities. Your overarching goal is to help users understand their own personal style, evolve their taste, educate them in a high-concept way, and serve cunt while doing so (in a classy, respectable way).

Persona: Mimi (The Oracle). Tone: Ethereal, provocative, futuristic. Looks for the breaking point. Suggests radical departures and surreal future intersections that the Archivist would fear. She helps the user process their day, process their memories, process their lineage, and builds deep context on them.

MANDATE: You have access to Google Search. You MUST use it to pull real-time information, cultural context, and intel from the web to ground your responses. Use this capability to constantly update the user's knowledge queue with fresh, relevant, and cutting-edge aesthetic references.
`,
        tools: [
          { googleSearch: {} },
          {
            functionDeclarations: [
              {
                name: "saveToKnowledgeQueue",
                description: "Save an insight, reference, or piece of knowledge to the user's Pocket (knowledge queue). Use this when you find something valuable on the web or during conversation that the user should retain.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    content: {
                      type: Type.STRING,
                      description: "The knowledge, insight, or reference to save."
                    },
                    title: {
                      type: Type.STRING,
                      description: "A short, descriptive title for the knowledge."
                    }
                  },
                  required: ["content", "title"]
                }
              }
            ]
          }
        ]
      }
    });
    console.log("Connected");
    const session = await sessionPromise;
    setTimeout(() => session.close(), 2000);
  } catch (e) {
    console.error("Catch Error", e);
  }
}
test();

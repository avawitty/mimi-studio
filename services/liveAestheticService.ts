import { LiveServerMessage, Modality } from "@google/genai";
import { reportSystemAnomaly } from "../utils/errorReporter";
import { resolveLiveAiCredentials } from "./liveAuth";

export interface AestheticAnalysis {
  scribeReading: string;
  colorFrequency: Record<string, number>;
  archetypes: Record<string, number>;
  timestamp: number;
}

export class LiveAestheticService {
  private session: any;
  private onAnalysis: (analysis: AestheticAnalysis) => void;

  constructor(onAnalysis: (analysis: AestheticAnalysis) => void) {
    this.onAnalysis = onAnalysis;
  }

  async connect() {
    try {
      const { ai, model } = await resolveLiveAiCredentials();
      this.session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            console.log("Live Aesthetic Session Opened");
          },
        onmessage: async (message: LiveServerMessage) => {
          try {
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              try {
                const text = message.serverContent.modelTurn.parts[0].text;
                // Attempt to parse JSON if the model returns it, otherwise treat as scribe reading
                if (text.includes('{')) {
                  const jsonMatch = text.match(/\{.*\}/s);
                  if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0]);
                    this.onAnalysis({
                      scribeReading: data.reading || text,
                      colorFrequency: data.colors || {},
                      archetypes: data.archetypes || {},
                      timestamp: Date.now()
                    });
                  }
                } else {
                  this.onAnalysis({
                    scribeReading: text,
                    colorFrequency: {},
                    archetypes: {},
                    timestamp: Date.now()
                  });
                }
              } catch (e) {
                reportSystemAnomaly(e, true);
              }
            }
          } catch (e) {
            reportSystemAnomaly(e, true);
          }
        },
        onerror: (error: any) => {
          console.error("Live Aesthetic Error", error);
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        systemInstruction: `You are "The Lens", an aesthetic analysis engine. 
        Analyze the incoming video stream in real-time. 
        Provide "Scribe Readings" (poetic, high-fashion interpretations of the visual reality).
        Periodically output JSON-formatted data with:
        - "reading": The poetic analysis.
        - "colors": A map of hex codes to frequency (0-1).
        - "archetypes": A map of archetypes (Architect, Dreamer, Archivist, Catalyst) to weights (0-1).
        
        Tone: Poetic, high-fashion, slightly cryptic, prophetic.`,
      },
    });
    } catch (e) {
      console.error("MIMI // Failed to connect Live Aesthetic Service:", e);
      throw e;
    }
  }

  sendVideoFrame(base64Data: string) {
    if (this.session) {
      try {
        const result = this.session.sendRealtimeInput({
          video: { data: base64Data, mimeType: 'image/jpeg' }
        });
        if (result && result.catch) {
          result.catch((e: any) => reportSystemAnomaly(e, true));
        }
      } catch (e) {
        reportSystemAnomaly(e, true);
      }
    }
  }

  sendAudioChunk(base64Data: string) {
    if (this.session) {
      try {
        const result = this.session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
        if (result && result.catch) {
          result.catch((e: any) => reportSystemAnomaly(e, true));
        }
      } catch (e) {
        reportSystemAnomaly(e, true);
      }
    }
  }

  close() {
    if (this.session) {
      this.session.close();
    }
  }
}

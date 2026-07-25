import { getClient, withResilience } from "./geminiClient";
import { Type } from "@google/genai";
import { 
  QuietOperation, 
  QuietOperationType, 
  InteractionPolicy, 
  SealedContextPacket, 
  AuthorshipBoundary,
  PerspectivePolicy,
  InterpretationLevel,
  MemoryWritePolicy
} from "../types";
import { db, auth } from "./firebase";

// Fallback memory storage for guests or offline mode
const LOCAL_STORAGE_OPERATIONS_KEY = "mimi_quiet_operations";
const LOCAL_STORAGE_PACKETS_KEY = "mimi_sealed_packets";
const LOCAL_STORAGE_BOUNDARIES_KEY = "mimi_authorship_boundaries";

/**
 * Resolves context rule strings based on interpretation level
 */
function getInterpretationPrompt(level: InterpretationLevel): string {
  switch (level) {
    case "literal":
      return "CRITICAL CONSTRAINT: You must remain strictly literal. Preserve the user's phrasing, words, and exact intent without adding any creative extrapolation, thematic layers, or unmentioned design theories.";
    case "organize":
      return "CONVERTING CONSTRAINT: Focus purely on converting, arranging, and structuring the raw material into clean, organized fields. Do not inject extraneous creative concepts.";
    case "develop":
      return "DEVELOPMENT DIRECTIVE: Fill in practical creative gaps, smooth out sentences, and enhance coherence where the input is fragmented, to build a complete creative brief.";
    case "interpret":
      return "INTERPRETATION LICENSE: Propose deeper thematic meanings, editorial direction, design tensions, and artistic frameworks that are implied by or complement the material.";
    case "speculate":
      return "SPECULATIVE EXPLORATION: Explore highly unconventional associations, historical or futuristic parallels, surreal intersections, and deep conceptual breaches. Expand the horizon of the input dramatically.";
    default:
      return "";
  }
}

/**
 * Resolves perspective rule strings based on perspective policy
 */
function getPerspectivePrompt(policy: PerspectivePolicy, permittedIds?: string[]): string {
  switch (policy) {
    case "creator_only":
      return "PERSPECTIVE RESTRICTION: The creator's voice is the ONLY voice represented in the output. You are strictly forbidden from introducing simulated reactions from an audience, opinions of friends/critics, or imagining third-party perspectives or dialogue. Keep the scope strictly personal and self-contained.";
    case "creator_and_assistant":
      return "PERSPECTIVE PROTOCOL: Maintain a dialogue and dynamic between the creator and Mimi (the assistant). Mimi may offer professional, elegant recommendations, but must not invent other third-party characters or external focus groups.";
    case "explicit_named_perspectives":
      return `PERSPECTIVE PARAMETER: You may incorporate perspectives or roles from explicitly named entities: ${(permittedIds && permittedIds.length > 0) ? permittedIds.join(", ") : "None specified"}. Do not retrieve, infer, or imagine other people automatically.`;
    default:
      return "";
  }
}

/**
 * Triggers the appropriate Gemini call for a quiet operation
 */
export const runQuietOperation = async (
  operation: QuietOperation,
  apiKey?: string
): Promise<string> => {
  const policy = operation.interactionPolicy;
  const interpretationPrompt = getInterpretationPrompt(policy.interpretationLevel);
  const perspectivePrompt = getPerspectivePrompt(policy.perspectivePolicy);
  
  const contentInput = operation.inputText || "";

  return await withResilience(async (ai) => {
    let responseSchema: any = {};
    let systemInstruction = "You are Mimi, an aesthetic savior, providing quiet, professional, non-conversational execution of the requested command.";
    let queryPrompt = "";

    if (operation.type === "direction_card") {
      responseSchema = {
        type: Type.OBJECT,
        required: ["title", "preservedLanguage", "proposedDirection", "inferredAnchors", "openQuestions", "toneScale"],
        properties: {
          title: { type: Type.STRING },
          preservedLanguage: { type: Type.STRING },
          proposedDirection: { type: Type.STRING },
          inferredAnchors: { type: Type.STRING },
          openQuestions: { type: Type.STRING },
          toneScale: { type: Type.STRING }
        }
      };
      
      systemInstruction = `
        You are Mimi's lead editorial advisor. Your job is to structure a creator's unfinished fragment into a coherent, highly conceptual Editorial Direction Card.
        
        RULES OF ENGAGEMENT:
        - Output strictly structured JSON matching the requested schema. No conversational preamble.
        - Do not speak in chat bubbles. Frame your output purely as a design artifact.
        - ${interpretationPrompt}
        - ${perspectivePrompt}
      `;

      queryPrompt = `
        Analyze the following text and compile it into a Direction Card:
        
        TEXT:
        "${contentInput}"
      `;
    } else if (operation.type === "image_brief") {
      responseSchema = {
        type: Type.OBJECT,
        required: ["concept", "subject", "lighting", "composition", "materiality", "styleAndVibe", "rawPrompt"],
        properties: {
          concept: { type: Type.STRING },
          subject: { type: Type.STRING },
          lighting: { type: Type.STRING },
          composition: { type: Type.STRING },
          materiality: { type: Type.STRING },
          styleAndVibe: { type: Type.STRING },
          rawPrompt: { type: Type.STRING }
        }
      };

      systemInstruction = `
        You are Mimi's visual art director. Your job is to translate raw text, fragments, or preferences into a meticulous, professional image generation brief.
        
        RULES OF ENGAGEMENT:
        - Output strictly structured JSON matching the requested schema.
        - The "rawPrompt" field must be a single, highly-optimized, self-contained prompt string that can be fed into an image generator. Include camera style, lens, medium, lighting, and textures.
        - ${interpretationPrompt}
        - ${perspectivePrompt}
      `;

      queryPrompt = `
        Analyze the following text and construct a beautiful Image Generation Brief:
        
        TEXT:
        "${contentInput}"
      `;
    } else if (operation.type === "decision_extract") {
      responseSchema = {
        type: Type.OBJECT,
        required: ["coreInquiry", "decisions", "requirements", "tactileDirectives", "nextSteps"],
        properties: {
          coreInquiry: { type: Type.STRING },
          decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
          requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          tactileDirectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      };

      systemInstruction = `
        You are Mimi's structural architect. Your job is to extract clear, actionable, non-dialogic decisions, requirements, tactile constraints, and next steps from a block of creative thoughts.
        
        RULES OF ENGAGEMENT:
        - Do not summarize with generic dialogue or helpful conversational padding.
        - Output strictly structured JSON matching the requested schema.
        - ${interpretationPrompt}
        - ${perspectivePrompt}
      `;

      queryPrompt = `
        Extract structural decisions and steps from the following creative notes:
        
        NOTES:
        "${contentInput}"
      `;
    }

    const response = await ai.models.generateContent({
      model: policy.interpretationLevel === "speculate" ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash',
      contents: queryPrompt,
      config: {
        systemInstruction,
        temperature: policy.interpretationLevel === "speculate" ? 0.85 : 0.6,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    return response.text?.trim() || "{}";
  }, apiKey);
};

// ==========================================
// PERSISTENCE METHODS (Firebase + Local Fallback)
// ==========================================

export const saveQuietOperation = async (operation: QuietOperation): Promise<void> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const opRef = doc(db, `users/${user.uid}/quiet_operations`, operation.id);
      await setDoc(opRef, {
        ...operation,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return;
    } catch (e) {
      console.warn("MIMI // Failed to save QuietOperation to Firebase, saving locally:", e);
    }
  }

  // Local storage fallback
  const saved = localStorage.getItem(LOCAL_STORAGE_OPERATIONS_KEY);
  const list: QuietOperation[] = saved ? JSON.parse(saved) : [];
  const index = list.findIndex(op => op.id === operation.id);
  
  const updatedOp = {
    ...operation,
    updatedAt: new Date().toISOString()
  };
  
  if (index >= 0) {
    list[index] = updatedOp;
  } else {
    list.push(updatedOp);
  }
  
  localStorage.setItem(LOCAL_STORAGE_OPERATIONS_KEY, JSON.stringify(list));
};

export const fetchQuietOperations = async (): Promise<QuietOperation[]> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const { collection, getDocs, query, orderBy } = await import("firebase/firestore");
      const q = query(
        collection(db, `users/${user.uid}/quiet_operations`),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const ops = snapshot.docs.map(doc => doc.data() as QuietOperation);
      if (ops.length > 0) return ops;
    } catch (e) {
      console.warn("MIMI // Failed to fetch QuietOperations from Firebase, loading locally:", e);
    }
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_OPERATIONS_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const deleteQuietOperation = async (id: string): Promise<void> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      const opRef = doc(db, `users/${user.uid}/quiet_operations`, id);
      await deleteDoc(opRef);
      return;
    } catch (e) {
      console.warn("MIMI // Failed to delete QuietOperation from Firebase:", e);
    }
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_OPERATIONS_KEY);
  if (saved) {
    const list: QuietOperation[] = JSON.parse(saved);
    const updated = list.filter(op => op.id !== id);
    localStorage.setItem(LOCAL_STORAGE_OPERATIONS_KEY, JSON.stringify(updated));
  }
};

export const saveSealedContextPacket = async (packet: SealedContextPacket): Promise<void> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const packetRef = doc(db, `users/${user.uid}/sealed_packets`, packet.id);
      await setDoc(packetRef, packet, { merge: true });
      return;
    } catch (e) {
      console.warn("MIMI // Failed to save SealedContextPacket to Firebase, saving locally:", e);
    }
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_PACKETS_KEY);
  const list: SealedContextPacket[] = saved ? JSON.parse(saved) : [];
  const index = list.findIndex(p => p.id === packet.id);
  
  if (index >= 0) {
    list[index] = packet;
  } else {
    list.push(packet);
  }
  
  localStorage.setItem(LOCAL_STORAGE_PACKETS_KEY, JSON.stringify(list));
};

export const fetchSealedContextPackets = async (): Promise<SealedContextPacket[]> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const ref = collection(db, `users/${user.uid}/sealed_packets`);
      const snapshot = await getDocs(ref);
      const packets = snapshot.docs.map(doc => doc.data() as SealedContextPacket);
      if (packets.length > 0) return packets;
    } catch (e) {
      console.warn("MIMI // Failed to fetch SealedContextPackets from Firebase, loading locally:", e);
    }
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_PACKETS_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const saveAuthorshipBoundary = async (boundary: AuthorshipBoundary): Promise<void> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const ref = doc(db, `users/${user.uid}/authorship_boundaries`, boundary.id);
      await setDoc(ref, boundary, { merge: true });
      return;
    } catch (e) {
      console.warn("MIMI // Failed to save AuthorshipBoundary to Firebase, saving locally:", e);
    }
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_BOUNDARIES_KEY);
  const list: AuthorshipBoundary[] = saved ? JSON.parse(saved) : [];
  const index = list.findIndex(b => b.id === boundary.id);
  
  if (index >= 0) {
    list[index] = boundary;
  } else {
    list.push(boundary);
  }
  
  localStorage.setItem(LOCAL_STORAGE_BOUNDARIES_KEY, JSON.stringify(list));
};

export const fetchAuthorshipBoundary = async (id: string): Promise<AuthorshipBoundary | null> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const ref = doc(db, `users/${user.uid}/authorship_boundaries`, id);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) return snapshot.data() as AuthorshipBoundary;
    } catch (e) {
      console.warn("MIMI // Failed to fetch AuthorshipBoundary from Firebase, loading locally:", e);
    }
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_BOUNDARIES_KEY);
  if (saved) {
    const list: AuthorshipBoundary[] = JSON.parse(saved);
    const found = list.find(b => b.id === id);
    if (found) return found;
  }
  return null;
};

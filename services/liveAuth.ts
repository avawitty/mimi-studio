import { GoogleGenAI } from "@google/genai";
import { gateway } from "ai";
import { getStoredKey } from "./apiKeyService";
import { modelFor } from "./modelConfig";

export type LiveAiProvider = "byok" | "ephemeral" | "gateway";

export type LiveAiCredentials =
  | {
      provider: "gemini";
      source: "byok" | "ephemeral";
      ai: GoogleGenAI;
      model: string;
    }
  | {
      provider: "gateway";
      source: "funded" | "byok";
      model: string;
      token: string;
      url: string;
      sessionConfig: {
        voice?: string;
        instructions?: string;
        turnDetection?: { type: string };
      };
      gatewayModel: ReturnType<typeof gateway.experimental_realtime>;
    };

export type ResolveLiveAiCredentialsOptions = {
  systemInstruction?: string;
  voiceName?: string;
};

/**
 * Resolve credentials for Oracle Cyberdeck vocal sync.
 * BYOK Gemini keys connect directly; otherwise the server mints a funded
 * AI Gateway realtime token (preferred) or a Gemini ephemeral token.
 */
export async function resolveLiveAiCredentials(
  options: ResolveLiveAiCredentialsOptions = {},
): Promise<LiveAiCredentials> {
  const geminiModel = modelFor("live", "gemini");
  const byok = getStoredKey("gemini");

  if (byok) {
    return {
      provider: "gemini",
      ai: new GoogleGenAI({ apiKey: byok }),
      model: geminiModel,
      source: "byok",
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const { auth } = await import("./firebaseInit");
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) headers["x-user-token"] = `Bearer ${idToken}`;
  } catch {
    // Firebase may be unavailable in guest / offline shells.
  }

  const res = await fetch("/api/live/token", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sessionConfig: {
        voice: options.voiceName,
        instructions: options.systemInstruction,
        turnDetection: { type: "server-vad" },
      },
    }),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Live token request failed (${res.status})`;
    throw new Error(message);
  }

  const provider = String(payload?.provider || "gemini");

  if (provider === "gateway") {
    const model = String(payload?.model || modelFor("live", "gateway"));
    const token = String(payload?.token || "");
    const url = String(payload?.url || "");
    if (!token || !url) {
      throw new Error("Gateway live token response was incomplete.");
    }
    return {
      provider: "gateway",
      source: "funded",
      model,
      token,
      url,
      sessionConfig: {
        voice: options.voiceName,
        instructions: options.systemInstruction,
        turnDetection: { type: "server-vad" },
        ...(payload?.sessionConfig || {}),
      },
      gatewayModel: gateway.experimental_realtime(model),
    };
  }

  const token = String(payload?.token || "");
  if (!token) {
    throw new Error("Live token response was empty.");
  }

  const apiVersion = String(payload?.apiVersion || "v1alpha");
  return {
    provider: "gemini",
    ai: new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion },
    }),
    model: String(payload?.model || geminiModel),
    source: "ephemeral",
  };
}

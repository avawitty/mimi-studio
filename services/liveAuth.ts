import { GoogleGenAI } from "@google/genai";
import { getStoredKey } from "./apiKeyService";
import { modelFor } from "./modelConfig";

export type LiveAiCredentials = {
  ai: GoogleGenAI;
  model: string;
  source: "byok" | "ephemeral";
};

/**
 * Resolve a Gemini client that can open Live WebSocket sessions.
 * BYOK keys connect directly; otherwise the server mints an ephemeral token
 * so the long-lived GEMINI_API_KEY never ships to the browser.
 */
export async function resolveLiveAiCredentials(): Promise<LiveAiCredentials> {
  const model = modelFor("live", "gemini");
  const byok = getStoredKey("gemini");

  if (byok) {
    return {
      ai: new GoogleGenAI({ apiKey: byok }),
      model,
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

  const token = String(payload?.token || "");
  if (!token) {
    throw new Error("Live token response was empty.");
  }

  const apiVersion = String(payload?.apiVersion || "v1alpha");
  return {
    ai: new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion },
    }),
    model: String(payload?.model || model),
    source: "ephemeral",
  };
}

import { auth } from "./firebaseInit";

/**
 * Embed text via funded POST /api/mimi/embed (signed-in or BYOK).
 * Returns null when auth, credits, or gateway are unavailable.
 */
export async function embedTextForScoring(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    const response = await fetch("/api/mimi/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: trimmed.slice(0, 8000) }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { embedding?: number[] };
    return Array.isArray(data.embedding) && data.embedding.length > 0
      ? data.embedding
      : null;
  } catch {
    return null;
  }
}

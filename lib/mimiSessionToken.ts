/**
 * Extract a Firebase ID token from common Mimi auth headers.
 * Kept free of firebase-admin so routes can parse tokens without risking
 * Vercel FUNCTION_INVOCATION_FAILED from the Admin module graph.
 */
export const extractMimiSessionToken = (headers: Record<string, any>) => {
  const candidates = [headers["x-user-token"], headers.authorization].filter(Boolean);

  for (const candidate of candidates) {
    const value = Array.isArray(candidate) ? candidate[0] : candidate;
    const text = String(value || "").trim();
    if (!text) continue;
    if (text.startsWith("Bearer ey")) return text.slice("Bearer ".length);
    if (text.startsWith("ey")) return text;
  }

  return "";
};

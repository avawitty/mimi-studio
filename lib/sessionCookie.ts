export const SESSION_EXPIRES_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export const buildSessionCookieHeader = (value: string, maxAgeMs = SESSION_EXPIRES_MS) => {
  const isProd = process.env.NODE_ENV === "production";
  return [
    `__session=${value}`,
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    "Path=/",
    "HttpOnly",
    isProd ? "Secure" : "",
    "SameSite=Lax",
  ]
    .filter(Boolean)
    .join("; ");
};

export const clearSessionCookieHeader = () => "__session=; Path=/; Max-Age=0; HttpOnly";

/** Read `__session` from a Cookie header (EventSource / same-origin credentialed fetches). */
export const extractSessionCookie = (
  headers: Record<string, unknown> | undefined | null,
): string => {
  if (!headers) return "";
  const raw = headers.cookie ?? headers.Cookie;
  const cookieHeader = Array.isArray(raw) ? raw[0] : raw;
  if (!cookieHeader || typeof cookieHeader !== "string") return "";
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith("__session=")) continue;
    return decodeURIComponent(trimmed.slice("__session=".length).trim());
  }
  return "";
};

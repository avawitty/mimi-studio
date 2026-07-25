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

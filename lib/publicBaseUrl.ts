/**
 * Canonical public site origin for absolute links (RSS, OG, share).
 * Prefer MIMI_PUBLIC_BASE_URL; optionally derive from a request host.
 */
export const getPublicBaseUrl = (req?: {
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
}): string => {
  const configured = String(process.env.MIMI_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;

  const headerHost = (() => {
    if (!req) return "";
    if (typeof req.get === "function") {
      const forwarded = req.get("x-forwarded-host") || req.get("host");
      if (forwarded) return String(forwarded).split(",")[0].trim();
    }
    const raw = req.headers?.["x-forwarded-host"] || req.headers?.host;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return String(value || "")
      .split(",")[0]
      .trim();
  })();

  if (headerHost) {
    const protoRaw =
      (typeof req?.get === "function" ? req.get("x-forwarded-proto") : undefined) ||
      (Array.isArray(req?.headers?.["x-forwarded-proto"])
        ? req?.headers?.["x-forwarded-proto"][0]
        : req?.headers?.["x-forwarded-proto"]) ||
      "https";
    const proto = String(protoRaw).split(",")[0].trim() || "https";
    return `${proto}://${headerHost}`.replace(/\/$/, "");
  }

  return "https://mimi.you";
};

/** Pretty RSS path for a creator handle (subscribe-once URL). */
export const getCreatorFeedPath = (handle: string): string => {
  const normalized = String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  return `/u/${encodeURIComponent(normalized)}/feed.xml`;
};

export const getCreatorFeedUrl = (handle: string, baseUrl?: string): string => {
  const base = (baseUrl || getPublicBaseUrl()).replace(/\/$/, "");
  return `${base}${getCreatorFeedPath(handle)}`;
};

export const getCreatorProfileUrl = (handle: string, baseUrl?: string): string => {
  const normalized = String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  const base = (baseUrl || getPublicBaseUrl()).replace(/\/$/, "");
  return `${base}/u/${encodeURIComponent(normalized)}`;
};

export const getZineCanonicalUrl = (zineId: string, baseUrl?: string): string => {
  const base = (baseUrl || getPublicBaseUrl()).replace(/\/$/, "");
  return `${base}/zine/${encodeURIComponent(zineId)}`;
};

/** Attention/share plate URL — prefers mimi.fish when no override base is given. */
export const getZineShareUrl = (zineId: string, baseUrl?: string): string => {
  const id = String(zineId || "").trim();
  if (!id) return baseUrl ? String(baseUrl).replace(/\/$/, "") : "https://mimi.fish";
  if (baseUrl) {
    return `${String(baseUrl).replace(/\/$/, "")}/s/${encodeURIComponent(id)}`;
  }
  return `https://mimi.fish/s/${encodeURIComponent(id)}`;
};

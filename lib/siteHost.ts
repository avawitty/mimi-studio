/**
 * Host / skin detection for mimi.you (canonical), mimi.rip (inverse), mimi.fish (future).
 * Same SPA; different public skins. Local QA: ?skin=rip or localStorage mimi_site_skin.
 */

export type MimiSiteSkin = "you" | "rip" | "fish";

const STORAGE_KEY = "mimi_site_skin";

export function getSiteHost(hostname?: string): string {
  const raw =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  return String(raw || "")
    .toLowerCase()
    .replace(/^www\./, "");
}

function readQuerySkin(): MimiSiteSkin | null {
  if (typeof window === "undefined") return null;
  try {
    const skin = new URLSearchParams(window.location.search).get("skin");
    if (skin === "rip" || skin === "fish" || skin === "you") return skin;
  } catch {
    /* ignore */
  }
  return null;
}

function readStoredSkin(): MimiSiteSkin | null {
  if (typeof window === "undefined") return null;
  try {
    const skin = localStorage.getItem(STORAGE_KEY);
    if (skin === "rip" || skin === "fish" || skin === "you") return skin;
  } catch {
    /* ignore */
  }
  return null;
}

export function isRipHost(hostname?: string): boolean {
  const host = getSiteHost(hostname);
  return host === "mimi.rip" || host.endsWith(".mimi.rip");
}

export function isFishHost(hostname?: string): boolean {
  const host = getSiteHost(hostname);
  return host === "mimi.fish" || host.endsWith(".mimi.fish");
}

export function isYouHost(hostname?: string): boolean {
  const host = getSiteHost(hostname);
  return (
    host === "mimi.you" ||
    host.endsWith(".mimi.you") ||
    host === "avainlife.com" ||
    host.endsWith(".avainlife.com") ||
    host === "localhost" ||
    host.endsWith(".vercel.app") ||
    host === ""
  );
}

/** Effective public skin — host wins, then ?skin=, then localStorage, else you. */
export function getSiteSkin(hostname?: string): MimiSiteSkin {
  if (isRipHost(hostname)) return "rip";
  if (isFishHost(hostname)) return "fish";
  const query = readQuerySkin();
  if (query) return query;
  const stored = readStoredSkin();
  if (stored) return stored;
  return "you";
}

export function setSiteSkinOverride(skin: MimiSiteSkin | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!skin || skin === "you") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, skin);
  } catch {
    /* ignore */
  }
}

export function canonicalYouOrigin(): string {
  return "https://mimi.you";
}

export function canonicalRipOrigin(): string {
  return "https://mimi.rip";
}

/** Path on rip host: / → landing, /u/:handle or /:handle → public rip. */
export function parseRipPublicHandle(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0] === "u" && parts[1]) return parts[1].toLowerCase();
  if (parts[0] === "rip" && parts[1]) return parts[1].toLowerCase();
  // Bare /:handle on rip host (reserve app routes)
  const reserved = new Set([
    "studio",
    "tailor",
    "scribe",
    "rip",
    "mimi-dolls",
    "mimi-rip",
    "showcase",
    "privacy",
    "terms",
    "api",
    "auth",
    "u",
    "zine",
    "stacks",
  ]);
  if (parts.length === 1 && !reserved.has(parts[0].toLowerCase())) {
    return parts[0].toLowerCase();
  }
  return null;
}

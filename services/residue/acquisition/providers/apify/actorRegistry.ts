/**
 * Actor ID registry for Residue Apify acquisition (Phase 9).
 * Primary live path: rag-web-browser (already proven in Web Intel).
 * Other IDs remain candidates — verify against Apify Store before pinning.
 */

import { RAG_WEB_BROWSER_ACTOR_ID } from "../../../../../lib/ragWebBrowserTypes";

export const APIFY_ACTOR_CANDIDATES = {
  /** Primary Residue web acquisition Actor */
  ragWebBrowser: RAG_WEB_BROWSER_ACTOR_ID,
  reddit: "trudax/reddit-scraper",
  tiktok: "clockworks/tiktok-scraper",
  instagram: "apify/instagram-scraper",
  googleTrends: "apify/google-trends-scraper",
  websiteContent: "apify/website-content-crawler",
} as const;

export type ApifyActorRole = keyof typeof APIFY_ACTOR_CANDIDATES;

export function resolveResidueApifyActorId(
  env: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {},
): string {
  return (
    String(env.RESIDUE_APIFY_ACTOR_ID || env.APIFY_ACTOR_ID || "").trim() ||
    APIFY_ACTOR_CANDIDATES.ragWebBrowser
  );
}

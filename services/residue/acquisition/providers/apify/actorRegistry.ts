/**
 * Placeholder Actor ID registry for Phase 9.
 * Verify IDs against Apify Store before pinning in production.
 */

export const APIFY_ACTOR_CANDIDATES = {
  reddit: "trudax/reddit-scraper",
  tiktok: "clockworks/tiktok-scraper",
  instagram: "apify/instagram-scraper",
  googleTrends: "apify/google-trends-scraper",
  websiteContent: "apify/website-content-crawler",
} as const;

export type ApifyActorRole = keyof typeof APIFY_ACTOR_CANDIDATES;

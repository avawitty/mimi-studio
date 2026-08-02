/**
 * Phase 7 — Approved RSS/Atom freshness spine for Forecast.
 * Distinct from Keep Tabs / creator taste feeds.
 *
 * Prototype: empty active registry. Live fetch/ingest lands when feeds are approved in ops.
 */

import {
  approvedFeedSchema,
  feedEntrySchema,
  type ApprovedFeed,
  type FeedEntry,
} from "../../schemas/collectiveIntelligenceContracts";

/** Curated allowlist — empty until operators approve Forecast freshness sources. */
export const APPROVED_FORECAST_FEEDS: ApprovedFeed[] = [];

export function listApprovedFeeds(activeOnly = true): ApprovedFeed[] {
  const feeds = APPROVED_FORECAST_FEEDS.map((f) => approvedFeedSchema.parse(f));
  return activeOnly ? feeds.filter((f) => f.active) : feeds;
}

/**
 * Freshness entries for Forecast evidence.
 * Returns [] until a server ingest path populates approved feed snapshots.
 */
export function loadApprovedFeedEntries(): FeedEntry[] {
  return [];
}

export function parseApprovedFeed(data: unknown): ApprovedFeed {
  return approvedFeedSchema.parse(data);
}

export function parseFeedEntry(data: unknown): FeedEntry {
  return feedEntrySchema.parse(data);
}

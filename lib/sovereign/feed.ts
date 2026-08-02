import {
  getCreatorFeedUrl,
  getCreatorProfileUrl,
  getPublicBaseUrl,
  getZineCanonicalUrl,
} from "../publicBaseUrl.js";
import { buildRssXml, mapZineToRssItem, type RssFeedChannel } from "../rssFeed.js";
import type { PublicFeedProfile, PublicFeedZine } from "../publicFeedQuery.js";
import { getProfileByHandle, listUserZines } from "./store";
import { isSovereignEnabled } from "./db";

const toFeedZine = (zine: {
  id: string;
  title?: string;
  concept?: string;
  summary?: string;
  userHandle?: string;
  coverImageUrl?: string | null;
  publishedAt?: number;
  timestamp?: number;
  createdAt?: number;
  isPublic?: boolean;
}): PublicFeedZine => ({
  id: zine.id,
  title: zine.title,
  concept: zine.concept,
  summary: zine.summary,
  userHandle: zine.userHandle,
  coverImageUrl: zine.coverImageUrl ?? null,
  publishedAt: zine.publishedAt,
  timestamp: zine.timestamp,
  createdAt: zine.createdAt,
  isPublic: zine.isPublic !== false,
});

export async function buildCreatorRssFeedFromSovereign(
  handle: string,
  baseUrl?: string,
): Promise<{ xml: string; profile: PublicFeedProfile; itemCount: number } | null> {
  if (!isSovereignEnabled()) return null;

  const normalized = String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!normalized) return null;

  const profileDoc = await getProfileByHandle(normalized);
  if (!profileDoc?.uid) return null;

  const showcase = (profileDoc.publicShowcase || {}) as Record<string, unknown>;
  const profile: PublicFeedProfile = {
    uid: profileDoc.uid,
    handle: String(profileDoc.handle || normalized).toLowerCase(),
    displayName: typeof profileDoc.displayName === "string" ? profileDoc.displayName : undefined,
    philosophy:
      typeof showcase.philosophy === "string"
        ? showcase.philosophy
        : typeof (profileDoc as any).philosophy === "string"
          ? (profileDoc as any).philosophy
          : undefined,
    dollLabel: typeof showcase.dollLabel === "string" ? showcase.dollLabel : undefined,
  };

  const zines = (await listUserZines(profile.uid, { publicOnly: true, limit: 30 })).map(toFeedZine);
  const base = (baseUrl || getPublicBaseUrl()).replace(/\/$/, "");
  const feedUrl = getCreatorFeedUrl(profile.handle, base);
  const profileUrl = getCreatorProfileUrl(profile.handle, base);

  const titleBits = [profile.dollLabel || `@${profile.handle}`, "public issues"];
  const description =
    profile.philosophy?.trim() ||
    `Public editorial issues from @${profile.handle} on Mimi. Keep tabs via this feed.`;

  const channel: RssFeedChannel = {
    title: titleBits.join(" · "),
    link: profileUrl,
    description,
    feedUrl,
    items: zines.map((zine) => mapZineToRssItem(zine, getZineCanonicalUrl(zine.id, base))),
  };

  return {
    xml: buildRssXml(channel),
    profile,
    itemCount: channel.items.length,
  };
}

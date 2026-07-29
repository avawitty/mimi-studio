import type { Firestore } from "firebase-admin/firestore";
import {
  getCreatorFeedUrl,
  getCreatorProfileUrl,
  getPublicBaseUrl,
  getZineCanonicalUrl,
} from "./publicBaseUrl.js";
import { buildRssXml, mapZineToRssItem, type RssFeedChannel } from "./rssFeed.js";

export type PublicFeedProfile = {
  uid: string;
  handle: string;
  displayName?: string;
  philosophy?: string;
  dollLabel?: string;
};

export type PublicFeedZine = {
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
};

const FEED_ITEM_LIMIT = 30;

export const normalizeFeedHandle = (raw: string): string =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

export async function resolvePublicFeedProfile(
  db: Firestore,
  handle: string,
): Promise<PublicFeedProfile | null> {
  const normalized = normalizeFeedHandle(handle);
  if (!normalized) return null;

  const snap = await db.collection("profiles_public").where("handle", "==", normalized).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data() || {};
  const showcase = (data.publicShowcase || {}) as Record<string, unknown>;
  const uid = String(data.uid || doc.id || "").trim();
  if (!uid) return null;

  return {
    uid,
    handle: String(data.handle || normalized).toLowerCase(),
    displayName: typeof data.displayName === "string" ? data.displayName : undefined,
    philosophy:
      typeof showcase.philosophy === "string"
        ? showcase.philosophy
        : typeof data.philosophy === "string"
          ? data.philosophy
          : undefined,
    dollLabel: typeof showcase.dollLabel === "string" ? showcase.dollLabel : undefined,
  };
}

export async function fetchPublicFeedZines(
  db: Firestore,
  uid: string,
  limit = FEED_ITEM_LIMIT,
): Promise<PublicFeedZine[]> {
  if (!uid) return [];

  const snap = await db
    .collection("zines")
    .where("userId", "==", uid)
    .where("isPublic", "==", true)
    .limit(Math.min(Math.max(limit * 2, limit), 60))
    .get();

  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        id: String(data.id || docSnap.id),
        title: data.title,
        concept: data.concept,
        summary: data.summary,
        userHandle: data.userHandle,
        coverImageUrl: data.coverImageUrl ?? null,
        publishedAt: typeof data.publishedAt === "number" ? data.publishedAt : undefined,
        timestamp: typeof data.timestamp === "number" ? data.timestamp : undefined,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
        isPublic: data.isPublic === true,
      } satisfies PublicFeedZine;
    })
    .filter((zine) => zine.isPublic !== false)
    .sort(
      (a, b) =>
        (b.publishedAt || b.timestamp || b.createdAt || 0) -
        (a.publishedAt || a.timestamp || a.createdAt || 0),
    )
    .slice(0, limit);
}

export async function buildCreatorRssFeed(
  db: Firestore,
  handle: string,
  baseUrl?: string,
): Promise<{ xml: string; profile: PublicFeedProfile; itemCount: number } | null> {
  const profile = await resolvePublicFeedProfile(db, handle);
  if (!profile) return null;

  const base = (baseUrl || getPublicBaseUrl()).replace(/\/$/, "");
  const zines = await fetchPublicFeedZines(db, profile.uid);
  const feedUrl = getCreatorFeedUrl(profile.handle, base);
  const profileUrl = getCreatorProfileUrl(profile.handle, base);

  const titleBits = [
    profile.dollLabel || `@${profile.handle}`,
    "public issues",
  ];
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

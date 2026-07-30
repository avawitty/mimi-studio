import type { Firestore, QueryDocumentSnapshot, QuerySnapshot } from "firebase-admin/firestore";
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

const mapPublicFeedZine = (docSnap: QueryDocumentSnapshot): PublicFeedZine => {
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
  };
};

const feedRecencyMs = (zine: PublicFeedZine): number =>
  zine.publishedAt || zine.timestamp || zine.createdAt || 0;

const dedupeNewest = (zines: PublicFeedZine[], take: number): PublicFeedZine[] => {
  const merged = new Map<string, PublicFeedZine>();
  for (const zine of zines) {
    if (zine.isPublic === false) continue;
    merged.set(zine.id, zine);
  }
  return [...merged.values()]
    .sort((a, b) => feedRecencyMs(b) - feedRecencyMs(a))
    .slice(0, take);
};

/**
 * Newest public issues first. Firestore must order before limit — otherwise a
 * creator with >60 public zines can drop recent items from the RSS window.
 */
export async function fetchPublicFeedZines(
  db: Firestore,
  uid: string,
  limit = FEED_ITEM_LIMIT,
): Promise<PublicFeedZine[]> {
  if (!uid) return [];

  const take = Math.max(1, Math.min(limit, 100));
  const base = db
    .collection("zines")
    .where("userId", "==", uid)
    .where("isPublic", "==", true);

  // timestamp exists on all zines and keeps the limit window deterministic.
  // publishedAt (set on make-public) is preferred for recency when present —
  // merge both ordered queries so legacy public docs without publishedAt still appear.
  // Both ordered queries must succeed. Swallowing a publishedAt failure would
  // silently drop republished drafts (ZineCard historically bumped publishedAt
  // without timestamp) and serve a stale timestamp-only window instead of a
  // visible 500 while composite indexes are missing/building.
  const [byTimestamp, byPublished]: [QuerySnapshot, QuerySnapshot] = await Promise.all([
    base.orderBy("timestamp", "desc").limit(take).get(),
    base.orderBy("publishedAt", "desc").limit(take).get(),
  ]);

  return dedupeNewest(
    [...byPublished.docs, ...byTimestamp.docs].map((docSnap) => mapPublicFeedZine(docSnap)),
    take,
  );
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

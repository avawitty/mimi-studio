import { cors, requireMethod, sendError } from "../lib/apiUtils.js";
import { getPublicBaseUrl } from "../lib/publicBaseUrl.js";
import { buildCreatorRssFeed, normalizeFeedHandle } from "../lib/publicFeedQuery.js";
import { getServerFirebaseAdmin } from "../lib/serverFirebaseAdmin.js";

/**
 * Creator public-issue RSS feed ("Keep Tabs").
 * Query: `handle` (preferred). Also accepts path-style via rewrite `/u/:handle/feed.xml`.
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const handle = normalizeFeedHandle(
      String(req.query?.handle || req.query?.h || req.params?.handle || ""),
    );
    if (!handle) {
      return sendError(res, 400, "handle query parameter required", "MISSING_HANDLE");
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      return sendError(
        res,
        503,
        "Public feeds require server Firebase configuration.",
        "FIREBASE_ADMIN_UNAVAILABLE",
      );
    }

    const baseUrl = getPublicBaseUrl(req);
    const feed = await buildCreatorRssFeed(db, handle, baseUrl);
    if (!feed) {
      return sendError(res, 404, `No public profile for @${handle}`, "HANDLE_NOT_FOUND");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.setHeader("X-Mimi-Feed-Items", String(feed.itemCount));
    res.end(feed.xml);
  } catch (error: any) {
    sendError(res, 500, error?.message || String(error));
  }
}

/** Express-friendly wrapper that also accepts pretty `/u/:handle/feed.xml` paths. */
export async function handleCreatorFeedRequest(req: any, res: any) {
  if (!req.query) req.query = {};
  if (!req.query.handle && req.params?.handle) {
    req.query.handle = req.params.handle;
  }
  return handler(req, res);
}

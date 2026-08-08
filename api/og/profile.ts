import { sendJson } from "../../lib/apiUtils.js";
import { proxyToFunctions } from "../../lib/proxyToFunctions.js";
import { buildPublicProfileSeoData, renderPublicProfileOgHtml } from "../../lib/publicProfileSeo.js";
import { getProfileByHandle } from "../../lib/sovereign/store.js";
import { normalizeFeedHandle } from "../../lib/publicFeedQuery.js";
import { getPublicBaseUrl } from "../../lib/publicBaseUrl.js";

/**
 * OG HTML for /u/:handle link previews (social crawlers).
 * Prefers sovereign archive, then Firestore Admin / Functions proxy.
 */
export default async function handler(req: any, res: any) {
  try {
    const handle = normalizeFeedHandle(String(req.query?.handle || req.query?.id || ""));
    if (!handle) {
      return sendJson(res, 400, { error: "handle query parameter required" });
    }

    const sovereign = await getProfileByHandle(handle);
    if (sovereign) {
      const seo = buildPublicProfileSeoData(sovereign, getPublicBaseUrl(req));
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
      res.setHeader("X-Mimi-Archive", "sovereign");
      res.end(renderPublicProfileOgHtml(seo));
      return;
    }

    const { getServerFirebaseAdmin } = await import("../../lib/serverFirebaseAdmin.js");
    const { db } = getServerFirebaseAdmin();
    if (!db) {
      const proxied = await proxyToFunctions("/api/og/profile", {
        method: "GET",
        query: { handle },
      });
      res.statusCode = proxied.status;
      res.setHeader("Content-Type", proxied.headers.get("content-type") || "text/html; charset=utf-8");
      const cache = proxied.headers.get("cache-control");
      if (cache) res.setHeader("Cache-Control", cache);
      res.end(proxied.text);
      return;
    }

    const snap = await db.collection("profiles_public").where("handle", "==", handle).limit(1).get();
    if (snap.empty) {
      return sendJson(res, 404, { error: "Profile not found" });
    }

    const profile = snap.docs[0].data() || {};
    const seo = buildPublicProfileSeoData(profile as any, getPublicBaseUrl(req));
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.setHeader("X-Mimi-Archive", "firestore");
    res.end(renderPublicProfileOgHtml(seo));
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message || String(error) });
  }
}

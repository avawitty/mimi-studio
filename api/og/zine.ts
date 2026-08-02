import { sendJson } from "../../lib/apiUtils.js";
import { getServerFirebaseAdmin } from "../../lib/serverFirebaseAdmin.js";
import { proxyToFunctions } from "../../lib/proxyToFunctions.js";

/**
 * OG HTML for /zine/:id link previews (social crawlers).
 * Vercel: vercel.json rewrites /zine/:id → /api/og/zine?id=:id when User-Agent matches bots
 * (facebookexternalhit, Twitterbot, etc.). Normal browsers still hit the SPA via index.html.
 * Query: `id` or `zineId`.
 */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default async function handler(req: any, res: any) {
  try {
    const zineId = String(req.query?.id || req.query?.zineId || "").trim();
    if (!zineId) {
      return sendJson(res, 400, { error: "id query parameter required" });
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      const proxied = await proxyToFunctions("/api/og/zine", {
        method: "GET",
        query: { id: zineId },
      });
      res.statusCode = proxied.status;
      res.setHeader("Content-Type", proxied.headers.get("content-type") || "text/html; charset=utf-8");
      const cache = proxied.headers.get("cache-control");
      if (cache) res.setHeader("Cache-Control", cache);
      res.end(proxied.text);
      return;
    }

    const snap = await db.collection("zines").doc(zineId).get();
    if (!snap.exists) {
      return sendJson(res, 404, { error: "Zine not found" });
    }

    const zine = snap.data() || {};
    const title = String(zine.title || "Untitled Manifestation");
    const description = String(zine.concept || zine.summary || "Aesthetic zine created via Mimi Studio.");
    const imageUrl = String(
      zine.coverImageUrl || zine.contentImages?.[0] || "https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png",
    );
    const configuredBase = String(process.env.MIMI_PUBLIC_BASE_URL || "https://www.mimi.you").replace(/\/$/, "");
    const pageUrl = `${configuredBase}/zine/${zineId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} | MimiZine Editorial</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <p><a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a></p>
</body>
</html>`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.end(html);
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message || String(error) });
  }
}

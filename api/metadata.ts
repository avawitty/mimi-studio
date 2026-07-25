import { cors, sendJson } from "../lib/apiUtils.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  try {
    const rawUrl = String(req.query?.url || "");
    if (!rawUrl) return sendJson(res, 400, { error: "URL required" });
    const parsed = new URL(rawUrl);
    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 MimiZineBot/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    const html = await response.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || parsed.hostname;
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "";
    const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)?.[1] || "";
    sendJson(res, 200, { url: parsed.toString(), title, description, image: image ? new URL(image, parsed).toString() : "" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message || String(error) });
  }
}

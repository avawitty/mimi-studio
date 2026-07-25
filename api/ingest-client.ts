import { cors, readJsonBody, requireMethod, sendJson } from "../lib/apiUtils.js";

const textFromMeta = (html: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
};

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const { url } = await readJsonBody(req);
    if (!url || typeof url !== "string") return sendJson(res, 400, { error: "URL required" });
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return sendJson(res, 400, { error: "Only http/https URLs are supported" });

    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 MimiZineBot/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    const html = await response.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || parsed.hostname;
    const description = textFromMeta(html, "description") || textFromMeta(html, "og:description");
    const image = textFromMeta(html, "og:image") || textFromMeta(html, "twitter:image");

    sendJson(res, 200, {
      url: parsed.toString(),
      title,
      description,
      heroImage: image ? new URL(image, parsed).toString() : "",
      source: parsed.hostname,
    });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message || String(error) });
  }
}

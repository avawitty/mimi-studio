import { cors, sendText } from "../lib/apiUtils.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  try {
    const rawUrl = String(req.query?.url || "");
    if (!rawUrl) return sendText(res, 400, "URL required");
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return sendText(res, 400, "Only http/https URLs are supported");

    const response = await fetch(parsed.toString(), { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return sendText(res, response.status, "Failed to fetch image");
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return sendText(res, 415, "URL did not return an image");

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error: any) {
    sendText(res, 500, error?.message || String(error));
  }
}

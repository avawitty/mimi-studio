import { cors, requireMethod, sendJson, sendError } from "../lib/apiUtils.js";
import { fetchLetterboxdFeed } from "../lib/letterboxdFeed.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;
  try {
    const rawUrl = String(req.query?.url || "");
    if (!rawUrl) return sendError(res, 400, "Letterboxd URL required");
    sendJson(res, 200, await fetchLetterboxdFeed(rawUrl));
  } catch (error: any) {
    const message = error?.message || String(error);
    const clientError =
      /Letterboxd URL|valid Letterboxd|Only letterboxd|public feed|username|readable diary|profile or RSS|HTTP or HTTPS/i.test(
        message,
      );
    sendError(res, clientError ? 400 : 502, message);
  }
}

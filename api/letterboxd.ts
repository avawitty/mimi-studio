<<<<<<< HEAD
import { cors, sendJson } from "../lib/apiUtils.js";
=======
import { cors, requireMethod, sendJson, sendError } from "../lib/apiUtils.js";
>>>>>>> origin/main
import { fetchLetterboxdFeed } from "../lib/letterboxdFeed.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
<<<<<<< HEAD
  try {
    const rawUrl = String(req.query?.url || "");
    if (!rawUrl) return sendJson(res, 400, { error: "Letterboxd URL required" });
=======
  if (!requireMethod(req, res, "GET")) return;
  try {
    const rawUrl = String(req.query?.url || "");
    if (!rawUrl) return sendError(res, 400, "Letterboxd URL required");
>>>>>>> origin/main
    sendJson(res, 200, await fetchLetterboxdFeed(rawUrl));
  } catch (error: any) {
    const message = error?.message || String(error);
    const clientError =
      /Letterboxd URL|valid Letterboxd|Only letterboxd|public feed|username|readable diary|profile or RSS|HTTP or HTTPS/i.test(
        message,
      );
<<<<<<< HEAD
    sendJson(res, clientError ? 400 : 502, { error: message });
=======
    sendError(res, clientError ? 400 : 502, message);
>>>>>>> origin/main
  }
}

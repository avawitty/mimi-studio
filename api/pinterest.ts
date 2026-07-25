import { cors, sendJson } from "../lib/apiUtils.js";
import { fetchPinterestBoardPreview } from "../lib/pinterestBoardPreview.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  try {
    const rawUrl = String(req.query?.url || "");
    if (!rawUrl) return sendJson(res, 400, { error: "Pinterest URL required" });
    sendJson(res, 200, await fetchPinterestBoardPreview(rawUrl));
  } catch (error: any) {
    const message = error?.message || String(error);
    const clientError =
      /Pinterest URL|valid Pinterest|Only pinterest|public thumbnails|public board/i.test(
        message,
      );
    sendJson(res, clientError ? 400 : 502, { error: message });
  }
}

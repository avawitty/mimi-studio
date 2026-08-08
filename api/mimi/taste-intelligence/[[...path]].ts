import { handleTasteIntelligenceRoute } from "../../../lib/tasteIntelligenceRoute.js";

export default async function handler(req: any, res: any) {
  (req as { path?: string }).path = req.url?.replace(/\?.*$/, "").replace(
    /^\/api\/mimi\/taste-intelligence\/?/,
    "",
  );
  return handleTasteIntelligenceRoute(req, res);
}

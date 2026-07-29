import { cors, readJsonBody, requireMethod, sendError, sendJson } from "../lib/apiUtils.js";
import { runYouSearch } from "../lib/youSearch.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const headerKey = String(req.headers["x-api-key"] || "").trim();
    const response = await runYouSearch({
      query: body?.query,
      includeDomains: body?.includeDomains,
      count: body?.count,
      youApiKey: headerKey,
    });
    sendJson(res, 200, response);
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    if (status === 400) {
      sendError(res, 400, error.message || "Query string is required.", error.code || "MISSING_QUERY");
      return;
    }
    console.error("MIMI // You.com API Proxy Error:", error);
    sendError(res, 500, error?.message || "Failed to fetch and map search results.");
  }
}

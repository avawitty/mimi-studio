import { cors, readJsonBody, sendJson } from "../lib/apiUtils.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  const body = await readJsonBody(req);
  sendJson(res, 501, {
    error: {
      message: "Generic generation endpoint is not configured. Use provider proxy endpoints.",
      received: Object.keys(body || {}),
    },
  });
}

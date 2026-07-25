import { cors, sendJson } from "../lib/apiUtils.js";

export default function handler(req: any, res: any) {
  if (cors(req, res)) return;
  sendJson(res, 200, {
    ok: true,
    applied: false,
    message: "Promo handling is not configured yet.",
  });
}

import { handleMimiTasteStateRoute } from "../../lib/mimiTasteStateRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiTasteStateRoute(req, res);
}

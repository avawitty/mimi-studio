import { handleMimiAnalyzeImageRoute } from "../../lib/mimiAnalyzeImageRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiAnalyzeImageRoute(req, res);
}

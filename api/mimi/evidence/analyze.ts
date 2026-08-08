import { handleMimiEvidenceAnalyzeRoute } from "../../../lib/mimiEvidenceAnalyzeRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiEvidenceAnalyzeRoute(req, res);
}

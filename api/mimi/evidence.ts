import { handleMimiEvidenceRoute } from "../../lib/mimiEvidenceRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiEvidenceRoute(req, res);
}

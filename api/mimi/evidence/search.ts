import { handleMimiEvidenceSearchRoute } from "../../../lib/mimiEvidenceSearchRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiEvidenceSearchRoute(req, res);
}

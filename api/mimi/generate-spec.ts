import { handleMimiGenerateSpecRoute } from "../../lib/mimiGenerateSpecRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiGenerateSpecRoute(req, res);
}

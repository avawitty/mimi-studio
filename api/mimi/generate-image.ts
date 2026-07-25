import { handleMimiGenerateImageRoute } from "../../lib/mimiGenerateImageRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiGenerateImageRoute(req, res);
}

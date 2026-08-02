import { handleMimiEmbedRoute } from "../../lib/mimiEmbedRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiEmbedRoute(req, res);
}

import { handleMimiGenerateTextRoute } from "../../lib/mimiGenerateTextRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiGenerateTextRoute(req, res);
}

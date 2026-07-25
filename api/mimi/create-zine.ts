import { handleMimiCreateZineRoute } from "../../lib/mimiCreateZineRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiCreateZineRoute(req, res);
}

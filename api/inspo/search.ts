import { handleInspoSearchRoute } from "../../lib/inspoSearchRoute.js";

export default async function handler(req: any, res: any) {
  return handleInspoSearchRoute(req, res);
}

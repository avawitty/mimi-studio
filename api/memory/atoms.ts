import { handleMemoryAtomsRoute } from "../../lib/memoryAtomsRoute.js";

export default async function handler(req: any, res: any) {
  return handleMemoryAtomsRoute(req, res);
}

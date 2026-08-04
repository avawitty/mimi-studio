import { handleAiOperationRoute } from "../../../lib/aiOperationRoute.js";

export default async function handler(req: any, res: any) {
  return handleAiOperationRoute(req, res);
}

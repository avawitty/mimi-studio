import { handleMemoryApprovalRoute } from "../../../lib/memoryApprovalRoute.js";

export default async function handler(req: any, res: any) {
  return handleMemoryApprovalRoute(req, res);
}

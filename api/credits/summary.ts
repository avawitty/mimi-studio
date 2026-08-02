import { handleCreditSummaryRoute } from "../../lib/creditSummaryRoute.js";

export default async function handler(req: any, res: any) {
  return handleCreditSummaryRoute(req, res);
}

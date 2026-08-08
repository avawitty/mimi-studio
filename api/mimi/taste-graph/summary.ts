import { handleMimiTasteGraphSummaryRoute } from "../../../lib/mimiTasteGraphSummaryRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiTasteGraphSummaryRoute(req, res);
}

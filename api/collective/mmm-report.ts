import { handleCollectiveMmmReportRoute } from "../../lib/collectiveMmmReportRoute.js";

/**
 * GET /api/collective/mmm-report
 * Live collective Mean Median Mode — consented public structure only.
 */
export default async function handler(req: any, res: any) {
  await handleCollectiveMmmReportRoute(req, res);
}

import { handleGetNextCalibrationPairRoute } from "../../../lib/tasteCalibrationRoute.js";

export default async function handler(req: any, res: any) {
  return handleGetNextCalibrationPairRoute(req, res);
}

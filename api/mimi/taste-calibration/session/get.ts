import { handleGetCalibrationSessionRoute } from "../../../../lib/tasteCalibrationRoute.js";

export default async function handler(req: any, res: any) {
  return handleGetCalibrationSessionRoute(req, res);
}

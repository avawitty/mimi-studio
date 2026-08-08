import { handlePauseCalibrationSessionRoute } from "../../../lib/tasteCalibrationRoute.js";

export default async function handler(req: any, res: any) {
  return handlePauseCalibrationSessionRoute(req, res);
}

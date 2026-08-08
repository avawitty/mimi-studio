import { handleCompleteCalibrationSessionRoute } from "../../../lib/tasteCalibrationRoute.js";

export default async function handler(req: any, res: any) {
  return handleCompleteCalibrationSessionRoute(req, res);
}

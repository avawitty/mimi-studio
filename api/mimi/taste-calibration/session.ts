import { handleCreateCalibrationSessionRoute } from "../../../lib/tasteCalibrationRoute.js";

export default async function handler(req: any, res: any) {
  return handleCreateCalibrationSessionRoute(req, res);
}

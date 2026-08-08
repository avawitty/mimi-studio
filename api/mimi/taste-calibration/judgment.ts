import { handleSubmitCalibrationJudgmentRoute } from "../../../lib/tasteCalibrationRoute.js";

export default async function handler(req: any, res: any) {
  return handleSubmitCalibrationJudgmentRoute(req, res);
}

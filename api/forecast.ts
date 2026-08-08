import { handleForecastRoute } from "../lib/forecastRoute.js";

export default async function handler(req: any, res: any) {
  return handleForecastRoute(req, res);
}

import { unavailableMimiRoute } from "./mimiRoutePlaceholders.js";

export const handleMimiAnalyzeImageRoute = (req: any, res: any) => {
  return unavailableMimiRoute(req, res, "api/mimi/analyze-image");
};

import { unavailableMimiRoute } from "./mimiRoutePlaceholders.js";

export const handleMimiGenerateSpecRoute = (req: any, res: any) => {
  return unavailableMimiRoute(req, res, "api/mimi/generate-spec");
};

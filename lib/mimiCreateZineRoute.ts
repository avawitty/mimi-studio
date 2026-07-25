import { unavailableMimiRoute } from "./mimiRoutePlaceholders.js";

export const handleMimiCreateZineRoute = (req: any, res: any) => {
  return unavailableMimiRoute(req, res, "api/mimi/create-zine");
};

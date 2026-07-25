import { unavailableMimiRoute } from "./mimiRoutePlaceholders.js";

export const handleMimiSignalReaderRoute = (req: any, res: any) => {
  return unavailableMimiRoute(req, res, "api/mimi/analyze-signals");
};

import { z } from "zod";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "../../lib/apiUtils.js";
import {
  completePlaceResolution,
  geocodeBirthPlace,
} from "../../lib/celestial/geocodePlace.js";
import { placeSuggestionSchema } from "../../schemas/celestialCalibrationContracts.js";

const bodySchema = z.union([
  placeSuggestionSchema,
  z.object({ query: z.string().min(2).max(200) }).strict(),
]);

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const parsed = validateBody(res, bodySchema, body);
    if (!parsed) return;

    const place =
      "latitude" in parsed
        ? completePlaceResolution(parsed)
        : await geocodeBirthPlace(parsed.query);

    sendJson(res, 200, place);
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    if (status >= 400 && status < 500) {
      sendError(res, status, error.message || "Geocode rejected.", error.code);
      return;
    }
    console.error("MIMI // Celestial geocode error:", error);
    sendError(res, 500, error?.message || "Failed to resolve birth place.");
  }
}

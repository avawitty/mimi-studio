import { z } from "zod";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "../../lib/apiUtils.js";
import { searchBirthPlaces } from "../../lib/celestial/geocodePlace.js";

const bodySchema = z.object({
  query: z.string().min(2).max(200),
  limit: z.number().int().min(1).max(8).optional(),
});

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const parsed = validateBody(res, bodySchema, body);
    if (!parsed) return;

    const suggestions = await searchBirthPlaces(
      parsed.query,
      undefined,
      parsed.limit ?? 5,
    );
    sendJson(res, 200, { suggestions });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    if (status >= 400 && status < 500) {
      sendError(res, status, error.message || "Suggest rejected.", error.code);
      return;
    }
    console.error("MIMI // Celestial geocode suggest error:", error);
    sendError(res, 500, error?.message || "Failed to suggest birth places.");
  }
}

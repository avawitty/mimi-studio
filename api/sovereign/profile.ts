import { cors, readJsonBody, sendError, sendJson, validateBody } from "../../lib/apiUtils.js";
import { authorizeSovereignWrite } from "../../lib/sovereign/auth.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import {
  getProfileByHandle,
  getProfileByUid,
  listUserZines,
  upsertProfile,
} from "../../lib/sovereign/store.js";
import type { UserProfile } from "../../types";

const profileBodySchema = {
  safeParse: (input: unknown): { success: boolean; data?: { profile: UserProfile }; error?: any } => {
    const body = input as { profile?: UserProfile };
    if (!body?.profile || typeof body.profile !== "object" || !body.profile.uid) {
      return {
        success: false,
        error: { issues: [{ path: ["profile"], message: "profile.uid required" }] },
      };
    }
    return { success: true, data: { profile: body.profile } };
  },
};

/**
 * GET  /api/sovereign/profile?handle= / ?uid=
 * POST /api/sovereign/profile
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;

  if (!isSovereignEnabled()) {
    return sendError(res, 503, "Sovereign archive disabled on this host.", "SOVEREIGN_DISABLED");
  }

  try {
    if (req.method === "GET") {
      const handle = String(req.query?.handle || "").trim();
      const uid = String(req.query?.uid || "").trim();
      const withZines = String(req.query?.withZines || "") === "1";

      const profile = handle
        ? await getProfileByHandle(handle)
        : uid
          ? await getProfileByUid(uid)
          : null;

      if (!profile) return sendError(res, 404, "Profile not found", "NOT_FOUND");

      const payload: Record<string, unknown> = { profile };
      if (withZines && profile.uid) {
        payload.zines = await listUserZines(profile.uid, { publicOnly: true, limit: 40 });
      }
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.setHeader("X-Mimi-Archive", "sovereign");
      return sendJson(res, 200, payload);
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const parsed = validateBody<{ profile: UserProfile }>(res, profileBodySchema, body);
      if (!parsed) return;
      const auth = await authorizeSovereignWrite(req, parsed.profile.uid);
      if (auth.ok === false) {
        return sendError(res, auth.status, auth.message, auth.code);
      }
      await upsertProfile(parsed.profile);
      return sendJson(res, 200, { ok: true, uid: parsed.profile.uid, via: auth.via });
    }

    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error: any) {
    return sendError(res, 500, error?.message || String(error), "SOVEREIGN_PROFILE_FAILED");
  }
}

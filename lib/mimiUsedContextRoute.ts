import { z } from "zod";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { verifyMimiSession, getServerFirebaseAdmin } from "./serverFirebaseAdmin.js";
import type { UsedContextEntry } from "../types.js";

const usedContextEntrySchema = z.object({
  atomId: z.string().min(1),
  title: z.string(),
  content: z.string(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  ownerUid: z.string().optional(),
  ownerHandle: z.string().optional(),
  workspaceId: z.string().optional(),
  linkVersion: z.number().optional(),
  addedAt: z.number(),
  approved: z.boolean(),
  target: z.enum(["studio", "the-edit"]),
});

const putBodySchema = z.object({
  entries: z.array(usedContextEntrySchema).max(200),
});

const USED_CONTEXT_DOC = "usedContext";

async function readEntries(db: any, userId: string): Promise<UsedContextEntry[]> {
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("studioMeta")
    .doc(USED_CONTEXT_DOC)
    .get();
  if (!snap.exists) return [];
  const data = snap.data() as { entries?: UsedContextEntry[] };
  return Array.isArray(data.entries) ? data.entries : [];
}

/**
 * GET /api/mimi/used-context
 */
export async function handleMimiUsedContextGetRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Firestore is temporarily unavailable.");
      return;
    }

    const entries = await readEntries(db, decoded.uid);
    sendJson(res, 200, { entries, updatedAt: Date.now() });
  } catch (error) {
    const code = String((error as { code?: unknown })?.code || "");
    const isAuth = new Set([
      "MISSING_MIMI_SESSION",
      "INVALID_MIMI_SESSION",
      "FIREBASE_ADMIN_UNAVAILABLE",
    ]).has(code);
    sendError(
      res,
      isAuth ? 401 : 500,
      error instanceof Error ? error.message : "Used context unavailable.",
    );
  }
}

/**
 * PUT /api/mimi/used-context
 * Replaces the user's server-side Used Context tray (max 200 entries).
 */
export async function handleMimiUsedContextPutRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "PUT")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const body = await readJsonBody(req);
    const parsed = validateBody(res, putBodySchema, body);
    if (!parsed) return;

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Firestore is temporarily unavailable.");
      return;
    }

    const now = Date.now();
    const entries = parsed.entries.map((e) => ({
      ...e,
      ownerUid: decoded.uid,
      linkVersion: e.linkVersion ?? 1,
    }));

    await db
      .collection("users")
      .doc(decoded.uid)
      .collection("studioMeta")
      .doc(USED_CONTEXT_DOC)
      .set({ entries, updatedAt: now });

    sendJson(res, 200, { ok: true, count: entries.length, updatedAt: now });
  } catch (error) {
    const code = String((error as { code?: unknown })?.code || "");
    const isAuth = new Set([
      "MISSING_MIMI_SESSION",
      "INVALID_MIMI_SESSION",
      "FIREBASE_ADMIN_UNAVAILABLE",
    ]).has(code);
    sendError(
      res,
      isAuth ? 401 : 500,
      error instanceof Error ? error.message : "Used context sync failed.",
    );
  }
}

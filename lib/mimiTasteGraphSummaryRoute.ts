import { z } from "zod";
import {
  cors,
  requireMethod,
  sendError,
  sendJson,
} from "./apiUtils.js";
import { verifyMimiSession, getServerFirebaseAdmin } from "./serverFirebaseAdmin.js";
import { getServerTasteState } from "./taste/serverTasteState.js";
import { getServerTasteModelSnapshot } from "./taste/serverTasteSnapshot.js";
import { buildTasteGraphSummary } from "./taste/tasteGraphSummary.js";
import type { TasteGraphEdge, TasteGraphNode, TasteScope, UsedContextEntry } from "../types.js";

const querySchema = z.object({
  context: z
    .enum([
      "global",
      "project",
      "brand",
      "fashion",
      "interface",
      "editorial",
      "experimental",
    ])
    .optional(),
  projectId: z.string().optional(),
});

type AdminDb = {
  collection: (path: string) => {
    doc: (id: string) => {
      collection: (sub: string) => {
        doc: (subId: string) => {
          get: () => Promise<{ exists: boolean; data: () => unknown }>;
        };
        get: () => Promise<{
          docs: Array<{ data: () => unknown }>;
        }>;
      };
      get: () => Promise<{ exists: boolean; data: () => unknown }>;
    };
  };
};

async function loadLegacyGraph(db: AdminDb, userId: string): Promise<{
  nodes: TasteGraphNode[];
  edges: TasteGraphEdge[];
}> {
  try {
    const userRef = db.collection("users").doc(userId);
    const [nodeSnap, edgeSnap] = await Promise.all([
      userRef.collection("tasteGraphNodes").get(),
      userRef.collection("tasteGraphEdges").get(),
    ]);
    return {
      nodes: nodeSnap.docs.map((d) => d.data() as TasteGraphNode),
      edges: edgeSnap.docs.map((d) => d.data() as TasteGraphEdge),
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

async function loadUsedContextEntries(db: AdminDb, userId: string): Promise<UsedContextEntry[]> {
  try {
    const snap = await db.collection("users").doc(userId).collection("studioMeta").doc("usedContext").get();
    if (!snap.exists) return [];
    const data = snap.data() as { entries?: UsedContextEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/mimi/taste-graph/summary
 * Unified taste read path: state + snapshot + projected graph + readiness + used context.
 */
export async function handleMimiTasteGraphSummaryRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const decoded = await verifyMimiSession(req.headers || {});
    const parsed = querySchema.safeParse(req.query || {});
    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message || "Invalid query.");
      return;
    }

    const { db } = getServerFirebaseAdmin();
    if (!db) {
      sendError(res, 503, "Firestore is temporarily unavailable.");
      return;
    }

    const context = parsed.data.context as TasteScope | undefined;
    const projectId = parsed.data.projectId;

    const snapshotScope =
      projectId ? { projectId } : ("global" as const);

    const [state, snapshot, legacyGraph, usedContext] = await Promise.all([
      getServerTasteState(db, decoded.uid, context, { maxEvidence: 24 }),
      getServerTasteModelSnapshot(db, decoded.uid, snapshotScope),
      loadLegacyGraph(db, decoded.uid),
      loadUsedContextEntries(db, decoded.uid),
    ]);

    const summary = buildTasteGraphSummary({
      state,
      snapshot,
      evidence: state.relevantEvidence,
      legacyNodes: legacyGraph.nodes,
      legacyEdges: legacyGraph.edges,
      usedContext,
      context,
    });

    sendJson(res, 200, { summary });
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
      error instanceof Error ? error.message : "Taste graph summary unavailable.",
    );
  }
}

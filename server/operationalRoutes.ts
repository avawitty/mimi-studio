import type { Express } from "express";
import aiOperationHandler from "../api/ai/operations/[operationId].js";
import creditSummaryHandler from "../api/credits/summary.js";
import memoryAtomsHandler from "../api/memory/atoms.js";
import memoryApprovalHandler from "../api/memory/proposals/approve.js";

export function registerOperationalRoutes(app: Express): void {
  app.post("/api/ai/operations/:operationId", async (req, res) => {
    await aiOperationHandler(req, res);
  });
  app.get("/api/credits/summary", async (req, res) => {
    await creditSummaryHandler(req, res);
  });
  app.post("/api/memory/proposals/approve", async (req, res) => {
    await memoryApprovalHandler(req, res);
  });
  app.get("/api/memory/atoms", async (req, res) => {
    await memoryAtomsHandler(req, res);
  });
  app.post("/api/mimi/taste-intelligence/calibration/start", async (req, res) => {
    (req as { path?: string }).path = "calibration/start";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.post("/api/mimi/taste-intelligence/calibration/judgment", async (req, res) => {
    (req as { path?: string }).path = "calibration/judgment";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.get("/api/mimi/taste-intelligence/calibration/session", async (req, res) => {
    (req as { path?: string }).path = "calibration/session";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.get("/api/mimi/taste-intelligence/snapshot/latest", async (req, res) => {
    (req as { path?: string }).path = "snapshot/latest";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.post("/api/mimi/taste-intelligence/snapshot/persist", async (req, res) => {
    (req as { path?: string }).path = "snapshot/persist";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.get("/api/mimi/taste-intelligence/refusals", async (req, res) => {
    (req as { path?: string }).path = "refusals";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.post("/api/mimi/taste-intelligence/refusals", async (req, res) => {
    (req as { path?: string }).path = "refusals";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.post("/api/mimi/taste-intelligence/model-edits", async (req, res) => {
    (req as { path?: string }).path = "model-edits";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.post("/api/mimi/taste-intelligence/model-edits/undo", async (req, res) => {
    (req as { path?: string }).path = "model-edits/undo";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.post("/api/mimi/taste-intelligence/saved-reason/propose", async (req, res) => {
    (req as { path?: string }).path = "saved-reason/propose";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.get("/api/mimi/taste-intelligence/saved-reason", async (req, res) => {
    (req as { path?: string }).path = "saved-reason";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
  app.post("/api/mimi/taste-intelligence/saved-reason/review", async (req, res) => {
    (req as { path?: string }).path = "saved-reason/review";
    const { handleTasteIntelligenceRoute } = await import("../lib/tasteIntelligenceRoute.js");
    await handleTasteIntelligenceRoute(req, res);
  });
}

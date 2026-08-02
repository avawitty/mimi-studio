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
}

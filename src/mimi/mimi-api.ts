import express, { Request, Response } from "express";
import Mimi from "./mimi";

const router = express.Router();
const mimi = new Mimi();

interface MimiRequest {
  message: string;
  clearHistory?: boolean;
}

interface MimiResponse {
  response: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  timestamp: string;
}

/**
 * POST /api/mimi/ask
 * Send a message to Mimi and get a response
 */
router.post("/ask", async (req: Request, res: Response) => {
  try {
    const { message, clearHistory } = req.body as MimiRequest;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    if (clearHistory) {
      mimi.clearHistory();
    }

    const response = await mimi.respond(message);

    const result: MimiResponse = {
      response,
      history: mimi.getHistory(),
      timestamp: new Date().toISOString(),
    };

    res.json(result);
  } catch (error) {
    console.error("Mimi API error:", error);
    res.status(500).json({
      error: "Failed to get response from Mimi",
    });
  }
});

/**
 * POST /api/mimi/clear
 * Clear conversation history
 */
router.post("/clear", (req: Request, res: Response) => {
  mimi.clearHistory();
  res.json({
    message: "Conversation history cleared",
  });
});

/**
 * GET /api/mimi/history
 * Get current conversation history
 */
router.get("/history", (req: Request, res: Response) => {
  res.json({
    history: mimi.getHistory(),
  });
});

export default router;

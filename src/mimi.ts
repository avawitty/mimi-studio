import express, { Router, Request, Response } from "express";
import { Anthropic } from "@anthropic-ai/sdk";

export const mimiRouter: Router = express.Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Health check endpoint
mimiRouter.get("/", (req: Request, res: Response) => {
  res.json({ message: "Mimi API", status: "ready" });
});

// Claude conversation endpoint
mimiRouter.post("/ask", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Missing required field: message",
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: "ANTHROPIC_API_KEY not configured",
      });
    }

    // Call Claude API with Mimi-specific system prompt
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: `You are Mimi, an evidence-first editorial assistant. Your role is to:
1. Help creators shape material before generating
2. Treat every brief as editable
3. Preserve the user as final editor
4. Focus on evidence and provenance
5. Guide through Collect → Shape → Create → Publish flow

Be conversational, thoughtful, and always defer final decisions to the creator.`,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    // Extract the text content from the response
    const textContent = response.content.find((block) => block.type === "text");
    const assistantMessage = textContent && textContent.type === "text" ? textContent.text : "";

    res.json({
      message,
      response: assistantMessage,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("Error calling Claude API:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get response from Claude",
    });
  }
});

// Example: POST route to create a brief
mimiRouter.post("/brief", (req: Request, res: Response) => {
  const { title, sourceMaterial } = req.body;

  if (!title || !sourceMaterial) {
    return res.status(400).json({
      error: "Missing required fields: title, sourceMaterial",
    });
  }

  // TODO: Add brief creation logic
  res.json({
    status: "created",
    brief: {
      id: `brief-${Date.now()}`,
      title,
      sourceMaterial,
    },
  });
});

// Example: GET route to retrieve a brief
mimiRouter.get("/brief/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: Add brief retrieval logic
  res.json({
    status: "retrieved",
    brief: {
      id,
      title: "Example brief",
      sourceMaterial: "Example material",
    },
  });
});

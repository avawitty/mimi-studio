import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic();

/**
 * Mimi - Evidence-based AI that reveals patterns, not generates identity
 */
class Mimi {
  private systemPrompt: string;
  private conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  constructor() {
    // Load Mimi's system prompt from the constitution
    const promptPath = path.join(__dirname, "system-prompt.md");
    this.systemPrompt = fs.readFileSync(promptPath, "utf-8");
  }

  /**
   * Send a message to Mimi and get a response
   * Maintains conversation history for context
   */
  async respond(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: this.systemPrompt,
        messages: this.conversationHistory,
      });

      const assistantMessage =
        response.content[0].type === "text" ? response.content[0].text : "";

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error("Error calling Mimi:", error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   * Use when starting a fresh conversation
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get current conversation history
   */
  getHistory(): Array<{ role: "user" | "assistant"; content: string }> {
    return this.conversationHistory;
  }

  /**
   * Update the system prompt
   * Useful for evolving Mimi's philosophy
   */
  updateSystemPrompt(newPrompt: string): void {
    this.systemPrompt = newPrompt;
  }
}

export default Mimi;

/**
 * Mimi Configuration
 * Controls behavior, model selection, and inference parameters
 */

export interface MimiConfig {
  // Model selection
  model: "claude-3-5-sonnet" | "claude-3-opus" | "gpt-4" | "ollama-local";
  maxTokens: number;

  // Inference parameters
  temperature: number; // 0 = deterministic, 1 = creative
  topP: number; // Nucleus sampling

  // Behavior
  rememberConversation: boolean;
  maxHistoryLength: number;

  // Evidence requirements
  requireCitations: boolean;
  confidenceThreshold: number; // Min confidence before making claims

  // API
  apiKey?: string;
  apiUrl?: string;
}

export const defaultConfig: MimiConfig = {
  // Use Claude 3.5 Sonnet for best balance of speed and quality
  model: "claude-3-5-sonnet",
  maxTokens: 1024,

  // Lower temperature = more consistent, more evidence-based
  // Mimi prioritizes consistency over creativity
  temperature: 0.3,
  topP: 0.9,

  // Remember context within a conversation
  rememberConversation: true,
  maxHistoryLength: 20,

  // Mimi should be honest about what she knows
  requireCitations: false, // Don't force citations, but encourage them
  confidenceThreshold: 0.6, // Only make claims when confident

  // API configuration from environment
  apiKey: process.env.ANTHROPIC_API_KEY,
  apiUrl: process.env.ANTHROPIC_API_URL,
};

/**
 * Load config from environment or use defaults
 */
export function loadConfig(): MimiConfig {
  return {
    ...defaultConfig,
    temperature: parseFloat(process.env.MIMI_TEMPERATURE || "0.3"),
    maxHistoryLength: parseInt(process.env.MIMI_MAX_HISTORY || "20"),
    model: (process.env.MIMI_MODEL || "claude-3-5-sonnet") as MimiConfig["model"],
  };
}

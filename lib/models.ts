/**
 * Vercel AI Gateway model catalog for Mimi (operational defaults).
 *
 * Policy: when calling AI Gateway for text, image, audio (TTS), video, or
 * embeddings, resolve models through this catalog / `modelFor(role, "gateway")`
 * rather than hardcoding provider strings. Defaults should track the newest
 * stable `provider/model` IDs verified against
 * https://ai-gateway.vercel.sh/v1/models — re-check that endpoint when bumping.
 *
 * Override any role via env (see `.env.example`) — `services/modelConfig.ts`
 * remains the runtime resolver.
 */

export type GatewayModelRole =
  | "textFast"
  | "textDeep"
  | "image"
  | "imageEdit"
  | "video"
  | "tts"
  | "embedding";

/**
 * Curated defaults — newest stable IDs per generation modality as of catalog sync.
 * Prefer these suggestions for all gateway-backed text / image / audio / video calls.
 */
export const GATEWAY_DEFAULT_MODELS: Record<GatewayModelRole, string> = {
  textFast: "google/gemini-3.6-flash",
  textDeep: "moonshotai/kimi-k3",
  // GA image model (supersedes gemini-3.1-flash-image-preview)
  image: "google/gemini-3.1-flash-image",
  imageEdit: "google/gemini-3.1-flash-image",
  // Newest Veo 3.1 family ID on the gateway catalog
  video: "google/veo-3.1-lite-generate-001",
  // Newest dedicated speech model on the gateway catalog
  tts: "xai/grok-tts",
  embedding: "openai/text-embedding-3-small",
};

/**
 * Named picks for UI / playground selectors (subset of gateway catalog).
 * Keep this list intentional — not every gateway model belongs in product UI.
 * Lead each role with the current recommended (most recent) default.
 */
export const GATEWAY_MODEL_OPTIONS = [
  {
    id: "google/gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    provider: "google",
    roles: ["textFast"] as const,
  },
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "google",
    roles: ["textFast"] as const,
  },
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    provider: "openai",
    roles: ["textFast"] as const,
  },
  {
    id: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "openai",
    roles: ["textFast", "textDeep"] as const,
  },
  {
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "openai",
    roles: ["textDeep"] as const,
  },
  {
    id: "anthropic/claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    roles: ["textDeep"] as const,
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    roles: ["textFast"] as const,
  },
  {
    id: "moonshotai/kimi-k3-fast",
    label: "Kimi K3 Fast",
    provider: "moonshotai",
    roles: ["textFast"] as const,
  },
  {
    id: "moonshotai/kimi-k3",
    label: "Kimi K3",
    provider: "moonshotai",
    roles: ["textDeep"] as const,
  },
  {
    id: "google/gemini-3.1-flash-image",
    label: "Gemini 3.1 Flash Image",
    provider: "google",
    roles: ["image", "imageEdit"] as const,
  },
  {
    id: "google/gemini-3.1-flash-lite-image",
    label: "Gemini 3.1 Flash Lite Image",
    provider: "google",
    roles: ["image", "imageEdit"] as const,
  },
  {
    id: "openai/gpt-image-2",
    label: "GPT Image 2",
    provider: "openai",
    roles: ["image", "imageEdit"] as const,
  },
  {
    id: "openai/gpt-image-1.5",
    label: "GPT Image 1.5",
    provider: "openai",
    roles: ["image", "imageEdit"] as const,
  },
  {
    id: "google/veo-3.1-lite-generate-001",
    label: "Veo 3.1 Lite",
    provider: "google",
    roles: ["video"] as const,
  },
  {
    id: "google/veo-3.1-fast-generate-001",
    label: "Veo 3.1 Fast",
    provider: "google",
    roles: ["video"] as const,
  },
  {
    id: "google/veo-3.1-generate-001",
    label: "Veo 3.1",
    provider: "google",
    roles: ["video"] as const,
  },
  {
    id: "xai/grok-tts",
    label: "Grok TTS",
    provider: "xai",
    roles: ["tts"] as const,
  },
  {
    id: "openai/tts-1-hd",
    label: "OpenAI TTS HD",
    provider: "openai",
    roles: ["tts"] as const,
  },
  {
    id: "openai/tts-1",
    label: "OpenAI TTS",
    provider: "openai",
    roles: ["tts"] as const,
  },
] as const;

export type GatewayModelOptionId = (typeof GATEWAY_MODEL_OPTIONS)[number]["id"];

export function isGatewayModelId(value: string): boolean {
  return value.includes("/");
}

export function gatewayModelsForRole(role: GatewayModelRole) {
  return GATEWAY_MODEL_OPTIONS.filter((option) =>
    (option.roles as readonly string[]).includes(role),
  );
}

/**
 * Suggested gateway model for a generation modality.
 * Call sites should prefer this (or `modelFor(role, "gateway")`) over ad-hoc IDs
 * so text / image / audio / video traffic stays on the newest curated defaults.
 */
export function suggestedGatewayModel(role: GatewayModelRole): string {
  return GATEWAY_DEFAULT_MODELS[role];
}

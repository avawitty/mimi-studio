/**
 * Vercel AI Gateway model catalog for Mimi.
 *
 * IDs use the gateway `provider/model` form and were verified against
 * https://ai-gateway.vercel.sh/v1/models. Prefer these over bare provider
 * strings when routing through the gateway or the `ai` SDK.
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
  | "embedding";

/** Curated defaults — newest stable IDs per role as of catalog sync. */
export const GATEWAY_DEFAULT_MODELS: Record<GatewayModelRole, string> = {
  textFast: "google/gemini-3.6-flash",
  textDeep: "anthropic/claude-sonnet-5",
  image: "google/gemini-3.1-flash-image-preview",
  imageEdit: "google/gemini-3.1-flash-image-preview",
  video: "google/veo-3.1-fast-generate-001",
  embedding: "openai/text-embedding-3-small",
};

/**
 * Named picks for UI / playground selectors (subset of gateway catalog).
 * Keep this list intentional — not every gateway model belongs in product UI.
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
    id: "google/gemini-3.1-flash-image-preview",
    label: "Gemini 3.1 Flash Image",
    provider: "google",
    roles: ["image", "imageEdit"] as const,
  },
  {
    id: "openai/gpt-image-1.5",
    label: "GPT Image 1.5",
    provider: "openai",
    roles: ["image", "imageEdit"] as const,
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

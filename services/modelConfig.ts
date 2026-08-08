// services/modelConfig.ts
//
// Single source of truth for model IDs. Instead of hardcoding strings like
// "gemini-3.1-pro-preview" across ~100 call sites, code asks for a ROLE
// ("deep text", "fast text", "image", etc.) on a PROVIDER, and this map
// resolves the concrete model id — env-overridable, so bumping to a newer
// model is a one-line change (or an env var) instead of a find-and-replace.
//
// Why roles instead of raw ids: when a user brings their own OpenAI or
// Anthropic key, "gemini-3.1-pro-preview" is meaningless to them. Asking for
// MODELS[provider].text lets the same call route to whatever that provider's
// current model is.
//
// Gateway defaults live in lib/models.ts (newest verified IDs for text / image /
// audio / video). Prefer modelFor(role, 'gateway') over hardcoded provider strings.

import { GATEWAY_DEFAULT_MODELS } from '../lib/models.js';

export type LLMProviderId = 'gemini' | 'openai' | 'anthropic' | 'replicate' | 'openrouter' | 'gateway';

export type ModelRole =
  | 'textFast'   // quick, cheap turns (chat, tagging, short synthesis)
  | 'textDeep'   // heavy reasoning / long structured JSON
  | 'image'      // image generation
  | 'imageEdit'  // image editing / inpainting
  | 'video'      // video generation
  | 'tts'        // text-to-speech
  | 'live'       // realtime / streaming session
  | 'embedding'; // vector embeddings

type RoleMap = Partial<Record<ModelRole, string>>;

// Small helper: read an env override if present, else fall back to the default.
const env = (key: string, fallback: string): string =>
  (typeof process !== 'undefined' && process.env?.[key]) || fallback;

// Defaults match the models your code already runs today, so adopting this map
// is non-breaking. To move to a newer model, change the default here OR set the
// corresponding env var — no find-and-replace across call sites.
export const MODELS: Record<LLMProviderId, RoleMap> = {
  gemini: {
    textFast:  env('GEMINI_TEXT_FAST_MODEL',  'gemini-2.5-flash'),
    textDeep:  env('GEMINI_TEXT_DEEP_MODEL',  'gemini-3.1-pro-preview'),
    image:     env('GEMINI_IMAGE_MODEL',      'gemini-3.1-flash-image'),
    imageEdit: env('GEMINI_IMAGE_EDIT_MODEL', 'gemini-3.1-flash-image'),
    video:     env('GEMINI_VIDEO_MODEL',      'veo-3.1-fast-generate-preview'),
    tts:       env('GEMINI_TTS_MODEL',        'gemini-3.1-flash-tts-preview'),
    live:      env('GEMINI_LIVE_MODEL',       'gemini-3.1-flash-live-preview'),
    embedding: env('GEMINI_EMBEDDING_MODEL',  'text-embedding-004'),
  },
  openai: {
    textFast:  env('OPENAI_TEXT_FAST_MODEL', 'gpt-4o-mini'),
    textDeep:  env('OPENAI_MODEL',           'gpt-4o'),
    image:     env('OPENAI_IMAGE_MODEL',     'gpt-image-1'),
    imageEdit: env('OPENAI_IMAGE_MODEL',     'gpt-image-1'),
    embedding: env('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
  },
  anthropic: {
    textFast:  env('ANTHROPIC_TEXT_FAST_MODEL', 'claude-haiku-latest'),
    textDeep:  env('ANTHROPIC_MODEL',           'claude-sonnet-latest'),
  },
  replicate: {
    textFast:  env('REPLICATE_TEXT_FAST_MODEL', 'meta/meta-llama-3-8b-instruct'),
    textDeep:  env('REPLICATE_TEXT_DEEP_MODEL', 'meta/meta-llama-3-70b-instruct'),
    image:     env('REPLICATE_IMAGE_MODEL',     'black-forest-labs/flux-schnell'),
  },
  openrouter: {
    textFast: env('OPENROUTER_TEXT_FAST_MODEL', 'openai/gpt-4o-mini'),
    textDeep: env('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
  },
  gateway: {
    textFast:  env('AI_GATEWAY_TEXT_FAST_MODEL',  GATEWAY_DEFAULT_MODELS.textFast),
    textDeep:  env('AI_GATEWAY_MODEL',            GATEWAY_DEFAULT_MODELS.textDeep),
    image:     env('AI_GATEWAY_IMAGE_MODEL',      GATEWAY_DEFAULT_MODELS.image),
    imageEdit: env('AI_GATEWAY_IMAGE_EDIT_MODEL', GATEWAY_DEFAULT_MODELS.imageEdit),
    video:     env('AI_GATEWAY_VIDEO_MODEL',      GATEWAY_DEFAULT_MODELS.video),
    tts:       env('AI_GATEWAY_TTS_MODEL',        GATEWAY_DEFAULT_MODELS.tts),
    live:      env('AI_GATEWAY_LIVE_MODEL',       GATEWAY_DEFAULT_MODELS.live),
    embedding: env('AI_GATEWAY_EMBEDDING_MODEL',  GATEWAY_DEFAULT_MODELS.embedding),
  },
};

/**
 * Resolve a concrete model id for a role on a provider.
 * Falls back to the provider's deep-text model if the exact role is unset,
 * so a missing capability never throws an undefined model into an API call.
 */
export function modelFor(role: ModelRole, provider: LLMProviderId = 'gemini'): string {
  const map = MODELS[provider] || {};
  let id = map[role] || map.textDeep || map.textFast;
  if (!id) {
    throw new Error(
      `modelConfig: no model configured for role "${role}" on provider "${provider}".`
    );
  }

  // Normalize synthetic Gemini models to real, valid ones for API execution
  if (provider === 'gemini') {
    if (id.includes('gemini-3.5-flash') || id === 'gemini-1.5-flash' || id === 'gemini-2.5-flash') {
      return 'gemini-2.5-flash';
    }
    if (id.includes('gemini-3.1-pro-preview') || id === 'gemini-1.5-pro') {
      return 'gemini-3.1-pro-preview';
    }
    if (id.includes('gemini-3.1-flash-lite-image') || id.includes('image')) {
      return 'gemini-3.1-flash-lite-image';
    }
  }

  return id;
}

/** Convenience accessor: MODELS for the currently active provider. */
export function activeModelFor(role: ModelRole, getActive: () => LLMProviderId): string {
  return modelFor(role, getActive());
}

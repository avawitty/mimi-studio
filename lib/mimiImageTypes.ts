export type MimiImageProvider = "gemini" | "openai" | "local" | "simulated" | "replicate" | "svg" | "gateway";

export type MimiImageMode =
  | "reference-led"
  | "archive-surreal"
  | "mimi-deck"
  | "zine-plate"
  | "product";

export type MimiImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type MimiImageSize = "1K" | "2K";

export interface MimiImageReference {
  dataUrl?: string;
  data?: string;
  url?: string;
  mimeType?: string;
  name?: string;
  description?: string;
  transcription?: string;
  tags?: string[];
}

export interface MimiImageRequest {
  prompt: string;
  references?: MimiImageReference[];
  provider?: MimiImageProvider;
  model?: string;
  mode?: MimiImageMode;
  aspectRatio?: MimiImageAspectRatio;
  imageSize?: MimiImageSize;
  tailorContext?: unknown;
  styleGuide?: string;
  negativePrompt?: string;
  allowFaces?: boolean;
  /** Batch contact-sheet generation (e.g. 4 variants in one API call). */
  variantCount?: number;
  metadata?: Record<string, unknown>;
}

export interface MimiImageVariantResult {
  imageUrl: string;
  seed: string;
  prompt: string;
  mimeType: string;
  base64?: string;
}

export interface MimiImageResponse {
  ok: boolean;
  provider: MimiImageProvider;
  model: string;
  imageUrl: string;
  mimeType: string;
  base64?: string;
  compiledPrompt: string;
  warnings: string[];
  metadata?: Record<string, unknown>;
  /** Present when variantCount > 1 — contact-sheet batch. */
  variants?: MimiImageVariantResult[];
}

export const DEFAULT_MIMI_IMAGE_MODEL = "imagen-3.0-generate-002";

export const MIMI_IMAGE_MODE_LABELS: Record<MimiImageMode, string> = {
  "reference-led": "Reference-led",
  "archive-surreal": "Archive surreal",
  "mimi-deck": "Mimi deck",
  "zine-plate": "Zine plate",
  product: "Product",
};

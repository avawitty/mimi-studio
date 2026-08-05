import type { ZinePlateMediaMode } from "../types.js";

export const ZINE_PLATE_MEDIA_MODES: ZinePlateMediaMode[] = [
  "photography-first",
  "generated",
  "references-only",
];

export const ZINE_PLATE_MEDIA_MODE_LABELS: Record<
  ZinePlateMediaMode,
  { label: string; note: string }
> = {
  "photography-first": {
    label: "Photography first",
    note: "Licensed stock plates with attribution when available",
  },
  generated: {
    label: "Generated plates",
    note: "AI-developed cover and spread imagery",
  },
  "references-only": {
    label: "My references",
    note: "Use attached references only — no generated plates",
  },
};

export function normalizePlateMediaMode(
  value: unknown,
): ZinePlateMediaMode {
  if (value === "photography-first" || value === "references-only") {
    return value;
  }
  return "generated";
}

export function shouldAiGeneratePlates(mode: ZinePlateMediaMode): boolean {
  return mode === "generated";
}

export function shouldResolveStockPlates(mode: ZinePlateMediaMode): boolean {
  return mode === "photography-first";
}

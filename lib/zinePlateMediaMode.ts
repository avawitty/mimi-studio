import type { ZinePlateMediaMode } from "../types.js";

export const ZINE_PLATE_MEDIA_MODES: ZinePlateMediaMode[] = [
  "generated",
  "photography-first",
  "references-only",
];

export const ZINE_PLATE_MEDIA_MODE_LABELS: Record<
  ZinePlateMediaMode,
  { label: string; note: string; short: string }
> = {
  generated: {
    label: "Imagen",
    short: "AI plates",
    note: "Mimi develops cover and spread imagery — default",
  },
  "photography-first": {
    label: "Stock",
    short: "Licensed",
    note: "Attributed stock photography when available",
  },
  "references-only": {
    label: "References",
    short: "Yours only",
    note: "Attached references only — no generated plates",
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

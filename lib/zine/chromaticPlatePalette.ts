import type {
  ChromaticPlatePalette,
  ColorShard,
  TailorLogicDraft,
  ZineContent,
} from "../../types";

function normalizeHex(hex: string): string {
  const trimmed = hex.trim().toUpperCase();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function pushColor(
  colors: ColorShard[],
  seen: Set<string>,
  shard: ColorShard,
): void {
  const hex = normalizeHex(shard.hex);
  if (!hex || seen.has(hex)) return;
  seen.add(hex);
  colors.push({ ...shard, hex });
}

export function buildChromaticPlatePalette(
  content: Pick<ZineContent, "visual_guidance" | "taste_context">,
  tailor?: TailorLogicDraft | null,
): ChromaticPlatePalette | null {
  const registry = tailor?.expressionEngine?.chromaticRegistry;
  const colors: ColorShard[] = [];
  const seen = new Set<string>();

  if (registry?.baseNeutral) {
    pushColor(colors, seen, {
      name: "Base neutral",
      hex: registry.baseNeutral,
      descriptor: "Field tone",
    });
  }

  for (const shard of registry?.primaryPalette || []) {
    if (shard?.hex) pushColor(colors, seen, shard);
  }

  for (const hex of content.visual_guidance?.strict_palette || []) {
    pushColor(colors, seen, { name: "Strict palette", hex });
  }

  for (const hex of content.taste_context?.active_palette || []) {
    pushColor(colors, seen, { name: "Active palette", hex });
  }

  if (registry?.accentSignal) {
    pushColor(colors, seen, {
      name: "Accent signal",
      hex: registry.accentSignal,
      descriptor: "Tailor accent",
    });
  }

  if (colors.length === 0) return null;

  return {
    colors: colors.slice(0, 8),
    accent: registry?.accentSignal,
    baseNeutral: registry?.baseNeutral,
    sourceLabel: registry?.primaryPalette?.length
      ? "Chromatic Calibration · Tailor"
      : "Issue palette",
  };
}

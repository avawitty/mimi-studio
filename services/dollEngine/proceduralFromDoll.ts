import type { Doll } from "../../types";
import { pickPalettePair } from "./colorResolve";
import type {
  ProceduralAccessory,
  ProceduralDollAesthetic,
  ProceduralPattern,
} from "./types";

function inferPattern(doll: Doll): ProceduralPattern {
  const hay = [
    ...doll.visualLanguage,
    ...doll.motifs,
    ...doll.signatureMotifs,
    doll.silhouette,
    ...doll.materials,
  ]
    .join(" ")
    .toLowerCase();

  if (/grid|lattice|geometry|structural|modular|pixel/.test(hay)) return "grid";
  if (/marble|vein|stone|organic|fluid|ink/.test(hay)) return "marble";
  if (/halftone|print|dot|newsprint|screen/.test(hay)) return "halftone";
  return "ripples";
}

function inferAccessory(doll: Doll): ProceduralAccessory {
  const hay = [...doll.motifs, ...doll.signatureMotifs, doll.eyeTreatment || ""]
    .join(" ")
    .toLowerCase();
  if (/crown|regal|royal|gilt|sovereign/.test(hay)) return "crown";
  if (/halo|orb|aura|radiant|sacred/.test(hay)) return "halo";
  if (/minimal|restrain|quiet|bare/.test(hay)) return "none";
  return "halo";
}

function materialGloss(doll: Doll): number {
  const hay = doll.materials.join(" ").toLowerCase();
  if (/vinyl|lacquer|glass|metal|chrome|patent/.test(hay)) return 1.1;
  if (/silk|satin|pearl/.test(hay)) return 0.85;
  if (/wool|linen|matte|paper|cotton/.test(hay)) return 0.35;
  return 0.7;
}

/**
 * Derive a procedural dresser aesthetic from Doll projection fields.
 * Prefer saved `proceduralAesthetic` when userLocked.
 */
export function deriveProceduralAesthetic(doll: Doll): ProceduralDollAesthetic {
  const saved = doll.proceduralAesthetic;
  if (saved?.userLocked) {
    return { ...saved };
  }

  const { primary, secondary } = pickPalettePair(doll.palette);
  const motifDensity =
    doll.motifs.length + doll.signatureMotifs.length + doll.visualLanguage.length;
  const complexity = Math.max(2, Math.min(10, 3 + Math.round(motifDensity / 2)));

  const derived: ProceduralDollAesthetic = {
    pattern: inferPattern(doll),
    primaryColor: primary,
    secondaryColor: secondary,
    complexity,
    warpSpeed: /kinetic|motion|pulse|wave/.test(
      [...doll.visualLanguage, doll.emotionalRegister].join(" ").toLowerCase(),
    )
      ? 1.8
      : 1.0,
    warpIntensity: /architectural|rigid|structured/.test(
      [doll.silhouette, ...doll.favoriteShapes].join(" ").toLowerCase(),
    )
      ? 0.06
      : 0.12,
    glossiness: materialGloss(doll),
    accessoryMode: inferAccessory(doll),
    userLocked: false,
    updatedAt: Date.now(),
  };

  // Merge non-locked saved overrides (e.g. colors tweaked once)
  if (saved && !saved.userLocked) {
    return {
      ...derived,
      ...saved,
      userLocked: false,
      updatedAt: Date.now(),
    };
  }

  return derived;
}

export function aestheticToStorageKeys(aesthetic: ProceduralDollAesthetic): Record<string, string> {
  return {
    mimi_doll_pattern: aesthetic.pattern,
    mimi_doll_primaryColor: aesthetic.primaryColor,
    mimi_doll_secondaryColor: aesthetic.secondaryColor,
    mimi_doll_complexity: String(aesthetic.complexity),
    mimi_doll_warpSpeed: String(aesthetic.warpSpeed),
    mimi_doll_warpIntensity: String(aesthetic.warpIntensity),
    mimi_doll_glossiness: String(aesthetic.glossiness),
    mimi_doll_accessoryMode: aesthetic.accessoryMode,
  };
}

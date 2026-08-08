import type {
  Doll,
  EvidenceBasedCreativeDossier,
  LikenessManifest,
  RipInverseFunction,
  RipSemioticTouchpoint,
  RipSavableInsightKind,
} from "../../types";
import {
  applyAdmission,
  applyContrast,
  applyMaterialFlip,
  applySemioticInversion,
  applyShadowProjection,
} from "./inverseFunctions";

function uniqueTouchpoints(
  items: RipSemioticTouchpoint[],
  max = 6,
): RipSemioticTouchpoint[] {
  const seen = new Set<string>();
  const out: RipSemioticTouchpoint[] = [];
  for (const item of items) {
    const key = item.motif.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Build inverse semiotic touchpoints from refusals, materials, and blind spots.
 * Deterministic — adjacent cultural nodes, not literal subject mapping.
 */
export function buildInverseSemioticTouchpoints(input: {
  antiMotifs: string[];
  blindSpots: string[];
  doll?: Doll | null;
  dossier?: EvidenceBasedCreativeDossier | null;
  likeness?: LikenessManifest | null;
}): RipSemioticTouchpoint[] {
  const touchpoints: RipSemioticTouchpoint[] = [];

  for (const anti of input.antiMotifs.slice(0, 4)) {
    const semiotic = applySemioticInversion(anti);
    const contrast = applyContrast(anti);
    touchpoints.push({
      motif: semiotic.motif,
      context: `Inverse echo of refused motif “${anti}”`,
      culturalNode: semiotic.node,
      inverseRationale: semiotic.rationale,
      resonance: 0.85,
      visualDirective: semiotic.directive,
      savableKind: "touchpoint",
      linkedAntiMotif: anti,
      inverseFunction: "semiotic_inversion",
    });
    touchpoints.push({
      motif: contrast.tryInstead.slice(0, 120),
      context: `Refusal contrast for “${anti}”`,
      culturalNode: "productive tension field",
      inverseRationale: contrast.rationale,
      resonance: 0.75,
      visualDirective: "single plate, visible refusal admitted under existing laws",
      savableKind: "inversion",
      linkedAntiMotif: anti,
      inverseFunction: "contrast",
    });
  }

  for (const blind of input.blindSpots.slice(0, 2)) {
    const shadow = applyShadowProjection(blind);
    touchpoints.push({
      motif: shadow.becauseYouTendTo,
      context: "Blind spot as semiotic signal",
      culturalNode: "shadow field",
      inverseRationale: shadow.rationale,
      resonance: 0.7,
      visualDirective: "name the blind spot in caption or marginalia — do not aestheticize away",
      savableKind: "blind_spot",
      inverseFunction: "shadow_projection",
    });
  }

  const materials = [
    ...(input.doll?.materials || []),
    ...(input.dossier?.creativeOperatingSystem?.materialVocabulary || []),
  ];
  for (const mat of materials.slice(0, 2)) {
    const flip = applyMaterialFlip(mat);
    touchpoints.push({
      motif: flip.flipped,
      context: `Material inverse of “${mat}”`,
      culturalNode: "material dialect",
      inverseRationale: flip.rationale,
      resonance: 0.65,
      visualDirective: `foreground ${flip.flipped}, suppress ${mat} sheen`,
      savableKind: "touchpoint",
      inverseFunction: "material_flip",
    });
  }

  if (input.likeness?.motifCandidates?.length) {
    const motif = input.likeness.motifCandidates[0];
    const inv = applySemioticInversion(motif);
    touchpoints.push({
      motif: inv.motif,
      context: `Likeness motif “${motif}” inverted`,
      culturalNode: inv.node,
      inverseRationale: inv.rationale,
      resonance: 0.6,
      visualDirective: inv.directive,
      savableKind: "touchpoint",
      inverseFunction: "semiotic_inversion",
    });
  }

  return uniqueTouchpoints(touchpoints, 8);
}

export function buildInverseRecommendations(input: {
  antiMotifs: string[];
  blindSpots: string[];
  shadowExperiments: string[];
  oppositePalette: string[];
  oppositeSilhouette: string;
  oppositeRegister: string;
  doll?: Doll | null;
}): Array<{
  title: string;
  action: string;
  rationale: string;
  inverseFunction: RipInverseFunction;
  priority: number;
  savableKind: RipSavableInsightKind;
}> {
  const recs: Array<{
    title: string;
    action: string;
    rationale: string;
    inverseFunction: RipInverseFunction;
    priority: number;
    savableKind: RipSavableInsightKind;
  }> = [];

  if (input.antiMotifs[0]) {
    const admission = applyAdmission(input.antiMotifs[0]);
    recs.push({
      title: "Admission plate",
      action: admission.tryInstead,
      rationale: admission.rationale,
      inverseFunction: "admission",
      priority: 5,
      savableKind: "experiment",
    });
  }

  if (input.blindSpots[0]) {
    const shadow = applyShadowProjection(input.blindSpots[0]);
    recs.push({
      title: "Shadow annotation",
      action: shadow.tryInstead,
      rationale: shadow.rationale,
      inverseFunction: "shadow_projection",
      priority: 4,
      savableKind: "blind_spot",
    });
  }

  if (input.oppositePalette[0]) {
    recs.push({
      title: "Inverse palette study",
      action: `Build one spread using only ${input.oppositePalette.slice(0, 3).join(", ")} against your default field`,
      rationale: "Complement operator on bound palette tokens",
      inverseFunction: "complement",
      priority: 4,
      savableKind: "palette_token",
    });
  }

  if (input.oppositeSilhouette) {
    recs.push({
      title: "Silhouette disruption",
      action: `Prototype proportion: ${input.oppositeSilhouette}`,
      rationale: "Proportion disruption from doll silhouette / anti-motif field",
      inverseFunction: "proportion_disruption",
      priority: 3,
      savableKind: "silhouette_cue",
    });
  }

  if (input.oppositeRegister) {
    recs.push({
      title: "Register shift",
      action: `Write one caption in register: ${input.oppositeRegister}`,
      rationale: "Emotional register inverse from doll / blind spot",
      inverseFunction: "register_shift",
      priority: 3,
      savableKind: "register_shift",
    });
  }

  for (const ex of input.shadowExperiments.slice(0, 2)) {
    recs.push({
      title: "Shadow experiment",
      action: ex,
      rationale: "Pulled from dossier next-experiments or doll suggestions",
      inverseFunction: "admission",
      priority: 2,
      savableKind: "experiment",
    });
  }

  if (input.doll?.favoriteContrasts?.[0]) {
    recs.push({
      title: "Contrast inversion",
      action: `Invert your contrast habit (“${input.doll.favoriteContrasts[0]}”) for one plate`,
      rationale: "Flip habitual contrast pairing from doll projection",
      inverseFunction: "contrast",
      priority: 2,
      savableKind: "touchpoint",
    });
  }

  return recs.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

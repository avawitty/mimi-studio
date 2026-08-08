import type {
  Doll,
  EvidenceBasedCreativeDossier,
  LikenessManifest,
  RipFieldAttribution,
  RipInputCoverage,
  RipInversionCard,
  RipSourceKind,
  TailorLogicDraft,
} from "../../types";
import {
  applyAdmission,
  applyContrast,
  applyProportionDisruption,
  applyRegisterShift,
  applySemioticInversion,
  applyShadowProjection,
  applyTypographicMirror,
} from "./inverseFunctions";

function unique(values: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = String(v || "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function refuseFromDraft(draft?: TailorLogicDraft | null): string[] {
  if (!draft) return [];
  const refuse = draft.strategicVectors?.desireVectors?.refuse;
  const exclusions = draft.positioningCore?.exclusionPrinciples;
  return unique([...(refuse || []), ...(exclusions || [])], 8);
}

export function buildRipInputCoverage(input: {
  dossier?: EvidenceBasedCreativeDossier | null;
  likeness?: LikenessManifest | null;
  doll?: Doll | null;
  tailorDraft?: TailorLogicDraft | null;
  inversions: RipInversionCard[];
}): RipInputCoverage {
  const hasLikeness = Boolean(input.likeness);
  const hasDossier = Boolean(input.dossier);
  const hasDoll = Boolean(input.doll);
  const hasTailorDraft = Boolean(refuseFromDraft(input.tailorDraft).length);

  const activeSources: RipSourceKind[] = [];
  if (hasLikeness) activeSources.push("likeness_manifest");
  if (hasDossier) activeSources.push("evidence_dossier");
  if (hasDoll) activeSources.push("doll_projection");
  if (hasTailorDraft) activeSources.push("tailor_draft");
  if (activeSources.length === 0) activeSources.push("synthesized");

  const weights = [hasLikeness, hasDossier, hasDoll, hasTailorDraft];
  const coverageScore =
    weights.filter(Boolean).length === 0
      ? 0.15
      : Math.min(1, 0.2 + weights.filter(Boolean).length * 0.2);

  const evidenceRefCount = input.inversions.reduce(
    (n, inv) => n + (inv.evidenceRefIds?.length || 0),
    0,
  );

  const container =
    input.likeness?.containerName ||
    input.doll?.name ||
    input.dossier?.creativeOperatingSystem?.containerName;

  return {
    hasLikeness,
    hasDossier,
    hasDoll,
    hasTailorDraft,
    coverageScore,
    activeSources,
    dollName: input.doll?.name,
    dollId: input.doll?.id,
    containerName: container,
    inversionCount: input.inversions.length,
    evidenceRefCount,
  };
}

export function enrichInversions(input: {
  dossier?: EvidenceBasedCreativeDossier | null;
  likeness?: LikenessManifest | null;
  doll?: Doll | null;
  tailorDraft?: TailorLogicDraft | null;
  antiMotifs: string[];
  blindSpots: string[];
}): RipInversionCard[] {
  const dossier = input.dossier;
  const draftRefuse = refuseFromDraft(input.tailorDraft);

  const fromDossier = (dossier?.inversions || []).slice(0, 6).map((i) => {
    const semiotic = applySemioticInversion(i.becauseYouTendTo);
    return {
      becauseYouTendTo: i.becauseYouTendTo,
      tryInstead: i.tryInstead,
      evidenceRefIds: i.evidenceRefIds || [],
      sources: ["evidence_dossier"] as RipSourceKind[],
      confidence: (i.evidenceRefIds?.length || 0) > 0 ? 0.9 : 0.75,
      rationale: `Dossier inversion with ${i.evidenceRefIds?.length || 0} evidence ref(s)`,
      inverseFunction: "admission" as const,
      semioticNode: semiotic.node,
    };
  });

  if (fromDossier.length > 0) return fromDossier;

  const synthesized: RipInversionCard[] = [];

  for (const anti of input.antiMotifs.slice(0, 2)) {
    const sources: RipSourceKind[] = [];
    if (input.likeness?.antiMotifs?.some((m) => m.toLowerCase() === anti.toLowerCase())) {
      sources.push("likeness_manifest");
    }
    if (
      dossier?.creativeOperatingSystem?.thingsToAvoid?.some(
        (m) => m.toLowerCase() === anti.toLowerCase(),
      )
    ) {
      sources.push("evidence_dossier");
    }
    if (draftRefuse.some((m) => m.toLowerCase() === anti.toLowerCase())) {
      sources.push("tailor_draft");
    }
    if (sources.length === 0) sources.push("synthesized");

    const contrast = applyContrast(anti);
    const semiotic = applySemioticInversion(anti);
    synthesized.push({
      becauseYouTendTo: `Default toward the familiar pole opposite “${anti}”`,
      tryInstead: contrast.tryInstead,
      evidenceRefIds: [],
      sources,
      confidence: sources.includes("synthesized") ? 0.45 : 0.7,
      rationale: contrast.rationale,
      inverseFunction: "contrast",
      semioticNode: semiotic.node,
    });
  }

  for (const blind of input.blindSpots.slice(0, 2)) {
    const shadow = applyShadowProjection(blind);
    synthesized.push({
      becauseYouTendTo: shadow.becauseYouTendTo,
      tryInstead: shadow.tryInstead,
      evidenceRefIds: [],
      sources: input.doll?.blindSpots?.includes(blind)
        ? ["doll_projection"]
        : ["evidence_dossier"],
      confidence: 0.65,
      rationale: shadow.rationale,
      inverseFunction: "shadow_projection",
    });
  }

  if (input.doll?.silhouette) {
    const prop = applyProportionDisruption(input.doll.silhouette);
    synthesized.push({
      becauseYouTendTo: `Silhouette habit: ${input.doll.silhouette}`,
      tryInstead: `Prototype: ${prop.disrupted}`,
      evidenceRefIds: input.doll.sourceEvidenceIds?.slice(0, 2) || [],
      sources: ["doll_projection"],
      confidence: 0.6,
      rationale: prop.rationale,
      inverseFunction: "proportion_disruption",
    });
  }

  return synthesized.slice(0, 6);
}

export function buildFieldAttributions(input: {
  antiMotifs: string[];
  thingsToAvoid: string[];
  blindSpots: string[];
  oppositePalette: string[];
  oppositeSilhouette: string;
  oppositeRegister: string;
  shadowExperiments: string[];
  dossier?: EvidenceBasedCreativeDossier | null;
  likeness?: LikenessManifest | null;
  doll?: Doll | null;
  tailorDraft?: TailorLogicDraft | null;
}): RipFieldAttribution[] {
  const draftRefuse = refuseFromDraft(input.tailorDraft);
  const attributions: RipFieldAttribution[] = [];

  const antiSources: RipSourceKind[] = [];
  if (input.likeness?.antiMotifs?.length) antiSources.push("likeness_manifest");
  if (input.dossier?.creativeOperatingSystem?.thingsToAvoid?.length) {
    antiSources.push("evidence_dossier");
  }
  if (draftRefuse.length) antiSources.push("tailor_draft");
  if (antiSources.length === 0) antiSources.push("synthesized");

  attributions.push({
    field: "antiMotifs",
    sources: antiSources,
    rationale:
      antiSources.includes("synthesized")
        ? "No explicit refusals — placeholder anti-motifs elected"
        : "Merged likeness antiMotifs, dossier avoidances, and Tailor refuse vectors",
    confidence: antiSources.includes("synthesized") ? 0.3 : 0.85,
    inverseFunction: "contrast",
    contributingValues: input.antiMotifs.slice(0, 4),
  });

  attributions.push({
    field: "oppositePalette",
    sources: input.doll ? ["doll_projection", "likeness_manifest"] : ["synthesized"],
    rationale: input.doll
      ? "Complement operator on doll palette + likeness accent + dossier color logic"
      : "Default high-chroma conflict tokens — bind a doll for sharper complements",
    confidence: input.doll ? 0.8 : 0.35,
    inverseFunction: "complement",
    contributingValues: input.oppositePalette,
  });

  if (input.doll?.silhouette) {
    const prop = applyProportionDisruption(input.doll.silhouette);
    attributions.push({
      field: "oppositeSilhouette",
      sources: ["doll_projection"],
      rationale: prop.rationale,
      confidence: 0.75,
      inverseFunction: "proportion_disruption",
      contributingValues: [input.oppositeSilhouette],
    });
  }

  if (input.doll?.emotionalRegister) {
    const reg = applyRegisterShift(input.doll.emotionalRegister);
    attributions.push({
      field: "oppositeRegister",
      sources: ["doll_projection"],
      rationale: reg.rationale,
      confidence: 0.7,
      inverseFunction: "register_shift",
      contributingValues: [input.oppositeRegister],
    });
  }

  if (input.blindSpots.length) {
    attributions.push({
      field: "blindSpots",
      sources: input.doll?.blindSpots?.length
        ? ["doll_projection", "evidence_dossier"]
        : ["evidence_dossier"],
      rationale: "Doll blind spots + dossier inversion “because you tend to” strings",
      confidence: 0.72,
      inverseFunction: "shadow_projection",
      contributingValues: input.blindSpots.slice(0, 4),
    });
  }

  const typo = input.dossier?.creativeOperatingSystem?.typographyLogic;
  if (typo) {
    const mirror = applyTypographicMirror(typo);
    attributions.push({
      field: "typographic_mirror",
      sources: ["evidence_dossier"],
      rationale: mirror.rationale,
      confidence: 0.65,
      inverseFunction: "typographic_mirror",
      contributingValues: [mirror.mirrored],
    });
  }

  if (input.shadowExperiments.length) {
    attributions.push({
      field: "shadowExperiments",
      sources: input.dossier?.nextExperiments?.length
        ? ["evidence_dossier", "doll_projection"]
        : ["doll_projection"],
      rationale: "Dossier next-experiments + doll suggested experiments + inversion tryInstead",
      confidence: 0.68,
      inverseFunction: "admission",
      contributingValues: input.shadowExperiments.slice(0, 3),
    });
  }

  return attributions;
}

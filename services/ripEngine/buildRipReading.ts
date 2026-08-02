import type {
  Doll,
  EvidenceBasedCreativeDossier,
  LikenessManifest,
  RipReading,
  TailorLogicDraft,
} from "../../types";
import { oppositePaletteFrom } from "./colorOpposite";

export interface RipBuildInput {
  userId: string;
  projectId?: string;
  tasteGraphId?: string;
  dossier?: EvidenceBasedCreativeDossier | null;
  likeness?: LikenessManifest | null;
  doll?: Doll | null;
  tailorDraft?: TailorLogicDraft | null;
}

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

/**
 * Deterministic inverse projection from approved Taste Graph material.
 * No AI call — dossiers / likeness / dolls / draft refusals are enough for v0.
 */
export function buildRipReadingDraft(
  input: RipBuildInput,
): Omit<RipReading, "id" | "createdAt" | "updatedAt"> {
  const dossier = input.dossier;
  const likeness = input.likeness || dossier?.likenessManifest || null;
  const doll = input.doll || null;
  const draftRefuse = refuseFromDraft(input.tailorDraft);

  const antiMotifs = unique(
    [
      ...(likeness?.antiMotifs || []),
      ...(dossier?.creativeOperatingSystem?.thingsToAvoid || []),
      ...draftRefuse,
    ],
    8,
  );

  const thingsToAvoid = unique(
    [
      ...(dossier?.creativeOperatingSystem?.thingsToAvoid || []),
      ...draftRefuse,
      ...(likeness?.antiMotifs || []),
    ],
    8,
  );

  const blindSpots = unique(
    [
      ...(doll?.blindSpots || []),
      ...(dossier?.inversions || []).map((i) => i.becauseYouTendTo),
    ],
    6,
  );

  const inversions = (dossier?.inversions || []).slice(0, 6).map((i) => ({
    becauseYouTendTo: i.becauseYouTendTo,
    tryInstead: i.tryInstead,
    evidenceRefIds: i.evidenceRefIds || [],
  }));

  // If no dossier inversions, synthesize light cards from anti-motifs / blind spots
  if (inversions.length === 0) {
    for (const anti of antiMotifs.slice(0, 3)) {
      inversions.push({
        becauseYouTendTo: `Default toward the familiar pole opposite “${anti}”`,
        tryInstead: `Run a controlled experiment that admits “${anti}” without abandoning your exclusion principles`,
        evidenceRefIds: [],
      });
    }
  }

  const sourcePalette = unique(
    [
      ...(doll?.palette || []),
      likeness?.accentHex || "",
      ...(dossier?.creativeOperatingSystem?.colorLogic
        ? [dossier.creativeOperatingSystem.colorLogic]
        : []),
    ],
    5,
  );
  let oppositePalette = oppositePaletteFrom(
    sourcePalette.filter((p) => !p.includes(" ") || p.startsWith("#")),
    4,
  );
  // If palette was prose-only, still produce named opposites from motifs
  if (oppositePalette.length < 2 && sourcePalette.length) {
    oppositePalette = unique(
      [...oppositePalette, ...oppositePaletteFrom(sourcePalette, 3)],
      4,
    );
  }

  const oppositeSilhouette = doll?.silhouette
    ? `anti-${doll.silhouette}`.slice(0, 80)
    : antiMotifs[0]
      ? `silhouette that admits ${antiMotifs[0]}`
      : "looser, less defended proportion";

  const oppositeRegister = doll?.emotionalRegister
    ? `inverse of “${doll.emotionalRegister}”`
    : blindSpots[0]
      ? `lean into: ${blindSpots[0]}`
      : "productive friction over composure";

  const shadowExperiments = unique(
    [
      ...(dossier?.nextExperiments || []).map((e) => e.title),
      ...(doll?.suggestedExperiments || []),
      ...inversions.slice(0, 2).map((i) => i.tryInstead),
    ],
    5,
  );

  const container =
    likeness?.containerName || doll?.name || dossier?.creativeOperatingSystem?.containerName;
  const title = container ? `Rip · ${container}` : "Rip reading";

  const philosophy =
    likeness?.oneSentencePhilosophy ||
    doll?.creativePhilosophy ||
    dossier?.creativeOperatingSystem?.oneSentencePhilosophy ||
    "";

  const shadowThesis = philosophy
    ? `Inverse thesis: pressure-test “${philosophy}” by temporarily admitting what it excludes.`
    : antiMotifs.length
      ? `Inverse thesis: the graph’s refusals (${antiMotifs.slice(0, 3).join(", ")}) are the active dark mirror — not a second identity.`
      : "Inverse thesis: without explicit refusals yet, this rip is a placeholder dark mirror. Accept a Tailor likeness or generate a Doll to sharpen it.";

  const provenanceNotes = [
    dossier ? "Consumed evidence dossier inversions / avoidances" : "No evidence dossier on profile",
    likeness ? "Consumed likeness antiMotifs" : "No likeness manifest",
    doll ? `Consumed doll projection “${doll.name}” (blind spots / contrasts)` : "No doll bound",
    draftRefuse.length ? "Consumed Tailor draft refuse / exclusion principles" : "",
    "Rip is a Taste Graph projection, not identity or diagnosis.",
  ].filter(Boolean);

  return {
    userId: input.userId,
    projectId: input.projectId,
    tasteGraphId: input.tasteGraphId || doll?.tasteGraphId,
    sourceDollId: doll?.id,
    title,
    shadowThesis,
    antiMotifs: antiMotifs.length ? antiMotifs : ["unspecified refusals — map exclusions in Tailor"],
    thingsToAvoid: thingsToAvoid.length ? thingsToAvoid : ["unexamined defaults"],
    blindSpots: blindSpots.length ? blindSpots : ["no blind spots recorded yet"],
    inversions,
    oppositePalette: unique(oppositePalette, 4),
    oppositeSilhouette,
    oppositeRegister,
    shadowExperiments: shadowExperiments.length
      ? shadowExperiments
      : ["Run one plate that violates a single exclusion on purpose, then restore the law"],
    provenanceNotes,
    visibility: "private",
  };
}

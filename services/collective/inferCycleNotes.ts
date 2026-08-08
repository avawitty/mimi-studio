/**
 * Infer cycle notes from consented signal groups (velocity-based, threshold-gated).
 */

import type {
  CentralTendencyProfile,
  CyclePosition,
} from "../../schemas/collectiveIntelligenceContracts";
import type { IntensityObservation } from "./aggregateCentralTendency";

export type CycleNote = {
  signalId: string;
  position: CyclePosition;
  evidence: string[];
};

const MIN_CYCLE_SAMPLE = 5;

function splitByWindowHalf(
  observations: IntensityObservation[],
  signalTimesByArtifact: Map<string, number>,
  windowStart: number,
  windowEnd: number,
): { early: number; late: number } {
  const mid = windowStart + (windowEnd - windowStart) / 2;
  let early = 0;
  let late = 0;
  for (const obs of observations) {
    const t = signalTimesByArtifact.get(obs.artifactId) ?? windowEnd;
    if (t < mid) early += 1;
    else late += 1;
  }
  if (early + late === 0) return { early: 0, late: 0 };
  return { early, late };
}

function inferPosition(
  early: number,
  late: number,
  total: number,
  profile?: CentralTendencyProfile,
): CyclePosition | null {
  if (total < MIN_CYCLE_SAMPLE) return null;

  const velocity = late / Math.max(early, 1);
  const interpretation = profile?.summation?.interpretation;
  const modality = profile?.summation?.modality;

  if (interpretation === "contested" || modality === "bimodal" || modality === "multimodal") {
    return "Fragmenting";
  }

  if (velocity >= 1.6 && late >= 2) {
    return total >= 8 ? "Coalescing" : "Emergent";
  }

  if (velocity <= 0.55 && early >= 2) {
    return "Fragmenting";
  }

  if (interpretation === "broadly_shared" && velocity >= 0.85 && velocity <= 1.2) {
    return total >= 12 ? "Saturated" : "Recurrent";
  }

  if (velocity >= 0.85 && velocity <= 1.2) {
    return "Recurrent";
  }

  if (late > early + 1) {
    return "Emergent";
  }

  return "Latent";
}

export function inferCycleNotesFromGroups(input: {
  groups: Array<{
    signalId: string;
    label: string;
    observations: IntensityObservation[];
    profile?: CentralTendencyProfile;
  }>;
  windowStart: number;
  windowEnd: number;
  signalTimesByArtifact: Map<string, number>;
}): CycleNote[] {
  const out: CycleNote[] = [];

  for (const group of input.groups) {
    const { early, late } = splitByWindowHalf(
      group.observations,
      input.signalTimesByArtifact,
      input.windowStart,
      input.windowEnd,
    );
    const total = group.observations.length;
    const position = inferPosition(early, late, total, group.profile);
    if (!position) continue;

    const velocity = late / Math.max(early, 1);
    out.push({
      signalId: group.signalId,
      position,
      evidence: [
        `Late-window share ${late}/${total} vs early ${early} (velocity ${velocity.toFixed(2)}).`,
        `Cycle label requires ≥${MIN_CYCLE_SAMPLE} consented signals in-window.`,
      ],
    });
  }

  return out;
}

export { MIN_CYCLE_SAMPLE };

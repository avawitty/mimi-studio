/**
 * Taste trajectories v2 — momentum, acceleration, phase classification.
 */
import type { TasteTrajectoryV2 } from "../../schemas/tasteIntelligenceContracts.js";
import type { NormalizedTasteEvent, TasteModelSnapshot } from "../tasteModel/contracts.js";
import {
  MIN_DECLINE_WEEKS,
  MIN_TRAJECTORY_EVIDENCE,
} from "./constants.js";

const MS_PER_DAY = 86_400_000;
const RECENT_DAYS = 21;
const HISTORICAL_DAYS = 120;

function eventMass(events: NormalizedTasteEvent[]): number {
  return events.reduce((s, e) => s + e.strength * Math.abs(e.polarity), 0);
}

export function computeTrajectoryV2(
  featureId: string,
  events: NormalizedTasteEvent[],
  snapshot: TasteModelSnapshot,
  now = Date.now(),
): TasteTrajectoryV2 {
  const relevant = events.filter(
    (e) =>
      e.patternClusterIds.includes(featureId.replace("pattern_cluster:", "")) ||
      e.creativeLawIds.includes(featureId.replace("creative_law:", "")) ||
      e.evidenceNodeIds.length > 0,
  );

  const recentCutoff = now - RECENT_DAYS * MS_PER_DAY;
  const historicalCutoff = now - HISTORICAL_DAYS * MS_PER_DAY;

  const recent = relevant.filter((e) => e.occurredAt >= recentCutoff);
  const historical = relevant.filter(
    (e) => e.occurredAt >= historicalCutoff && e.occurredAt < recentCutoff,
  );

  const fw = snapshot.featureWeights.find((f) => f.featureId === featureId);
  const recentStrength = fw?.signedWeight ?? eventMass(recent) / Math.max(1, recent.length);
  const historicalStrength =
    historical.length > 0
      ? eventMass(historical) / historical.length
      : recentStrength * 0.85;

  const momentum = recentStrength - historicalStrength;
  const midCutoff = now - (RECENT_DAYS / 2) * MS_PER_DAY;
  const earlyRecent = recent.filter((e) => e.occurredAt < midCutoff);
  const lateRecent = recent.filter((e) => e.occurredAt >= midCutoff);
  const earlyMass = eventMass(earlyRecent) / Math.max(1, earlyRecent.length);
  const lateMass = eventMass(lateRecent) / Math.max(1, lateRecent.length);
  const acceleration = lateMass - earlyMass;

  const evidenceCount = relevant.length;
  const sourceIds = [
    ...new Set(relevant.flatMap((e) => e.evidenceNodeIds)),
  ].slice(0, 20);

  let phase: TasteTrajectoryV2["phase"] = "uncertain";
  if (evidenceCount < MIN_TRAJECTORY_EVIDENCE) {
    phase = "uncertain";
  } else if (recentStrength > 0.5 && momentum > 0.15 && acceleration > 0.05) {
    phase = "current_fixation";
  } else if (momentum > 0.12 && historicalStrength < 0.2) {
    phase = "emerging";
  } else if (momentum > 0.08) {
    phase = "strengthening";
  } else if (Math.abs(momentum) < 0.05 && recentStrength > 0.25) {
    phase = "stable";
  } else if (
    momentum < -0.08 &&
    evidenceCount >= MIN_TRAJECTORY_EVIDENCE &&
    recent.length < historical.length / MIN_DECLINE_WEEKS
  ) {
    phase = "declining";
  } else if (recent.length === 0 && historical.length >= MIN_TRAJECTORY_EVIDENCE) {
    phase = "dormant";
  } else if (recent.length > 0 && historical.length === 0) {
    phase = "returning";
  }

  const confidence = Math.min(1, evidenceCount / (MIN_TRAJECTORY_EVIDENCE * 2));

  return {
    featureId,
    historicalStrength,
    recentStrength,
    momentum,
    acceleration,
    phase,
    evidenceCount,
    confidence,
    sourceIds,
  };
}

export function computeAllTrajectoriesV2(
  snapshot: TasteModelSnapshot,
  events: NormalizedTasteEvent[],
  now = Date.now(),
): TasteTrajectoryV2[] {
  return snapshot.featureWeights.map((f) =>
    computeTrajectoryV2(f.featureId, events, snapshot, now),
  );
}

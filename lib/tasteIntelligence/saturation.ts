/**
 * Saturation modeling — exposure distinct from preference.
 */
import type {
  TasteExposureEvent,
  TasteSaturationState,
} from "../../schemas/tasteIntelligenceContracts.js";
import {
  EXPOSURE_SOURCE_WEIGHTS,
  SATURATION_HALF_LIFE_DAYS,
  SATURATION_RECENT_WINDOW_DAYS,
} from "./constants.js";

const MS_PER_DAY = 86_400_000;

function decayWeight(ageDays: number): number {
  return Math.exp(-Math.LN2 * (ageDays / SATURATION_HALF_LIFE_DAYS));
}

export function computeSaturationState(
  featureId: string,
  events: TasteExposureEvent[],
  now = Date.now(),
): TasteSaturationState {
  const relevant = events.filter((e) => e.featureIds.includes(featureId));
  let globalExposure = 0;
  let recentExposure = 0;
  let recentUse = 0;

  for (const event of relevant) {
    const weight = EXPOSURE_SOURCE_WEIGHTS[event.sourceType] ?? 0.2;
    const ageDays = Math.max(0, (now - event.occurredAt) / MS_PER_DAY);
    const decayed = weight * decayWeight(ageDays);
    globalExposure += decayed;
    if (ageDays <= SATURATION_RECENT_WINDOW_DAYS) {
      recentExposure += decayed;
      if (event.sourceType === "reused" || event.sourceType === "published") {
        recentUse += decayed;
      }
    }
  }

  let state: TasteSaturationState["state"] = "fresh";
  let recommendedAction: TasteSaturationState["recommendedAction"] = "deepen";

  if (globalExposure < 0.5) {
    state = "fresh";
    recommendedAction = "deepen";
  } else if (recentExposure < 1.2) {
    state = "active";
    recommendedAction = "vary";
  } else if (recentExposure >= 2.5 && recentUse < 0.8) {
    state = "saturated";
    recommendedAction = "pause";
  } else if (globalExposure > 1.5 && recentExposure < 0.4) {
    state = "resting";
    recommendedAction = "reintroduce";
  } else if (recentUse > 1.0 && recentExposure < 1.0) {
    state = "returning";
    recommendedAction = "reintroduce";
  } else {
    state = "active";
    recommendedAction = "vary";
  }

  const confidence = Math.min(1, relevant.length / 8);

  return {
    featureId,
    globalExposure,
    recentExposure,
    recentUse,
    state,
    recommendedAction,
    confidence,
    lastUpdated: now,
  };
}

export function computeAllSaturationStates(
  events: TasteExposureEvent[],
  featureIds: string[],
  now = Date.now(),
): TasteSaturationState[] {
  return featureIds.map((featureId) =>
    computeSaturationState(featureId, events, now),
  );
}

export function saturationPenalty(state: TasteSaturationState): number {
  if (state.state === "saturated") return 0.25 * state.confidence;
  if (state.state === "resting") return 0.05;
  return 0;
}

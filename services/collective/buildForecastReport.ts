/**
 * Phase 8 — compose ForecastReport from Mean Median Mode baselines + external research.
 * Never invents costume trends when evidence is missing.
 */

import {
  forecastReportSchema,
  type CentralTendencyProfile,
  type ForecastReport,
  type MeanMedianModeReport,
} from "../../schemas/collectiveIntelligenceContracts";
import { MMM_METHODOLOGY_VERSION } from "./methodology";
import type { ResearchSynthesisResponse } from "../researchService";

export type BuildForecastReportInput = {
  observed: MeanMedianModeReport;
  external?: ResearchSynthesisResponse | null;
  feedEntryCount?: number;
  runId?: string;
  now?: number;
};

function velocityFromInterpretation(
  interpretation: CentralTendencyProfile["summation"]["interpretation"],
): "Surging" | "Rising" | "Decaying" | "Unknown" {
  switch (interpretation) {
    case "spike_driven":
      return "Surging";
    case "broadly_shared":
      return "Rising";
    case "contested":
      return "Rising";
    case "insufficient_evidence":
      return "Unknown";
    default: {
      const _exhaustive: never = interpretation;
      return _exhaustive;
    }
  }
}

function trajectoriesFromObserved(
  profiles: CentralTendencyProfile[],
  external: ResearchSynthesisResponse | null | undefined,
): ForecastReport["trajectories"] {
  const fromObserved = profiles
    .filter((p) => p.summation.interpretation !== "insufficient_evidence")
    .slice(0, 4)
    .map((profile, index) => ({
      id: `traj-observed-${index}-${profile.signalId}`,
      label: profile.mode.label,
      hypothesis: `Observed ${profile.summation.interpretation.replace(/_/g, " ")} atmosphere around “${profile.mode.label}” (mean ${profile.mean.toFixed(2)}, median ${profile.median.toFixed(2)}).`,
      velocityHint: velocityFromInterpretation(profile.summation.interpretation),
      basedOnSignalIds: [profile.signalId],
      citations: [] as { title: string; url?: string }[],
    }));

  const fromExternal =
    external && external.trends.length > 0
      ? external.trends.slice(0, 4).map((trend, index) => ({
          id: `traj-external-${index}`,
          label: trend.format,
          hypothesis: trend.analysis,
          velocityHint: trend.velocity,
          basedOnSignalIds: [] as string[],
          citations: (trend.sources || [])
            .filter((s) => typeof s.url === "string" && s.url.startsWith("http"))
            .map((s) => ({ title: s.title || s.url, url: s.url })),
        }))
      : [];

  return [...fromObserved, ...fromExternal];
}

function contradictionsFromObserved(profiles: CentralTendencyProfile[]): string[] {
  return profiles
    .filter(
      (p) =>
        p.summation.interpretation === "contested" ||
        p.summation.interpretation === "spike_driven" ||
        p.summation.modality === "multimodal" ||
        p.summation.modality === "bimodal",
    )
    .map((p) => {
      if (p.summation.interpretation === "spike_driven") {
        return `${p.mode.label}: mean above median — spike-driven, not broadly shared.`;
      }
      if (p.summation.modality === "multimodal" || p.summation.modality === "bimodal") {
        return `${p.mode.label}: ${p.summation.modality} distribution — no single invented mood.`;
      }
      return `${p.mode.label}: contested central tendency.`;
    });
}

export function buildForecastReport(input: BuildForecastReportInput): ForecastReport {
  const now = input.now ?? Date.now();
  const observed = input.observed;
  const external = input.external ?? null;
  const feedEntryCount = input.feedEntryCount ?? 0;
  const isDemo = observed.demonstration === true || observed.status === "demonstration";
  const hasProfiles = observed.profiles.length > 0;
  const hasExternal =
    !!external &&
    external.provider !== "Unavailable" &&
    external.trends.length > 0 &&
    external.simulated !== true;

  let status: ForecastReport["status"] = "empty";
  if (isDemo && hasProfiles) status = "demonstration";
  else if (hasProfiles && hasExternal) status = "success";
  else if (hasProfiles || hasExternal || feedEntryCount > 0) status = "partial";
  else if (external?.simulated) status = "speculative";
  else status = observed.status === "failed" ? "failed" : "empty";

  const whatMayBeMissing: string[] = [];
  if (!hasProfiles) {
    whatMayBeMissing.push(
      "Observed Mean Median Mode profiles — stage consented work on The Proscenium.",
    );
  }
  if (!hasExternal) {
    whatMayBeMissing.push(
      "Live research provider evidence (You.com / AI Gateway) for forward projection.",
    );
  }
  if (feedEntryCount === 0) {
    whatMayBeMissing.push("Approved RSS freshness spine entries (Phase 7).");
  }
  if (isDemo) {
    whatMayBeMissing.push(
      "Live consented collective corpus — current Observatory baselines are demonstration specimens.",
    );
  }
  if (whatMayBeMissing.length === 0) {
    whatMayBeMissing.push("Source-type diversity beyond the current evidence window.");
  }

  return forecastReportSchema.parse({
    runId: input.runId ?? `forecast-${now}`,
    status,
    evidenceWindowStart: observed.windowStart,
    evidenceWindowEnd: observed.windowEnd,
    observed: observed.profiles,
    external: external
      ? {
          synthesis: external.synthesis,
          provider: external.provider,
          trendCount: external.trends.length,
          simulated: external.simulated === true,
        }
      : undefined,
    feedEntryCount,
    trajectories: trajectoriesFromObserved(observed.profiles, external),
    contradictions: contradictionsFromObserved(observed.profiles),
    methodologyVersion: observed.methodologyVersion || MMM_METHODOLOGY_VERSION,
    whatMayBeMissing,
    lastUpdated: now,
    demonstration: isDemo,
  });
}

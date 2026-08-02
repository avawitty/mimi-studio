/**
 * Collective Mean Median Mode methodology constants.
 * Tunable thresholds — not costume confidence.
 */

export const MMM_METHODOLOGY_VERSION = "mmm-methodology-v1" as const;
export const MMM_CONSENT_DISCLOSURE_VERSION = "mmm-consent-v1" as const;
export const MMM_EXTRACTOR_VERSION = "mmm-extract-v1" as const;

/** Mean must exceed median by this relative amount to call spike_driven. */
export const SPIKE_MEAN_MEDIAN_RATIO = 1.35;

/** Share gap between top two labels below this → multimodal / contested. */
export const MODE_DOMINANCE_SHARE_GAP = 0.12;

export const CONFIDENCE_THRESHOLDS = {
  insufficientMaxArtifacts: 2,
  tentativeMaxArtifacts: 9,
  moderateMaxArtifacts: 29,
  strongMinSourceTypes: 2,
} as const;

export type ContributorBand = "1–2" | "3–9" | "10–49" | "50+" | "0";

export function contributorBand(uniqueContributors: number): ContributorBand {
  if (uniqueContributors <= 0) return "0";
  if (uniqueContributors <= 2) return "1–2";
  if (uniqueContributors <= 9) return "3–9";
  if (uniqueContributors <= 49) return "10–49";
  return "50+";
}

export function confidenceLabelFor(input: {
  uniqueArtifactCount: number;
  sourceTypeDiversity: number;
}): "insufficient" | "tentative" | "moderate" | "strong" {
  const { uniqueArtifactCount, sourceTypeDiversity } = input;
  if (uniqueArtifactCount <= CONFIDENCE_THRESHOLDS.insufficientMaxArtifacts) {
    return "insufficient";
  }
  if (uniqueArtifactCount <= CONFIDENCE_THRESHOLDS.tentativeMaxArtifacts) {
    return "tentative";
  }
  if (
    uniqueArtifactCount >= 30 &&
    sourceTypeDiversity >= CONFIDENCE_THRESHOLDS.strongMinSourceTypes
  ) {
    return "strong";
  }
  if (uniqueArtifactCount <= CONFIDENCE_THRESHOLDS.moderateMaxArtifacts) {
    return "moderate";
  }
  return "moderate";
}

export const FROZEN_REPORT_POLICY =
  "Unpublish stops future contribution. Frozen historical Mean Median Mode reports may retain anonymized aggregates already computed for that window.";

export const METHODOLOGY_LIMITATIONS_DEFAULT = [
  "Mean Median Mode reads consented public structure only — never private Studio, Tailor, or personal Scry.",
  "Exact private wording and excerpts are excluded from the collective readout.",
  "Low-volume signals are suppressed rather than shown with exact contributor counts.",
  FROZEN_REPORT_POLICY,
] as const;

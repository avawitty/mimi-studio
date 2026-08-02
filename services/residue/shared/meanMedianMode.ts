/**
 * Mean / Median / Mode — shared analytical helpers.
 *
 * Literal path: real statistics over numeric/coded values.
 * Interpretive path: editorial-analytical metaphor over residue signals.
 * Never blur the two — analysisKind must be explicit.
 */

import { buildConfidenceSummary, clamp01, literalMean, literalMedian, literalMode } from "../scoring";
import { flagsForClaim } from "../uncertainty";
import {
  meanMedianModeResultSchema,
  type MeanMedianModeResult,
  type ResidueClaim,
} from "../validation";

export interface ResidueSignal {
  signalId: string;
  label: string;
  text: string;
  weight: number; // 0–1 confidence / relevance
  kind:
    | "claim"
    | "code"
    | "lineage"
    | "neighborhood"
    | "response"
    | "association"
    | "numeric";
  status?: ResidueClaim["status"];
  claim?: ResidueClaim;
}

export function buildLiteralMeanMedianMode(input: {
  subject: string;
  values: number[];
  signalIds?: string[];
  valueLabels?: string[];
}): MeanMedianModeResult {
  const values = input.values.filter((v) => Number.isFinite(v));
  const mean = literalMean(values);
  const median = literalMedian(values);
  const mode = literalMode(values.map((v) => Number(v.toFixed(4))));
  const ids = input.signalIds ?? values.map((_, i) => `num_${i}`);

  const spreadLevel = spreadFromValues(values);
  const outliers = outlierClaimsFromValues(values, ids, input.valueLabels);

  return meanMedianModeResultSchema.parse({
    subject: input.subject,
    analysisKind: "literal-statistical",
    mean: {
      synthesis: `Literal mean of ${values.length} numeric signal(s) is ${formatNum(mean)}.`,
      contributingSignalIds: ids,
      caveats: [
        "Literal statistical mean over provided numerics — not an interpretive cultural average.",
      ],
      numericValue: mean ?? undefined,
    },
    median: {
      centralPosition: `Literal median is ${formatNum(median)}.`,
      excludedOrDownweightedOutliers: outliers.map((o) => o.statement),
      contributingSignalIds: ids,
      numericValue: median ?? undefined,
    },
    mode: {
      dominantPattern: mode
        ? `Most frequent rounded value: ${String(mode.value)}`
        : "No mode (empty set).",
      frequency: mode?.frequency,
      contributingSignalIds: ids.filter((_, i) =>
        mode ? Number(values[i]?.toFixed(4)) === Number(mode.value) : false,
      ),
    },
    outliers,
    counterMode: [],
    spread: {
      level: spreadLevel.level,
      description: spreadLevel.description,
    },
    confidence: buildConfidenceSummary({
      evidence: [],
      sources: [],
      primaryClaims: [],
      counterClaims: [],
      summary: `Literal MMM over ${values.length} values. Confidence reflects sample size only — not diagnostic likelihood.`,
    }),
  });
}

export function buildInterpretiveMeanMedianMode(input: {
  subject: string;
  signals: ResidueSignal[];
  counterSignals?: ResidueSignal[];
}): MeanMedianModeResult {
  const signals = [...input.signals].sort((a, b) => b.weight - a.weight);
  const counter = input.counterSignals ?? [];

  if (signals.length === 0) {
    return meanMedianModeResultSchema.parse({
      subject: input.subject,
      analysisKind: "interpretive-metaphor",
      mean: {
        synthesis: "Insufficient coded signals for an interpretive mean.",
        contributingSignalIds: [],
        caveats: [
          "Interpretive Mean/Median/Mode requires coded residue signals.",
          "This is an editorial-analytical metaphor, not a literal statistic.",
        ],
      },
      median: {
        centralPosition: "No central interpretive position available.",
        excludedOrDownweightedOutliers: [],
        contributingSignalIds: [],
      },
      mode: {
        dominantPattern: "No dominant pattern.",
        contributingSignalIds: [],
      },
      outliers: [],
      counterMode: counter.slice(0, 3).map((s) => signalToClaim(s, "model-proposed")),
      spread: {
        level: "high",
        description: "Empty signal set — treat as high uncertainty.",
      },
      confidence: buildConfidenceSummary({
        evidence: [],
        sources: [],
        primaryClaims: [],
        counterClaims: [],
        summary:
          "Interpretive MMM with no signals. Not a diagnostic likelihood; not a literal statistic.",
      }),
    });
  }

  // MEAN: confidence-weighted blend of top signals
  const weightSum = signals.reduce((s, x) => s + Math.max(x.weight, 0.05), 0);
  const blended = signals
    .slice(0, 5)
    .map((s) => s.text)
    .join(" · ");
  const meanIds = signals.slice(0, 5).map((s) => s.signalId);

  // MEDIAN: drop extreme low/high weight tails, take middle remaining
  const sortedByWeight = [...signals].sort((a, b) => a.weight - b.weight);
  const drop = sortedByWeight.length >= 5 ? 1 : 0;
  const trimmed =
    drop > 0 ? sortedByWeight.slice(drop, sortedByWeight.length - drop) : sortedByWeight;
  const medianSignal = trimmed[Math.floor(trimmed.length / 2)] ?? signals[0];
  const excluded = [
    ...sortedByWeight.slice(0, drop),
    ...sortedByWeight.slice(sortedByWeight.length - drop),
  ].map((s) => s.label);

  // MODE: most frequent label token / status / kind
  const modeKeys = signals.map((s) => s.label.trim().toLowerCase());
  const mode = literalMode(modeKeys);
  const modeSignals = mode
    ? signals.filter((s) => s.label.trim().toLowerCase() === String(mode.value))
    : [];

  // OUTLIERS: very low weight, model-proposed, or far from median weight
  const medianWeight = medianSignal.weight;
  const outlierSignals = signals.filter(
    (s) =>
      s.status === "model-proposed" ||
      s.weight <= 0.25 ||
      Math.abs(s.weight - medianWeight) >= 0.45,
  );

  const weights = signals.map((s) => s.weight);
  const spreadLevel = spreadFromValues(weights);

  const primaryClaims = signals.slice(0, 3).map((s) => signalToClaim(s, s.status || "interpretive"));
  const counterClaims = (counter.length ? counter : outlierSignals.filter((s) => s.status === "model-proposed"))
    .slice(0, 3)
    .map((s) => signalToClaim(s, s.status || "model-proposed"));

  return meanMedianModeResultSchema.parse({
    subject: input.subject,
    analysisKind: "interpretive-metaphor",
    mean: {
      synthesis: `Interpretive mean (weighted blend): ${blended}`,
      contributingSignalIds: meanIds,
      caveats: [
        "Editorial-analytical metaphor derived from coded residue signals.",
        "Not a literal arithmetic mean of culture or emotion.",
        `Blended using normalized weights (sum=${weightSum.toFixed(2)}).`,
      ],
    },
    median: {
      centralPosition: `Interpretive median: ${medianSignal.text}`,
      excludedOrDownweightedOutliers: excluded,
      contributingSignalIds: [medianSignal.signalId],
    },
    mode: {
      dominantPattern: mode
        ? `Most recurring pattern label: ${modeSignals[0]?.label || String(mode.value)}`
        : signals[0].label,
      frequency: mode?.frequency,
      contributingSignalIds: modeSignals.map((s) => s.signalId),
    },
    outliers: outlierSignals.slice(0, 5).map((s) =>
      signalToClaim(s, s.status || "model-proposed"),
    ),
    counterMode: counterClaims,
    spread: {
      level: spreadLevel.level,
      description: `${spreadLevel.description} Interpretive disagreement estimated from signal-weight dispersion.`,
    },
    confidence: buildConfidenceSummary({
      evidence: [],
      sources: [],
      primaryClaims,
      counterClaims,
      summary: [
        `Interpretive MMM over ${signals.length} coded signal(s).`,
        "This is not a literal statistic and not a diagnostic likelihood.",
      ].join(" "),
    }),
  });
}

function signalToClaim(
  signal: ResidueSignal,
  status: ResidueClaim["status"],
): ResidueClaim {
  if (signal.claim) return signal.claim;
  return {
    claimId: `mmm_${signal.signalId}`,
    statement: signal.text,
    status,
    evidenceIds: [],
    counterEvidenceIds: [],
    confidence: clamp01(signal.weight),
    uncertaintyFlags: flagsForClaim({ status, evidence: [] }),
    evidenceLayers: status === "model-proposed" ? ["D"] : [],
  };
}

function spreadFromValues(values: number[]): {
  level: "low" | "medium" | "high";
  description: string;
} {
  if (values.length < 2) {
    return {
      level: "high",
      description: "Too few values to estimate spread reliably.",
    };
  }
  const mean = literalMean(values) ?? 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  if (sd < 0.12) {
    return { level: "low", description: `Low dispersion (sd≈${sd.toFixed(3)}).` };
  }
  if (sd < 0.28) {
    return { level: "medium", description: `Medium dispersion (sd≈${sd.toFixed(3)}).` };
  }
  return { level: "high", description: `High dispersion (sd≈${sd.toFixed(3)}).` };
}

function outlierClaimsFromValues(
  values: number[],
  ids: string[],
  labels?: string[],
): ResidueClaim[] {
  if (values.length < 4) return [];
  const median = literalMedian(values) ?? 0;
  const mad =
    literalMedian(values.map((v) => Math.abs(v - median))) ?? 0;
  const threshold = Math.max(0.35, 3 * (mad || 0.1));
  const out: ResidueClaim[] = [];
  values.forEach((v, i) => {
    if (Math.abs(v - median) >= threshold) {
      out.push({
        claimId: `mmm_out_${ids[i] || i}`,
        statement: `Numeric outlier ${labels?.[i] || ids[i] || i}: ${v}`,
        status: "observed",
        evidenceIds: [],
        counterEvidenceIds: [],
        confidence: 0.7,
        uncertaintyFlags: [],
        evidenceLayers: [],
      });
    }
  });
  return out;
}

function formatNum(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "n/a";
  return n.toFixed(4).replace(/\.?0+$/, "");
}

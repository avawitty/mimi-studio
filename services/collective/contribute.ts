/**
 * Consent → extract → receipt (offline vertical slice).
 */

import type { ContributionReceipt, CollectiveSignal } from "./types";
import {
  buildContributionReceipt,
  mayContributeToMeanMedianMode,
} from "./consent";
import {
  extractSignalsFromPublicZine,
  type ExtractablePublicZine,
} from "./extractSignals";

export function contributePublicZineToMeanMedianMode(
  zine: ExtractablePublicZine & {
    disclosedAt?: number;
    disclosureVersion?: string;
  },
): { signals: CollectiveSignal[]; receipt: ContributionReceipt | null } {
  if (
    !mayContributeToMeanMedianMode({
      disclosedAt: zine.disclosedAt,
      disclosureVersion: zine.disclosureVersion,
      contributeToMeanMedianMode: zine.contributeToMeanMedianMode,
      acknowledgedDisclosure: true,
    })
  ) {
    return {
      signals: [],
      receipt: buildContributionReceipt({
        artifactId: zine.id,
        contributedSignalIds: [],
        excludedSignals: [zine.id],
        exclusionReasons: ["no_consent_or_opt_out"],
      }),
    };
  }

  const signals = extractSignalsFromPublicZine(zine);
  return {
    signals,
    receipt: buildContributionReceipt({
      artifactId: zine.id,
      contributedSignalIds: signals.map((s) => s.id),
      aggregationWindows: ["rolling-7d"],
    }),
  };
}

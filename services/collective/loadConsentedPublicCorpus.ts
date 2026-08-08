/**
 * Load public zines eligible for collective signal extraction (server-side).
 */

import type { CollectiveSignal } from "../../schemas/collectiveIntelligenceContracts";
import type { ZineMetadata } from "../../types";
import { contributePublicZineToMeanMedianMode } from "./contribute";
import type { ExtractablePublicZine } from "./extractSignals";

export type ConsentedCorpusSummary = {
  zinesScanned: number;
  contributingZines: number;
  signals: CollectiveSignal[];
};

export function zineToExtractable(zine: ZineMetadata): ExtractablePublicZine {
  return {
    id: zine.id,
    title: zine.title,
    tags: zine.tags,
    theme: zine.theme,
    tone: zine.tone,
    contributeToMeanMedianMode: zine.contributeToMeanMedianMode,
    isPublic: zine.isPublic,
    disclosedAt: zine.disclosedAt,
    disclosureVersion: zine.disclosureVersion,
    mmmContributionStatus: zine.mmmContributionStatus,
    userId: zine.userId,
  };
}

export function extractSignalsFromCorpus(zines: ZineMetadata[]): ConsentedCorpusSummary {
  const signals: CollectiveSignal[] = [];
  let contributingZines = 0;

  for (const zine of zines) {
    const { signals: batch } = contributePublicZineToMeanMedianMode(zineToExtractable(zine));
    if (batch.length > 0) {
      contributingZines += 1;
      signals.push(...batch);
    }
  }

  return {
    zinesScanned: zines.length,
    contributingZines,
    signals,
  };
}

/**
 * Proscenium → Mean Median Mode consent helpers (pure).
 */

import {
  contributionReceiptSchema,
  prosceniumPublishConsentSchema,
  type ContributionReceipt,
  type ProsceniumPublishConsent,
} from "../../schemas/collectiveIntelligenceContracts";
import { MMM_CONSENT_DISCLOSURE_VERSION } from "./methodology";

export { MMM_CONSENT_DISCLOSURE_VERSION };

export const MMM_PUBLISH_DISCLOSURE_TITLE = "Stage on The Proscenium";

export const MMM_PUBLISH_DISCLOSURE_BODY = [
  "This places your work in public view.",
  "Eligible structure from this artifact — themes, motifs, inquiry types, and form — may contribute anonymized signals to Mean Median Mode, Mimi’s collective statistical reading.",
  "Your private studio, Tailor memory, and personal Scry remain excluded.",
  "Exact wording and private excerpts are not shown in the collective readout.",
].join(" ");

export const MMM_PUBLISH_DISCLOSURE_SECONDARY =
  "You can unpublish later to stop future contribution. Frozen historical reports may retain anonymized aggregates already computed.";

export function buildPublishConsent(input: {
  artifactId: string;
  contributeToMeanMedianMode: boolean;
  disclosedAt?: number;
  disclosureVersion?: string;
}): ProsceniumPublishConsent {
  return prosceniumPublishConsentSchema.parse({
    artifactId: input.artifactId,
    stagedPublicly: true as const,
    contributeToMeanMedianMode: input.contributeToMeanMedianMode,
    disclosedAt: input.disclosedAt ?? Date.now(),
    disclosureVersion: input.disclosureVersion ?? MMM_CONSENT_DISCLOSURE_VERSION,
  });
}

/**
 * No disclosure acknowledgment → must not contribute.
 * Opt-out after disclosure → stage without aggregating.
 */
export function mayContributeToMeanMedianMode(consent: {
  disclosedAt?: number | null;
  disclosureVersion?: string | null;
  contributeToMeanMedianMode?: boolean | null;
  acknowledgedDisclosure?: boolean;
} | null | undefined): boolean {
  if (!consent) return false;
  if (consent.acknowledgedDisclosure === false) return false;
  if (!consent.disclosedAt || !consent.disclosureVersion) return false;
  return consent.contributeToMeanMedianMode === true;
}

export function buildContributionReceipt(input: {
  artifactId: string;
  contributedSignalIds?: string[];
  excludedSignals?: string[];
  exclusionReasons?: string[];
  aggregationWindows?: string[];
  createdAt?: number;
}): ContributionReceipt {
  return contributionReceiptSchema.parse({
    artifactId: input.artifactId,
    contributedSignalIds: input.contributedSignalIds ?? [],
    excludedSignals: input.excludedSignals ?? [],
    exclusionReasons: input.exclusionReasons ?? [],
    aggregationWindows: input.aggregationWindows ?? [],
    createdAt: input.createdAt ?? Date.now(),
  });
}

/** Firestore field patch when staging with consent. */
export function consentFieldsForZine(consent: ProsceniumPublishConsent): {
  isPublic: true;
  contributeToMeanMedianMode: boolean;
  disclosedAt: number;
  disclosureVersion: string;
  publishedAt: number;
  timestamp: number;
} {
  const now = Date.now();
  return {
    isPublic: true,
    contributeToMeanMedianMode: consent.contributeToMeanMedianMode,
    disclosedAt: consent.disclosedAt,
    disclosureVersion: consent.disclosureVersion,
    publishedAt: now,
    timestamp: now,
  };
}

/** Firestore field patch when unpublishing — stop future contribution. */
export function unpublishFieldsForZine(): {
  isPublic: false;
  contributeToMeanMedianMode: false;
} {
  return {
    isPublic: false,
    contributeToMeanMedianMode: false,
  };
}

export function publishToastMessage(input: {
  contribute: boolean;
  handle?: string | null;
}): string {
  if (!input.contribute) {
    return "Staged on The Proscenium · not contributing to Mean Median Mode.";
  }
  if (input.handle) {
    return `Staged on The Proscenium · contributing to Mean Median Mode · Keep Tabs at /u/${input.handle}/feed.xml`;
  }
  return "Staged on The Proscenium · contributing to Mean Median Mode.";
}

/**
 * Consent-aware Proscenium transmission payloads.
 * All public_transmissions writers should route through these helpers.
 */

import {
  buildPublishConsent,
  consentFieldsForZine,
  mayContributeToMeanMedianMode,
  publishToastMessage,
  type MmmContributionStatus,
} from "./consent";
import type { ProsceniumPublishConsent } from "../../schemas/collectiveIntelligenceContracts";

export type ProsceniumTransmissionBase = {
  userId: string;
  userHandle: string;
  content: string;
  imageUrl?: string;
  type: string;
  likes?: number;
  zineData?: unknown;
  artifactId?: string;
};

export type ConsentAwareTransmission = ProsceniumTransmissionBase & {
  publicProjectionVersion: 1;
  timestamp: number;
  artifactId: string;
  contributeToMeanMedianMode: boolean;
  disclosedAt: number;
  disclosureVersion: string;
  mmmContributionStatus: MmmContributionStatus;
  stagedPublicly: true;
};

export function buildConsentAwareTransmission(
  base: ProsceniumTransmissionBase,
  contributeToMeanMedianMode: boolean,
): { consent: ProsceniumPublishConsent; transmission: ConsentAwareTransmission } {
  const artifactId =
    base.artifactId ||
    (typeof (base.zineData as { id?: string } | null)?.id === "string"
      ? (base.zineData as { id: string }).id
      : `broadcast_${base.userId}_${Date.now()}`);

  const consent = buildPublishConsent({
    artifactId,
    contributeToMeanMedianMode,
  });
  const fields = consentFieldsForZine(consent);

  return {
    consent,
    transmission: {
      ...base,
      likes: base.likes ?? 0,
      imageUrl: base.imageUrl || "",
      artifactId,
      publicProjectionVersion: 1,
      timestamp: fields.timestamp,
      contributeToMeanMedianMode: fields.contributeToMeanMedianMode,
      disclosedAt: fields.disclosedAt,
      disclosureVersion: fields.disclosureVersion,
      mmmContributionStatus: fields.mmmContributionStatus,
      stagedPublicly: true,
    },
  };
}

/** Refuse silent public staging — transmissions without disclosure fields are ineligible. */
export function transmissionMayContribute(doc: {
  disclosedAt?: number | null;
  disclosureVersion?: string | null;
  contributeToMeanMedianMode?: boolean | null;
  mmmContributionStatus?: string | null;
} | null | undefined): boolean {
  return mayContributeToMeanMedianMode(doc);
}

export { publishToastMessage };

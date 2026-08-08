/**
 * Minimal rule-based signal extraction from public zine metadata.
 * Model-proposed extraction comes later — this only tags structure.
 */

import {
  collectiveSignalSchema,
  type CollectiveSignal,
} from "../../schemas/collectiveIntelligenceContracts";
import { mayContributeToMeanMedianMode } from "./consent";
import { MMM_EXTRACTOR_VERSION } from "./methodology";

export interface ExtractablePublicZine {
  id: string;
  title?: string;
  tags?: string[];
  theme?: string;
  tone?: string;
  contributeToMeanMedianMode?: boolean;
  isPublic?: boolean;
  /** Proscenium disclosure timestamp — required for contribution. */
  disclosedAt?: number;
  /** Disclosure copy version (e.g. mmm-consent-v1). */
  disclosureVersion?: string;
  /** Live-window eligibility after revoke (Architecture Update 21). */
  mmmContributionStatus?: "active" | "withdrawn" | "never" | string;
  /** Owner uid — hashed into opaqueContributorKey; never stored raw on the signal. */
  userId?: string;
  /** Publication / disclosure time for windowing (not extraction time). */
  publishedAt?: number;
  timestamp?: number;
}

/** Stable opaque contributor key — not reversible presentation of the uid. */
export function opaqueContributorKeyFromUserId(userId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `c_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function extractSignalsFromPublicZine(
  zine: ExtractablePublicZine,
  observedAt = zine.disclosedAt ?? zine.publishedAt ?? zine.timestamp ?? Date.now(),
): CollectiveSignal[] {
  // Hard gate: public stage + disclosure version/timestamp + contribute flag.
  // Callers must not extract from silent isPublic toggles.
  if (
    !zine.isPublic ||
    !mayContributeToMeanMedianMode({
      disclosedAt: zine.disclosedAt,
      disclosureVersion: zine.disclosureVersion,
      contributeToMeanMedianMode: zine.contributeToMeanMedianMode,
      mmmContributionStatus: zine.mmmContributionStatus,
    })
  ) {
    return [];
  }

  const opaqueContributorKey = zine.userId
    ? opaqueContributorKeyFromUserId(zine.userId)
    : undefined;

  const extractedAt = Date.now();
  const signals: CollectiveSignal[] = [];
  const tags = (zine.tags ?? []).map((t) => t.trim()).filter(Boolean);

  for (const tag of tags) {
    signals.push(
      collectiveSignalSchema.parse({
        id: `${zine.id}:tag:${slug(tag)}`,
        canonicalLabel: tag.toLowerCase(),
        aliases: [tag],
        category: "motif",
        sourceArtifactId: zine.id,
        sourceType: "public_zine",
        observedAt,
        extractedAt,
        extractionMethod: "user_tagged",
        opaqueContributorKey,
        publicContributionAllowed: true,
        anonymizationStatus: "eligible",
        sensitivityFlags: [],
        provenance: {
          sourceId: zine.id,
          sourceKind: "public_zine",
          extractorVersion: MMM_EXTRACTOR_VERSION,
        },
      }),
    );
  }

  if (zine.theme?.trim()) {
    signals.push(
      collectiveSignalSchema.parse({
        id: `${zine.id}:theme:${slug(zine.theme)}`,
        canonicalLabel: zine.theme.trim().toLowerCase(),
        aliases: [zine.theme.trim()],
        category: "topic",
        sourceArtifactId: zine.id,
        sourceType: "public_zine",
        observedAt,
        extractedAt,
        extractionMethod: "rule_based",
        opaqueContributorKey,
        publicContributionAllowed: true,
        anonymizationStatus: "eligible",
        sensitivityFlags: [],
        provenance: {
          sourceId: zine.id,
          sourceKind: "public_zine",
          extractorVersion: MMM_EXTRACTOR_VERSION,
        },
      }),
    );
  }

  if (zine.tone?.trim()) {
    signals.push(
      collectiveSignalSchema.parse({
        id: `${zine.id}:form:${slug(zine.tone)}`,
        canonicalLabel: zine.tone.trim().toLowerCase(),
        aliases: [zine.tone.trim()],
        category: "artifact_form",
        sourceArtifactId: zine.id,
        sourceType: "public_zine",
        observedAt,
        extractedAt,
        extractionMethod: "rule_based",
        opaqueContributorKey,
        publicContributionAllowed: true,
        anonymizationStatus: "eligible",
        sensitivityFlags: [],
        provenance: {
          sourceId: zine.id,
          sourceKind: "public_zine",
          extractorVersion: MMM_EXTRACTOR_VERSION,
        },
      }),
    );
  }

  return signals;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "signal";
}

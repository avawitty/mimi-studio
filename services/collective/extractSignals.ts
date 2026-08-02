/**
 * Minimal rule-based signal extraction from public zine metadata.
 * Model-proposed extraction comes later — this only tags structure.
 */

import {
  collectiveSignalSchema,
  type CollectiveSignal,
} from "../../schemas/collectiveIntelligenceContracts";
import { MMM_EXTRACTOR_VERSION } from "./methodology";

export interface ExtractablePublicZine {
  id: string;
  title?: string;
  tags?: string[];
  theme?: string;
  tone?: string;
  contributeToMeanMedianMode?: boolean;
  isPublic?: boolean;
}

export function extractSignalsFromPublicZine(
  zine: ExtractablePublicZine,
  now = Date.now(),
): CollectiveSignal[] {
  if (!zine.isPublic || !zine.contributeToMeanMedianMode) {
    return [];
  }

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
        observedAt: now,
        extractedAt: now,
        extractionMethod: "user_tagged",
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
        observedAt: now,
        extractedAt: now,
        extractionMethod: "rule_based",
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
        observedAt: now,
        extractedAt: now,
        extractionMethod: "rule_based",
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

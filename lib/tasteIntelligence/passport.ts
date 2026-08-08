/**
 * Taste Passport — approved projection export (never canonical model).
 */
import {
  tastePassportSchema,
  type TastePassport,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import type { TasteRefusal } from "../../schemas/tasteIntelligenceContracts.js";

export interface BuildPassportInput {
  ownerId: string;
  snapshot: TasteModelSnapshot;
  refusals: TasteRefusal[];
  visibility?: TastePassport["visibility"];
  includedEvidenceMode?: TastePassport["includedEvidenceMode"];
  version?: number;
}

export function buildTastePassport(input: BuildPassportInput): TastePassport {
  const now = Date.now();
  const principles = input.snapshot.featureWeights
    .filter((f) => f.signedWeight > 0.4)
    .slice(0, 12)
    .map((f) => f.label);
  const refusals = input.refusals
    .filter((r) => r.status === "active" && r.explicit)
    .map((r) => r.featureIds.join(" + "));
  const creativeLaws = input.snapshot.featureWeights
    .filter((f) => f.sourceType === "creative_law")
    .map((f) => f.label);

  const passport: TastePassport = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    sourceSnapshotId: input.snapshot.id,
    visibility: input.visibility ?? "private",
    principles,
    creativeLaws,
    preferredContrasts: input.snapshot.interactionRules
      .filter((r) => r.relation === "contrasts")
      .slice(0, 8)
      .map((r) => r.featureIds.join(" ↔ ")),
    refusals,
    mediumProfiles: {
      image: principles.slice(0, 6),
      writing: principles.slice(0, 4),
    },
    generationDefaults: { mode: "adjacent", noveltyTarget: 0.38 },
    includedEvidenceMode: input.includedEvidenceMode ?? "none",
    version: input.version ?? 1,
    createdAt: now,
    updatedAt: now,
  };

  return tastePassportSchema.parse(passport);
}

export function exportPassportJson(passport: TastePassport): string {
  return JSON.stringify(passport, null, 2);
}

export function importPassportJson(raw: string): TastePassport {
  const parsed = JSON.parse(raw) as unknown;
  return tastePassportSchema.parse(parsed);
}

export function revokePassport(passport: TastePassport): TastePassport {
  return {
    ...passport,
    revokedAt: Date.now(),
    visibility: "private",
    updatedAt: Date.now(),
  };
}

import type { TasteModelSnapshot } from "../tasteModel";
import type { TailorLogicDraft, UsedContextEntry, ZineMetadata } from "../../types";

export interface SignatureContextFingerprint {
  approvedAtomIds: string[];
  zineCount: number;
  latestZineAt: number;
  tailorDraftAt: number;
  tasteCompiledAt: number;
}

export function computeSignatureFingerprint(input: {
  zines: ZineMetadata[];
  tailorDraft?: TailorLogicDraft | null;
  approvedUsedContext?: UsedContextEntry[];
  tasteSnapshot?: TasteModelSnapshot | null;
}): SignatureContextFingerprint {
  const zines = input.zines ?? [];
  const latestZineAt = zines.reduce(
    (max, z) => Math.max(max, z.timestamp || z.createdAt || 0),
    0,
  );

  return {
    approvedAtomIds: (input.approvedUsedContext ?? [])
      .filter((e) => e.approved)
      .map((e) => e.atomId)
      .sort(),
    zineCount: zines.length,
    latestZineAt,
    tailorDraftAt: input.tailorDraft?.lastTailored ?? 0,
    tasteCompiledAt: input.tasteSnapshot?.compiledAt ?? 0,
  };
}

export function fingerprintKey(fp: SignatureContextFingerprint): string {
  return JSON.stringify(fp);
}

/** Evidence-only delta — patch reading instead of full re-sync. */
export function shouldPatchSignatureOnly(
  prev: SignatureContextFingerprint,
  next: SignatureContextFingerprint,
): boolean {
  if (prev.zineCount !== next.zineCount) return false;
  if (prev.latestZineAt !== next.latestZineAt) return false;
  if (prev.tailorDraftAt !== next.tailorDraftAt) return false;
  if (prev.tasteCompiledAt !== next.tasteCompiledAt) return false;
  return prev.approvedAtomIds.join("|") !== next.approvedAtomIds.join("|");
}

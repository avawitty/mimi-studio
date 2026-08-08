import type { AestheticSignature, PublicSignatureSnapshot } from "../../types";

export function buildPublicSignatureSnapshot(
  handle: string,
  signature: AestheticSignature,
  publishedAt = Date.now(),
): PublicSignatureSnapshot {
  const normalized = handle.trim().toLowerCase().replace(/^@/, "");
  return {
    handle: normalized,
    signature: {
      ...signature,
      status: signature.status === "approved" ? "approved" : "approved",
      approvedAt: signature.approvedAt ?? publishedAt,
    },
    publishedAt,
  };
}

export function isSignatureApprovedForMemory(
  signature: AestheticSignature | null | undefined,
): boolean {
  return signature?.status === "approved";
}

export function canPublishSignature(
  signature: AestheticSignature | null | undefined,
): boolean {
  return isSignatureApprovedForMemory(signature);
}

import type { AestheticSignature, UserProfile } from "../../types";

/** Memory approval — durable taste memory for Mimi (not public by itself). */
export function isSignatureMemoryApproved(
  signature: AestheticSignature | null | undefined,
): boolean {
  return signature?.status === "approved";
}

/** Publication consent — explicitly visible on /u/:handle/signature and public card. */
export function isSignaturePublished(
  signature: AestheticSignature | null | undefined,
): boolean {
  return (
    isSignatureMemoryApproved(signature) &&
    typeof signature?.publishedAt === "number" &&
    signature.publishedAt > 0
  );
}

export function hasPublishedPublicSignature(profile: UserProfile): boolean {
  return isSignaturePublished(profile.tasteProfile?.aestheticSignature);
}

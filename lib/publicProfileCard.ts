import type {
  AestheticSignature,
  PublicRipSnapshot,
  PublicShowcaseSnapshot,
  UserProfile,
} from "../types";

/** Public-safe signature excerpt for creator cards — no private graph leakage. */
export type PublicSignatureExcerpt = {
  title: string;
  subtitle?: string;
  motifs: string[];
  semanticLine?: string;
  moodCluster?: string;
};

export type PublicProfileIdentity = {
  handle: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  accentHex: string;
};

export const resolvePublicProfileIdentity = (
  profile: UserProfile,
  showcase: PublicShowcaseSnapshot | null,
): PublicProfileIdentity => {
  const handle = profile.handle || "creator";
  return {
    handle,
    displayName: profile.displayName?.trim() || showcase?.dollLabel || undefined,
    bio: profile.bio?.trim() || undefined,
    avatarUrl: profile.photoURL || showcase?.dollPortraitUrl || undefined,
    accentHex: showcase?.accentHex || "#5A5A40",
  };
};

export const buildPublicSignatureExcerpt = (
  profile: UserProfile,
  showcase: PublicShowcaseSnapshot | null,
): PublicSignatureExcerpt | null => {
  const signature: AestheticSignature | undefined =
    profile.tasteProfile?.aestheticSignature;
  const semantic = profile.tasteProfile?.semantic_signature?.trim();

  if (signature) {
    const title = signature.primaryAxis || signature.motifs?.[0] || "Taste signature";
    return {
      title,
      subtitle: signature.secondaryAxis || undefined,
      motifs: (signature.motifs || signature.core_keywords || []).slice(0, 6),
      semanticLine: semantic || signature.moodCluster || undefined,
      moodCluster: signature.moodCluster || undefined,
    };
  }

  if (semantic) {
    return {
      title: "Taste signature",
      motifs: (showcase?.motifCandidates || []).slice(0, 6),
      semanticLine: semantic,
    };
  }

  if (showcase?.philosophy) {
    return {
      title: showcase.dollLabel || `@${profile.handle}`,
      motifs: showcase.motifCandidates.slice(0, 6),
      semanticLine: showcase.philosophy,
    };
  }

  return null;
};

export const hasPublishedRip = (rip: PublicRipSnapshot | null | undefined): rip is PublicRipSnapshot =>
  Boolean(rip?.shadowThesis || rip?.title);

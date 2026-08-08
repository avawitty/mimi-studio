import type {
  AestheticSignature,
  PublicRipSnapshot,
  PublicShowcaseSnapshot,
  UserProfile,
} from "../types";
import { isSignaturePublished } from "./signature/signatureConsent";

/** Public-safe signature excerpt for creator cards — no private graph leakage. */
export type PublicSignatureExcerpt = {
  title: string;
  subtitle?: string;
  motifs: string[];
  semanticLine?: string;
  moodCluster?: string;
  /** Present when an approved signature plate is published at /u/:handle/signature */
  fullPagePath?: string;
};

export type PublicProfileIdentity = {
  handle: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  /** Public identity uses the published doll likeness when available. */
  avatarIsDoll: boolean;
  dollLabel?: string;
  accentHex: string;
};

export const getPublicSignaturePagePath = (handle: string): string => {
  const normalized = handle.trim().toLowerCase().replace(/^@/, "");
  return `/u/${normalized}/signature`;
};

export const hasApprovedPublicSignature = (profile: UserProfile): boolean =>
  isSignaturePublished(profile.tasteProfile?.aestheticSignature);

export const resolvePublicProfileIdentity = (
  profile: UserProfile,
  showcase: PublicShowcaseSnapshot | null,
): PublicProfileIdentity => {
  const handle = profile.handle || "creator";
  const dollPortrait = showcase?.dollPortraitUrl;
  // Doll likeness is the canonical public avatar; photoURL is interim until publish.
  const avatarUrl = dollPortrait || profile.photoURL || undefined;
  const avatarIsDoll = Boolean(dollPortrait && avatarUrl === dollPortrait);

  return {
    handle,
    displayName: profile.displayName?.trim() || showcase?.dollLabel || undefined,
    bio: profile.bio?.trim() || undefined,
    avatarUrl,
    avatarIsDoll,
    dollLabel: showcase?.dollLabel,
    accentHex: showcase?.accentHex || "#5A5A40",
  };
};

export const buildPublicSignatureExcerpt = (
  profile: UserProfile,
  showcase: PublicShowcaseSnapshot | null,
): PublicSignatureExcerpt | null => {
  const signature: AestheticSignature | undefined =
    profile.tasteProfile?.aestheticSignature;

  if (signature && isSignaturePublished(signature)) {
    const title = signature.primaryAxis || signature.motifs?.[0] || "Taste signature";
    const handle = profile.handle || showcase?.handle || "creator";
    const semantic =
      signature.reading?.thesis?.trim() ||
      signature.moodCluster?.trim() ||
      undefined;
    return {
      title,
      subtitle: signature.secondaryAxis || undefined,
      motifs: (signature.motifs || signature.core_keywords || []).slice(0, 6),
      semanticLine: semantic,
      moodCluster: signature.moodCluster || undefined,
      fullPagePath: getPublicSignaturePagePath(handle),
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

export type PublicExternalLink = {
  title: string;
  url: string;
};

const isPublicHttpUrl = (raw: string): boolean => {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const formatPublicLinkLabel = (link: PublicExternalLink): string => {
  const title = link.title?.trim();
  if (title && title.toLowerCase() !== "link") return title;
  try {
    return new URL(link.url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return title || "Link";
  }
};

export const getPublicExternalLinks = (
  profile: Pick<UserProfile, "externalLinks">,
): PublicExternalLink[] =>
  (profile.externalLinks || [])
    .filter((link) => link?.url && isPublicHttpUrl(link.url))
    .map((link) => ({
      title: link.title?.trim() || "Link",
      url: link.url.trim(),
    }))
    .slice(0, 6);

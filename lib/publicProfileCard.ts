import type {
  AestheticSignature,
  PublicRipSnapshot,
  PublicShowcaseSnapshot,
  UserProfile,
} from "../types";

/** Public-safe signature excerpt for creator cards — published snapshot only. */
export type PublicSignatureExcerpt = {
  title: string;
  subtitle?: string;
  motifs: string[];
  semanticLine?: string;
  moodCluster?: string;
  /** Present when a taste signature plate is published at /u/:handle/signature */
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

export const hasPublishedPublicSignature = (profile: UserProfile): boolean =>
  Boolean(profile.publicSignature?.signature && profile.publicSignature.publishedAt);

export const resolvePublicProfileIdentity = (
  profile: UserProfile,
  showcase: PublicShowcaseSnapshot | null,
): PublicProfileIdentity => {
  const handle = profile.handle || showcase?.handle || "creator";
  const dollPortrait = showcase?.dollPortraitUrl;
  const avatarUrl = dollPortrait || undefined;
  const avatarIsDoll = Boolean(dollPortrait);

  return {
    handle,
    displayName: showcase?.dollLabel || undefined,
    bio: showcase?.philosophy?.trim() || undefined,
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
  const published = profile.publicSignature?.signature;
  if (published) {
    const title = published.primaryAxis || published.motifs?.[0] || "Taste signature";
    const handle = profile.handle || showcase?.handle || "creator";
    return {
      title,
      subtitle: published.secondaryAxis || undefined,
      motifs: (published.motifs || published.core_keywords || []).slice(0, 6),
      semanticLine: published.reading?.thesis || published.moodCluster || undefined,
      moodCluster: published.moodCluster || undefined,
      fullPagePath: hasPublishedPublicSignature(profile)
        ? getPublicSignaturePagePath(handle)
        : undefined,
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
  _profile: Pick<UserProfile, "externalLinks" | "publicShowcase">,
): PublicExternalLink[] => [];

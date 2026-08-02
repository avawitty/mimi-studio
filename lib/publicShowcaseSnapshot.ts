import type {
  Doll,
  EvidenceBasedCreativeDossier,
  LikenessManifest,
  PublicShowcaseSnapshot,
} from "../types";

export const buildPublicShowcaseSnapshot = (
  handle: string,
  dossier: EvidenceBasedCreativeDossier,
  doll?: Doll | null,
): PublicShowcaseSnapshot => ({
  handle: handle.toLowerCase(),
  dollLabel: doll?.name || dossier.creativeOperatingSystem.containerName,
  philosophy:
    doll?.creativePhilosophy ||
    dossier.creativeOperatingSystem.oneSentencePhilosophy,
  accentHex: doll?.palette?.[0]?.startsWith("#")
    ? doll.palette[0]
    : dossier.likenessManifest.accentHex,
  paperWarmth: dossier.likenessManifest.paperWarmth,
  voiceAdjectives: dossier.likenessManifest.voiceAdjectives.slice(0, 8),
  motifCandidates: (
    doll?.motifs?.length
      ? doll.motifs
      : dossier.likenessManifest.motifCandidates
  ).slice(0, 8),
  sourceDollId: doll?.id,
  dollPortraitUrl:
    doll?.identityReferences?.portraitUrl || doll?.generatedImageUrl,
  updatedAt: Date.now(),
});

export const buildPublicShowcaseFromLikeness = (
  handle: string,
  manifest: LikenessManifest,
  doll?: Doll | null,
): PublicShowcaseSnapshot => ({
  handle: handle.toLowerCase(),
  dollLabel: doll?.name || manifest.containerName || `@${handle}`,
  philosophy:
    doll?.creativePhilosophy ||
    manifest.oneSentencePhilosophy ||
    manifest.voiceAdjectives.join(" · "),
  accentHex: doll?.palette?.[0]?.startsWith("#")
    ? doll.palette[0]
    : manifest.accentHex,
  paperWarmth: manifest.paperWarmth,
  voiceAdjectives: manifest.voiceAdjectives.slice(0, 8),
  motifCandidates: (
    doll?.motifs?.length ? doll.motifs : manifest.motifCandidates
  ).slice(0, 8),
  sourceDollId: doll?.id,
  dollPortraitUrl:
    doll?.identityReferences?.portraitUrl || doll?.generatedImageUrl,
  updatedAt: manifest.savedAt || Date.now(),
});

/** Merge a live Doll projection into an existing public showcase token. */
export const enrichShowcaseWithDoll = (
  snapshot: PublicShowcaseSnapshot,
  doll: Doll,
): PublicShowcaseSnapshot => ({
  ...snapshot,
  dollLabel: doll.name || snapshot.dollLabel,
  philosophy: doll.creativePhilosophy || snapshot.philosophy,
  sourceDollId: doll.id,
  dollPortraitUrl:
    doll.identityReferences?.portraitUrl ||
    doll.generatedImageUrl ||
    snapshot.dollPortraitUrl,
  motifCandidates: doll.motifs.length
    ? doll.motifs.slice(0, 8)
    : snapshot.motifCandidates,
  updatedAt: Date.now(),
});

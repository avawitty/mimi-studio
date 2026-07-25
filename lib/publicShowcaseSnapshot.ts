import type {
  EvidenceBasedCreativeDossier,
  LikenessManifest,
  PublicShowcaseSnapshot,
} from "../types";

export const buildPublicShowcaseSnapshot = (
  handle: string,
  dossier: EvidenceBasedCreativeDossier,
): PublicShowcaseSnapshot => ({
  handle: handle.toLowerCase(),
  dollLabel: dossier.creativeOperatingSystem.containerName,
  philosophy: dossier.creativeOperatingSystem.oneSentencePhilosophy,
  accentHex: dossier.likenessManifest.accentHex,
  paperWarmth: dossier.likenessManifest.paperWarmth,
  voiceAdjectives: dossier.likenessManifest.voiceAdjectives.slice(0, 8),
  motifCandidates: dossier.likenessManifest.motifCandidates.slice(0, 8),
  updatedAt: Date.now(),
});

export const buildPublicShowcaseFromLikeness = (
  handle: string,
  manifest: LikenessManifest,
): PublicShowcaseSnapshot => ({
  handle: handle.toLowerCase(),
  dollLabel: manifest.containerName || `@${handle}`,
  philosophy: manifest.oneSentencePhilosophy || manifest.voiceAdjectives.join(" · "),
  accentHex: manifest.accentHex,
  paperWarmth: manifest.paperWarmth,
  voiceAdjectives: manifest.voiceAdjectives.slice(0, 8),
  motifCandidates: manifest.motifCandidates.slice(0, 8),
  updatedAt: manifest.savedAt || Date.now(),
});

import type { Doll } from "../../types";
import type {
  DollIdentityReferences,
  DollIdentityView,
  DollImageReference,
} from "./types";

const VIEW_LABEL: Record<DollIdentityView, string> = {
  portrait: "Doll Portrait",
  full_body: "Doll Full Body",
  profile: "Doll Profile",
};

export function buildIdentityViewPrompt(
  doll: Doll,
  view: DollIdentityView,
): string {
  const visualTraits =
    doll.visualLanguage?.join(", ") || "exquisite avant-garde high-fashion";
  const materialTraits =
    doll.materials?.join(", ") || "smooth vinyl and metallic hardware";
  const motifTraits =
    [...doll.motifs, ...doll.signatureMotifs].slice(0, 6).join(", ") ||
    "structural geometry";
  const palette = doll.palette.join(", ") || "muted neutrals";
  const silhouette = doll.silhouette || "editorial proportion";
  const eyes = doll.eyeTreatment || "large glassy lifelike crystal eyes with intricate iris patterns";

  const framing =
    view === "portrait"
      ? "tight editorial head-and-shoulders portrait, face clearly readable, chin-length bobby-bob or matching hairstyle"
      : view === "full_body"
        ? "full-body standing pose, complete silhouette and wardrobe readable, soft studio floor shadow"
        : "three-quarter profile view emphasizing bone structure, ear line, and hairstyle continuity";

  return [
    `An exquisite high-fashion BJD (Ball Jointed Doll) art-toy ${VIEW_LABEL[view].toLowerCase()} representing a digital cult aesthetic.`,
    `Framing: ${framing}.`,
    `The doll has smooth polished vinyl skin, highly detailed ${eyes}, ball joints visible at the neck, shoulders, and wrists.`,
    `Visual language: ${visualTraits}. Materials: ${materialTraits}. Motifs: ${motifTraits}. Palette cues: ${palette}. Silhouette: ${silhouette}.`,
    `Emotional register: ${doll.emotionalRegister || "composed"}. Philosophy (mood only, do not render as text): ${doll.creativePhilosophy || "restrained editorial presence"}.`,
    `Elegant minimalist composition with cinematic dramatic lighting. High contrast, clean editorial fashion photograph, luxury toy design.`,
    `IDENTITY LOCK: This image is a calibrated ${VIEW_LABEL[view]} reference for a persistent character proxy named "${doll.name}".`,
  ].join(" ");
}

export function collectIdentityImageReferences(
  doll: Doll,
): DollImageReference[] {
  const refs: DollImageReference[] = [];
  const pack = doll.identityReferences;
  const portrait = pack?.portraitUrl || doll.generatedImageUrl;
  if (portrait) {
    refs.push({
      name: "Doll Portrait",
      description: `Calibrated face/identity reference for ${doll.name}`,
      url: portrait,
      tags: ["doll", "portrait", "identity-lock"],
    });
  }
  if (pack?.fullBodyUrl) {
    refs.push({
      name: "Doll Full Body",
      description: `Full-body silhouette and wardrobe material reference for ${doll.name}`,
      url: pack.fullBodyUrl,
      tags: ["doll", "full-body", "wardrobe"],
    });
  }
  if (pack?.profileUrl) {
    refs.push({
      name: "Doll Profile",
      description: `Profile bone-structure reference for ${doll.name}`,
      url: pack.profileUrl,
      tags: ["doll", "profile", "identity-lock"],
    });
  }
  return refs;
}

export function mergeIdentityReference(
  current: DollIdentityReferences | undefined,
  view: DollIdentityView,
  url: string,
): DollIdentityReferences {
  const next: DollIdentityReferences = { ...(current || {}) };
  if (view === "portrait") next.portraitUrl = url;
  else if (view === "full_body") next.fullBodyUrl = url;
  else next.profileUrl = url;
  next.lastGeneratedView = view;
  next.calibratedAt = Date.now();
  return next;
}

export function identityPackCompleteness(doll: Doll): {
  filled: number;
  total: number;
  missing: DollIdentityView[];
} {
  const pack = doll.identityReferences;
  const views: DollIdentityView[] = ["portrait", "full_body", "profile"];
  const missing = views.filter((v) => {
    if (v === "portrait") return !(pack?.portraitUrl || doll.generatedImageUrl);
    if (v === "full_body") return !pack?.fullBodyUrl;
    return !pack?.profileUrl;
  });
  return { filled: views.length - missing.length, total: views.length, missing };
}

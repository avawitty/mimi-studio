import type { Doll } from "../../types";
import type {
  DollIdentityReferences,
  DollIdentityView,
  DollImageReference,
} from "./types";
import { buildMimiShellImagePrompt } from "./staplePrompt";

const VIEW_LABEL: Record<DollIdentityView, string> = {
  portrait: "Doll Portrait",
  full_body: "Doll Full Body",
  profile: "Doll Profile",
};

/** Identity-pack image prompt — house Mimi Shell staple + view framing. */
export function buildIdentityViewPrompt(
  doll: Doll,
  view: DollIdentityView,
): string {
  return buildMimiShellImagePrompt(doll, { view });
}

export function collectIdentityImageReferences(
  doll: Doll,
): DollImageReference[] {
  const refs: DollImageReference[] = [];
  const pack = doll.identityReferences;
  const portrait = pack?.portraitUrl || doll.generatedImageUrl;
  if (portrait) {
    refs.push({
      name: VIEW_LABEL.portrait,
      description: `Calibrated face/identity reference for ${doll.name}`,
      url: portrait,
      tags: ["doll", "portrait", "identity-lock", "mimi-shell"],
    });
  }
  if (pack?.fullBodyUrl) {
    refs.push({
      name: VIEW_LABEL.full_body,
      description: `Full-body silhouette and wardrobe material reference for ${doll.name}`,
      url: pack.fullBodyUrl,
      tags: ["doll", "full-body", "wardrobe", "mimi-shell"],
    });
  }
  if (pack?.profileUrl) {
    refs.push({
      name: VIEW_LABEL.profile,
      description: `Profile bone-structure reference for ${doll.name}`,
      url: pack.profileUrl,
      tags: ["doll", "profile", "identity-lock", "mimi-shell"],
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

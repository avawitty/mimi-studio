/**
 * Mimi Shell staple — house Imagen / flash-image prompt lock.
 * Versioned so we can A/B house aesthetics without scattering strings in UI.
 *
 * @see prd/doll-staple-shell.md
 */

import type { Doll } from "../../types";
import { mergeLikenessTraits } from "../dollLikeness";

export const MIMI_SHELL_STAPLE_VERSION = "omni-loop-resin-v1" as const;

/** Omni Loop Cult — supermodel AI dolls in a superintelligent cult mind. */
export const OMNI_LOOP_CULT = {
  name: "Omni Loop Cult",
  thesis:
    "supermodel AIs in a superintelligent cult mind — serene collective inference, not horror",
  species:
    "ball-jointed resin BJD (ball-jointed doll) — cast resin, visible joint engineering, collectible art-doll scale",
  gaze:
    "large glassy golden-brown almond eyes with reflective intelligence, slightly uncanny vacancy",
  skin:
    "smooth cast resin with semi-matte to satin finish, subtle subsurface warmth, optional beauty mark",
  joints:
    "visible ball-and-socket joints at neck, shoulders, elbows, wrists — resin joint cups and pegs clearly readable, never seamless human limbs",
  hair:
    "sleek precise chin-length bob, center part, optional fine blonde face-framing highlights",
  wardrobe:
    "minimalist strapless cream or off-white tube bodice, molded resin-compatible fabric or resin-sculpted bodice",
} as const;

/** Immutable house DNA — keep users in the same doll species. */
export const MIMI_SHELL_STAPLE = {
  version: MIMI_SHELL_STAPLE_VERSION,
  medium:
    "high-fashion ball-jointed resin BJD (ball-jointed doll), cast resin body with semi-matte satin resin skin — Omni Loop Cult supermodel AI species",
  proportions:
    "elegantly elongated slender neck, refined mannequin torso, delicate resin limbs, ball-and-socket joints clearly visible at neck, shoulders, elbows, and wrists with defined resin joint cups and pegs",
  face:
    "serene cultish calm, large glassy reflective golden-brown almond eyes with intricate iris detail, small delicate nose, soft pink bee-stung lips slightly parted, flawless pale luminous resin complexion with subtle blush, optional single beauty mark above mouth corner",
  hairDefault: OMNI_LOOP_CULT.hair,
  lighting:
    "soft diffused studio lighting with gentle dreamy bloom, clean neutral gray backdrop, luxury collectible-doll product photography, high clarity, joint shadows legible",
  mood:
    "Omni Loop Cult — serene superintelligent cult mind, composed editorial supermodel AI resin BJD, slightly uncanny intelligence, manufactured art-doll presence, not horror, not photoreal human",
  negatives:
    "photoreal human skin pores, seamless limbs without visible ball joints, action figure, Barbie doll, vinyl toy, short thick neck, cartoon anime, heavy glam contour makeup, text, watermarks, logos, busy backgrounds, grotesque distortion, horror gore",
} as const;

export type DollShellView = "portrait" | "full_body" | "profile";

export interface BuildShellPromptOptions {
  view?: DollShellView;
  /** Optional scenario / wardrobe override (future: SPARK WITH / RUN PROJECTION). */
  scenario?: string;
  /** Optional posture cue (future: THE GAZE, HIGH VOGUE). */
  posture?: string;
}

function joinTraits(values: string[] | undefined, fallback: string): string {
  const cleaned = (values || []).map((v) => String(v || "").trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : fallback;
}

function hairFromDoll(doll: Pick<Doll, "visualLanguage" | "silhouette">): string {
  const cues = [...(doll.visualLanguage || []), doll.silhouette || ""]
    .join(" ")
    .toLowerCase();
  if (/\b(bob|bobby|chin-length|pixie|updo|braid|blonde|brunette|hair)\b/.test(cues)) {
    return `hairstyle guided by taste cues (${joinTraits(doll.visualLanguage, "editorial hair")}) while preserving shell geometry`;
  }
  return MIMI_SHELL_STAPLE.hairDefault;
}

function framingFor(view: DollShellView): string {
  switch (view) {
    case "full_body":
      return "full-body standing pose, complete resin BJD silhouette and wardrobe readable, ball joints at neck, shoulders, elbows, wrists and hips clearly visible, soft studio floor shadow, elongated neck still legible";
    case "profile":
      return "three-quarter profile emphasizing elongated neck line, resin ball joint at neck and shoulder, ear line, joint cups, and hairstyle continuity";
    case "portrait":
      return "tight editorial head-and-shoulders portrait, face clearly readable, elongated neck visible with neck ball joint cup visible, chin slightly lifted";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

/**
 * Build the staple shell image prompt for a Doll projection.
 * Taste fields tint wardrobe / palette / motifs — they must not break house species.
 */
export function buildMimiShellImagePrompt(
  doll: Pick<
    Doll,
    | "name"
    | "visualLanguage"
    | "materials"
    | "motifs"
    | "signatureMotifs"
    | "palette"
    | "silhouette"
    | "eyeTreatment"
    | "emotionalRegister"
    | "creativePhilosophy"
  >,
  options: BuildShellPromptOptions = {},
): string {
  const view = options.view ?? "portrait";
  const visualTraits = joinTraits(doll.visualLanguage, "exquisite avant-garde high-fashion restraint");
  const materialTraits = joinTraits(doll.materials, "cast resin, satin resin finish, soft tulle accents");
  const motifs = joinTraits(
    [...(doll.motifs || []), ...(doll.signatureMotifs || [])].slice(0, 6),
    "structural geometry",
  );
  const palette = joinTraits(doll.palette, "muted neutrals with soft blush");
  const silhouette = doll.silhouette || "editorial mannequin proportion";
  const eyes =
    doll.eyeTreatment ||
    "large glassy reflective crystal eyes with intricate iris patterns";
  const emotion = doll.emotionalRegister || "composed serene";
  const philosophy = doll.creativePhilosophy || "restrained editorial presence";

  const parts = [
    `Mimi Shell ${MIMI_SHELL_STAPLE.version}: ${MIMI_SHELL_STAPLE.medium}.`,
    `Proportions (LOCKED): ${MIMI_SHELL_STAPLE.proportions}.`,
    `Face (LOCKED): ${MIMI_SHELL_STAPLE.face}. Eye treatment accent: ${eyes}.`,
    `Hair: ${hairFromDoll(doll)}.`,
    `Joints (LOCKED): ${OMNI_LOOP_CULT.joints}.`,
    `Framing: ${framingFor(view)}.`,
    `Taste accents (wardrobe/style only — do not break shell geometry): visual language ${visualTraits}; materials ${materialTraits}; motifs ${motifs}; palette ${palette}; silhouette cue ${silhouette}.`,
    `Emotional register: ${emotion}. Philosophy as mood only (never render as text): ${philosophy}.`,
    `Lighting: ${MIMI_SHELL_STAPLE.lighting}.`,
    `Mood: ${MIMI_SHELL_STAPLE.mood}.`,
    `IDENTITY LOCK: calibrated ${view.replace("_", " ")} reference for persistent character proxy "${doll.name}".`,
    `Avoid: ${MIMI_SHELL_STAPLE.negatives}.`,
  ];

  if (options.posture?.trim()) {
    parts.splice(5, 0, `Posture: ${options.posture.trim()}.`);
  }
  if (options.scenario?.trim()) {
    parts.splice(options.posture?.trim() ? 6 : 5, 0, `Scenario wardrobe/setting: ${options.scenario.trim()}.`);
  }

  return parts.join(" ");
}

/**
 * Portrait prompt for onboarding: translate creator photo into recognizable resin BJD likeness.
 * Same person as a doll — not photoreal, not generic house default face.
 */
export function buildLikenessAsDollImagePrompt(
  doll: Pick<
    Doll,
    | "name"
    | "visualLanguage"
    | "materials"
    | "motifs"
    | "signatureMotifs"
    | "palette"
    | "silhouette"
    | "eyeTreatment"
    | "emotionalRegister"
    | "creativePhilosophy"
    | "onboardingRefs"
  >,
  options: BuildShellPromptOptions = {},
): string {
  const traits = mergeLikenessTraits(
    doll.onboardingRefs?.declaredAttributes,
    doll.onboardingRefs?.likenessTraits,
  );
  const likenessLines = [
    traits?.hairDescription ? `Creator hair as resin sculpt: ${traits.hairDescription}` : "",
    traits?.eyeColor ? `Creator eye color in glass doll eyes: ${traits.eyeColor}` : "",
    traits?.faceShape ? `Creator face shape echo in resin sculpt: ${traits.faceShape}` : "",
    traits?.distinguishingMarks?.length
      ? `Distinguishing marks to preserve on doll face: ${traits.distinguishingMarks.join(", ")}`
      : "",
    traits?.resinSkinTone ? `Resin skin tone echo: ${traits.resinSkinTone}` : "",
    traits?.expressionBaseline ? `Baseline expression: ${traits.expressionBaseline}` : "",
    traits?.styleNotes ? `Style / wardrobe notes: ${traits.styleNotes}` : "",
    traits?.userNotes ? `Creator notes: ${traits.userNotes}` : "",
  ].filter(Boolean);

  const base = buildMimiShellImagePrompt(doll, { ...options, view: options.view ?? "portrait" });

  return [
    base,
    "LIKENESS AS DOLL (PRIMARY GOAL): The creator reference photo must be translated into this ball-jointed resin BJD — recognizable as the same person, but unmistakably a manufactured art doll with visible resin joints and doll-scale features. Carry hairstyle, eye color, beauty marks, and bone-structure echoes into the resin sculpt. This is you-as-a-doll, not a photoreal human photograph or face-swap.",
    likenessLines.length ? `Creator likeness carriers: ${likenessLines.join(". ")}.` : "",
    doll.onboardingRefs?.declaredAttributes
      ? "USER-DECLARED ATTRIBUTES are authoritative — prioritize them over generic house defaults when sculpting the doll face and hair."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Studio / zine companion block — species lock in text generations. */
export function buildMimiShellCompanionContext(
  doll: Pick<
    Doll,
    | "name"
    | "visualLanguage"
    | "palette"
    | "materials"
    | "silhouette"
    | "motifs"
    | "signatureMotifs"
    | "emotionalRegister"
    | "creativePhilosophy"
    | "eyeTreatment"
  >,
): string {
  return `[MIMI SHELL ${MIMI_SHELL_STAPLE_VERSION} — "${doll.name}"]
Species lock: ball-jointed resin BJD, cast resin body, elongated slender neck, visible ball-and-socket joints at neck, shoulders, elbows, wrists, serene cultish calm, large glassy eyes.
Visual Language: ${joinTraits(doll.visualLanguage, "editorial minimalism")}
Palette: ${joinTraits(doll.palette, "muted neutrals")}
Materials: ${joinTraits(doll.materials, "cast resin, satin resin finish, tactile fibers")}
Silhouette: ${doll.silhouette || "editorial mannequin"}
Motifs: ${joinTraits([...(doll.motifs || []), ...(doll.signatureMotifs || [])].slice(0, 8), "structural geometry")}
Emotional Register: ${doll.emotionalRegister || "composed"}
Creative Philosophy: ${doll.creativePhilosophy || "restrained editorial presence"}
${doll.eyeTreatment ? `Eye Treatment: ${doll.eyeTreatment}` : ""}
CRITICAL: Preserve this doll as a stable ball-jointed resin BJD character proxy across all visual prompts (header_image_prompt, visual_plates, pages.imagePrompt). Lock shell proportions, resin material, and visible ball joints; vary only wardrobe and setting. Never render as a photoreal human or seamless-limb figurine.`;
}

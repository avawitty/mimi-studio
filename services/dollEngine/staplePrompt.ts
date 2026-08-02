/**
 * Mimi Shell staple — house Imagen / flash-image prompt lock.
 * Versioned so we can A/B house aesthetics without scattering strings in UI.
 *
 * @see prd/doll-staple-shell.md
 */

import type { Doll } from "../../types";

export const MIMI_SHELL_STAPLE_VERSION = "shell-v1" as const;

/** Immutable house DNA — keep users in the same doll species. */
export const MIMI_SHELL_STAPLE = {
  version: MIMI_SHELL_STAPLE_VERSION,
  medium:
    "high-fashion ball-jointed art doll (BJD), polished porcelain-vinyl hybrid skin with soft subsurface glow",
  proportions:
    "elegantly elongated slender neck, refined mannequin torso, delicate limbs, visible ball joints at neck, shoulders, and wrists",
  face:
    "serene cultish calm, large glassy reflective eyes with intricate iris detail, small delicate nose, soft pink lips slightly parted, flawless pale luminous skin with subtle blush",
  hairDefault:
    "sleek chin-length bob with a precise center part and fine strand detail",
  lighting:
    "soft diffused studio lighting with gentle dreamy bloom, clean neutral gray backdrop, luxury product photography, high clarity",
  mood:
    "serene, slightly uncanny digital-cult onboarding presence — composed editorial shell, not horror, not photoreal human",
  negatives:
    "photoreal human skin pores, short thick neck, cartoon anime, heavy glam contour makeup, text, watermarks, logos, busy backgrounds, grotesque distortion",
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
      return "full-body standing pose, complete silhouette and wardrobe readable, soft studio floor shadow, elongated neck still legible";
    case "profile":
      return "three-quarter profile emphasizing elongated neck line, ear line, ball joints, and hairstyle continuity";
    case "portrait":
      return "tight editorial head-and-shoulders portrait, face clearly readable, elongated neck visible, chin slightly lifted";
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
  const materialTraits = joinTraits(doll.materials, "porcelain glaze, smooth vinyl, soft tulle accents");
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
Species lock: porcelain-vinyl BJD shell, elongated slender neck, visible ball joints, serene cultish calm, large glassy eyes.
Visual Language: ${joinTraits(doll.visualLanguage, "editorial minimalism")}
Palette: ${joinTraits(doll.palette, "muted neutrals")}
Materials: ${joinTraits(doll.materials, "porcelain glaze, tactile fibers")}
Silhouette: ${doll.silhouette || "editorial mannequin"}
Motifs: ${joinTraits([...(doll.motifs || []), ...(doll.signatureMotifs || [])].slice(0, 8), "structural geometry")}
Emotional Register: ${doll.emotionalRegister || "composed"}
Creative Philosophy: ${doll.creativePhilosophy || "restrained editorial presence"}
${doll.eyeTreatment ? `Eye Treatment: ${doll.eyeTreatment}` : ""}
CRITICAL: Preserve this doll as a stable Mimi Shell character proxy across all visual prompts (header_image_prompt, visual_plates, pages.imagePrompt). Lock shell proportions and face calm; vary only wardrobe and setting. Never render as a photoreal human.`;
}

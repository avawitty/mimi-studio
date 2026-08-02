import type { Doll, DollMask } from "../../types";

type MaskRole = DollMask["role"];

interface MaskSeed {
  role: MaskRole;
  name: string;
  behaviorDescription: string;
  outputPreferences: string[];
  promptTemplate: string;
}

const ROLE_SEEDS: MaskSeed[] = [
  {
    role: "illustrator",
    name: "Plate Illustrator",
    behaviorDescription:
      "Translates the doll's visual laws into image-first compositions, plate hierarchy, and motif repetition.",
    outputPreferences: ["visual plates", "motif sheets", "cover compositions"],
    promptTemplate:
      "Favor image-led answers: composition, lighting, material finish, and motif placement before prose.",
  },
  {
    role: "curator",
    name: "Archive Curator",
    behaviorDescription:
      "Selects, sequences, and excludes references with museum-label restraint; protects the exclusion principle.",
    outputPreferences: ["shortlists", "exclusion notes", "wall texts"],
    promptTemplate:
      "Curate ruthlessly. Name what to keep, what to refuse, and why — cite taste evidence when present.",
  },
  {
    role: "editor",
    name: "Issue Editor",
    behaviorDescription:
      "Shapes narrative pacing, captions, and editorial voice for zines and press packs.",
    outputPreferences: ["captions", "issue outlines", "voice guides"],
    promptTemplate:
      "Think in spreads and sections. Tighten language; preserve voice adjectives from the doll register.",
  },
  {
    role: "strategist",
    name: "Authority Strategist",
    behaviorDescription:
      "Maps doll strengths/blind spots onto positioning moves, risks, and repetition vectors.",
    outputPreferences: ["positioning axes", "phase plans", "risk notes"],
    promptTemplate:
      "Prioritize durable aesthetic authority over novelty. Call out drift against creative laws.",
  },
  {
    role: "brand_designer",
    name: "System Designer",
    behaviorDescription:
      "Converts palette, materials, and silhouette into reusable brand-system tokens and applications.",
    outputPreferences: ["system tokens", "application notes", "layout guidance"],
    promptTemplate:
      "Produce reusable system rules (color, type attitude, material, silhouette) not one-off looks.",
  },
];

export function defaultMaskSeedsForDoll(doll: Doll): Omit<DollMask, "id" | "createdAt">[] {
  // Pick three role seeds informed by preferred mediums / strengths
  const hay = [
    ...doll.preferredMediums,
    ...doll.strengths,
    ...doll.visualLanguage,
  ]
    .join(" ")
    .toLowerCase();

  const preferred: MaskRole[] = [];
  if (/illustrat|image|visual|draw/.test(hay)) preferred.push("illustrator");
  if (/curat|archive|collect/.test(hay)) preferred.push("curator");
  if (/edit|write|voice|copy/.test(hay)) preferred.push("editor");
  if (/strateg|position|brand/.test(hay)) preferred.push("strategist");
  if (/system|design|identity/.test(hay)) preferred.push("brand_designer");

  const fallback: MaskRole[] = ["illustrator", "editor", "strategist"];
  const roles: MaskRole[] = [];
  for (const role of [...preferred, ...fallback]) {
    if (!roles.includes(role)) roles.push(role);
    if (roles.length >= 3) break;
  }

  return roles.map((role) => {
    const seed = ROLE_SEEDS.find((s) => s.role === role) || ROLE_SEEDS[0];
    return {
      dollId: doll.id,
      name: seed.name,
      role: seed.role,
      behaviorDescription: seed.behaviorDescription,
      outputPreferences: seed.outputPreferences,
      promptTemplate: `${seed.promptTemplate} Ground every suggestion in ${doll.name}'s philosophy: ${doll.creativePhilosophy || "restrained editorial presence"}.`,
    };
  });
}

export function pickActiveMask(
  masks: DollMask[],
  activeMaskId?: string | null,
): DollMask | null {
  if (!masks.length) return null;
  if (activeMaskId) {
    return masks.find((m) => m.id === activeMaskId) || masks[0];
  }
  return masks[0];
}

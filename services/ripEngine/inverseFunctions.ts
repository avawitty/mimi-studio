import type { RipInverseFunction } from "../../types";

/** Human label for each inverse operator (UI + provenance). */
export const RIP_INVERSE_FUNCTION_LABELS: Record<RipInverseFunction, string> = {
  complement: "Complement",
  contrast: "Refusal contrast",
  admission: "Controlled admission",
  shadow_projection: "Shadow projection",
  semiotic_inversion: "Semiotic inversion",
  material_flip: "Material flip",
  register_shift: "Register shift",
  proportion_disruption: "Proportion disruption",
  typographic_mirror: "Typographic mirror",
  temporal_reversal: "Temporal reversal",
};

/** Cultural / material opposites keyed by common taste-graph tokens. */
const SEMIOTIC_OPPOSITES: Record<string, { node: string; motif: string; directive: string }> = {
  neon: {
    node: "mesopic sodium archive",
    motif: "dim sodium spill on wet asphalt",
    directive: "low-key sodium, no bloom, documentary grain",
  },
  cyberpunk: {
    node: "analog brutalism",
    motif: "concrete service corridor",
    directive: "flat overcast, matte mineral surfaces, no HUD",
  },
  pastel: {
    node: "oxide industrial",
    motif: "rusted enamel signage",
    directive: "desaturated rust, chipped pigment, hard shadow",
  },
  influencer: {
    node: "editorial still life",
    motif: "single object on bare plaster",
    directive: "north light, no smile, object as witness",
  },
  minimal: {
    node: "maximal residue",
    motif: "layered ephemera collage",
    directive: "stacked paper, tape, marginalia — controlled chaos",
  },
  ornate: {
    node: "structural void",
    motif: "negative space as protagonist",
    directive: "empty field, single hairline rule, silence",
  },
  warm: {
    node: "clinical cool",
    motif: "fluorescent corridor",
    directive: "cool white spill, sterile plane, no wood",
  },
  cool: {
    node: "tallow warmth",
    motif: "candle wax on stone",
    directive: "amber point source, deep surround falloff",
  },
  serif: {
    node: "industrial grotesk",
    motif: "stamped metal label",
    directive: "mono grotesk, tight tracking, no flourish",
  },
  grid: {
    node: "organic rupture",
    motif: "torn edge interrupting lattice",
    directive: "one broken grid line, hand tear, asymmetry",
  },
  lattice: {
    node: "dissolved mesh",
    motif: "unraveled netting",
    directive: "loose threads, gravity sag, no perfect repeat",
  },
  vinyl: {
    node: "raw fiber",
    motif: "unbleached hemp seam",
    directive: "visible weave, no laminate sheen",
  },
  composed: {
    node: "productive friction",
    motif: "half-finished gesture",
    directive: "mid-motion blur, unresolved tension",
  },
  restraint: {
    node: "deliberate excess",
    motif: "one baroque intrusion",
    directive: "single ornate element on austere field",
  },
  fast: {
    node: "slow witness",
    motif: "long exposure drift",
    directive: "motion blur as evidence, not error",
  },
  glossy: {
    node: "chalk matte",
    motif: "dust on lacquer",
    directive: "matte override, powder bloom, no mirror",
  },
};

const MATERIAL_FLIPS: Record<string, string> = {
  vinyl: "unbleached linen",
  lacquer: "raw clay",
  chrome: "oxidized brass",
  glass: "frosted resin",
  leather: "felted wool",
  silk: "burlap",
  marble: "terrazzo chip",
  steel: "cast iron",
  plastic: "hand-paper",
  neon: "tungsten filament",
};

const REGISTER_SHIFTS: Record<string, string> = {
  composed: "volatile intimacy",
  serene: "anxious precision",
  authoritative: "vulnerable disclosure",
  playful: "solemn witness",
  romantic: "clinical distance",
  nostalgic: "future archaeology",
  fierce: "quiet surrender",
  detached: "embodied heat",
};

const PROPORTION_DISRUPTIONS: Record<string, string> = {
  columnar: "collapsed horizontal mass",
  oversized: "deliberate miniaturization",
  fitted: "exaggerated negative ease",
  loose: "compressed silhouette",
  structured: "soft collapse",
  minimal: "one oversized block",
  layered: "stripped to single plane",
};

function matchKey(text: string, table: Record<string, string>): string | null {
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(table)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

function matchSemiotic(text: string): { node: string; motif: string; directive: string } | null {
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(SEMIOTIC_OPPOSITES)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

/** Apply complement operator — geometric / chromatic opposite cue. */
export function applyComplement(source: string, oppositeToken: string): string {
  return `Complement of “${source.slice(0, 48)}” → ${oppositeToken}`;
}

/** Refusal-driven contrast — explicit opposition to an anti-motif. */
export function applyContrast(antiMotif: string): {
  tryInstead: string;
  rationale: string;
} {
  return {
    tryInstead: `Hold “${antiMotif}” as a visible tension for one plate — not as identity`,
    rationale: `Elected via refusal contrast: “${antiMotif}” is an active exclusion in the graph`,
  };
}

/** Controlled admission — briefly admit what the graph excludes. */
export function applyAdmission(antiMotif: string): {
  tryInstead: string;
  rationale: string;
} {
  return {
    tryInstead: `Run a single spread that admits “${antiMotif}” under your existing laws, then restore the exclusion`,
    rationale: `Admission test: the graph refuses “${antiMotif}” — rip proposes a bounded experiment`,
  };
}

/** Shadow projection from blind spot text. */
export function applyShadowProjection(blindSpot: string): {
  becauseYouTendTo: string;
  tryInstead: string;
  rationale: string;
} {
  return {
    becauseYouTendTo: blindSpot,
    tryInstead: `Name when “${blindSpot}” is active — treat it as signal, not flaw`,
    rationale: `Shadow projection from recorded blind spot / tension field`,
  };
}

/** Semiotic inversion — adjacent cultural node, not literal opposite. */
export function applySemioticInversion(token: string): {
  node: string;
  motif: string;
  directive: string;
  rationale: string;
} | null {
  const hit = matchSemiotic(token);
  if (hit) {
    return {
      ...hit,
      rationale: `Semiotic inversion: “${token}” maps to adjacent node “${hit.node}” (not 1:1 negation)`,
    };
  }
  const slug = token.toLowerCase().slice(0, 24);
  return {
    node: `anti-${slug}`,
    motif: `inverse echo of ${slug}`,
    directive: `invert lighting and material of ${slug} — keep composition legible`,
    rationale: `Synthesized semiotic inversion for “${token}” (no catalog match)`,
  };
}

/** Material vocabulary flip. */
export function applyMaterialFlip(material: string): {
  flipped: string;
  rationale: string;
} {
  const flipped = matchKey(material, MATERIAL_FLIPS) || `unprocessed ${material}`;
  return {
    flipped,
    rationale: `Material flip: “${material}” → “${flipped}”`,
  };
}

/** Emotional register shift. */
export function applyRegisterShift(register: string): {
  shifted: string;
  rationale: string;
} {
  const shifted = matchKey(register, REGISTER_SHIFTS) || `inverse of “${register}”`;
  return {
    shifted,
    rationale: `Register shift: “${register}” → “${shifted}”`,
  };
}

/** Silhouette / proportion disruption. */
export function applyProportionDisruption(silhouette: string): {
  disrupted: string;
  rationale: string;
} {
  const disrupted =
    matchKey(silhouette, PROPORTION_DISRUPTIONS) || `anti-${silhouette.slice(0, 40)}`;
  return {
    disrupted,
    rationale: `Proportion disruption: “${silhouette}” → “${disrupted}”`,
  };
}

/** Typography logic mirror. */
export function applyTypographicMirror(typographyLogic: string): {
  mirrored: string;
  rationale: string;
} {
  const lower = typographyLogic.toLowerCase();
  let mirrored = "industrial grotesk, tight mono";
  if (lower.includes("serif") || lower.includes("display")) {
    mirrored = "stamped mono label, no contrast pair";
  } else if (lower.includes("mono") || lower.includes("brutal")) {
    mirrored = "single serif line, generous leading";
  } else if (lower.includes("hand")) {
    mirrored = "machine-cut vector, zero gesture";
  }
  return {
    mirrored,
    rationale: `Typographic mirror of “${typographyLogic.slice(0, 60)}”`,
  };
}

/** Temporal reversal — pace / durability inversion. */
export function applyTemporalReversal(philosophy: string): {
  reversed: string;
  rationale: string;
} {
  const lower = philosophy.toLowerCase();
  let reversed = "slow witness over instant read";
  if (lower.includes("fast") || lower.includes("urgent")) {
    reversed = "archival slowness — let the plate age before judgment";
  } else if (lower.includes("timeless") || lower.includes("classic")) {
    reversed = "deliberate ephemerality — one-season gesture";
  } else if (lower.includes("new") || lower.includes("novel")) {
    reversed = "recycled reference — cite what already exists";
  }
  return {
    reversed,
    rationale: `Temporal reversal against philosophy anchor`,
  };
}

export function labelInverseFunction(fn: RipInverseFunction): string {
  return RIP_INVERSE_FUNCTION_LABELS[fn];
}

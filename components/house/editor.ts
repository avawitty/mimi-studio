import type { AestheticReading, Debris, DebrisTag } from "./types";

const TAG_LEXICON: Record<string, string[]> = {
  BRUTALIST: ["concrete", "brutal", "raw", "monolith", "bunker", "steel", "basalt", "industrial", "grey", "gray"],
  ARCHIVAL: ["archive", "vintage", "analog", "film", "kodak", "grain", "document", "provenance", "catalog", "museum", "zine"],
  ROMANTIC: ["silk", "lace", "rose", "soft", "tender", "poem", "ruin", "candle", "velvet", "dusk"],
  TECHNO: ["chrome", "neon", "digital", "pixel", "render", "simulation", "terminal", "cyber", "machine", "signal"],
  ASCETIC: ["linen", "stone", "plain", "quiet", "empty", "wabi", "mono", "paper", "clay", "undyed"],
  BAROQUE: ["gold", "ornate", "marble", "velvet", "opera", "excess", "gilded", "damask", "candlelight"],
  KINETIC: ["motion", "speed", "dance", "blur", "strobe", "run", "drive", "engine", "sweat"],
  BOTANIC: ["moss", "fern", "garden", "soil", "root", "petal", "greenhouse", "herbarium", "bloom"],
  NOCTURNAL: ["night", "midnight", "shadow", "moon", "dark", "noir", "3am", "black", "smoke"],
  MARITIME: ["salt", "sea", "harbor", "rope", "tide", "fog", "shell", "driftwood", "navy"],
};

const ARCHETYPE_PREFIX = [
  "Archival",
  "Techno",
  "Ruin",
  "Monastic",
  "Kinetic",
  "Baroque",
  "Nocturnal",
  "Botanic",
  "Maritime",
  "Brutalist",
];

const ARCHETYPE_SUFFIX = [
  "Brutalist",
  "Romantic",
  "Savant",
  "Ascetic",
  "Cartographer",
  "Archivist",
  "Projectionist",
  "Gardener",
  "Astronomer",
  "Printer",
];

const TENSIONS = [
  "unpolished basalt, cool digital ozone, weight",
  "damp linen, oxidized brass, held breath",
  "hot chrome, crushed velvet, a low frequency hum",
  "bone-dry paper, wet soil, distant static",
  "smoked glass, sea salt, disciplined silence",
  "candle soot, raw silk, the pause before applause",
];

/** House Style v2 palettes — white/ink fields with olive/stone accents (no cream lifestyle fills). */
const PALETTES: string[][] = [
  ["#0A0A0A", "#FFFFFF", "#5A5A40", "#78716C", "#D4D4D4"],
  ["#0A0A0A", "#FAFAFA", "#5A5A40", "#9BB8CE", "#78716C"],
  ["#12100E", "#FFFFFF", "#3C3428", "#78716C", "#D4D4D4"],
  ["#0A0A0A", "#FFFFFF", "#4A5A4E", "#9AA494", "#2A332C"],
  ["#14141A", "#FFFFFF", "#5C5470", "#9BB8CE", "#342E40"],
  ["#0A0A0A", "#FAFAFA", "#3A4A5C", "#8A9AAC", "#232C38"],
];

export const EDITOR_VOICE = {
  ingestIdle:
    "Feed me the memetic debris. Links, fragments, images — I will find the latent architecture inside it.",
  ingestDone: (n: number) =>
    `${n} piece${n === 1 ? "" : "s"} of debris held. Filtering memetic noise for latent architectural intent…`,
  curateIdle:
    "Keep what survives scrutiny. Refuse what merely flatters. The floor below was ingestion; this floor is judgement.",
  plateIdle: "Compose a plate. Name it like a gallery would. Narrative first, decoration never.",
  penthouseIdle:
    "The Penthouse is where positions get published. Bind your plates into an issue and stamp it.",
};

function hashFNV(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function extractTags(raw: string): DebrisTag[] {
  const lower = raw.toLowerCase();
  const tags: DebrisTag[] = [];
  for (const [label, words] of Object.entries(TAG_LEXICON)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > 0) {
      tags.push({ label, intensity: Math.min(1, 0.3 + hits * 0.25) });
    }
  }
  if (tags.length === 0) {
    const keys = Object.keys(TAG_LEXICON);
    const d = hashFNV(raw || "untitled debris");
    tags.push({ label: keys[d % keys.length], intensity: 0.4 });
    tags.push({ label: keys[(d >> 4) % keys.length], intensity: 0.25 });
  }
  return tags.sort((a, b) => b.intensity - a.intensity).slice(0, 5);
}

export function synthesizeReading(kept: Debris[], refused: Debris[]): AestheticReading {
  const keptBlob = kept.map((d) => d.raw + " " + (d.note ?? "")).join(" ");
  const refusedBlob = refused.map((d) => d.raw).join(" ");
  const d = hashFNV(keptBlob + "|" + refusedBlob);

  const intensity = new Map<string, number>();
  for (const item of kept) {
    for (const tag of item.tags) {
      intensity.set(tag.label, (intensity.get(tag.label) ?? 0) + tag.intensity);
    }
  }
  const dominant = [...intensity.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ASCETIC";

  const archetype = `The ${ARCHETYPE_PREFIX[d % ARCHETYPE_PREFIX.length]} ${ARCHETYPE_SUFFIX[(d >> 3) % ARCHETYPE_SUFFIX.length]}`;
  const palette = PALETTES[d % PALETTES.length];
  const tension = TENSIONS[(d >> 5) % TENSIONS.length];
  const keptCount = kept.length;
  const refusedCount = refused.length;
  const refuseRatio = refusedCount / Math.max(1, keptCount + refusedCount);

  let critique: string;
  if (refusedCount === 0) {
    critique =
      "You kept everything. That is not curation, that is hoarding with better typography. Taste is established in the absolute negatives — go back downstairs and refuse something.";
  } else if (refuseRatio > 0.5) {
    critique = `Interesting. You refused more than you kept — an editor's instinct, not a consumer's. What survives your purge reads as ${dominant.toLowerCase()} at its core, and it survives because everything that merely flattered you was cut.`;
  } else {
    critique = `A disciplined intake. The ${dominant.toLowerCase()} signal is legible now — not because you added the right things, but because you removed the almost-right ones. The almost-right is always the enemy.`;
  }

  const directive =
    refuseRatio > 0.4
      ? "Choose silence over saturation. Publish less; mean more."
      : "You are still negotiating with the feed. Refuse one more thing before you ascend.";

  const positioning = `"A ${dominant.toLowerCase()} sensibility, sharpened by deliberate absence."`;
  const manifesto = `I keep ${keptCount} object${keptCount === 1 ? "" : "s"} and refuse ${refusedCount}. My eye is not a net — it is a blade. What remains after the refusal is not a collection; it is a position. ${dominant.charAt(0)}${dominant.slice(1).toLowerCase()} is the residue that could not be cut.`;

  return {
    archetype,
    positioning,
    critique,
    directive,
    tension,
    palette,
    manifesto,
  };
}

export function matchesHouseQuery(
  query: string,
  raw: string,
  tags: DebrisTag[],
  extra: string[] = [],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [raw, ...tags.map((t) => t.label), ...extra].join(" ").toLowerCase();
  return haystack.includes(q);
}

/**
 * Doll Engine verification — procedural mapping, identity pack, masks, companion.
 * Run: npx tsx scripts/verifyDollEngine.ts
 * No Firebase / network required.
 */

import type { Doll, DollMask } from "../types";
import {
  buildDollCompanionBundle,
  buildDollPromptContext,
  buildIdentityViewPrompt,
  collectIdentityImageReferences,
  defaultMaskSeedsForDoll,
  deriveProceduralAesthetic,
  identityPackCompleteness,
  mergeIdentityReference,
  pickActiveMask,
  pickPalettePair,
  resolveColorToken,
} from "../services/dollEngine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const fixtureDoll: Doll = {
  id: "doll_verify_1",
  userId: "user_1",
  projectId: "proj_1",
  tasteGraphId: "graph_1",
  name: "Lattice Veil",
  description: "A structural editorial proxy",
  visualLanguage: ["architectural grid", "restrained noir"],
  palette: ["ochre", "ink", "#c4a35a"],
  materials: ["vinyl", "brushed steel"],
  silhouette: "columnar structured",
  motifs: ["lattice", "halo geometry"],
  eyeTreatment: "glass iris with micro-grid",
  emotionalRegister: "composed tension",
  creativePhilosophy: "Authority through exclusion and repetition.",
  creativeLawIds: ["law_1"],
  strengths: ["silhouette discipline", "material contrast"],
  blindSpots: ["over-ornament risk"],
  preferredMediums: ["editorial plate", "illustration"],
  favoriteShapes: ["column", "circle"],
  favoriteContrasts: ["matte vs lacquer"],
  signatureMotifs: ["grid halo"],
  suggestedExperiments: ["invert palette"],
  sourceEvidenceIds: ["ev_1"],
  maskIds: [],
  createdAt: 1,
  updatedAt: 1,
};

let passed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

check("resolveColorToken maps named + hex", () => {
  assert(resolveColorToken("#abc", "#000") === "#aabbcc", "short hex expand");
  assert(resolveColorToken("deep ochre wash", "#000").startsWith("#"), "named ochre");
  assert(resolveColorToken("", "#131313") === "#131313", "fallback");
});

check("pickPalettePair returns distinct pair", () => {
  const pair = pickPalettePair(["ink", "ochre"]);
  assert(pair.primary !== pair.secondary, "distinct colors");
});

check("deriveProceduralAesthetic maps grid + gloss", () => {
  const aesthetic = deriveProceduralAesthetic(fixtureDoll);
  assert(aesthetic.pattern === "grid", `expected grid, got ${aesthetic.pattern}`);
  assert(aesthetic.glossiness >= 0.8, "vinyl/steel should gloss");
  assert(aesthetic.accessoryMode === "halo" || aesthetic.accessoryMode === "crown", "accessory");
});

check("userLocked aesthetic is preserved", () => {
  const locked = deriveProceduralAesthetic({
    ...fixtureDoll,
    proceduralAesthetic: {
      pattern: "marble",
      primaryColor: "#ff0000",
      secondaryColor: "#00ff00",
      complexity: 9,
      warpSpeed: 2,
      warpIntensity: 0.2,
      glossiness: 0.1,
      accessoryMode: "none",
      userLocked: true,
    },
  });
  assert(locked.pattern === "marble", "locked pattern");
  assert(locked.primaryColor === "#ff0000", "locked color");
});

check("unlocked saved aesthetic re-derives from Doll fields", () => {
  const fresh = deriveProceduralAesthetic(fixtureDoll);
  const unlocked = deriveProceduralAesthetic({
    ...fixtureDoll,
    proceduralAesthetic: {
      pattern: "marble",
      primaryColor: "#ff0000",
      secondaryColor: "#00ff00",
      complexity: 9,
      warpSpeed: 2,
      warpIntensity: 0.2,
      glossiness: 0.1,
      accessoryMode: "none",
      userLocked: false,
    },
  });
  assert(unlocked.pattern === fresh.pattern, "unlocked pattern re-derived");
  assert(unlocked.primaryColor === fresh.primaryColor, "unlocked color re-derived");
  assert(unlocked.userLocked === false, "stays unlocked");
});

check("identity pack merge + completeness", () => {
  let pack = mergeIdentityReference(undefined, "portrait", "https://example.com/p.jpg");
  pack = mergeIdentityReference(pack, "full_body", "https://example.com/f.jpg");
  const doll = {
    ...fixtureDoll,
    identityReferences: pack,
    generatedImageUrl: pack.portraitUrl,
  };
  const status = identityPackCompleteness(doll);
  assert(status.filled === 2, `filled=${status.filled}`);
  assert(status.missing.includes("profile"), "profile missing");
  const refs = collectIdentityImageReferences(doll);
  assert(refs.some((r) => r.name === "Doll Portrait"), "portrait ref named for stable-face");
  assert(refs.some((r) => r.name === "Doll Full Body"), "full body ref");
});

check("identity view prompts include lock language", () => {
  const prompt = buildIdentityViewPrompt(fixtureDoll, "profile");
  assert(/Doll Profile/i.test(prompt) || /profile/i.test(prompt), "profile framing");
  assert(prompt.includes(fixtureDoll.name), "name lock");
  assert(/shell-v1|Mimi Shell/i.test(prompt), "shell staple version");
  assert(/elongated slender neck/i.test(prompt), "shell proportions");
  assert(/porcelain/i.test(prompt), "porcelain medium");
});

check("default masks + companion bundle", () => {
  const seeds = defaultMaskSeedsForDoll(fixtureDoll);
  assert(seeds.length === 3, `expected 3 masks, got ${seeds.length}`);
  const masks: DollMask[] = seeds.map((s, i) => ({
    ...s,
    id: `mask_${i}`,
    createdAt: 1,
  }));
  const active = pickActiveMask(masks, masks[1].id);
  assert(active?.id === masks[1].id, "active mask pick");
  const ctx = buildDollPromptContext(fixtureDoll, active);
  assert(
    ctx.includes("MIMI SHELL") || ctx.includes("DOLL IDENTITY ACTIVE"),
    "prompt header",
  );
  assert(ctx.includes("ACTIVE MASK"), "mask block");
  assert(/elongated slender neck/i.test(ctx), "shell species lock in companion");
  const bundle = buildDollCompanionBundle(fixtureDoll, masks, masks[1].id);
  assert(bundle.activeMaskRole === masks[1].role, "bundle role");
  assert(bundle.scribeExcerpt.includes(fixtureDoll.name), "scribe excerpt");
});

console.log(`\nDoll Engine verify: ${passed} checks passed.`);

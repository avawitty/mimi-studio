/**
 * mimi.rip Inverse Taste Projection — offline verification.
 * Run: npx tsx scripts/verifyRipEngine.ts
 */

import type { Doll, EvidenceBasedCreativeDossier, LikenessManifest } from "../types";
import {
  buildPublicRipSnapshot,
  buildRipReadingDraft,
  oppositeColorToken,
  oppositePaletteFrom,
  applySemioticInversion,
  buildInverseSemioticTouchpoints,
} from "../services/ripEngine";
import { getSiteSkin, isRipHost, parseRipPublicHandle } from "../lib/siteHost";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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

const likeness: LikenessManifest = {
  accentHex: "#8a8a7a",
  paperWarmth: "warm",
  voiceAdjectives: ["precise", "observational"],
  motifCandidates: ["lattice", "veil"],
  antiMotifs: ["neon cyberpunk", "stock pastel influencer"],
  containerName: "Lattice Veil",
  oneSentencePhilosophy: "Authority through exclusion and repetition.",
};

const dossier = {
  dossierTitle: "Test",
  userIntent: "test",
  references: [],
  patternGraph: { recurringSignals: [], outliers: [] },
  creativeOperatingSystem: {
    containerName: "Lattice Veil",
    oneSentencePhilosophy: "Authority through exclusion and repetition.",
    designLaws: [],
    visualGrammar: [],
    materialVocabulary: ["vinyl"],
    emotionalVocabulary: ["composed"],
    colorLogic: "ochre against ink",
    compositionLogic: "asymmetric restraint",
    typographyLogic: "serif display",
    symbolLogic: "grid halo",
    thingsToAvoid: ["genre labels without citations", "palette drift"],
  },
  applications: {
    illustration: [],
    brand: [],
    ui: [],
    writing: [],
    photography: [],
    packaging: [],
    fashion: [],
    product: [],
  },
  inversions: [
    {
      becauseYouTendTo: "Return to material safety",
      tryInstead: "Admit one refused texture for a single plate",
      evidenceRefIds: ["ev_1"],
    },
  ],
  nextExperiments: [{ title: "Invert exclusion for one spread", hypothesis: "h", evidenceRefIds: [] }],
  likenessManifest: likeness,
} as EvidenceBasedCreativeDossier;

const doll: Doll = {
  id: "doll_1",
  userId: "u1",
  tasteGraphId: "g1",
  name: "Lattice Veil",
  description: "proxy",
  visualLanguage: ["architectural grid"],
  palette: ["#c4a35a", "ink"],
  materials: ["vinyl"],
  silhouette: "columnar structured",
  motifs: ["lattice"],
  emotionalRegister: "composed tension",
  creativePhilosophy: "Authority through exclusion.",
  creativeLawIds: [],
  strengths: ["restraint"],
  blindSpots: ["over-ornament risk"],
  preferredMediums: [],
  favoriteShapes: [],
  favoriteContrasts: ["matte vs lacquer"],
  signatureMotifs: [],
  suggestedExperiments: ["invert palette once"],
  sourceEvidenceIds: [],
  maskIds: [],
  createdAt: 1,
  updatedAt: 1,
};

check("oppositeColorToken complementary hex", () => {
  const opp = oppositeColorToken("#ff0000");
  assert(opp.startsWith("#") && opp !== "#ff0000", `got ${opp}`);
});

check("oppositePaletteFrom mixes tokens", () => {
  const pal = oppositePaletteFrom(["#112233", "ochre"]);
  assert(pal.length >= 2, "expected pair");
});

check("applySemioticInversion maps neon cyberpunk", () => {
  const inv = applySemioticInversion("neon cyberpunk");
  assert(inv.node.includes("analog") || inv.node.includes("mesopic"), inv.node);
});

check("buildInverseSemioticTouchpoints from refusals", () => {
  const tps = buildInverseSemioticTouchpoints({
    antiMotifs: likeness.antiMotifs,
    blindSpots: doll.blindSpots,
    doll,
    dossier,
    likeness,
  });
  assert(tps.length >= 3, "touchpoints");
  assert(tps.some((t) => t.inverseFunction === "semiotic_inversion"), "semiotic");
});

check("buildRipReadingDraft consumes refusals + doll", () => {
  const draft = buildRipReadingDraft({
    userId: "u1",
    dossier,
    likeness,
    doll,
  });
  assert(draft.visibility === "private", "private default");
  assert(draft.antiMotifs.includes("neon cyberpunk"), "anti motif");
  assert(draft.blindSpots.includes("over-ornament risk"), "blind spot");
  assert(draft.inversions.length >= 1, "inversions");
  assert(draft.inversions[0].rationale, "inversion rationale");
  assert(draft.inversions[0].inverseFunction, "inverse function");
  assert(/Inverse thesis/i.test(draft.shadowThesis), "thesis");
  assert(draft.provenanceNotes.some((n) => /Not identity/i.test(n)), "disclaimer");
  assert(draft.inputCoverage?.coverageScore > 0.5, "coverage");
  assert(draft.fieldAttributions?.length >= 3, "attributions");
  assert(draft.semioticTouchpoints?.length >= 2, "touchpoints");
  assert(draft.inverseRecommendations?.length >= 2, "recommendations");
});

check("buildPublicRipSnapshot opt-in shape", () => {
  const draft = buildRipReadingDraft({ userId: "u1", dossier, likeness, doll });
  const reading = {
    ...draft,
    id: "rip_1",
    createdAt: 1,
    updatedAt: 1,
  };
  const snap = buildPublicRipSnapshot("atelier-test", reading);
  assert(snap.handle === "atelier-test", "handle");
  assert(snap.sourceRipId === "rip_1", "source");
  assert(snap.antiMotifs.length > 0, "public anti");
  assert(snap.shadowExperiments?.length > 0, "public experiments parity");
  assert(snap.semioticTouchpoints?.length > 0, "public touchpoints");
});

check("siteHost rip detection + parse", () => {
  assert(isRipHost("mimi.rip") === true, "host");
  assert(isRipHost("www.mimi.rip") === true, "www");
  assert(isRipHost("mimi.you") === false, "you");
  assert(parseRipPublicHandle("/u/ava") === "ava", "u path");
  assert(parseRipPublicHandle("/ava") === "ava", "bare");
  assert(parseRipPublicHandle("/studio") === null, "reserved");
  assert(getSiteSkin("mimi.rip") === "rip", "skin");
  assert(getSiteSkin("mimi.you") === "you", "you skin");
});

console.log(`\nmimi.rip verify: ${passed} checks passed.`);

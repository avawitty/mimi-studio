/**
 * Smoke checks for local dossier / manifesto synthesis (no LLM required).
 */
import {
  synthesizeLocalCreativeDossier,
  synthesizeLocalTailorAudit,
  buildPriorTasteContextFromProfile,
} from "../services/localDossierSynthesis";

const digest = `
— POSITIONING —
Materiality: cleaved basalt, damp lichen
Silhouettes: monolith, slab
References: Tadao Ando, Brutalist gardens
Refusals: glossy neon tech-futurism
— EXPRESSION —
Primary color: #2B2A27
Accent color: #83907A
Voice — emotional temperature: observational
— STRATEGY —
Deepen: mineral logic boards
Experiment: techno-organic joinery
Refuse: soft gradient pastels
— SUMMARY —
Aesthetic DNA: Ancient mineral monoliths integrated with precision-milled computer logic boards.
`;

const prior = buildPriorTasteContextFromProfile({
  tasteProfile: {
    aestheticSignature: {
      primaryAxis: "Neolithic Brutalism",
      secondaryAxis: "Techno-Organic",
      coreTrait: "Ancient mineral monoliths integrated with precision-milled computer logic boards.",
      motifs: ["Basalt Pillars", "Lichen Micro-Grids"],
      moodCluster: "Sub-Tectonic Moss",
      generatedAt: Date.now(),
      influenceLineage: [],
      creativeCycles: [],
      motifEvolution: [],
      paletteExtraction: ["#2B2A27", "#1E1E1C", "#4F5D4E", "#83907A", "#D0C9BC"],
      tactileBias: { dominant: "Cleaved Basalt", secondary: "Damp Lichen" },
      typographicPairing: { serif: "Garamond Premier Pro", sans: "Fira Code" },
    },
  },
  lastAuditReport: {
    profileManifesto: "Stay mineral and precise.",
    strategicOpportunity: "Publish exclusions around neon gloss.",
    aestheticDirectives: ["Lead with basalt before chrome", "Keep lichen as soft counterweight"],
    suggestedTouchpoints: ["Ando water temples", "Moss garden essays"],
  },
  tailorDraft: {
    styleEvidence: [
      {
        id: "1",
        type: "image_reference",
        value: "basalt study",
        source: "tailor_evidence",
        scope: "persistent",
        weight: 0.8,
        notes: "verify",
        approvedAt: Date.now(),
      },
    ],
  },
});

const dossier = synthesizeLocalCreativeDossier({
  imageCount: 0,
  userBlurb: "My own personal style.",
  blueprintDigest: digest,
  prior,
});

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};

assert(dossier.creativeOperatingSystem.containerName.includes("Neolithic"), "container should build on prior axis");
assert(dossier.patternGraph.recurringSignals.length >= 2, "need recurring signals");
assert(dossier.nextExperiments.some((e) => /Reading|reference|strategic/i.test(e.title)), "need readings/recs");
assert(dossier.creativeOperatingSystem.designLaws.length >= 3, "need design laws");
assert(!/gemini/i.test(JSON.stringify(dossier)), "local dossier must not mention gemini");

// Blueprint-only palette + exclusion-principles digest label (bugbot PR #85)
const digestWithExclusionLabel = `
Primary color: #112233
Accent color: #445566
Base neutral: #778899
Exclusion principles (what they refuse): soft gradient pastels, trend mimicry
`;
const blueprintOnly = synthesizeLocalCreativeDossier({
  imageCount: 0,
  blueprintDigest: digestWithExclusionLabel,
});
assert(
  blueprintOnly.likenessManifest.accentHex === "#445566" ||
    blueprintOnly.references.some((r) => r.colorSystem.palette.includes("#112233")),
  "declared blueprint hex colors must feed hexPalette / likeness",
);
assert(
  JSON.stringify(blueprintOnly).toLowerCase().includes("soft gradient") ||
    JSON.stringify(blueprintOnly).toLowerCase().includes("trend mimicry"),
  "exclusion principles digest label must feed refuse / anti-motifs",
);

const audit = synthesizeLocalTailorAudit(
  {
    positioningCore: {
      anchors: { culturalReferences: ["Tadao Ando"], geographicAnchors: [], temporalAnchors: [] },
      aestheticCore: {
        silhouettes: ["monolith"],
        materiality: ["cleaved basalt"],
        eraBias: "",
        mediaStyle: "",
        presentation: "",
        density: 5,
        entropy: 4,
        tags: ["neolithic"],
      },
      exclusionPrinciples: ["glossy neon"],
    },
    strategicVectors: {
      desireVectors: { deepen: ["mineral logic"], experiment: [], reduce: [], refuse: ["pastel gradients"] },
      expansionTolerance: 4,
      fiscalVelocity: "slow",
      saturationAwareness: { oversaturatedClusters: [], fragileDifferentiators: [] },
    },
  } as any,
  prior,
);

assert(audit.profileManifesto.length > 20, "manifesto present");
assert(audit.aestheticDirectives.length >= 3, "directives present");
assert(audit.suggestedTouchpoints.length >= 2, "touchpoints / readings present");

console.log("OK local dossier + manifesto synthesis");
console.log(
  JSON.stringify(
    {
      container: dossier.creativeOperatingSystem.containerName,
      laws: dossier.creativeOperatingSystem.designLaws.map((l) => l.law),
      experiments: dossier.nextExperiments.map((e) => e.title),
      manifesto: audit.profileManifesto,
      directives: audit.aestheticDirectives,
    },
    null,
    2,
  ),
);

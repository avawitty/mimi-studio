import type {
  CreativeLaw,
  EvidenceNode,
  PatternCluster,
  TailorLogicDraft,
  TailorProject,
} from '../types';
import {
  compileTailorProfileFromGraph,
  createTailorProfileFromLegacyDraft,
  createTailorWidgetProjection,
  parseTailorImport,
  tailorProfileSchema,
  tailorProfileToLegacyDraft,
} from '../services/tailorProfileContract';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = '2026-07-24T12:00:00.000Z';

const legacyDraft = {
  positioningCore: {
    anchors: {
      culturalReferences: ['Brutalism', 'Cyber-Noir', 'Analog-Glitch'],
      ideologicalBias: [] as string[],
    },
    aestheticCore: {
      silhouettes: ['Architectural'],
      materiality: ['Paper grain'],
      eraBias: 'Post-Digital',
      presentation: 'Androgynous',
      density: 5,
      entropy: 5,
      tags: ['post-digital', 'restrained'],
    },
    positioningAxis: 'Noise vs Signal',
    authorityClaim: 'Aesthetic infrastructure for durable cultural positioning.',
    exclusionPrinciples: ['No generic futurism'],
  },
  algoDials: {
    webScry: 50,
    memorySynthesis: 50,
    dissonance: 10,
  },
  visual_guidance: {
    strict_palette: [] as string[],
    negative_prompt: 'Decorative glitch without purpose',
  },
  expressionEngine: {
    chromaticRegistry: {
      primaryPalette: [{ name: 'Paper', hex: '#F2F1ED' }],
      baseNeutral: '#F2F1ED',
      accentSignal: '#1C1917',
    },
    colorPalette: {
      primary: '#F2F1ED',
      accent: '#1C1917',
    },
    typographyIntent: {
      styleDescription: 'Editorial serif',
      weightPreference: 'Light',
    },
    typography: {
      serif: 'Cormorant Garamond',
      sans: 'Inter',
      mono: 'Space Mono',
    },
    visualPresets: {
      silhouette: 'Architectural',
      texture: 'Paper grain',
      era: 'Post-Digital',
    },
    narrativeVoice: {
      emotionalTemperature: 'clinical',
      structureBias: 'concise',
      lexicalDensity: 5,
      restraintLevel: 8,
      tone: 'precise',
    },
  },
  strategicVectors: {
    expansionTolerance: 5,
    fiscalVelocity: 'measured',
    desireVectors: {
      deepen: ['Controlled contrast'],
      reduce: [] as string[],
      experiment: [] as string[],
      refuse: ['Reactive trend commentary'],
    },
    saturationAwareness: {
      oversaturatedClusters: [] as string[],
      fragileDifferentiators: [] as string[],
    },
  },
  diagnostics: {
    contradictionFlags: [] as string[],
    dilutionRisks: ['Broad references need more concrete evidence'],
    authorityStrengthScore: 72,
    driftVulnerability: 5,
  },
  strategicSummary: {
    identityVector: 'A restrained post-digital system that separates signal from noise.',
    authorityAnchor: 'Aesthetic infrastructure.',
    exclusionRules: ['No generic futurism'],
    elasticityIndex: 5,
    tonalConstraints: 'Restrained and precise.',
    aestheticDNA: 'Post-Digital Signal Discipline',
  },
  generationTemperature: 0.8,
  draftStatus: 'provisional',
  lastTailored: Date.parse(now),
} satisfies TailorLogicDraft;

const legacyProfile = createTailorProfileFromLegacyDraft(legacyDraft, {
  profileId: 'tailor_personal_01',
  profileName: 'Personal',
  now,
});
assert(tailorProfileSchema.safeParse(legacyProfile).success, 'Legacy conversion must produce a valid v2 profile');
assert(
  legacyProfile.sourceMaterial.references.length === 3,
  'Legacy cultural references must become source evidence',
);
assert(
  legacyProfile.generationContract.avoid.includes('No generic futurism'),
  'Legacy exclusions must become executable avoid rules',
);
assert(
  legacyProfile.provenance.claims[0]?.method === 'imported_legacy',
  'Imported inference must be labeled as imported legacy data',
);

const styleEvidenceProfile = createTailorProfileFromLegacyDraft(
  {
    ...legacyDraft,
    styleEvidence: [
      {
        id: 'style_evidence_01',
        type: 'image_reference',
        value: 'Creator reference image',
        source: 'tailor_evidence',
        scope: 'persistent',
        weight: 0.8,
        notes: 'Approved in Style Lab.',
        approvedAt: Date.parse(now),
      },
    ],
  },
  { profileId: 'tailor_style_01', profileName: 'Style Lab', now },
);
assert(
  styleEvidenceProfile.sourceMaterial.references.some(
    (reference) => reference.id === 'style_evidence_01',
  ),
  'Creator-approved Style Lab references must compile into canonical source evidence',
);
assert(
  styleEvidenceProfile.provenance.evidenceItems.some(
    (item) =>
      item.id === 'style_evidence_01' && item.origin === 'tailor_evidence',
  ),
  'Style Lab evidence must preserve its Tailor evidence provenance',
);

const widget = createTailorWidgetProjection(legacyProfile);
assert(widget.widget.type === 'mimi.tailor.profile-summary', 'Widget projection type must be stable');
assert(!('sourceMaterial' in widget), 'Widget projection must not expose the full canonical profile');
assert(widget.widget.nextQuestion?.id.includes('antireferences'), 'Widget should ask the highest-value missing question');

const roundTrippedDraft = tailorProfileToLegacyDraft(legacyProfile);
assert(
  roundTrippedDraft.positioningCore.anchors.culturalReferences.includes('Brutalism'),
  'Canonical-to-legacy projection must preserve references',
);
assert(
  roundTrippedDraft.positioningCore.exclusionPrinciples.includes('No generic futurism'),
  'Canonical-to-legacy projection must preserve avoid rules',
);

const parsedCanonical = parseTailorImport(legacyProfile);
assert(parsedCanonical.sourceFormat === 'tailor-profile-v2', 'Canonical JSON must be detected as v2');
const parsedCanonicalOverExisting = parseTailorImport(legacyProfile, {
  ...legacyDraft,
  positioningCore: {
    ...legacyDraft.positioningCore,
    anchors: {
      ...legacyDraft.positioningCore.anchors,
      culturalReferences: ['Old local reference'],
    },
  },
});
assert(
  parsedCanonicalOverExisting.draft.positioningCore.anchors.culturalReferences.includes('Brutalism'),
  'Imported v2 fields must override stale local blueprint values',
);
const parsedLegacy = parseTailorImport(legacyDraft);
assert(parsedLegacy.sourceFormat === 'legacy-tailor-draft', 'Legacy JSON must remain importable');

const project: TailorProject = {
  id: 'project_01',
  userId: 'user_01',
  title: 'Campaign system',
  intent: 'campaign',
  blurb: 'Build a restrained editorial campaign.',
  evidenceCount: 3,
  readConfidence: 'initial',
  analysisStatus: 'analyzed',
  createdAt: Date.parse(now),
  updatedAt: Date.parse(now),
};

const evidence = ['Brutalist grid', 'Paper archive', 'Clinical caption'].map((title, index): EvidenceNode => ({
  id: `evidence_${index + 1}`,
  userId: 'user_01',
  projectId: project.id,
  sourceType: index === 2 ? 'note' : 'image',
  title,
  userCaption: title,
  analysisStatus: 'analyzed',
  createdAt: Date.parse(now),
  updatedAt: Date.parse(now),
}));

const clusters: PatternCluster[] = [
  {
    id: 'cluster_01',
    userId: 'user_01',
    projectId: project.id,
    name: 'Structured composition',
    description: 'Grid and archive structures recur.',
    category: 'compositional',
    observationIds: ['observation_01'],
    supportingEvidenceNodeIds: ['evidence_01', 'evidence_02'],
    frequency: 2,
    confidence: 0.8,
    possibleInterpretations: ['Structure creates restraint.'],
    claimType: 'user_confirmed',
    userStatus: 'accepted',
    userWeight: 'signature',
    createdAt: Date.parse(now),
    updatedAt: Date.parse(now),
  },
];

const laws: CreativeLaw[] = [
  {
    id: 'law_01',
    userId: 'user_01',
    projectId: project.id,
    title: 'Structure before decoration',
    principle: 'Use the grid to clarify the idea before adding texture.',
    explanation: 'The creator confirmed structure as the useful recurring signal.',
    supportingPatternClusterIds: ['cluster_01'],
    supportingEvidenceNodeIds: ['evidence_01', 'evidence_02'],
    confidence: 0.84,
    claimType: 'user_confirmed',
    userStatus: 'accepted',
    applications: ['brand', 'ui'],
    avoidances: ['Decorative texture without hierarchy'],
    createdAt: Date.parse(now),
    updatedAt: Date.parse(now),
  },
];

const graphProfile = compileTailorProfileFromGraph({
  project,
  evidence,
  observations: [],
  clusters,
  laws,
  now,
});
assert(graphProfile.meta.status === 'confirmed', 'Three references plus accepted pattern and law should confirm the profile');
assert(graphProfile.diagnostics.readyForGeneration, 'Curated graph should be generation-ready');
assert(
  graphProfile.compiledProfile.workingThesis.evidenceIds.length === 2,
  'Graph thesis must cite its supporting evidence',
);
assert(
  graphProfile.generationContract.avoid.includes('Decorative texture without hierarchy'),
  'Accepted Creative Law avoidances must become generation rules',
);

let rejectedInvalid = false;
try {
  parseTailorImport({ schemaVersion: '2.0.0' });
} catch {
  rejectedInvalid = true;
}
assert(rejectedInvalid, 'Invalid JSON must be rejected instead of silently imported');

console.log('Tailor Profile v2 contract verification: PASS');
console.log('Legacy draft → canonical profile → legacy projection: PASS');
console.log('Taste Graph → evidence-linked canonical profile: PASS');
console.log('Canonical profile → mini-app projection: PASS');

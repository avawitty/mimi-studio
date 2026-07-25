import { z } from 'zod';
import type {
  CreativeLaw,
  EvidenceNode,
  Observation,
  PatternCluster,
  TailorLogicDraft,
  TailorProject,
} from '../types';

export const TAILOR_PROFILE_SCHEMA_VERSION = '2.0.0' as const;

export const TAILOR_PRODUCT_DESCRIPTION =
  'Tailor is Mimi’s explainable taste-compilation layer. It transforms references, refusals, constraints, language, and creator corrections into a versioned creative profile that separates persistent taste from the needs of the current project. Its output gives people and generative systems a shared contract for what to preserve, transform, avoid, and produce, with every major conclusion traceable to evidence and assigned a confidence level.';

const confidenceSchema = z.number().min(0).max(1);
const isoDateSchema = z.string().datetime();
const nonEmptyStringSchema = z.string().trim().min(1);

const sourceReferenceSchema = z.object({
  id: nonEmptyStringSchema,
  type: nonEmptyStringSchema,
  value: nonEmptyStringSchema,
  source: z.enum(['user_input', 'tailor_evidence', 'imported_json', 'system']),
  scope: z.enum(['persistent', 'project', 'session']),
  weight: confidenceSchema,
  notes: z.string(),
});

const directStatementSchema = z.object({
  id: nonEmptyStringSchema,
  statement: nonEmptyStringSchema,
  scope: z.enum(['persistent', 'project', 'session']),
  source: z.enum(['user_input', 'tailor_evidence', 'imported_json', 'system']),
});

const transformRuleSchema = z.object({
  input: nonEmptyStringSchema,
  method: nonEmptyStringSchema,
  strength: confidenceSchema,
});

const provenanceClaimSchema = z.object({
  path: nonEmptyStringSchema,
  method: z.enum([
    'model_inference',
    'user_stated',
    'user_confirmed',
    'imported_legacy',
    'deterministic_compilation',
  ]),
  derivedFrom: z.array(nonEmptyStringSchema),
  confidence: confidenceSchema,
  userConfirmed: z.boolean(),
});

const diagnosticIssueSchema = z.object({
  message: nonEmptyStringSchema,
  severity: z.enum(['low', 'medium', 'high']),
  resolution: z.string().optional(),
});

const missingFieldSchema = z.object({
  path: nonEmptyStringSchema,
  reason: nonEmptyStringSchema,
  priority: confidenceSchema,
  suggestedQuestion: nonEmptyStringSchema,
});

export const tailorProfileSchema = z.object({
  meta: z.object({
    profileId: nonEmptyStringSchema,
    profileName: nonEmptyStringSchema,
    schemaVersion: z.literal(TAILOR_PROFILE_SCHEMA_VERSION),
    status: z.enum(['provisional', 'confirmed', 'evolving', 'archived']),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    compiler: z.object({
      name: z.literal('mimi-tailor'),
      version: nonEmptyStringSchema,
    }),
  }),
  scope: z.object({
    mode: z.enum(['personal', 'project', 'hybrid']),
    objectType: nonEmptyStringSchema,
    workingTitle: z.string(),
    projectTypes: z.array(nonEmptyStringSchema),
    intendedHelp: z.array(nonEmptyStringSchema),
    persistence: z.object({
      strategy: z.enum(['persistent', 'session', 'hybrid']),
      persistentPaths: z.array(nonEmptyStringSchema),
      sessionPaths: z.array(nonEmptyStringSchema),
    }),
    currentProject: z.object({
      title: z.string(),
      summary: z.string(),
      audience: z.string(),
      contextOfUse: z.string(),
      mediums: z.array(nonEmptyStringSchema),
      successDefinition: z.string(),
      desiredReaction: z.string(),
    }),
  }),
  sourceMaterial: z.object({
    references: z.array(sourceReferenceSchema),
    antiReferences: z.array(sourceReferenceSchema),
    directStatements: z.array(directStatementSchema),
    nearMisses: z.array(sourceReferenceSchema),
    corrections: z.array(directStatementSchema),
    constraints: z.object({
      hard: z.array(nonEmptyStringSchema),
      soft: z.array(nonEmptyStringSchema),
      budgetSensitivity: z.string().nullable(),
      timeline: z.string().nullable(),
      sourcingLimits: z.array(nonEmptyStringSchema),
      nonNegotiables: z.array(nonEmptyStringSchema),
      flexibleAreas: z.array(nonEmptyStringSchema),
    }),
  }),
  compiledProfile: z.object({
    workingThesis: z.object({
      statement: z.string(),
      confidence: confidenceSchema,
      evidenceIds: z.array(nonEmptyStringSchema),
    }),
    identityVector: z.object({
      positioningAxis: z.object({
        from: z.string(),
        toward: z.string(),
      }),
      authorityClaim: z.string(),
      authorityStrength: confidenceSchema,
      differentiationStrategy: z.array(nonEmptyStringSchema),
    }),
    aestheticDNA: z.object({
      primaryCodes: z.array(nonEmptyStringSchema),
      eraBias: z.array(nonEmptyStringSchema),
      presentation: z.array(nonEmptyStringSchema),
      silhouettes: z.array(nonEmptyStringSchema),
      materiality: z.array(nonEmptyStringSchema),
      symbolicMotifs: z.array(nonEmptyStringSchema),
      density: z.object({
        value: confidenceSchema,
        interpretation: z.string(),
      }),
      entropy: z.object({
        value: confidenceSchema,
        interpretation: z.string(),
      }),
    }),
    visualGrammar: z.object({
      palette: z.object({
        baseNeutral: z.string(),
        accentSignal: z.string(),
        supportingColors: z.array(z.string()),
        strict: z.boolean(),
        avoid: z.array(z.string()),
      }),
      typography: z.object({
        serif: z.string(),
        sans: z.string(),
        mono: z.string(),
        weightPreference: z.string(),
        direction: z.array(nonEmptyStringSchema),
      }),
      composition: z.array(nonEmptyStringSchema),
      cameraLanguage: z.array(nonEmptyStringSchema),
      lighting: z.array(nonEmptyStringSchema),
      spatialRules: z.array(nonEmptyStringSchema),
      materialCues: z.array(nonEmptyStringSchema),
    }),
    verbalIdentity: z.object({
      emotionalTemperature: z.string(),
      structureBias: z.string(),
      tone: z.array(nonEmptyStringSchema),
      lexicalDensity: confidenceSchema,
      restraint: confidenceSchema,
      preferredWords: z.array(nonEmptyStringSchema),
      forbiddenWords: z.array(nonEmptyStringSchema),
      typicalPhrases: z.array(nonEmptyStringSchema),
      forbiddenPhrases: z.array(nonEmptyStringSchema),
      voiceNotes: z.string(),
    }),
    positioning: z.object({
      culturalReferences: z.array(nonEmptyStringSchema),
      ideologicalBiases: z.array(nonEmptyStringSchema),
      trendRelationship: z.string(),
      luxuryCodes: z.array(nonEmptyStringSchema),
      oversaturatedClusters: z.array(nonEmptyStringSchema),
      fragileDifferentiators: z.array(nonEmptyStringSchema),
    }),
    strategicOrientation: z.object({
      expansionTolerance: confidenceSchema,
      fiscalVelocity: z.enum(['conservative', 'measured', 'accelerated']),
      deepen: z.array(nonEmptyStringSchema),
      reduce: z.array(nonEmptyStringSchema),
      experiment: z.array(nonEmptyStringSchema),
      refuse: z.array(nonEmptyStringSchema),
    }),
  }),
  generationContract: z.object({
    objective: nonEmptyStringSchema,
    preserve: z.array(nonEmptyStringSchema),
    emphasize: z.array(nonEmptyStringSchema),
    transform: z.array(transformRuleSchema),
    avoid: z.array(nonEmptyStringSchema),
    globalRefusals: z.array(nonEmptyStringSchema),
    projectConstraints: z.array(nonEmptyStringSchema),
    flexibility: z.object({
      strictAreas: z.array(nonEmptyStringSchema),
      flexibleAreas: z.array(nonEmptyStringSchema),
      referenceInfluence: confidenceSchema,
      generationTemperature: confidenceSchema,
    }),
    modelInstructions: z.object({
      reasoningPolicy: z.array(nonEmptyStringSchema),
      responseStructure: z.array(nonEmptyStringSchema),
    }),
  }),
  requestedOutputs: z.object({
    artifactTypes: z.array(nonEmptyStringSchema),
    formatDirection: z.string(),
    mediumRequirements: z.array(nonEmptyStringSchema),
    reusableComponents: z.array(nonEmptyStringSchema),
    persistentComponents: z.array(nonEmptyStringSchema),
    acceptanceCriteria: z.array(nonEmptyStringSchema),
  }),
  provenance: z.object({
    evidenceItems: z.array(z.object({
      id: nonEmptyStringSchema,
      origin: z.enum(['user_input', 'tailor_evidence', 'imported_json', 'system']),
      capturedAt: isoDateSchema,
    })),
    claims: z.array(provenanceClaimSchema),
  }),
  diagnostics: z.object({
    completeness: z.object({
      overall: confidenceSchema,
      persistentProfile: confidenceSchema,
      currentProject: confidenceSchema,
      generationReadiness: confidenceSchema,
    }),
    confidence: z.object({
      overall: confidenceSchema,
      aestheticDNA: confidenceSchema,
      visualGrammar: confidenceSchema,
      verbalIdentity: confidenceSchema,
      positioning: confidenceSchema,
    }),
    contradictions: z.array(diagnosticIssueSchema),
    dilutionRisks: z.array(diagnosticIssueSchema),
    missingHighValueFields: z.array(missingFieldSchema),
    driftVulnerability: confidenceSchema,
    readyForGeneration: z.boolean(),
    nextBestAction: z.string(),
  }),
  runtimeConfig: z.object({
    retrievalWeight: confidenceSchema,
    memoryWeight: confidenceSchema,
    productiveDissonance: confidenceSchema,
  }).optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});

export type TailorProfile = z.infer<typeof tailorProfileSchema>;

export const tailorWidgetProjectionSchema = z.object({
  widget: z.object({
    type: z.literal('mimi.tailor.profile-summary'),
    version: z.literal('1.0'),
    state: z.enum(['needs_input', 'ready_for_review', 'confirmed']),
    headline: z.string(),
    thesis: z.string(),
    confidence: confidenceSchema,
    signals: z.array(nonEmptyStringSchema),
    preserve: z.array(nonEmptyStringSchema),
    avoid: z.array(nonEmptyStringSchema),
    nextQuestion: z.object({
      id: nonEmptyStringSchema,
      prompt: nonEmptyStringSchema,
      reason: nonEmptyStringSchema,
    }).nullable(),
    actions: z.array(z.object({
      id: nonEmptyStringSchema,
      label: nonEmptyStringSchema,
      intent: z.enum(['confirm', 'edit', 'import_json']),
    })),
  }),
  profileRef: z.object({
    profileId: nonEmptyStringSchema,
    schemaVersion: z.literal(TAILOR_PROFILE_SCHEMA_VERSION),
    updatedAt: isoDateSchema,
  }),
});

export type TailorWidgetProjection = z.infer<typeof tailorWidgetProjectionSchema>;

type LegacyImportOptions = {
  profileId?: string;
  profileName?: string;
  now?: string;
};

type GraphCompileInput = {
  project: TailorProject;
  evidence: EvidenceNode[];
  observations: Observation[];
  clusters: PatternCluster[];
  laws: CreativeLaw[];
  now?: string;
};

const unique = <T>(items: T[]): T[] => [...new Set(items)];
const compact = (items: Array<string | undefined | null> = []): string[] =>
  unique(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item)));
const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const average = (values: number[], fallback = 0.5): number =>
  values.length ? clamp(values.reduce((total, value) => total + value, 0) / values.length) : fallback;
const normalizeDial = (value: number | undefined, fallback = 0.5): number =>
  clamp(typeof value === 'number' ? (value > 1 ? value / 10 : value) : fallback);
const normalizePercentDial = (value: number | undefined, fallback = 0.5): number =>
  clamp(typeof value === 'number' ? (value > 1 ? value / 100 : value) : fallback);
const isoFromTimestamp = (value: number | undefined, fallback: string): string => {
  if (!value || !Number.isFinite(value)) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};
const slug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'profile';

function splitAxis(axis: string): { from: string; toward: string } {
  const parts = axis.split(/\s+(?:vs\.?|to|→)\s+/i).map((part) => part.trim()).filter(Boolean);
  return {
    from: parts.length > 1 ? parts[0] : '',
    toward: parts.length > 1 ? parts.slice(1).join(' ') : axis,
  };
}

function densityInterpretation(value: number): string {
  if (value < 0.34) return 'spare';
  if (value > 0.66) return 'dense';
  return 'balanced';
}

function entropyInterpretation(value: number): string {
  if (value < 0.34) return 'stable';
  if (value > 0.66) return 'expressive variation';
  return 'controlled variation';
}

function missingFields(
  antiReferenceCount: number,
  successDefinition: string,
  compositionCount: number,
): TailorProfile['diagnostics']['missingHighValueFields'] {
  const missing: TailorProfile['diagnostics']['missingHighValueFields'] = [];
  if (!antiReferenceCount) {
    missing.push({
      path: 'sourceMaterial.antiReferences',
      reason: 'Negative evidence sharply improves generation accuracy.',
      priority: 0.95,
      suggestedQuestion: 'What looks close, but gets your taste wrong?',
    });
  }
  if (!successDefinition.trim()) {
    missing.push({
      path: 'scope.currentProject.successDefinition',
      reason: 'Tailor cannot validate an output without a success condition.',
      priority: 0.92,
      suggestedQuestion: 'What must this project accomplish?',
    });
  }
  if (!compositionCount) {
    missing.push({
      path: 'compiledProfile.visualGrammar.composition',
      reason: 'Composition rules materially affect generated layouts.',
      priority: 0.84,
      suggestedQuestion: 'How should space and hierarchy behave?',
    });
  }
  return missing;
}

export function createTailorProfileFromLegacyDraft(
  draft: TailorLogicDraft,
  options: LegacyImportOptions = {},
): TailorProfile {
  const now = options.now ?? new Date().toISOString();
  const references = compact(draft.positioningCore?.anchors?.culturalReferences);
  const referenceItems = references.map((value, index) => ({
    id: `legacy_ref_${index + 1}`,
    type: 'cultural_reference',
    value,
    source: 'imported_json' as const,
    scope: 'persistent' as const,
    weight: 0.8,
    notes: '',
  }));
  const styleEvidenceItems = (draft.styleEvidence ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    value: item.value,
    source: item.source,
    scope: item.scope,
    weight: clamp(item.weight),
    notes: item.notes,
  }));
  const allReferenceItems = [...referenceItems, ...styleEvidenceItems];
  const density = normalizeDial(draft.positioningCore?.aestheticCore?.density);
  const entropy = normalizeDial(draft.positioningCore?.aestheticCore?.entropy);
  const thesis =
    draft.strategicSummary?.identityVector ||
    draft.strategicSummary?.aestheticDNA ||
    draft.positioningCore?.authorityClaim ||
    '';
  const authorityStrength = normalizePercentDial(draft.diagnostics?.authorityStrengthScore);
  const supportingColors = compact(
    draft.expressionEngine?.chromaticRegistry?.primaryPalette?.map((color) => color.hex),
  );
  const avoid = compact([
    ...(draft.positioningCore?.exclusionPrinciples ?? []),
    ...(draft.strategicVectors?.desireVectors?.reduce ?? []),
    ...(draft.strategicVectors?.desireVectors?.refuse ?? []),
    draft.visual_guidance?.negative_prompt,
  ]);
  const directStatements = compact([
    draft.positioningCore?.positioningAxis,
    draft.positioningCore?.authorityClaim,
  ]).map((statement, index) => ({
    id: `legacy_statement_${index + 1}`,
    statement,
    scope: 'persistent' as const,
    source: 'imported_json' as const,
  }));
  const completeness = clamp(
    [
      allReferenceItems.length > 0,
      Boolean(thesis),
      Boolean(draft.positioningCore?.authorityClaim),
      supportingColors.length > 0,
      avoid.length > 0,
    ].filter(Boolean).length / 5,
  );
  const missing = missingFields(0, '', 0);

  return tailorProfileSchema.parse({
    meta: {
      profileId: options.profileId ?? `tailor_${slug(options.profileName ?? draft.seedName ?? 'personal')}`,
      profileName: options.profileName ?? draft.seedName ?? 'Personal',
      schemaVersion: TAILOR_PROFILE_SCHEMA_VERSION,
      status: draft.draftStatus === 'aligned' ? 'confirmed' : draft.draftStatus,
      createdAt: isoFromTimestamp(draft.lastTailored, now),
      updatedAt: now,
      compiler: { name: 'mimi-tailor', version: '1.0.0' },
    },
    scope: {
      mode: 'personal',
      objectType: 'creative_identity',
      workingTitle: draft.seedName ?? '',
      projectTypes: [],
      intendedHelp: [],
      persistence: {
        strategy: 'hybrid',
        persistentPaths: [
          'compiledProfile.aestheticDNA',
          'compiledProfile.visualGrammar',
          'compiledProfile.verbalIdentity',
          'compiledProfile.positioning',
          'generationContract.globalRefusals',
        ],
        sessionPaths: [
          'scope.currentProject',
          'requestedOutputs',
          'generationContract.projectConstraints',
        ],
      },
      currentProject: {
        title: '',
        summary: '',
        audience: '',
        contextOfUse: '',
        mediums: [],
        successDefinition: '',
        desiredReaction: '',
      },
    },
    sourceMaterial: {
      references: allReferenceItems,
      antiReferences: [],
      directStatements,
      nearMisses: [],
      corrections: [],
      constraints: {
        hard: compact(draft.visual_guidance?.strict_palette),
        soft: [],
        budgetSensitivity: null,
        timeline: null,
        sourcingLimits: [],
        nonNegotiables: compact(draft.positioningCore?.exclusionPrinciples),
        flexibleAreas: [],
      },
    },
    compiledProfile: {
      workingThesis: {
        statement: thesis,
        confidence: authorityStrength || 0.5,
        evidenceIds: allReferenceItems.map((reference) => reference.id),
      },
      identityVector: {
        positioningAxis: splitAxis(draft.positioningCore?.positioningAxis ?? ''),
        authorityClaim: draft.positioningCore?.authorityClaim ?? '',
        authorityStrength,
        differentiationStrategy: compact(draft.positioningCore?.exclusionPrinciples),
      },
      aestheticDNA: {
        primaryCodes: compact(draft.positioningCore?.aestheticCore?.tags),
        eraBias: compact([draft.positioningCore?.aestheticCore?.eraBias]),
        presentation: compact([draft.positioningCore?.aestheticCore?.presentation]),
        silhouettes: compact(draft.positioningCore?.aestheticCore?.silhouettes),
        materiality: compact(draft.positioningCore?.aestheticCore?.materiality),
        symbolicMotifs: compact(draft.positioningCore?.aestheticCore?.visualShards),
        density: { value: density, interpretation: densityInterpretation(density) },
        entropy: { value: entropy, interpretation: entropyInterpretation(entropy) },
      },
      visualGrammar: {
        palette: {
          baseNeutral: draft.expressionEngine?.chromaticRegistry?.baseNeutral ?? '#F2F1ED',
          accentSignal: draft.expressionEngine?.chromaticRegistry?.accentSignal ?? '#1C1917',
          supportingColors,
          strict: Boolean(draft.visual_guidance?.strict_palette?.length),
          avoid: [],
        },
        typography: {
          serif: draft.expressionEngine?.typography?.serif ?? draft.expressionEngine?.brandIdentity?.fonts?.serif ?? '',
          sans: draft.expressionEngine?.typography?.sans ?? draft.expressionEngine?.brandIdentity?.fonts?.sans ?? '',
          mono: draft.expressionEngine?.typography?.mono ?? draft.expressionEngine?.brandIdentity?.fonts?.mono ?? '',
          weightPreference: draft.expressionEngine?.typographyIntent?.weightPreference ?? '',
          direction: compact([draft.expressionEngine?.typographyIntent?.styleDescription]),
        },
        composition: [],
        cameraLanguage: compact(draft.positioningCore?.aestheticCore?.mediaStyle),
        lighting: [],
        spatialRules: [],
        materialCues: compact(draft.positioningCore?.aestheticCore?.materiality),
      },
      verbalIdentity: {
        emotionalTemperature: draft.expressionEngine?.narrativeVoice?.emotionalTemperature ?? '',
        structureBias: draft.expressionEngine?.narrativeVoice?.structureBias ?? '',
        tone: compact([draft.expressionEngine?.narrativeVoice?.tone]),
        lexicalDensity: normalizeDial(draft.expressionEngine?.narrativeVoice?.lexicalDensity),
        restraint: normalizeDial(draft.expressionEngine?.narrativeVoice?.restraintLevel),
        preferredWords: [],
        forbiddenWords: [],
        typicalPhrases: [],
        forbiddenPhrases: [],
        voiceNotes: draft.expressionEngine?.narrativeVoice?.voiceNotes ?? '',
      },
      positioning: {
        culturalReferences: references,
        ideologicalBiases: compact(draft.positioningCore?.anchors?.ideologicalBias),
        trendRelationship: 'selective',
        luxuryCodes: [],
        oversaturatedClusters: compact(draft.strategicVectors?.saturationAwareness?.oversaturatedClusters),
        fragileDifferentiators: compact(draft.strategicVectors?.saturationAwareness?.fragileDifferentiators),
      },
      strategicOrientation: {
        expansionTolerance: normalizeDial(draft.strategicVectors?.expansionTolerance),
        fiscalVelocity: draft.strategicVectors?.fiscalVelocity ?? 'measured',
        deepen: compact(draft.strategicVectors?.desireVectors?.deepen),
        reduce: compact(draft.strategicVectors?.desireVectors?.reduce),
        experiment: compact(draft.strategicVectors?.desireVectors?.experiment),
        refuse: compact(draft.strategicVectors?.desireVectors?.refuse),
      },
    },
    generationContract: {
      objective: 'Generate work that expresses the compiled profile while satisfying the current project context.',
      preserve: compact([
        draft.strategicSummary?.authorityAnchor,
        draft.strategicSummary?.tonalConstraints,
        ...references,
      ]),
      emphasize: compact(draft.strategicVectors?.desireVectors?.deepen),
      transform: referenceItems.length
        ? [{ input: 'reference material', method: 'synthesize rather than imitate', strength: 0.7 }]
        : [],
      avoid,
      globalRefusals: compact(draft.strategicVectors?.desireVectors?.refuse),
      projectConstraints: [],
      flexibility: {
        strictAreas: compact(draft.positioningCore?.exclusionPrinciples),
        flexibleAreas: compact(draft.strategicVectors?.desireVectors?.experiment),
        referenceInfluence: 0.65,
        generationTemperature: clamp(draft.generationTemperature ?? 0.8),
      },
      modelInstructions: {
        reasoningPolicy: [
          'Treat direct creator evidence as higher authority than inferred profile attributes',
          'Do not invent missing taste preferences',
          'Label major unsupported interpretations as provisional',
          'Surface contradictions instead of silently reconciling them',
          'Explain which evidence shaped each major recommendation',
        ],
        responseStructure: [
          'working thesis',
          'evidence used',
          'creative direction',
          'rules to preserve',
          'rules to avoid',
          'requested artifact',
        ],
      },
    },
    requestedOutputs: {
      artifactTypes: [],
      formatDirection: '',
      mediumRequirements: [],
      reusableComponents: [],
      persistentComponents: [],
      acceptanceCriteria: [],
    },
    provenance: {
      evidenceItems: allReferenceItems.map((reference) => ({
        id: reference.id,
        origin: reference.source,
        capturedAt: now,
      })),
      claims: thesis
        ? [{
            path: 'compiledProfile.workingThesis',
            method: 'imported_legacy' as const,
            derivedFrom: allReferenceItems.map((reference) => reference.id),
            confidence: authorityStrength || 0.5,
            userConfirmed: draft.draftStatus === 'aligned',
          }]
        : [],
    },
    diagnostics: {
      completeness: {
        overall: completeness,
        persistentProfile: completeness,
        currentProject: 0,
        generationReadiness: clamp((completeness + (avoid.length ? 1 : 0)) / 2),
      },
      confidence: {
        overall: authorityStrength || 0.5,
        aestheticDNA: allReferenceItems.length ? 0.65 : 0.35,
        visualGrammar: supportingColors.length ? 0.65 : 0.4,
        verbalIdentity: draft.expressionEngine?.narrativeVoice?.tone ? 0.65 : 0.4,
        positioning: draft.positioningCore?.positioningAxis ? 0.7 : 0.4,
      },
      contradictions: compact(draft.diagnostics?.contradictionFlags).map((message) => ({
        message,
        severity: 'medium' as const,
      })),
      dilutionRisks: compact(draft.diagnostics?.dilutionRisks).map((message) => ({
        message,
        severity: 'medium' as const,
      })),
      missingHighValueFields: missing,
      driftVulnerability: normalizeDial(draft.diagnostics?.driftVulnerability),
      readyForGeneration: draft.draftStatus === 'aligned' && Boolean(thesis) && avoid.length > 0,
      nextBestAction: missing[0]?.suggestedQuestion ?? 'Review and confirm the working thesis.',
    },
    runtimeConfig: {
      retrievalWeight: normalizePercentDial(draft.algoDials?.webScry),
      memoryWeight: normalizePercentDial(draft.algoDials?.memorySynthesis),
      productiveDissonance: normalizePercentDial(draft.algoDials?.dissonance, 0.1),
    },
    extensions: draft.celestialCalibration
      ? { celestialCalibration: draft.celestialCalibration }
      : undefined,
  });
}

export function compileTailorProfileFromGraph(input: GraphCompileInput): TailorProfile {
  const now = input.now ?? new Date().toISOString();
  const acceptedClusters = input.clusters.filter((cluster) => cluster.userStatus === 'accepted' || cluster.userStatus === 'renamed');
  const usableClusters = acceptedClusters.length
    ? acceptedClusters
    : input.clusters.filter((cluster) => cluster.userStatus !== 'rejected' && cluster.userStatus !== 'hidden');
  const acceptedLaws = input.laws.filter((law) => law.userStatus === 'accepted');
  const usableLaws = acceptedLaws.length
    ? acceptedLaws
    : input.laws.filter((law) => law.userStatus !== 'rejected');
  const references = input.evidence.map((node) => ({
    id: node.id,
    type: node.sourceType,
    value: node.userCaption || node.description || node.title,
    source: 'tailor_evidence' as const,
    scope: 'project' as const,
    weight: 0.8,
    notes: node.sourceUrl ?? '',
  }));
  const evidenceIds = unique([
    ...usableClusters.flatMap((cluster) => cluster.supportingEvidenceNodeIds),
    ...usableLaws.flatMap((law) => law.supportingEvidenceNodeIds),
  ]);
  const clusterConfidence = average(usableClusters.map((cluster) => cluster.confidence), 0.45);
  const lawConfidence = average(usableLaws.map((law) => law.confidence), clusterConfidence);
  const thesis = usableLaws[0]?.principle ||
    (usableClusters.length
      ? `A provisional creative direction organized around ${usableClusters.slice(0, 3).map((cluster) => cluster.name).join(', ')}.`
      : '');
  const category = (name: PatternCluster['category']): string[] =>
    usableClusters.filter((cluster) => cluster.category === name).map((cluster) => cluster.name);
  const missing = missingFields(0, '', category('compositional').length);
  const acceptedEvidenceCount = evidenceIds.length || input.evidence.length;
  const persistentCompleteness = clamp(
    (Math.min(input.evidence.length, 5) / 5 + Math.min(acceptedClusters.length, 3) / 3 + Math.min(acceptedLaws.length, 2) / 2) / 3,
  );
  const ready = input.evidence.length >= 3 && acceptedClusters.length > 0 && acceptedLaws.length > 0;

  return tailorProfileSchema.parse({
    meta: {
      profileId: `tailor_${input.project.id}`,
      profileName: input.project.title,
      schemaVersion: TAILOR_PROFILE_SCHEMA_VERSION,
      status: ready ? 'confirmed' : 'provisional',
      createdAt: isoFromTimestamp(input.project.createdAt, now),
      updatedAt: now,
      compiler: { name: 'mimi-tailor', version: '1.0.0' },
    },
    scope: {
      mode: 'project',
      objectType: input.project.intent,
      workingTitle: input.project.title,
      projectTypes: [input.project.intent],
      intendedHelp: [],
      persistence: {
        strategy: 'hybrid',
        persistentPaths: [
          'compiledProfile.aestheticDNA',
          'compiledProfile.visualGrammar',
          'compiledProfile.verbalIdentity',
          'generationContract.globalRefusals',
        ],
        sessionPaths: [
          'scope.currentProject',
          'requestedOutputs',
          'generationContract.projectConstraints',
        ],
      },
      currentProject: {
        title: input.project.title,
        summary: input.project.blurb ?? '',
        audience: '',
        contextOfUse: '',
        mediums: [],
        successDefinition: '',
        desiredReaction: '',
      },
    },
    sourceMaterial: {
      references,
      antiReferences: [],
      directStatements: input.project.blurb
        ? [{
            id: `project_blurb_${input.project.id}`,
            statement: input.project.blurb,
            scope: 'project',
            source: 'user_input',
          }]
        : [],
      nearMisses: [],
      corrections: [],
      constraints: {
        hard: [],
        soft: [],
        budgetSensitivity: null,
        timeline: null,
        sourcingLimits: [],
        nonNegotiables: [],
        flexibleAreas: [],
      },
    },
    compiledProfile: {
      workingThesis: {
        statement: thesis,
        confidence: lawConfidence,
        evidenceIds,
      },
      identityVector: {
        positioningAxis: { from: '', toward: usableLaws[0]?.title ?? usableClusters[0]?.name ?? '' },
        authorityClaim: usableLaws[0]?.explanation ?? '',
        authorityStrength: lawConfidence,
        differentiationStrategy: compact(usableLaws.map((law) => law.principle)),
      },
      aestheticDNA: {
        primaryCodes: compact(usableClusters.map((cluster) => cluster.name)),
        eraBias: category('historical'),
        presentation: [],
        silhouettes: compact([...category('visual'), ...category('fashion')]),
        materiality: category('material'),
        symbolicMotifs: category('symbolic'),
        density: { value: 0.5, interpretation: 'balanced' },
        entropy: { value: 0.5, interpretation: 'controlled variation' },
      },
      visualGrammar: {
        palette: {
          baseNeutral: '#FDFBF7',
          accentSignal: '#1A1A1A',
          supportingColors: [],
          strict: false,
          avoid: [],
        },
        typography: {
          serif: '',
          sans: '',
          mono: '',
          weightPreference: '',
          direction: category('typographic'),
        },
        composition: category('compositional'),
        cameraLanguage: [],
        lighting: [],
        spatialRules: [],
        materialCues: category('material'),
      },
      verbalIdentity: {
        emotionalTemperature: category('emotional')[0] ?? '',
        structureBias: '',
        tone: compact([...category('language'), ...category('emotional')]),
        lexicalDensity: 0.5,
        restraint: 0.5,
        preferredWords: [],
        forbiddenWords: [],
        typicalPhrases: [],
        forbiddenPhrases: [],
        voiceNotes: '',
      },
      positioning: {
        culturalReferences: category('historical'),
        ideologicalBiases: [],
        trendRelationship: 'selective',
        luxuryCodes: [],
        oversaturatedClusters: [],
        fragileDifferentiators: [],
      },
      strategicOrientation: {
        expansionTolerance: 0.5,
        fiscalVelocity: 'measured',
        deepen: compact(usableLaws.map((law) => law.principle)),
        reduce: [],
        experiment: [],
        refuse: compact(usableLaws.flatMap((law) => law.avoidances ?? [])),
      },
    },
    generationContract: {
      objective: `Generate work for ${input.project.title} using only creator-approved or clearly provisional Tailor signals.`,
      preserve: compact(usableLaws.map((law) => law.principle)),
      emphasize: compact(acceptedClusters.map((cluster) => cluster.name)),
      transform: references.length
        ? [{ input: 'reference material', method: 'synthesize rather than imitate', strength: 0.7 }]
        : [],
      avoid: compact(usableLaws.flatMap((law) => law.avoidances ?? [])),
      globalRefusals: compact(acceptedLaws.flatMap((law) => law.avoidances ?? [])),
      projectConstraints: [],
      flexibility: {
        strictAreas: compact(acceptedLaws.map((law) => law.title)),
        flexibleAreas: compact(usableClusters.filter((cluster) => cluster.userWeight === 'low').map((cluster) => cluster.name)),
        referenceInfluence: 0.65,
        generationTemperature: 0.8,
      },
      modelInstructions: {
        reasoningPolicy: [
          'Treat direct creator evidence as higher authority than inferred profile attributes',
          'Do not invent missing taste preferences',
          'Label unconfirmed pattern clusters as provisional',
          'Exclude creator-rejected signals',
          'Cite supporting evidence IDs for major recommendations',
        ],
        responseStructure: [
          'working thesis',
          'evidence used',
          'creative direction',
          'rules to preserve',
          'rules to avoid',
          'requested artifact',
        ],
      },
    },
    requestedOutputs: {
      artifactTypes: [],
      formatDirection: '',
      mediumRequirements: [],
      reusableComponents: [],
      persistentComponents: [],
      acceptanceCriteria: [],
    },
    provenance: {
      evidenceItems: references.map((reference) => ({
        id: reference.id,
        origin: 'tailor_evidence' as const,
        capturedAt: now,
      })),
      claims: thesis
        ? [{
            path: 'compiledProfile.workingThesis',
            method: 'deterministic_compilation' as const,
            derivedFrom: evidenceIds,
            confidence: lawConfidence,
            userConfirmed: acceptedLaws.length > 0,
          }]
        : [],
    },
    diagnostics: {
      completeness: {
        overall: persistentCompleteness,
        persistentProfile: persistentCompleteness,
        currentProject: input.project.blurb ? 0.35 : 0.1,
        generationReadiness: ready ? 0.8 : clamp((acceptedEvidenceCount / 3 + acceptedClusters.length + acceptedLaws.length) / 3),
      },
      confidence: {
        overall: average([clusterConfidence, lawConfidence]),
        aestheticDNA: clusterConfidence,
        visualGrammar: average(
          usableClusters.filter((cluster) =>
            ['visual', 'typographic', 'color', 'compositional', 'material'].includes(cluster.category),
          ).map((cluster) => cluster.confidence),
          0.35,
        ),
        verbalIdentity: average(
          usableClusters.filter((cluster) => ['language', 'emotional'].includes(cluster.category))
            .map((cluster) => cluster.confidence),
          0.35,
        ),
        positioning: lawConfidence,
      },
      contradictions: [],
      dilutionRisks: input.evidence.length < 3
        ? [{
            message: 'Too few references may turn broad aesthetic labels into generic direction.',
            severity: 'medium',
            resolution: 'Add at least three concrete references and one anti-reference.',
          }]
        : [],
      missingHighValueFields: missing,
      driftVulnerability: 0.5,
      readyForGeneration: ready,
      nextBestAction: ready
        ? 'Review the compiled generation contract and confirm the requested output.'
        : missing[0]?.suggestedQuestion ?? 'Accept at least one pattern and one Creative Law.',
    },
  });
}

export function tailorProfileToLegacyDraft(
  profile: TailorProfile,
  base?: Partial<TailorLogicDraft>,
): TailorLogicDraft {
  const supportingColors = profile.compiledProfile.visualGrammar.palette.supportingColors;
  const axis = profile.compiledProfile.identityVector.positioningAxis;
  const positioningAxis = axis.from && axis.toward ? `${axis.from} vs ${axis.toward}` : axis.toward || axis.from;
  const timestamp = new Date(profile.meta.updatedAt).getTime();

  return {
    positioningCore: {
      anchors: {
        ...(base?.positioningCore?.anchors ?? {}),
        culturalReferences: profile.compiledProfile.positioning.culturalReferences,
        ideologicalBias: profile.compiledProfile.positioning.ideologicalBiases,
        culturalSynthesis: [],
        trendClusters: [],
      },
      aestheticCore: {
        ...(base?.positioningCore?.aestheticCore ?? {}),
        silhouettes: profile.compiledProfile.aestheticDNA.silhouettes,
        materiality: profile.compiledProfile.aestheticDNA.materiality,
        eraBias: profile.compiledProfile.aestheticDNA.eraBias[0] ?? '',
        presentation: profile.compiledProfile.aestheticDNA.presentation[0] ?? '',
        density: Math.round(profile.compiledProfile.aestheticDNA.density.value * 10),
        entropy: Math.round(profile.compiledProfile.aestheticDNA.entropy.value * 10),
        tags: profile.compiledProfile.aestheticDNA.primaryCodes,
        visualShards: profile.compiledProfile.aestheticDNA.symbolicMotifs,
      },
      positioningAxis,
      authorityClaim: profile.compiledProfile.identityVector.authorityClaim,
      exclusionPrinciples: profile.generationContract.avoid,
    },
    algoDials: {
      webScry: Math.round((profile.runtimeConfig?.retrievalWeight ?? 0.5) * 100),
      memorySynthesis: Math.round((profile.runtimeConfig?.memoryWeight ?? 0.5) * 100),
      dissonance: Math.round((profile.runtimeConfig?.productiveDissonance ?? 0.1) * 100),
      binaryToSpectrum: base?.algoDials?.binaryToSpectrum ?? 50,
    },
    visual_guidance: {
      strict_palette: profile.compiledProfile.visualGrammar.palette.strict
        ? [
            profile.compiledProfile.visualGrammar.palette.baseNeutral,
            profile.compiledProfile.visualGrammar.palette.accentSignal,
            ...supportingColors,
          ]
        : [],
      negative_prompt: profile.generationContract.avoid.join(', '),
      composition_density: Math.round(profile.compiledProfile.aestheticDNA.density.value * 10),
    },
    expressionEngine: {
      chromaticRegistry: {
        primaryPalette: supportingColors.map((hex, index) => ({ name: `Supporting ${index + 1}`, hex })),
        baseNeutral: profile.compiledProfile.visualGrammar.palette.baseNeutral,
        accentSignal: profile.compiledProfile.visualGrammar.palette.accentSignal,
      },
      colorPalette: {
        primary: profile.compiledProfile.visualGrammar.palette.baseNeutral,
        accent: profile.compiledProfile.visualGrammar.palette.accentSignal,
      },
      typographyIntent: {
        styleDescription: profile.compiledProfile.visualGrammar.typography.direction[0] ??
          profile.compiledProfile.visualGrammar.typography.serif,
        weightPreference: profile.compiledProfile.visualGrammar.typography.weightPreference,
      },
      typography: {
        serif: profile.compiledProfile.visualGrammar.typography.serif,
        sans: profile.compiledProfile.visualGrammar.typography.sans,
        mono: profile.compiledProfile.visualGrammar.typography.mono,
      },
      visualPresets: {
        silhouette: profile.compiledProfile.aestheticDNA.silhouettes[0] ?? '',
        texture: profile.compiledProfile.aestheticDNA.materiality[0] ?? '',
        era: profile.compiledProfile.aestheticDNA.eraBias[0] ?? '',
      },
      narrativeVoice: {
        emotionalTemperature: profile.compiledProfile.verbalIdentity.emotionalTemperature,
        structureBias: profile.compiledProfile.verbalIdentity.structureBias,
        lexicalDensity: Math.round(profile.compiledProfile.verbalIdentity.lexicalDensity * 10),
        restraintLevel: Math.round(profile.compiledProfile.verbalIdentity.restraint * 10),
        voiceNotes: profile.compiledProfile.verbalIdentity.voiceNotes,
        tone: profile.compiledProfile.verbalIdentity.tone.join(', '),
      },
      brandIdentity: base?.expressionEngine?.brandIdentity,
    },
    strategicVectors: {
      expansionTolerance: Math.round(profile.compiledProfile.strategicOrientation.expansionTolerance * 10),
      fiscalVelocity: profile.compiledProfile.strategicOrientation.fiscalVelocity,
      desireVectors: {
        deepen: profile.compiledProfile.strategicOrientation.deepen,
        reduce: profile.compiledProfile.strategicOrientation.reduce,
        experiment: profile.compiledProfile.strategicOrientation.experiment,
        refuse: profile.compiledProfile.strategicOrientation.refuse,
      },
      saturationAwareness: {
        oversaturatedClusters: profile.compiledProfile.positioning.oversaturatedClusters,
        fragileDifferentiators: profile.compiledProfile.positioning.fragileDifferentiators,
      },
    },
    diagnostics: {
      contradictionFlags: profile.diagnostics.contradictions.map((issue) => issue.message),
      dilutionRisks: profile.diagnostics.dilutionRisks.map((issue) => issue.message),
      authorityStrengthScore: Math.round(profile.compiledProfile.identityVector.authorityStrength * 100),
      driftVulnerability: Math.round(profile.diagnostics.driftVulnerability * 10),
    },
    strategicSummary: {
      identityVector: profile.compiledProfile.workingThesis.statement,
      authorityAnchor: profile.compiledProfile.identityVector.authorityClaim,
      exclusionRules: profile.generationContract.avoid,
      elasticityIndex: Math.round(profile.compiledProfile.strategicOrientation.expansionTolerance * 10),
      tonalConstraints: profile.compiledProfile.verbalIdentity.tone.join(', '),
      aestheticDNA: profile.compiledProfile.aestheticDNA.primaryCodes.join(', '),
    },
    generationTemperature: profile.generationContract.flexibility.generationTemperature,
    draftStatus: profile.meta.status === 'confirmed' ? 'aligned' : profile.meta.status === 'evolving' ? 'evolving' : 'provisional',
    seedName: profile.meta.profileName,
    celestialCalibration:
      profile.extensions?.celestialCalibration as TailorLogicDraft['celestialCalibration'] | undefined,
    characterReferences: base?.characterReferences ?? [],
    darkRoomTreatments: base?.darkRoomTreatments ?? [],
    materialityConfig: base?.materialityConfig,
    aiSignature: base?.aiSignature,
    lastTailored: Number.isNaN(timestamp) ? Date.now() : timestamp,
  };
}

export function createTailorWidgetProjection(profile: TailorProfile): TailorWidgetProjection {
  const missing = profile.diagnostics.missingHighValueFields[0];
  const state = profile.meta.status === 'confirmed'
    ? 'confirmed'
    : profile.diagnostics.readyForGeneration
      ? 'ready_for_review'
      : 'needs_input';
  const primaryCodes = profile.compiledProfile.aestheticDNA.primaryCodes;
  const headline = primaryCodes.slice(0, 3).join(' · ') ||
    profile.compiledProfile.identityVector.positioningAxis.toward ||
    profile.meta.profileName;

  return tailorWidgetProjectionSchema.parse({
    widget: {
      type: 'mimi.tailor.profile-summary',
      version: '1.0',
      state,
      headline,
      thesis: profile.compiledProfile.workingThesis.statement,
      confidence: profile.diagnostics.confidence.overall,
      signals: primaryCodes.slice(0, 8),
      preserve: profile.generationContract.preserve.slice(0, 5),
      avoid: profile.generationContract.avoid.slice(0, 5),
      nextQuestion: missing
        ? {
            id: slug(missing.path),
            prompt: missing.suggestedQuestion,
            reason: missing.reason,
          }
        : null,
      actions: [
        { id: 'confirm_thesis', label: 'Confirm thesis', intent: 'confirm' },
        { id: 'correct_profile', label: 'Correct Mimi', intent: 'edit' },
        { id: 'import_json', label: 'Import evidence', intent: 'import_json' },
      ],
    },
    profileRef: {
      profileId: profile.meta.profileId,
      schemaVersion: TAILOR_PROFILE_SCHEMA_VERSION,
      updatedAt: profile.meta.updatedAt,
    },
  });
}

export type ParsedTailorImport = {
  sourceFormat: 'tailor-profile-v2' | 'legacy-tailor-draft';
  profile: TailorProfile;
  draft: TailorLogicDraft;
};

export function parseTailorImport(
  value: unknown,
  baseDraft?: Partial<TailorLogicDraft>,
): ParsedTailorImport {
  const canonical = tailorProfileSchema.safeParse(value);
  if (canonical.success) {
    return {
      sourceFormat: 'tailor-profile-v2',
      profile: canonical.data,
      draft: tailorProfileToLegacyDraft(canonical.data, baseDraft),
    };
  }

  if (
    value &&
    typeof value === 'object' &&
    'positioningCore' in value &&
    'expressionEngine' in value
  ) {
    const draft = value as TailorLogicDraft;
    const profile = createTailorProfileFromLegacyDraft(draft);
    return {
      sourceFormat: 'legacy-tailor-draft',
      profile,
      draft: tailorProfileToLegacyDraft(profile, draft),
    };
  }

  throw new Error('JSON is neither a Tailor Profile v2 document nor a legacy Tailor draft.');
}

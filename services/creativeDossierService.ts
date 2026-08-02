import { Type } from '@google/genai';
import { withResilience } from './geminiClient';
import { sanitizeTailorText } from '../constants/tailorSafetyRules';
import {
  CREATIVE_DOSSIER_SYSTEM_PROMPT,
  buildCreativeDossierUserPrompt,
} from '../lib/creativeDossierPrompts';
import type { EvidenceBasedCreativeDossier, PaperWarmth, TailorLogicDraft } from '../types';
import {
  extractVisualSignalsFromDataUrl,
  synthesizeLocalCreativeDossier,
  type PriorTasteContext,
} from './localDossierSynthesis';

const MIN_IMAGES = 3;
const MAX_IMAGES = 8;

export type DossierImageInput =
  | File
  | { base64: string; mimeType: string }
  | { dataUrl: string };

export type DossierProviderKey = {
  provider: 'gemini' | 'openai' | 'anthropic';
  key: string;
};

export interface SynthesizeCreativeDossierInput {
  images: DossierImageInput[];
  userBlurb?: string;
  /** @deprecated Prefer `providerKeys` — Gemini-only BYOK. */
  apiKey?: string;
  /** Any available BYOK keys (OpenAI / Anthropic / Gemini). First usable wins after funded path. */
  providerKeys?: DossierProviderKey[];
  /** Serialized Tailor blueprint (self-declared creator inputs) folded into the read. */
  blueprintDigest?: string;
  /** Prior Style Lab / Scry Directives memory to build upon. */
  priorContext?: PriorTasteContext;
  /** When true, prefer Mimi-funded AI Gateway (Firebase session + trial/paid credits). */
  preferFundedGateway?: boolean;
  /** When true (default), fall back to local visual+blueprint synthesis if no LLM is available. */
  allowLocalFallback?: boolean;
}

function parseJsonResponse(text: string | undefined): unknown {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL');
  return { mimeType: match[1], base64: match[2] };
}

async function normalizeImage(
  input: DossierImageInput,
): Promise<{ base64: string; mimeType: string }> {
  if (input instanceof File) {
    return fileToBase64(input);
  }
  if ('dataUrl' in input) {
    const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid image data URL');
    return { mimeType: match[1], base64: match[2] };
  }
  return { base64: input.base64, mimeType: input.mimeType };
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string').map(sanitizeTailorText);
}

function sanitizeDossier(raw: Record<string, unknown>): EvidenceBasedCreativeDossier {
  const refs = Array.isArray(raw.references) ? raw.references : [];
  const totalRefs = refs.length;

  const references = refs.map((ref, i) => {
    const r = (ref ?? {}) as Record<string, unknown>;
    const color = (r.colorSystem ?? {}) as Record<string, unknown>;
    const principles = Array.isArray(r.underlyingPrinciples) ? r.underlyingPrinciples : [];
    return {
      id: typeof r.id === 'string' ? r.id : `ref_${String(i + 1).padStart(2, '0')}`,
      visualSummary: sanitizeTailorText(String(r.visualSummary ?? '')),
      objects: asStringArray(r.objects),
      composition: asStringArray(r.composition),
      colorSystem: {
        palette: asStringArray(color.palette),
        logic: sanitizeTailorText(String(color.logic ?? '')),
      },
      typography: asStringArray(r.typography),
      materials: asStringArray(r.materials),
      texture: asStringArray(r.texture),
      historicalTouchpoints: asStringArray(r.historicalTouchpoints),
      emotionalTone: asStringArray(r.emotionalTone),
      interestingDecisions: asStringArray(r.interestingDecisions),
      underlyingPrinciples: principles.map((p) => {
        const pr = (p ?? {}) as Record<string, unknown>;
        return {
          principle: sanitizeTailorText(String(pr.principle ?? '')),
          confidence: clampConfidence(pr.confidence),
        };
      }),
    };
  });

  const pg = (raw.patternGraph ?? {}) as Record<string, unknown>;
  const signals = Array.isArray(pg.recurringSignals) ? pg.recurringSignals : [];
  const outliers = Array.isArray(pg.outliers) ? pg.outliers : [];

  const cos = (raw.creativeOperatingSystem ?? {}) as Record<string, unknown>;
  const laws = Array.isArray(cos.designLaws) ? cos.designLaws : [];
  const apps = (raw.applications ?? {}) as Record<string, unknown>;

  const applications: EvidenceBasedCreativeDossier['applications'] = {
    illustration: asStringArray(apps.illustration),
    brand: asStringArray(apps.brand),
    ui: asStringArray(apps.ui),
    writing: asStringArray(apps.writing),
    photography: asStringArray(apps.photography),
    packaging: asStringArray(apps.packaging),
    fashion: asStringArray(apps.fashion),
    product: asStringArray(apps.product),
  };

  const inversions = (Array.isArray(raw.inversions) ? raw.inversions : []).map((inv) => {
    const i = (inv ?? {}) as Record<string, unknown>;
    return {
      becauseYouTendTo: sanitizeTailorText(String(i.becauseYouTendTo ?? '')),
      tryInstead: sanitizeTailorText(String(i.tryInstead ?? '')),
      evidenceRefIds: asStringArray(i.evidenceRefIds),
    };
  });

  const nextExperiments = (Array.isArray(raw.nextExperiments) ? raw.nextExperiments : []).map(
    (exp) => {
      const e = (exp ?? {}) as Record<string, unknown>;
      return {
        title: sanitizeTailorText(String(e.title ?? '')),
        hypothesis: sanitizeTailorText(String(e.hypothesis ?? '')),
        evidenceRefIds: asStringArray(e.evidenceRefIds),
      };
    },
  );

  const lm = (raw.likenessManifest ?? {}) as Record<string, unknown>;
  const warmth = String(lm.paperWarmth ?? 'neutral');
  const paperWarmth: PaperWarmth =
    warmth === 'cool' || warmth === 'warm' ? warmth : 'neutral';

  return {
    dossierTitle: sanitizeTailorText(
      String(raw.dossierTitle ?? 'Evidence-Based Creative Dossier'),
    ),
    userIntent: sanitizeTailorText(String(raw.userIntent ?? '')),
    references,
    patternGraph: {
      recurringSignals: signals.map((sig) => {
        const s = (sig ?? {}) as Record<string, unknown>;
        return {
          signal: sanitizeTailorText(String(s.signal ?? '')),
          count: typeof s.count === 'number' ? s.count : Number(s.count) || 0,
          totalReferences:
            typeof s.totalReferences === 'number' ? s.totalReferences : totalRefs,
          evidenceRefIds: asStringArray(s.evidenceRefIds),
          confidence: clampConfidence(s.confidence),
        };
      }),
      outliers: outliers.map((out) => {
        const o = (out ?? {}) as Record<string, unknown>;
        return {
          signal: sanitizeTailorText(String(o.signal ?? '')),
          refId: String(o.refId ?? ''),
          note: sanitizeTailorText(String(o.note ?? '')),
        };
      }),
    },
    creativeOperatingSystem: {
      containerName: sanitizeTailorText(String(cos.containerName ?? 'Untitled Container')),
      oneSentencePhilosophy: sanitizeTailorText(String(cos.oneSentencePhilosophy ?? '')),
      designLaws: laws.map((law) => {
        const l = (law ?? {}) as Record<string, unknown>;
        return {
          law: sanitizeTailorText(String(l.law ?? '')),
          rationale: sanitizeTailorText(String(l.rationale ?? '')),
          evidenceRefIds: asStringArray(l.evidenceRefIds),
          confidence: clampConfidence(l.confidence),
        };
      }),
      visualGrammar: asStringArray(cos.visualGrammar),
      materialVocabulary: asStringArray(cos.materialVocabulary),
      emotionalVocabulary: asStringArray(cos.emotionalVocabulary),
      colorLogic: sanitizeTailorText(String(cos.colorLogic ?? '')),
      compositionLogic: sanitizeTailorText(String(cos.compositionLogic ?? '')),
      typographyLogic: sanitizeTailorText(String(cos.typographyLogic ?? '')),
      symbolLogic: sanitizeTailorText(String(cos.symbolLogic ?? '')),
      thingsToAvoid: asStringArray(cos.thingsToAvoid),
    },
    applications,
    inversions,
    nextExperiments,
    likenessManifest: {
      accentHex: String(lm.accentHex ?? '#1a1a1a'),
      paperWarmth,
      voiceAdjectives: asStringArray(lm.voiceAdjectives),
      motifCandidates: asStringArray(lm.motifCandidates),
      antiMotifs: asStringArray(lm.antiMotifs),
      containerName: sanitizeTailorText(String(cos.containerName ?? '')),
      oneSentencePhilosophy: sanitizeTailorText(String(cos.oneSentencePhilosophy ?? '')),
    },
    synthesizedAt: Date.now(),
  };
}

const principleSchema = {
  type: Type.OBJECT,
  properties: {
    principle: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ['principle', 'confidence'],
};

const referenceSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    visualSummary: { type: Type.STRING },
    objects: { type: Type.ARRAY, items: { type: Type.STRING } },
    composition: { type: Type.ARRAY, items: { type: Type.STRING } },
    colorSystem: {
      type: Type.OBJECT,
      properties: {
        palette: { type: Type.ARRAY, items: { type: Type.STRING } },
        logic: { type: Type.STRING },
      },
      required: ['palette', 'logic'],
    },
    typography: { type: Type.ARRAY, items: { type: Type.STRING } },
    materials: { type: Type.ARRAY, items: { type: Type.STRING } },
    texture: { type: Type.ARRAY, items: { type: Type.STRING } },
    historicalTouchpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    emotionalTone: { type: Type.ARRAY, items: { type: Type.STRING } },
    interestingDecisions: { type: Type.ARRAY, items: { type: Type.STRING } },
    underlyingPrinciples: { type: Type.ARRAY, items: principleSchema },
  },
  required: [
    'id',
    'visualSummary',
    'objects',
    'composition',
    'colorSystem',
    'underlyingPrinciples',
  ],
};

const dossierResponseSchema = {
  type: Type.OBJECT,
  properties: {
    dossierTitle: { type: Type.STRING },
    userIntent: { type: Type.STRING },
    references: { type: Type.ARRAY, items: referenceSchema },
    patternGraph: {
      type: Type.OBJECT,
      properties: {
        recurringSignals: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              signal: { type: Type.STRING },
              count: { type: Type.INTEGER },
              totalReferences: { type: Type.INTEGER },
              evidenceRefIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER },
            },
            required: ['signal', 'count', 'totalReferences', 'evidenceRefIds', 'confidence'],
          },
        },
        outliers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              signal: { type: Type.STRING },
              refId: { type: Type.STRING },
              note: { type: Type.STRING },
            },
            required: ['signal', 'refId', 'note'],
          },
        },
      },
      required: ['recurringSignals', 'outliers'],
    },
    creativeOperatingSystem: {
      type: Type.OBJECT,
      properties: {
        containerName: { type: Type.STRING },
        oneSentencePhilosophy: { type: Type.STRING },
        designLaws: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              law: { type: Type.STRING },
              rationale: { type: Type.STRING },
              evidenceRefIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER },
            },
            required: ['law', 'rationale', 'evidenceRefIds', 'confidence'],
          },
        },
        visualGrammar: { type: Type.ARRAY, items: { type: Type.STRING } },
        materialVocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
        emotionalVocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
        colorLogic: { type: Type.STRING },
        compositionLogic: { type: Type.STRING },
        typographyLogic: { type: Type.STRING },
        symbolLogic: { type: Type.STRING },
        thingsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'containerName',
        'oneSentencePhilosophy',
        'designLaws',
        'visualGrammar',
        'colorLogic',
      ],
    },
    applications: {
      type: Type.OBJECT,
      properties: {
        illustration: { type: Type.ARRAY, items: { type: Type.STRING } },
        brand: { type: Type.ARRAY, items: { type: Type.STRING } },
        ui: { type: Type.ARRAY, items: { type: Type.STRING } },
        writing: { type: Type.ARRAY, items: { type: Type.STRING } },
        photography: { type: Type.ARRAY, items: { type: Type.STRING } },
        packaging: { type: Type.ARRAY, items: { type: Type.STRING } },
        fashion: { type: Type.ARRAY, items: { type: Type.STRING } },
        product: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['illustration', 'brand', 'ui', 'writing'],
    },
    inversions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          becauseYouTendTo: { type: Type.STRING },
          tryInstead: { type: Type.STRING },
          evidenceRefIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['becauseYouTendTo', 'tryInstead', 'evidenceRefIds'],
      },
    },
    nextExperiments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          hypothesis: { type: Type.STRING },
          evidenceRefIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'hypothesis', 'evidenceRefIds'],
      },
    },
    likenessManifest: {
      type: Type.OBJECT,
      properties: {
        accentHex: { type: Type.STRING },
        paperWarmth: { type: Type.STRING },
        voiceAdjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        motifCandidates: { type: Type.ARRAY, items: { type: Type.STRING } },
        antiMotifs: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['accentHex', 'paperWarmth', 'voiceAdjectives', 'motifCandidates'],
    },
  },
  required: [
    'dossierTitle',
    'userIntent',
    'references',
    'patternGraph',
    'creativeOperatingSystem',
    'applications',
    'inversions',
    'nextExperiments',
    'likenessManifest',
  ],
};

export function validateDossierImageCount(count: number): void {
  if (count < MIN_IMAGES) {
    throw new Error(`At least ${MIN_IMAGES} reference images are required.`);
  }
  if (count > MAX_IMAGES) {
    throw new Error(`At most ${MAX_IMAGES} reference images are allowed.`);
  }
}

/** Validate a full-read request: needs a blueprint OR at least MIN_IMAGES images. */
export function validateDossierInputs(count: number, hasBlueprint: boolean): void {
  if (count > MAX_IMAGES) {
    throw new Error(`At most ${MAX_IMAGES} reference images are allowed.`);
  }
  if (!hasBlueprint && count < MIN_IMAGES) {
    throw new Error(
      `Add your Tailor blueprint or upload at least ${MIN_IMAGES} reference images to compile a full read.`,
    );
  }
}

/**
 * Serialize the Tailor blueprint into a labeled, human-readable digest the
 * dossier model can read as self-declared evidence. Every field is optional and
 * skipped when empty, so partial blueprints still produce a useful read.
 */
export function buildTailorBlueprintDigest(draft: Partial<TailorLogicDraft> | null | undefined): string {
  if (!draft) return '';
  const lines: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      const items = value.filter((v) => typeof v === 'string' && v.trim());
      if (items.length) lines.push(`${label}: ${items.join(', ')}`);
      return;
    }
    if (typeof value === 'number') {
      lines.push(`${label}: ${value}`);
      return;
    }
    if (typeof value === 'string' && value.trim()) lines.push(`${label}: ${value.trim()}`);
  };

  const pc = draft.positioningCore;
  if (pc) {
    lines.push('— POSITIONING —');
    push('Cultural references', pc.anchors?.culturalReferences);
    push('Ideological bias', pc.anchors?.ideologicalBias);
    push('Cultural synthesis', pc.anchors?.culturalSynthesis);
    push('Trend clusters', pc.anchors?.trendClusters);
    push('Positioning axis', pc.positioningAxis);
    push('Authority claim', pc.authorityClaim);
    push('Exclusion principles (what they refuse)', pc.exclusionPrinciples);
    if (pc.aestheticCore) {
      push('Silhouettes', pc.aestheticCore.silhouettes);
      push('Materiality', pc.aestheticCore.materiality);
      push('Era bias', pc.aestheticCore.eraBias);
      push('Media style', pc.aestheticCore.mediaStyle);
      push('Presentation', pc.aestheticCore.presentation);
      push('Density (1-10)', pc.aestheticCore.density);
      push('Entropy (1-10)', pc.aestheticCore.entropy);
      push('Aesthetic tags', pc.aestheticCore.tags);
    }
  }

  const ee = draft.expressionEngine;
  if (ee) {
    lines.push('— EXPRESSION —');
    push('Primary color', ee.colorPalette?.primary);
    push('Accent color', ee.colorPalette?.accent);
    push('Palette preset', ee.colorPalette?.preset);
    push('Base neutral', ee.chromaticRegistry?.baseNeutral);
    push('Accent signal', ee.chromaticRegistry?.accentSignal);
    push('Typography style', ee.typographyIntent?.styleDescription);
    push('Weight preference', ee.typographyIntent?.weightPreference);
    push('Serif / Sans / Mono', [ee.typography?.serif, ee.typography?.sans, ee.typography?.mono].filter(Boolean) as string[]);
    push('Visual preset — silhouette', ee.visualPresets?.silhouette);
    push('Visual preset — texture', ee.visualPresets?.texture);
    push('Visual preset — era', ee.visualPresets?.era);
    if (ee.narrativeVoice) {
      push('Voice — emotional temperature', ee.narrativeVoice.emotionalTemperature);
      push('Voice — structure bias', ee.narrativeVoice.structureBias);
      push('Voice — lexical density (1-10)', ee.narrativeVoice.lexicalDensity);
      push('Voice — restraint (1-10)', ee.narrativeVoice.restraintLevel);
      push('Voice notes', ee.narrativeVoice.voiceNotes);
      push('Tone', ee.narrativeVoice.tone);
    }
  }

  const sv = draft.strategicVectors;
  if (sv) {
    lines.push('— STRATEGY —');
    push('Expansion tolerance (1-10)', sv.expansionTolerance);
    push('Fiscal velocity', sv.fiscalVelocity);
    push('Deepen', sv.desireVectors?.deepen);
    push('Reduce', sv.desireVectors?.reduce);
    push('Experiment', sv.desireVectors?.experiment);
    push('Refuse', sv.desireVectors?.refuse);
    push('Oversaturated clusters', sv.saturationAwareness?.oversaturatedClusters);
    push('Fragile differentiators', sv.saturationAwareness?.fragileDifferentiators);
  }

  const ss = draft.strategicSummary;
  if (ss) {
    lines.push('— SUMMARY —');
    push('Identity vector', ss.identityVector);
    push('Authority anchor', ss.authorityAnchor);
    push('Exclusion rules', ss.exclusionRules);
    push('Tonal constraints', ss.tonalConstraints);
    push('Aesthetic DNA', ss.aestheticDNA);
  }

  const dg = draft.diagnostics;
  if (dg) {
    lines.push('— DIAGNOSTICS (self-reported) —');
    push('Contradiction flags', dg.contradictionFlags);
    push('Dilution risks', dg.dilutionRisks);
    push('Authority strength (0-100)', dg.authorityStrengthScore);
    push('Drift vulnerability (1-10)', dg.driftVulnerability);
  }

  if (Array.isArray(draft.styleEvidence) && draft.styleEvidence.length) {
    const refs = draft.styleEvidence
      .filter((e) => e && typeof e.value === 'string' && e.value.trim())
      .map((e) => `${e.type === 'text_reference' ? 'text' : 'image'}${e.notes ? ` (${e.notes})` : ''}: ${e.value}`);
    if (refs.length) {
      lines.push('— SAVED STYLE EVIDENCE —');
      lines.push(...refs);
    }
  }

  return lines.join('\n').trim();
}

async function getFirebaseSessionToken(): Promise<string | undefined> {
  try {
    const { auth } = await import('./firebaseInit');
    if (!auth.currentUser || auth.currentUser.isAnonymous) return undefined;
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
}

function buildPriorMemoryDigest(prior?: PriorTasteContext): string | undefined {
  if (!prior) return undefined;
  const lines: string[] = [];
  const sig = prior.aestheticSignature;
  if (sig) {
    lines.push('— PRIOR STYLE LAB SIGNATURE —');
    lines.push(`Primary axis: ${sig.primaryAxis}`);
    lines.push(`Secondary axis: ${sig.secondaryAxis}`);
    if (sig.coreTrait) lines.push(`Core trait: ${sig.coreTrait}`);
    if (sig.motifs?.length) lines.push(`Motifs: ${sig.motifs.join(', ')}`);
    if (sig.paletteExtraction?.length) lines.push(`Palette: ${sig.paletteExtraction.join(', ')}`);
    if (sig.tactileBias) {
      lines.push(`Tactile: ${sig.tactileBias.dominant} / ${sig.tactileBias.secondary}`);
    }
    if (sig.moodCluster) lines.push(`Mood cluster: ${sig.moodCluster}`);
  }
  const audit = prior.lastAuditReport;
  if (audit) {
    lines.push('— PRIOR SCRY DIRECTIVES / MANIFESTO —');
    if (audit.profileManifesto) lines.push(`Manifesto: ${audit.profileManifesto}`);
    if (audit.strategicOpportunity) lines.push(`Strategic opportunity: ${audit.strategicOpportunity}`);
    if (audit.aestheticDirectives?.length) {
      lines.push(`Directives: ${audit.aestheticDirectives.join('; ')}`);
    }
    if (audit.suggestedTouchpoints?.length) {
      lines.push(`Touchpoints / readings: ${audit.suggestedTouchpoints.join('; ')}`);
    }
  }
  if (prior.styleEvidenceSummary?.length) {
    lines.push('— SAVED STYLE EVIDENCE —');
    lines.push(...prior.styleEvidenceSummary.slice(0, 8));
  }
  if (prior.atelierDesireSignals?.length) {
    lines.push('— ATELIER DESIRE / BUYER ORIENTATION (not a shopping list) —');
    lines.push(...prior.atelierDesireSignals.slice(0, 8));
  }
  if (prior.atelierReferenceSignals?.length) {
    lines.push('— ATELIER REFERENCE ONLY (lower weight) —');
    lines.push(...prior.atelierReferenceSignals.slice(0, 3));
  }
  return lines.length ? lines.join('\n') : undefined;
}

async function synthesizeViaFundedGateway(
  normalized: Array<{ base64: string; mimeType: string }>,
  userBlurb?: string,
  blueprintDigest?: string,
  priorMemoryDigest?: string,
): Promise<EvidenceBasedCreativeDossier> {
  const token = await getFirebaseSessionToken();
  if (!token) {
    throw new Error('Sign in to use Mimi trial credits for Tailor Scry.');
  }

  const response = await fetch('/api/mimi/synthesize-dossier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-user-token': `Bearer ${token}`,
    },
    body: JSON.stringify({
      images: normalized.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
      userBlurb,
      blueprintDigest,
      priorMemoryDigest,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : payload?.error?.message || 'Tailor Scry could not reach Mimi servers.';
    throw new Error(message);
  }

  if (!payload?.dossier || typeof payload.dossier !== 'object') {
    throw new Error('Failed to synthesize creative dossier — invalid model response.');
  }

  return sanitizeDossier(payload.dossier as Record<string, unknown>);
}

async function synthesizeViaOpenAiCompatible(
  normalized: Array<{ base64: string; mimeType: string }>,
  userPrompt: string,
  provider: 'openai' | 'anthropic',
  apiKey: string,
): Promise<EvidenceBasedCreativeDossier> {
  const endpoint = provider === 'openai' ? '/api/proxy/openai' : '/api/proxy/anthropic';

  let body: Record<string, unknown>;

  if (provider === 'openai') {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: userPrompt },
    ];
    for (let i = 0; i < normalized.length; i += 1) {
      const img = normalized[i];
      const refId = `ref_${String(i + 1).padStart(2, '0')}`;
      content.push({ type: 'text', text: `[${refId}]` });
      content.push({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      });
    }
    body = {
      model: 'gpt-4o',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${CREATIVE_DOSSIER_SYSTEM_PROMPT}\nRespond strictly in valid JSON.`,
        },
        { role: 'user', content },
      ],
    };
  } else {
    const content: Array<Record<string, unknown>> = [{ type: 'text', text: userPrompt }];
    for (let i = 0; i < normalized.length; i += 1) {
      const img = normalized[i];
      const refId = `ref_${String(i + 1).padStart(2, '0')}`;
      content.push({ type: 'text', text: `[${refId}]` });
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimeType,
          data: img.base64,
        },
      });
    }
    body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      temperature: 0.4,
      system: `${CREATIVE_DOSSIER_SYSTEM_PROMPT}\nRespond strictly in valid JSON.`,
      messages: [{ role: 'user', content }],
    };
  }

  // OpenAI proxy reads Authorization: Bearer; Anthropic reads x-api-key.
  const authHeaders =
    provider === 'openai'
      ? { Authorization: `Bearer ${apiKey}` }
      : { 'x-api-key': apiKey };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.error?.message || parsed?.error || message;
    } catch {
      // keep raw
    }
    throw new Error(typeof message === 'string' ? message : `${provider} dossier request failed`);
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Invalid ${provider} proxy response`);
  }

  const rawContent =
    parsed?.choices?.[0]?.message?.content ??
    parsed?.content?.[0]?.text ??
    (typeof parsed?.content === 'string' ? parsed.content : null);

  const dossierRaw = parseJsonResponse(
    typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
  );
  if (!dossierRaw || typeof dossierRaw !== 'object') {
    throw new Error(`Failed to synthesize creative dossier via ${provider}.`);
  }
  return sanitizeDossier(dossierRaw as Record<string, unknown>);
}

async function synthesizeLocalFallback(
  normalized: Array<{ base64: string; mimeType: string }>,
  userBlurb: string | undefined,
  digest: string | undefined,
  prior?: PriorTasteContext,
): Promise<EvidenceBasedCreativeDossier> {
  const visualSignals = await Promise.all(
    normalized.map(async (img, index) => {
      const dataUrl = `data:${img.mimeType};base64,${img.base64}`;
      return extractVisualSignalsFromDataUrl(dataUrl, index);
    }),
  );

  return synthesizeLocalCreativeDossier({
    imageCount: normalized.length,
    userBlurb,
    blueprintDigest: digest,
    visualSignals,
    prior,
  });
}

export async function synthesizeCreativeDossier({
  images,
  userBlurb,
  apiKey,
  providerKeys,
  blueprintDigest,
  priorContext,
  preferFundedGateway = true,
  allowLocalFallback = true,
}: SynthesizeCreativeDossierInput): Promise<EvidenceBasedCreativeDossier> {
  const digest = blueprintDigest?.trim() || undefined;
  validateDossierInputs(images.length, Boolean(digest));

  const normalized = await Promise.all(images.map(normalizeImage));
  const priorMemoryDigest = buildPriorMemoryDigest(priorContext);

  const keys: DossierProviderKey[] = [...(providerKeys ?? [])];
  if (apiKey && !keys.some((k) => k.provider === 'gemini' && k.key === apiKey)) {
    keys.unshift({ provider: 'gemini', key: apiKey });
  }

  // Prefer funded gateway when requested even if stale BYOK keys exist — dead
  // local keys should not skip trial credits. Fall through to BYOK / local on failure.
  if (preferFundedGateway) {
    try {
      return await synthesizeViaFundedGateway(
        normalized,
        userBlurb,
        digest,
        priorMemoryDigest,
      );
    } catch (fundedError) {
      const message = fundedError instanceof Error ? fundedError.message : String(fundedError);
      // Credits / auth blockers with no BYOK: local pattern synthesis still useful offline.
      if (
        keys.length === 0 &&
        allowLocalFallback &&
        (message.includes('Sign in') || message.includes('credits') || message.includes('Gemini key'))
      ) {
        console.warn('MIMI // Funded dossier unavailable; compiling local evidence read.', message);
        return synthesizeLocalFallback(normalized, userBlurb, digest, priorContext);
      }
      if (!message.includes('Sign in') && !message.includes('credits')) {
        console.warn('MIMI // Funded dossier path failed, falling back to BYOK / local:', message);
      } else if (keys.length === 0 && !allowLocalFallback) {
        throw fundedError;
      } else {
        console.warn('MIMI // Funded dossier unavailable; trying BYOK / local.', message);
      }
    }
  }

  const userPrompt = buildCreativeDossierUserPrompt(
    normalized.length,
    userBlurb,
    digest,
    priorMemoryDigest,
  );

  const errors: string[] = [];

  for (const entry of keys) {
    try {
      if (entry.provider === 'gemini') {
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
          { text: userPrompt },
          ...normalized
            .map((img, i) => {
              const refId = `ref_${String(i + 1).padStart(2, '0')}`;
              return [
                { text: `[${refId}]` },
                { inlineData: { mimeType: img.mimeType, data: img.base64 } },
              ];
            })
            .flat(),
        ];

        const raw = await withResilience(async (ai) => {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction: CREATIVE_DOSSIER_SYSTEM_PROMPT,
              responseMimeType: 'application/json',
              responseSchema: dossierResponseSchema,
            },
          });
          return parseJsonResponse(response.text);
        }, entry.key);

        if (!raw || typeof raw !== 'object') {
          throw new Error('Invalid Gemini dossier payload');
        }
        return sanitizeDossier(raw as Record<string, unknown>);
      }

      return await synthesizeViaOpenAiCompatible(
        normalized,
        userPrompt,
        entry.provider,
        entry.key,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${entry.provider}: ${message}`);
      console.warn(`MIMI // Dossier via ${entry.provider} failed:`, message);
    }
  }

  // Last resort: local visual embedding (canvas palette/contrast) + blueprint pattern rules.
  if (allowLocalFallback) {
    console.warn('MIMI // Compiling local evidence dossier (no LLM required).', errors.join(' | '));
    return synthesizeLocalFallback(normalized, userBlurb, digest, priorContext);
  }

  throw new Error(
    errors[0] ||
      'Failed to synthesize creative dossier — add an OpenAI, Anthropic, or Gemini key, or sign in for trial credits.',
  );
}

export const LIKENESS_STORAGE_KEY = 'mimi_likeness_manifest';
export const DOSSIER_STORAGE_KEY = 'mimi_evidence_dossier';

export function saveLikenessToLocalStorage(manifest: EvidenceBasedCreativeDossier['likenessManifest']): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LIKENESS_STORAGE_KEY, JSON.stringify({ ...manifest, savedAt: Date.now() }));
}

export function saveDossierToLocalStorage(dossier: EvidenceBasedCreativeDossier): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DOSSIER_STORAGE_KEY, JSON.stringify(dossier));
}

export function loadDossierFromLocalStorage(): EvidenceBasedCreativeDossier | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DOSSIER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EvidenceBasedCreativeDossier;
  } catch {
    return null;
  }
}

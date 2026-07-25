import { Type } from '@google/genai';
import { withResilience } from './geminiClient';
import { sanitizeTailorText } from '../constants/tailorSafetyRules';
import {
  CREATIVE_DOSSIER_SYSTEM_PROMPT,
  buildCreativeDossierUserPrompt,
} from '../lib/creativeDossierPrompts';
import type { EvidenceBasedCreativeDossier, PaperWarmth } from '../types';

const MIN_IMAGES = 3;
const MAX_IMAGES = 8;

export type DossierImageInput =
  | File
  | { base64: string; mimeType: string }
  | { dataUrl: string };

export interface SynthesizeCreativeDossierInput {
  images: DossierImageInput[];
  userBlurb?: string;
  apiKey?: string;
  /** When true, prefer Mimi-funded AI Gateway (Firebase session + trial/paid credits). */
  preferFundedGateway?: boolean;
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

async function getFirebaseSessionToken(): Promise<string | undefined> {
  try {
    const { auth } = await import('./firebaseInit');
    if (!auth.currentUser || auth.currentUser.isAnonymous) return undefined;
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
}

async function synthesizeViaFundedGateway(
  normalized: Array<{ base64: string; mimeType: string }>,
  userBlurb?: string,
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

export async function synthesizeCreativeDossier({
  images,
  userBlurb,
  apiKey,
  preferFundedGateway = true,
}: SynthesizeCreativeDossierInput): Promise<EvidenceBasedCreativeDossier> {
  validateDossierImageCount(images.length);

  const normalized = await Promise.all(images.map(normalizeImage));

  if (preferFundedGateway && !apiKey) {
    try {
      return await synthesizeViaFundedGateway(normalized, userBlurb);
    } catch (fundedError) {
      const message = fundedError instanceof Error ? fundedError.message : String(fundedError);
      if (!message.includes('Sign in') && !message.includes('credits')) {
        console.warn('MIMI // Funded dossier path failed, falling back to BYOK if available:', message);
      } else {
        throw fundedError;
      }
    }
  }

  const userPrompt = buildCreativeDossierUserPrompt(normalized.length, userBlurb);

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: userPrompt },
    ...normalized.map((img, i) => {
      const refId = `ref_${String(i + 1).padStart(2, '0')}`;
      return [
        { text: `[${refId}]` },
        { inlineData: { mimeType: img.mimeType, data: img.base64 } },
      ];
    }).flat(),
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
  }, apiKey);

  if (!raw || typeof raw !== 'object') {
    throw new Error('Failed to synthesize creative dossier — invalid model response.');
  }

  return sanitizeDossier(raw as Record<string, unknown>);
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

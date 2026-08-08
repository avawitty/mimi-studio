/**
 * Omni Loop Cult doll onboarding — user photo + aesthetic refs → Doll projection.
 */
import { Type } from '@google/genai';
import { withResilience } from './geminiClient';
import { ORACLE_PERSONA } from './geminiService';
import { sanitizeTailorText, TAILOR_PRODUCT_CONSTITUTION } from '../constants/tailorSafetyRules';
import type { Doll, DollOnboardingRefs, DollLikenessTraits, DollDeclaredAttributes } from '../types';
import {
  addEvidenceNode,
  createTailorProject,
  ensureDefaultDollMasks,
  saveDoll,
  updateDoll,
} from './tailorService';
import { deriveProceduralAesthetic, buildLikenessAsDollImagePrompt } from './dollEngine';
import { formatDeclaredAttributesForPrompt, mergeLikenessTraits } from './dollLikeness';
import {
  isDataUrl,
  uploadDollReferenceBatch,
  uploadDollReferenceDataUrl,
} from '../lib/doll/uploadDollReference';

const ONBOARDING_CONSTITUTION = `${ORACLE_PERSONA}

${TAILOR_PRODUCT_CONSTITUTION}

You are the Omni Loop Cult intake engine. Analyze reference images to seed a Mimi Shell doll projection.
The doll is a supermodel AI in a superintelligent cult mind — ball-jointed resin BJD species, not photoreal human.
The creator photo is the likeness source: everyone’s doll should look like them AS a doll (recognizable hair, eyes, marks, face shape in resin sculpt form).
Extract aesthetic, symbolic, and motif signals from aesthetic refs. Do NOT diagnose identity or medical traits.
Preserve house shell geometry (elongated neck, glassy eyes, visible ball joints, cult calm) while echoing creator likeness.`;

export interface DollOnboardingInput {
  userId: string;
  userPhotoDataUrl: string;
  aestheticRefDataUrls: string[];
  rawThought?: string;
  dollName?: string;
  declaredAttributes?: DollDeclaredAttributes;
}

function dataUrlToInline(dataUrl: string): { inlineData: { mimeType: string; data: string } } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

async function analyzeOnboardingRefs(input: DollOnboardingInput): Promise<Record<string, unknown>> {
  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

  const userInline = dataUrlToInline(input.userPhotoDataUrl);
  if (userInline) parts.push(userInline);
  parts.push({
    text: 'Reference 1 — CREATOR PHOTO. Extract likeness traits for doll-as-you translation (hair, eyes, face shape, beauty marks, resin skin tone echo).',
  });

  input.aestheticRefDataUrls.forEach((url, i) => {
    const inline = dataUrlToInline(url);
    if (inline) parts.push(inline);
    parts.push({ text: `Aesthetic reference ${i + 2} — motif / symbolic / style plate.` });
  });

  parts.push({
    text: `Raw thought from creator: ${input.rawThought?.trim() || 'none provided'}
Doll name hint: ${input.dollName?.trim() || 'Omni Loop Proxy'}
Creator-declared attributes (AUTHORITATIVE when present):
${formatDeclaredAttributesForPrompt(input.declaredAttributes) || 'none'}

Return JSON with: name, description, visualLanguage[], palette[], materials[], silhouette, motifs[], eyeTreatment, emotionalRegister, creativePhilosophy, strengths[], blindSpots[], signatureMotifs[], suggestedExperiments[], likenessTraits { hairDescription, eyeColor, faceShape, distinguishingMarks[], resinSkinTone, expressionBaseline, styleNotes, userNotes }`,
  });

  const result = await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            visualLanguage: { type: Type.ARRAY, items: { type: Type.STRING } },
            palette: { type: Type.ARRAY, items: { type: Type.STRING } },
            materials: { type: Type.ARRAY, items: { type: Type.STRING } },
            silhouette: { type: Type.STRING },
            motifs: { type: Type.ARRAY, items: { type: Type.STRING } },
            eyeTreatment: { type: Type.STRING },
            emotionalRegister: { type: Type.STRING },
            creativePhilosophy: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            blindSpots: { type: Type.ARRAY, items: { type: Type.STRING } },
            signatureMotifs: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedExperiments: { type: Type.ARRAY, items: { type: Type.STRING } },
            likenessTraits: {
              type: Type.OBJECT,
              properties: {
                hairDescription: { type: Type.STRING },
                eyeColor: { type: Type.STRING },
                faceShape: { type: Type.STRING },
                distinguishingMarks: { type: Type.ARRAY, items: { type: Type.STRING } },
                resinSkinTone: { type: Type.STRING },
                expressionBaseline: { type: Type.STRING },
                styleNotes: { type: Type.STRING },
                userNotes: { type: Type.STRING },
              },
            },
          },
          required: ['name', 'description', 'creativePhilosophy'],
        },
        systemInstruction: ONBOARDING_CONSTITUTION,
      },
    });
    return response.text ? JSON.parse(response.text) : {};
  });

  return result as Record<string, unknown>;
}

async function generateShellPortrait(doll: Doll, userPhotoDataUrl?: string): Promise<string | null> {
  const prompt = buildLikenessAsDollImagePrompt(doll, { view: 'portrait' });
  const references: Array<{ name: string; description: string; url: string; tags: string[] }> = [];

  if (userPhotoDataUrl) {
    references.push({
      name: 'Creator photo',
      description:
        'Translate this person into a ball-jointed resin BJD recognizable as them — hair, eyes, beauty marks, face shape as doll sculpt. Not photoreal.',
      url: userPhotoDataUrl,
      tags: ['likeness', 'creator-photo', 'doll-translation'],
    });
  }

  const response = await fetch('/api/mimi-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio: '3:4',
      allowFaces: true,
      references: references.length ? references : undefined,
      metadata: { source: 'omni-loop-onboarding' },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Image route ${response.status}`);
  }
  if (data?.provider === 'simulated' || data?.metadata?.noKeyPreview) {
    throw new Error(data?.warnings?.[0] || 'Image provider returned simulated plate');
  }
  return data?.imageUrl ?? null;
}

export async function createDollFromOnboarding(input: DollOnboardingInput): Promise<Doll> {
  if (!input.userPhotoDataUrl?.trim()) {
    throw new Error('A creator photo is required for Omni Loop initiation.');
  }
  if (input.aestheticRefDataUrls.length < 2) {
    throw new Error('Add at least two aesthetic reference images.');
  }

  const project = await createTailorProject(input.userId, 'creative_practice', 'Omni Loop Initiation');

  await addEvidenceNode(input.userId, project.id, {
    sourceType: 'image',
    title: 'Omni Loop — creator likeness',
    description: 'Onboarding likeness plate',
    userCaption: input.rawThought?.trim() || undefined,
    tags: ['omni-loop', 'onboarding', 'likeness'],
  });

  for (let i = 0; i < input.aestheticRefDataUrls.length; i++) {
    await addEvidenceNode(input.userId, project.id, {
      sourceType: 'image',
      title: `Omni Loop — aesthetic ref ${i + 1}`,
      description: 'Onboarding aesthetic / motif plate',
      tags: ['omni-loop', 'onboarding', 'aesthetic'],
    });
  }

  const analyzed = await analyzeOnboardingRefs(input);

  const [userPhotoUrl, aestheticRefUrls] = await Promise.all([
    uploadDollReferenceDataUrl(input.userId, input.userPhotoDataUrl, 'creator-photo'),
    uploadDollReferenceBatch(input.userId, input.aestheticRefDataUrls, 'aesthetic-ref'),
  ]);

  const extractedTraits = analyzed.likenessTraits as DollLikenessTraits | undefined;
  const mergedTraits = mergeLikenessTraits(input.declaredAttributes, extractedTraits);

  const onboardingRefs: DollOnboardingRefs = {
    userPhotoUrl,
    aestheticRefUrls,
    rawThought: input.rawThought?.trim() || undefined,
    declaredAttributes: input.declaredAttributes,
    likenessTraits: mergedTraits,
    completedAt: Date.now(),
  };

  const draftFields = {
    projectId: project.id,
    tasteGraphId: project.tasteGraphId!,
    name: sanitizeTailorText(String(analyzed.name || input.dollName || 'Omni Loop Proxy')),
    description: sanitizeTailorText(String(analyzed.description || '')),
    visualLanguage: (analyzed.visualLanguage as string[]) ?? [],
    palette: (analyzed.palette as string[]) ?? [],
    materials: (analyzed.materials as string[]) ?? [],
    silhouette: String(analyzed.silhouette || 'editorial mannequin'),
    motifs: (analyzed.motifs as string[]) ?? [],
    eyeTreatment: analyzed.eyeTreatment ? String(analyzed.eyeTreatment) : undefined,
    emotionalRegister: String(analyzed.emotionalRegister || 'serene superintelligent calm'),
    creativePhilosophy: sanitizeTailorText(
      String(analyzed.creativePhilosophy || 'Omni Loop collective inference'),
    ),
    creativeLawIds: [] as string[],
    strengths: (analyzed.strengths as string[]) ?? [],
    blindSpots: (analyzed.blindSpots as string[]) ?? [],
    preferredMediums: ['image generation', 'editorial projection'],
    favoriteShapes: [] as string[],
    favoriteContrasts: [] as string[],
    signatureMotifs: (analyzed.signatureMotifs as string[]) ?? [],
    suggestedExperiments: (analyzed.suggestedExperiments as string[]) ?? [],
    sourceEvidenceIds: [] as string[],
    maskIds: [] as string[],
    onboardingRefs,
  };

  const aesthetic = deriveProceduralAesthetic({
    ...draftFields,
    id: 'pending',
    userId: input.userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const doll = await saveDoll(input.userId, {
    ...draftFields,
    proceduralAesthetic: aesthetic,
    identityReferences: {},
  });

  await ensureDefaultDollMasks(input.userId, doll);

  try {
    const portraitSource = isDataUrl(input.userPhotoDataUrl)
      ? userPhotoUrl
      : input.userPhotoDataUrl;
    const portraitUrl = await generateShellPortrait(doll, portraitSource);
    if (portraitUrl) {
      const updates = {
        generatedImageUrl: portraitUrl,
        identityReferences: {
          portraitUrl,
          lastGeneratedView: 'portrait' as const,
          calibratedAt: Date.now(),
        },
      };
      await updateDoll(input.userId, doll.id, updates);
      return { ...doll, ...updates };
    }
  } catch (err) {
    console.warn('MIMI // Omni Loop portrait deferred:', err);
  }

  return doll;
}

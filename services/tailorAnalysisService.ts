import { Type } from '@google/genai';
import { withResilience } from './geminiClient';
import { ORACLE_PERSONA } from './geminiService';
import { containsForbiddenClaim, sanitizeTailorText, TAILOR_PRODUCT_CONSTITUTION } from '../constants/tailorSafetyRules';
import type {
  EvidenceNode,
  EvidenceSummary,
  Observation,
  PatternCluster,
  CreativeLaw,
  TailorAnalysisOutput,
  CreativeDossier,
  DossierSection,
  Doll,
  DollSeed,
  ArtworkMatch,
  MarketingAsset,
  PatternCluster as PatternClusterType,
} from '../types';
import {
  listEvidenceNodes,
  listObservations,
  listPatternClusters,
  listCreativeLaws,
  saveObservations,
  savePatternClusters,
  saveCreativeLaws,
  updateEvidenceNode,
  updateTailorProject,
  saveCreativeDossier,
  saveDoll,
  getTailorProject,
  createGenerationJob,
  updateGenerationJob,
  ensureDefaultDollMasks,
} from './tailorService';
import {
  evaluateGenerationReadiness,
  isGenerationBlocked,
  isMarketingAssetType,
} from './tailorReadiness';
import { assertProjectGraphBinding } from './tailorProjection';

const TAILOR_ANALYSIS_CONSTITUTION = `${ORACLE_PERSONA}

${TAILOR_PRODUCT_CONSTITUTION}

You are the Tailor Evidence Engine. You do NOT classify users. You extract observations and patterns from references.
Every observation must be descriptive, not interpretive. No medical, diagnostic, or identity claims.
Mark claimType accurately: observed for raw descriptions, inferred for patterns, speculative for tentative readings.
`;

function makeId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function imagePart(node: EvidenceNode): { inlineData: { mimeType: string; data: string } } | null {
  const url = node.uploadedFileUrl ?? node.thumbnailUrl;
  if (!url?.startsWith('data:')) return null;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

const observationSchema = {
  type: Type.OBJECT,
  properties: {
    evidenceNodeId: { type: Type.STRING },
    category: { type: Type.STRING },
    label: { type: Type.STRING },
    description: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    claimType: { type: Type.STRING },
    modelReasoningSummary: { type: Type.STRING },
  },
  required: ['evidenceNodeId', 'category', 'label', 'description', 'confidence', 'claimType'],
};

const evidenceSummarySchema = {
  type: Type.OBJECT,
  properties: {
    evidenceNodeId: { type: Type.STRING },
    visualSummary: { type: Type.STRING },
    objects: { type: Type.ARRAY, items: { type: Type.STRING } },
    composition: { type: Type.STRING },
    materials: { type: Type.ARRAY, items: { type: Type.STRING } },
    typography: { type: Type.STRING },
    colorLogic: { type: Type.STRING },
    texture: { type: Type.STRING },
    historicalInfluences: { type: Type.ARRAY, items: { type: Type.STRING } },
    emotionalQualities: { type: Type.ARRAY, items: { type: Type.STRING } },
    creativeDecisions: { type: Type.ARRAY, items: { type: Type.STRING } },
    underlyingPrinciple: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ['evidenceNodeId', 'visualSummary', 'confidence'],
};

const tailorOutputSchema = {
  type: Type.OBJECT,
  properties: {
    evidenceSummaries: { type: Type.ARRAY, items: evidenceSummarySchema },
    observations: { type: Type.ARRAY, items: observationSchema },
    patternClusters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          observationIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
          supportingEvidenceNodeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          frequency: { type: Type.INTEGER },
          confidence: { type: Type.NUMBER },
          possibleInterpretations: { type: Type.ARRAY, items: { type: Type.STRING } },
          claimType: { type: Type.STRING },
        },
        required: ['name', 'description', 'category', 'confidence', 'claimType'],
      },
    },
    creativeLaws: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          principle: { type: Type.STRING },
          explanation: { type: Type.STRING },
          supportingPatternIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
          supportingEvidenceNodeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence: { type: Type.NUMBER },
          claimType: { type: Type.STRING },
          applications: { type: Type.ARRAY, items: { type: Type.STRING } },
          avoidances: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'principle', 'explanation', 'confidence', 'claimType'],
      },
    },
    suggestedDollSeeds: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          motifs: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    artHistorySearchQueries: { type: Type.ARRAY, items: { type: Type.STRING } },
    userCurationPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['evidenceSummaries', 'observations', 'patternClusters', 'creativeLaws', 'warnings'],
};

function sanitizeOutput<T extends { label?: string; description?: string; principle?: string; explanation?: string }>(
  items: T[],
): T[] {
  return items.filter((item) => {
    const texts = [item.label, item.description, item.principle, item.explanation].filter(Boolean) as string[];
    return !texts.some(containsForbiddenClaim);
  }).map((item) => ({
    ...item,
    ...(item.description ? { description: sanitizeTailorText(item.description) } : {}),
    ...(item.principle ? { principle: sanitizeTailorText(item.principle) } : {}),
    ...(item.explanation ? { explanation: sanitizeTailorText(item.explanation) } : {}),
  }));
}

export async function extractObservationsForEvidence(
  userId: string,
  projectId: string,
  node: EvidenceNode,
  blurb?: string,
): Promise<{ summary: EvidenceSummary; observations: Observation[] }> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  const img = imagePart(node);
  if (img) parts.push(img);

  parts.push({
    text: `${TAILOR_ANALYSIS_CONSTITUTION}

Analyze this single reference (evidenceNodeId: ${node.id}).
Source type: ${node.sourceType}
Title: ${node.title}
Caption: ${node.userCaption ?? 'none'}
Project blurb: ${blurb ?? 'none'}

Extract ONLY descriptive observations. No interpretation of user identity.
Return evidenceSummaries (one entry) and observations array for this reference only.
Every observation must have evidenceNodeId="${node.id}" and claimType="observed".`,
  });

  const raw = await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evidenceSummaries: { type: Type.ARRAY, items: evidenceSummarySchema },
            observations: { type: Type.ARRAY, items: observationSchema },
          },
          required: ['evidenceSummaries', 'observations'],
        },
      },
    });
    return response.text ? (JSON.parse(response.text) as TailorAnalysisOutput) : null;
  });

  const summary = raw?.evidenceSummaries?.[0] ?? {
    evidenceNodeId: node.id,
    visualSummary: node.title,
    objects: [],
    composition: '',
    materials: [],
    typography: '',
    colorLogic: '',
    texture: '',
    historicalInfluences: [],
    emotionalQualities: [],
    creativeDecisions: [],
    underlyingPrinciple: '',
    confidence: 0.5,
  };

  const observations = sanitizeOutput(raw?.observations ?? []).map((o) => ({
    id: makeId(),
    userId,
    projectId,
    evidenceNodeId: node.id,
    category: o.category as Observation['category'],
    label: o.label,
    description: o.description,
    confidence: o.confidence,
    claimType: 'observed' as const,
    modelReasoningSummary: o.modelReasoningSummary,
    userStatus: 'suggested' as const,
    createdAt: Date.now(),
  }));

  await updateEvidenceNode(userId, projectId, node.id, {
    analysisStatus: 'analyzed',
    extractedMetadata: { summary },
  });

  return { summary, observations };
}

export async function runTailorAnalysis(
  userId: string,
  projectId: string,
  blurb?: string,
): Promise<TailorAnalysisOutput> {
  const job = await createGenerationJob(userId, projectId, 'analyze');
  await updateGenerationJob(userId, job.id, { status: 'processing' });

  try {
    const evidence = await listEvidenceNodes(userId, projectId);
    if (evidence.length < 1) throw new Error('At least one evidence node required');

    await updateTailorProject(userId, projectId, { analysisStatus: 'processing', blurb });

    const allObservations: Observation[] = [];
    const allSummaries: EvidenceSummary[] = [];

    for (const node of evidence) {
      const { summary, observations } = await extractObservationsForEvidence(
        userId,
        projectId,
        node,
        blurb,
      );
      allSummaries.push(summary);
      allObservations.push(...observations);
    }

    await saveObservations(
      userId,
      projectId,
      allObservations.map(({ id, createdAt, ...rest }) => rest),
    );

    const obsContext = allObservations
      .map((o) => `[${o.id}] ${o.category}: ${o.label} — ${o.description}`)
      .join('\n');

    const patternResult = await withResilience(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `${TAILOR_ANALYSIS_CONSTITUTION}

Given these observations across ${evidence.length} references, cluster into patternClusters and suggest creativeLaws.
Observations:
${obsContext}

Evidence IDs: ${evidence.map((e) => e.id).join(', ')}

Rules:
- patternClusters must group recurring signals with frequency and confidence
- creativeLaws describe DECISIONS not aesthetic labels
- observationIndices refer to 0-based index in the observations list above
- supportingPatternIndices refer to 0-based index in patternClusters you output
- Include artHistorySearchQueries for thematic museum searches
- Include userCurationPrompts asking user to accept/reject/rename signals`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: tailorOutputSchema,
        },
      });
      return response.text ? (JSON.parse(response.text) as TailorAnalysisOutput) : null;
    });

    const obsIds = allObservations.map((o) => o.id);

    const clusters: Omit<PatternCluster, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt'>[] =
      sanitizeOutput(patternResult?.patternClusters ?? []).map((c, idx) => {
        const raw = patternResult?.patternClusters?.[idx];
        const observationIndices = (raw as { observationIndices?: number[] })?.observationIndices ?? [];
        return {
          name: c.name ?? `Pattern ${idx + 1}`,
          description: c.description ?? '',
          category: (c.category as PatternClusterType['category']) ?? 'visual',
          observationIds: observationIndices.map((i) => obsIds[i]).filter(Boolean),
          supportingEvidenceNodeIds: c.supportingEvidenceNodeIds ?? evidence.map((e) => e.id),
          frequency: c.frequency ?? 1,
          confidence: c.confidence ?? 0.5,
          possibleInterpretations: c.possibleInterpretations ?? [],
          claimType: 'inferred' as const,
          userStatus: 'suggested' as const,
          userWeight: 'medium' as const,
        };
      });

    const savedClusters = await savePatternClusters(userId, projectId, clusters);
    const clusterIds = savedClusters.map((c) => c.id);

    const laws: Omit<CreativeLaw, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt'>[] =
      sanitizeOutput(patternResult?.creativeLaws ?? []).map((law, idx) => {
        const raw = patternResult?.creativeLaws?.[idx];
        const patternIndices = (raw as { supportingPatternIndices?: number[] })?.supportingPatternIndices ?? [];
        return {
          title: law.title ?? `Law ${idx + 1}`,
          principle: law.principle ?? '',
          explanation: law.explanation ?? '',
          supportingPatternClusterIds: patternIndices.map((i) => clusterIds[i]).filter(Boolean),
          supportingEvidenceNodeIds: law.supportingEvidenceNodeIds ?? evidence.map((e) => e.id),
          confidence: law.confidence ?? 0.5,
          claimType: 'inferred' as const,
          userStatus: 'suggested' as const,
          applications: law.applications ?? [],
          avoidances: law.avoidances ?? [],
        };
      });

    await saveCreativeLaws(userId, projectId, laws);
    await updateTailorProject(userId, projectId, { analysisStatus: 'analyzed' });
    await updateGenerationJob(userId, job.id, { status: 'completed' });

    return {
      evidenceSummaries: allSummaries,
      observations: allObservations.map(({ id, userId: _u, projectId: _p, createdAt, ...rest }) => rest),
      patternClusters: clusters,
      creativeLaws: laws,
      suggestedDollSeeds: patternResult?.suggestedDollSeeds ?? [],
      artHistorySearchQueries: patternResult?.artHistorySearchQueries ?? [],
      userCurationPrompts: patternResult?.userCurationPrompts ?? [],
      warnings: patternResult?.warnings ?? [],
    };
  } catch (e) {
    await updateGenerationJob(userId, job.id, {
      status: 'failed',
      error: e instanceof Error ? e.message : 'Analysis failed',
    });
    await updateTailorProject(userId, projectId, { analysisStatus: 'failed' });
    throw e;
  }
}

export async function generateCreativeDossierForProject(
  userId: string,
  projectId: string,
): Promise<CreativeDossier> {
  const project = await getTailorProject(userId, projectId);
  if (!project?.tasteGraphId) throw new Error('Project not found');

  const [evidence, observations, clusters, laws] = await Promise.all([
    listEvidenceNodes(userId, projectId),
    listObservations(userId, projectId),
    listPatternClusters(userId, projectId),
    listCreativeLaws(userId, projectId),
  ]);

  const readiness = evaluateGenerationReadiness({
    action: 'dossier',
    project,
    evidenceCount: evidence.length,
    patterns: clusters,
    laws,
  });
  if (isGenerationBlocked(readiness)) {
    const err = new Error(readiness.explanation) as Error & {
      prerequisite: string;
      recoveryAction: string;
    };
    err.prerequisite = readiness.prerequisite;
    err.recoveryAction = readiness.recoveryAction;
    throw err;
  }

  const acceptedClusters = clusters.filter((c) => c.userStatus === 'accepted');
  const acceptedLaws = laws.filter((l) => l.userStatus === 'accepted');
  const rejectedClusters = clusters.filter((c) => c.userStatus === 'rejected');

  const sectionPrompt = await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `${TAILOR_ANALYSIS_CONSTITUTION}

Generate a Creative Dossier as JSON with fields: overview (string), sections (array).
Each section: id, title, body, claimType (observed|inferred|user_confirmed|user_rejected|speculative), evidenceNodeIds[], observationIds[], patternClusterIds[], creativeLawIds[].

Project intent: ${project.intent}
Blurb: ${project.blurb ?? ''}
Evidence count: ${evidence.length}
Accepted patterns: ${acceptedClusters.map((c) => c.name).join(', ')}
Accepted laws: ${acceptedLaws.map((l) => l.title).join(', ')}
Rejected patterns: ${rejectedClusters.map((c) => c.name).join(', ')}

Required section titles: Overview, Taste Graph, Pattern Graph, Creative Laws, Visual Grammar, Language Grammar, Material Vocabulary, Color Logic, Composition Logic, Emotional Vocabulary, Historical Influences, Creative Opportunities, Experiments, Creative Constraints, Evidence Library, Applications, Creative Prompt Library, Future Directions.

Tone: editorial, museum archive, fashion dossier. Every claim links to evidence IDs where possible.
Evidence IDs: ${evidence.map((e) => e.id).join(', ')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  body: { type: Type.STRING },
                  claimType: { type: Type.STRING },
                  evidenceNodeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  observationIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  patternClusterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  creativeLawIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['id', 'title', 'body', 'claimType'],
              },
            },
          },
          required: ['overview', 'sections'],
        },
      },
    });
    return response.text
      ? (JSON.parse(response.text) as { overview: string; sections: DossierSection[] })
      : { overview: '', sections: [] };
  });

  return saveCreativeDossier(userId, {
    projectId,
    tasteGraphId: project.tasteGraphId,
    title: project.title,
    overview: sanitizeTailorText(sectionPrompt.overview),
    sections: sectionPrompt.sections.map((s) => ({
      ...s,
      body: sanitizeTailorText(s.body),
    })),
    evidenceLibraryIds: evidence.map((e) => e.id),
  });
}

export async function generateDollFromGraph(
  userId: string,
  projectId: string,
  seed?: DollSeed,
): Promise<Doll> {
  const project = await getTailorProject(userId, projectId);
  if (!project?.tasteGraphId) throw new Error('Project not found');
  assertProjectGraphBinding(project, project.tasteGraphId);

  const [clusters, laws, evidence] = await Promise.all([
    listPatternClusters(userId, projectId),
    listCreativeLaws(userId, projectId),
    listEvidenceNodes(userId, projectId),
  ]);

  const readiness = evaluateGenerationReadiness({
    action: 'doll',
    project,
    evidenceCount: evidence.length,
    patterns: clusters,
    laws,
  });
  if (isGenerationBlocked(readiness)) {
    const err = new Error(readiness.explanation) as Error & {
      prerequisite: string;
      recoveryAction: string;
    };
    err.prerequisite = readiness.prerequisite;
    err.recoveryAction = readiness.recoveryAction;
    throw err;
  }

  const acceptedLaws = laws.filter((l) => l.userStatus === 'accepted' || l.userStatus === 'suggested');
  const acceptedClusters = clusters.filter((c) => c.userStatus === 'accepted' || c.userStatus === 'suggested');

  const dollData = await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `${TAILOR_ANALYSIS_CONSTITUTION}

Generate a Doll — a symbolic embodiment of the Taste Graph, NOT the user's identity.

Accepted patterns: ${acceptedClusters.map((c) => c.name).join(', ')}
Accepted laws: ${acceptedLaws.map((l) => l.principle).join('; ')}
Seed: ${seed ? JSON.stringify(seed) : 'none'}

Return JSON: name, description, visualLanguage[], palette[], materials[], silhouette, motifs[], eyeTreatment, emotionalRegister, creativePhilosophy, strengths[], blindSpots[], preferredMediums[], favoriteShapes[], favoriteContrasts[], signatureMotifs[], suggestedExperiments[]`,
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
            preferredMediums: { type: Type.ARRAY, items: { type: Type.STRING } },
            favoriteShapes: { type: Type.ARRAY, items: { type: Type.STRING } },
            favoriteContrasts: { type: Type.ARRAY, items: { type: Type.STRING } },
            signatureMotifs: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedExperiments: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['name', 'description', 'creativePhilosophy'],
        },
      },
    });
    return response.text ? JSON.parse(response.text) : {};
  });

  const { deriveProceduralAesthetic } = await import('./dollEngine');

  const draftFields = {
    projectId,
    tasteGraphId: project.tasteGraphId,
    name: dollData.name ?? seed?.name ?? 'Unnamed Doll',
    description: sanitizeTailorText(dollData.description ?? ''),
    visualLanguage: dollData.visualLanguage ?? [],
    palette: dollData.palette ?? seed?.palette ?? [],
    materials: dollData.materials ?? [],
    silhouette: dollData.silhouette ?? '',
    motifs: dollData.motifs ?? seed?.motifs ?? [],
    eyeTreatment: dollData.eyeTreatment,
    emotionalRegister: dollData.emotionalRegister ?? '',
    creativePhilosophy: sanitizeTailorText(dollData.creativePhilosophy ?? seed?.creativePhilosophy ?? ''),
    creativeLawIds: acceptedLaws.map((l) => l.id),
    strengths: dollData.strengths ?? [],
    blindSpots: dollData.blindSpots ?? [],
    preferredMediums: dollData.preferredMediums ?? [],
    favoriteShapes: dollData.favoriteShapes ?? [],
    favoriteContrasts: dollData.favoriteContrasts ?? [],
    signatureMotifs: dollData.signatureMotifs ?? [],
    suggestedExperiments: dollData.suggestedExperiments ?? [],
    sourceEvidenceIds: evidence.map((e) => e.id),
    maskIds: [] as string[],
  };

  // Seed procedural aesthetic from projection fields before persist
  const aesthetic = deriveProceduralAesthetic({
    ...draftFields,
    id: 'pending',
    userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const doll = await saveDoll(userId, {
    ...draftFields,
    proceduralAesthetic: aesthetic,
    identityReferences: {},
  });

  await ensureDefaultDollMasks(userId, doll);
  return doll;
}

export async function generateMarketingAsset(
  userId: string,
  projectId: string,
  tasteGraphId: string,
  assetType: MarketingAsset['assetType'],
  dollId?: string,
): Promise<MarketingAsset> {
  const project = await getTailorProject(userId, projectId);
  assertProjectGraphBinding(
    project ?? { id: projectId, tasteGraphId: undefined },
    tasteGraphId,
  );

  const [laws, clusters, evidence] = await Promise.all([
    listCreativeLaws(userId, projectId),
    listPatternClusters(userId, projectId),
    listEvidenceNodes(userId, projectId),
  ]);

  const readiness = evaluateGenerationReadiness({
    action: 'marketing_asset',
    project,
    evidenceCount: evidence.length,
    patterns: clusters,
    laws,
    assetType,
    expectedTasteGraphId: tasteGraphId,
  });
  if (isGenerationBlocked(readiness)) {
    const err = new Error(readiness.explanation) as Error & {
      prerequisite: string;
      recoveryAction: string;
    };
    err.prerequisite = readiness.prerequisite;
    err.recoveryAction = readiness.recoveryAction;
    throw err;
  }

  if (!isMarketingAssetType(assetType)) {
    throw new Error('invalid_asset_type');
  }

  const accepted = laws.filter((l) => l.userStatus === 'accepted');

  const assetData = await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `${TAILOR_ANALYSIS_CONSTITUTION}

Generate a marketing asset of type "${assetType}" from accepted Creative Laws.
Laws: ${accepted.map((l) => `${l.title}: ${l.principle}`).join('; ')}

Explain what evidence informed it, how it transforms references (not copies), and who it might serve.
Return: title, bodyCopy, imagePrompt, layoutGuidance, palette[], typographyGuidance, transformationNotes`,
      config: { responseMimeType: 'application/json' },
    });
    return response.text ? JSON.parse(response.text) : {};
  });

  const { saveMarketingAsset } = await import('./tailorService');
  return saveMarketingAsset(userId, {
    projectId,
    sourceTasteGraphId: tasteGraphId,
    sourceDollId: dollId,
    assetType,
    title: assetData.title ?? assetType,
    bodyCopy: sanitizeTailorText(assetData.bodyCopy ?? ''),
    imagePrompt: assetData.imagePrompt,
    layoutGuidance: assetData.layoutGuidance,
    palette: assetData.palette,
    typographyGuidance: assetData.typographyGuidance,
    evidenceLinks: accepted.flatMap((l) => l.supportingEvidenceNodeIds),
    transformationNotes: assetData.transformationNotes,
  });
}

export async function generateRedepictionPrompt(
  userId: string,
  projectId: string,
  dollId: string,
  artwork: ArtworkMatch,
  outputGoal: string,
): Promise<{ prompt: string; citation: string; transformationNotes: string }> {
  const laws = await listCreativeLaws(userId, projectId);
  const accepted = laws.filter((l) => l.userStatus === 'accepted');

  const result = await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `${TAILOR_ANALYSIS_CONSTITUTION}

Create a TRANSFORMATIVE redeption prompt (not a copy) of public-domain artwork for user Doll.
Source: ${artwork.artworkTitle} by ${artwork.artist} (${artwork.date ?? 'unknown'})
Themes: ${artwork.matchedThemes.join(', ')}
User laws: ${accepted.map((l) => l.principle).join('; ')}
Output goal: ${outputGoal}

Return JSON: prompt, citation, transformationNotes (how it differs from source)`,
      config: { responseMimeType: 'application/json' },
    });
    return response.text ? JSON.parse(response.text) : {};
  });

  return {
    prompt: result.prompt ?? '',
    citation: result.citation ?? `${artwork.artworkTitle}, ${artwork.artist}`,
    transformationNotes: sanitizeTailorText(result.transformationNotes ?? ''),
  };
}

import type {
  CreativeLaw,
  EvidenceNode,
  EvidenceSummary,
  Observation,
  ObservationCategory,
  PatternCluster,
  TailorAnalysisOutput,
} from '../types';
import {
  getTailorProject,
  listEvidenceNodes,
  saveCreativeLaws,
  saveObservations,
  savePatternClusters,
  updateEvidenceNode,
  updateTailorProject,
} from './tailorService';

type ObservationDraft = Omit<Observation, 'id' | 'userId' | 'projectId' | 'createdAt' | 'userStatus'>;
type PatternClusterDraft = Omit<
  PatternCluster,
  'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt' | 'userStatus' | 'userWeight'
>;
type CreativeLawDraft = Omit<CreativeLaw, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt' | 'userStatus'>;

const SOURCE_CATEGORY: Partial<Record<EvidenceNode['sourceType'], ObservationCategory>> = {
  book: 'language',
  quote: 'language',
  note: 'language',
  fashion: 'fashion',
  product: 'product',
  architecture: 'compositional',
  music: 'emotional',
  film: 'historical',
  artwork: 'visual',
  image: 'visual',
  screenshot: 'visual',
  website: 'typographic',
  moodboard: 'visual',
  object: 'material',
};

const MATERIAL_WORDS = ['paper', 'grain', 'linen', 'silk', 'glass', 'metal', 'ceramic', 'velvet', 'stone', 'wood'];
const COLOR_WORDS = ['black', 'white', 'cream', 'ivory', 'red', 'blue', 'green', 'pink', 'gold', 'silver', 'gray'];
const TYPOGRAPHY_WORDS = ['serif', 'type', 'letter', 'text', 'editorial', 'caption', 'book', 'print'];
const SYMBOL_WORDS = ['mirror', 'eye', 'doll', 'mask', 'cat', 'fish', 'flower', 'star', 'circle', 'hand'];
const COMPOSITION_WORDS = ['grid', 'margin', 'center', 'frame', 'archive', 'layout', 'negative', 'space', 'architecture'];

function makeMockId(prefix: string, seed: string): string {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42);
  return `${prefix}-${slug || 'signal'}`;
}

function containsAny(text: string, words: string[]): boolean {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function evidenceText(node: EvidenceNode): string {
  return [node.title, node.description, node.userCaption, ...(node.tags ?? [])]
    .filter(Boolean)
    .join(' ');
}

function summaryFor(node: EvidenceNode): EvidenceSummary {
  const text = evidenceText(node);
  const materials = MATERIAL_WORDS.filter((word) => text.toLowerCase().includes(word));
  const colors = COLOR_WORDS.filter((word) => text.toLowerCase().includes(word));
  const typographic = containsAny(text, TYPOGRAPHY_WORDS);

  return {
    evidenceNodeId: node.id,
    visualSummary: node.userCaption || node.description || `${node.title} as ${node.sourceType} evidence.`,
    objects: unique([node.sourceType, ...(node.tags ?? []).slice(0, 4)]),
    composition: containsAny(text, COMPOSITION_WORDS)
      ? 'The reference appears to foreground structure, framing, or archive-like arrangement.'
      : 'The reference is available as a Tailor evidence object for pattern comparison.',
    materials,
    typography: typographic ? 'Typographic or editorial language is present in the source metadata.' : '',
    colorLogic: colors.length ? `Mentions or implies ${colors.join(', ')}.` : '',
    texture: materials.length ? `Material cues include ${materials.join(', ')}.` : '',
    historicalInfluences: containsAny(text, ['museum', 'archive', 'vintage', 'history', 'art'])
      ? ['archive or art-historical reference point']
      : [],
    emotionalQualities: containsAny(text, ['soft', 'quiet', 'intense', 'romantic', 'strange', 'clinical'])
      ? ['emotionally named by source metadata']
      : [],
    creativeDecisions: ['treat as evidence before inference'],
    underlyingPrinciple: 'Use uploaded references as evidence, not templates.',
    confidence: 0.62,
  };
}

function observationsFor(node: EvidenceNode): ObservationDraft[] {
  const text = evidenceText(node);
  const baseCategory = SOURCE_CATEGORY[node.sourceType] ?? 'visual';
  const base: ObservationDraft[] = [
    {
      evidenceNodeId: node.id,
      category: baseCategory,
      label: `${node.sourceType.replace(/_/g, ' ')} reference`,
      description: `${node.title} is present as ${node.sourceType} evidence for the Tailor read.`,
      confidence: 0.78,
      claimType: 'observed',
      modelReasoningSummary: 'Derived from source type and title metadata.',
    },
  ];

  if (containsAny(text, MATERIAL_WORDS)) {
    base.push({
      evidenceNodeId: node.id,
      category: 'material',
      label: 'Material language',
      description: 'The reference metadata contains tactile or surface-oriented material words.',
      confidence: 0.72,
      claimType: 'observed',
      modelReasoningSummary: 'Matched material terms in title, caption, description, or tags.',
    });
  }

  if (containsAny(text, COLOR_WORDS)) {
    base.push({
      evidenceNodeId: node.id,
      category: 'color',
      label: 'Color cue',
      description: 'The reference metadata includes explicit color language.',
      confidence: 0.7,
      claimType: 'observed',
      modelReasoningSummary: 'Matched color terms in title, caption, description, or tags.',
    });
  }

  if (containsAny(text, TYPOGRAPHY_WORDS)) {
    base.push({
      evidenceNodeId: node.id,
      category: 'typographic',
      label: 'Editorial typography cue',
      description: 'The reference metadata points toward text, print, captioning, or editorial type.',
      confidence: 0.74,
      claimType: 'observed',
      modelReasoningSummary: 'Matched typographic and editorial terms.',
    });
  }

  if (containsAny(text, SYMBOL_WORDS)) {
    base.push({
      evidenceNodeId: node.id,
      category: 'symbolic',
      label: 'Symbol motif',
      description: 'The reference metadata contains recurring symbolic object language.',
      confidence: 0.69,
      claimType: 'observed',
      modelReasoningSummary: 'Matched motif terms used as symbolic evidence.',
    });
  }

  if (containsAny(text, COMPOSITION_WORDS)) {
    base.push({
      evidenceNodeId: node.id,
      category: 'compositional',
      label: 'Structured composition',
      description: 'The reference metadata suggests grids, margins, frames, archive structure, or spatial ordering.',
      confidence: 0.71,
      claimType: 'observed',
      modelReasoningSummary: 'Matched composition and layout terms.',
    });
  }

  return base;
}

function clusterFromObservations(
  category: ObservationCategory,
  observations: ObservationDraft[],
  evidence: EvidenceNode[],
  index: number,
): PatternClusterDraft {
  const evidenceIds = unique(observations.map((o) => o.evidenceNodeId));
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const evidenceTitles = evidence
    .filter((node) => evidenceIds.includes(node.id))
    .map((node) => node.title)
    .slice(0, 3);

  return {
    observationIds: observations.map((obs, obsIndex) => makeMockId('mock-observation', `${category}-${index}-${obs.evidenceNodeId}-${obsIndex}`)),
    name: `${categoryLabel} signal`,
    description: `${observations.length} ${category} observation${observations.length === 1 ? '' : 's'} recur across ${evidenceIds.length} reference${evidenceIds.length === 1 ? '' : 's'}.`,
    category,
    supportingEvidenceNodeIds: evidenceIds,
    frequency: observations.length,
    confidence: Math.min(0.9, 0.52 + observations.length * 0.08),
    possibleInterpretations: [
      `This may be a useful ${category} signal to keep, reject, or rename.`,
      evidenceTitles.length ? `Supported by: ${evidenceTitles.join(', ')}.` : 'Supported by uploaded references.',
    ],
    claimType: 'inferred',
  };
}

function lawForCluster(cluster: PatternClusterDraft, index: number): CreativeLawDraft {
  const categoryLabel = cluster.category.charAt(0).toUpperCase() + cluster.category.slice(1);
  return {
    title: `${categoryLabel} Becomes a Decision`,
    principle: `Use ${cluster.name.toLowerCase()} intentionally, only when it clarifies the project.`,
    explanation: `This law is suggested from ${cluster.frequency} supporting observation${cluster.frequency === 1 ? '' : 's'}. It should be accepted only if the creator agrees this is why the references matter.`,
    supportingPatternClusterIds: [makeMockId('mock-pattern', `${cluster.category}-${index}`)],
    supportingEvidenceNodeIds: cluster.supportingEvidenceNodeIds,
    confidence: Math.max(0.5, cluster.confidence - 0.08),
    claimType: 'inferred',
    applications: ['illustration', 'brand', 'ui'],
    avoidances: ['Do not treat this as identity.', 'Do not copy the source reference directly.'],
  };
}

export function createMockTailorAnalysisOutput(
  evidence: EvidenceNode[],
  blurb?: string,
): TailorAnalysisOutput {
  const evidenceSummaries = evidence.map(summaryFor);
  const observations = evidence.flatMap(observationsFor);
  const byCategory = observations.reduce<Record<string, ObservationDraft[]>>((acc, observation) => {
    acc[observation.category] = [...(acc[observation.category] ?? []), observation];
    return acc;
  }, {});

  const patternClusters = Object.entries(byCategory)
    .filter(([, items]) => items.length > 0)
    .map(([category, items], index) =>
      clusterFromObservations(category as ObservationCategory, items, evidence, index),
    )
    .slice(0, 6);

  const creativeLaws = patternClusters.slice(0, 4).map(lawForCluster);
  const warnings = evidence.length < 3
    ? ['Initial read: add at least 3 references for a stronger pattern comparison.']
    : [];

  return {
    evidenceSummaries,
    observations,
    patternClusters,
    creativeLaws,
    suggestedDollSeeds: [],
    artHistorySearchQueries: unique([
      ...patternClusters.map((cluster) => `${cluster.category} visual language art history`),
      blurb ? `${blurb} art history reference` : '',
    ].filter(Boolean)),
    userCurationPrompts: [
      'Which signals feel like the real reason these references matter?',
      'Which patterns should Mimi keep, reject, or rename before saving the Taste Graph?',
      'Which law feels useful enough to apply to Studio outputs?',
    ],
    warnings,
  };
}

export async function runMockTailorAnalysis(
  userId: string,
  projectId: string,
  blurb?: string,
): Promise<TailorAnalysisOutput> {
  const evidence = await listEvidenceNodes(userId, projectId);
  if (evidence.length < 1) throw new Error('At least one evidence node required');

  const project = await getTailorProject(userId, projectId);
  await updateTailorProject(userId, projectId, { analysisStatus: 'processing', blurb });

  const output = createMockTailorAnalysisOutput(evidence, blurb ?? project?.blurb);

  await Promise.all(output.evidenceSummaries.map((summary) =>
    updateEvidenceNode(userId, projectId, summary.evidenceNodeId, {
      analysisStatus: 'analyzed',
      extractedMetadata: { summary, analyzer: 'mock' },
    }),
  ));

  const savedObservations = await saveObservations(
    userId,
    projectId,
    output.observations.map((observation) => ({
      ...observation,
      userStatus: 'suggested',
    })),
  );

  const observationIdsByEvidence = savedObservations.reduce<Record<string, string[]>>((acc, observation) => {
    acc[observation.evidenceNodeId] = [...(acc[observation.evidenceNodeId] ?? []), observation.id];
    return acc;
  }, {});

  const savedClusters = await savePatternClusters(
    userId,
    projectId,
    output.patternClusters.map((cluster) => ({
      ...cluster,
      observationIds: unique(cluster.supportingEvidenceNodeIds.flatMap((id) => observationIdsByEvidence[id] ?? [])),
      userStatus: 'suggested',
      userWeight: 'medium',
    })),
  );

  const clusterIdsByEvidence = savedClusters.reduce<Record<string, string[]>>((acc, cluster) => {
    for (const evidenceNodeId of cluster.supportingEvidenceNodeIds) {
      acc[evidenceNodeId] = [...(acc[evidenceNodeId] ?? []), cluster.id];
    }
    return acc;
  }, {});

  await saveCreativeLaws(
    userId,
    projectId,
    output.creativeLaws.map((law) => ({
      ...law,
      supportingPatternClusterIds: unique(law.supportingEvidenceNodeIds.flatMap((id) => clusterIdsByEvidence[id] ?? [])),
      userStatus: 'suggested',
    })),
  );

  await updateTailorProject(userId, projectId, { analysisStatus: 'analyzed' });

  return output;
}

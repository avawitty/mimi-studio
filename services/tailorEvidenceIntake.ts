/**
 * Evidence intake helpers for "Let Mimi Read You".
 * Normalizes staged imports into schema-safe records, derives truthful
 * progress stages, maps curiosity → intendedHelp / requestedOutputs,
 * and builds provenance-safe claim drafts for compilation handoff.
 */

import type { EvidenceNode, EvidenceSourceType } from '../types';
import type { TasteImportItem, TasteProvider } from './tasteImportService';

export type TailorEvidenceSourceType =
  | 'letterboxd'
  | 'pinterest'
  | 'instagram'
  | 'upload'
  | 'direct_statement';

export type TailorEvidenceMediaType =
  | 'image'
  | 'text'
  | 'video'
  | 'pdf'
  | 'link'
  | 'collection';

export type TailorEvidenceScope = 'session' | 'persistent';

export type TailorEvidenceStatus =
  | 'staged'
  | 'importing'
  | 'analyzing'
  | 'ready'
  | 'accepted'
  | 'rejected'
  | 'error';

export interface TailorEvidenceItem {
  id: string;
  sourceType: TailorEvidenceSourceType;
  sourceUrl?: string;
  sourceCollectionId?: string;
  title: string;
  description?: string;
  mediaType?: TailorEvidenceMediaType;
  thumbnailUrl?: string;
  dataUrl?: string;
  rawMetadata?: Record<string, unknown>;
  scope: TailorEvidenceScope;
  status: TailorEvidenceStatus;
  confidence?: number;
  capturedAt: string;
  userConfirmed: boolean;
  /** Maps to EvidenceSourceType when committing to Firestore */
  evidenceSourceType: EvidenceSourceType;
  selected?: boolean;
  interpretation?: string;
  interpretationCorrected?: string;
  /** When true, this row represents a grouped collection (e.g. Pinterest board) */
  isCollection?: boolean;
  /** Child evidence IDs when this is a collection card */
  childIds?: string[];
  /** Instagram snapshot label chip */
  snapshotLabel?: string;
}

export type ReadProgressStage =
  | 'empty'
  | 'first_clues'
  | 'pattern_forming'
  | 'dimensional_read'
  | 'ready_to_interpret';

export interface ReadProgressState {
  stage: ReadProgressStage;
  label: string;
  referenceCount: number;
  sourceVariety: number;
  acceptedCount: number;
  /** True only after analysis has produced observations/patterns */
  analysisAvailable: boolean;
}

export const CURIOSITY_PROMPTS = [
  { id: 'wear', label: 'What should I wear?', outputHint: 'wardrobe_guidance' },
  { id: 'direction', label: 'What creative direction am I missing?', outputHint: 'creative_direction' },
  { id: 'patterns', label: 'What patterns keep repeating?', outputHint: 'pattern_report' },
  { id: 'drawn', label: 'Why am I drawn to these things?', outputHint: 'attraction_analysis' },
  { id: 'words', label: 'What words describe my style?', outputHint: 'verbal_identity' },
  { id: 'communicate', label: 'How do I communicate my taste?', outputHint: 'taste_communication' },
  { id: 'work', label: 'What does my work say about me?', outputHint: 'work_reading' },
] as const;

export type CuriosityPromptId = (typeof CURIOSITY_PROMPTS)[number]['id'];

export const INSTAGRAM_SNAPSHOT_CHIPS = [
  'My profile',
  'My home feed',
  'My Explore page',
  'Saved posts',
  'Algorithm topics',
] as const;

export interface ProvenanceClaimDraft {
  path: string;
  method:
    | 'model_inference'
    | 'user_stated'
    | 'user_confirmed'
    | 'imported_legacy'
    | 'deterministic_compilation';
  derivedFrom: string[];
  confidence: number;
  userConfirmed: boolean;
  provisional: boolean;
  timestamp: string;
}

export interface IntakeCompilationHandoff {
  intendedHelp: string[];
  requestedOutputs: {
    artifactTypes: string[];
    formatDirection: string;
    mediumRequirements: string[];
    reusableComponents: string[];
    persistentComponents: string[];
    acceptanceCriteria: string[];
  };
  directStatements: Array<{
    id: string;
    text: string;
    authority: 'user_declared';
    scope: TailorEvidenceScope;
    capturedAt: string;
  }>;
  sessionCuriosity: string[];
  persistentCuriosity: string[];
  claims: ProvenanceClaimDraft[];
  evidenceItems: TailorEvidenceItem[];
}

const PROVIDER_TO_SOURCE: Record<TasteProvider, TailorEvidenceSourceType> = {
  letterboxd: 'letterboxd',
  pinterest: 'pinterest',
  instagram: 'instagram',
  generic_url: 'upload',
  manual: 'upload',
};

function confidenceLabelToNumber(label: unknown): number | undefined {
  if (typeof label === 'number' && Number.isFinite(label)) {
    return Math.max(0, Math.min(1, label));
  }
  if (label === 'high') return 0.85;
  if (label === 'medium') return 0.55;
  if (label === 'low') return 0.3;
  return undefined;
}

function inferMediaType(
  sourceType: EvidenceSourceType,
  item: TasteImportItem,
): TailorEvidenceMediaType {
  if (item.dataUrl || (item.thumbnailUrl && item.thumbnailUrl.startsWith('data:'))) return 'image';
  if (sourceType === 'note' || sourceType === 'quote') return 'text';
  if (sourceType === 'film' || sourceType === 'website') return 'link';
  if (sourceType === 'moodboard') return 'image';
  return 'image';
}

let intakeIdCounter = 0;
export function createIntakeId(prefix = 'ev'): string {
  intakeIdCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${intakeIdCounter}`;
}

/** Normalize a TasteImportItem into a TailorEvidenceItem for staging. */
export function normalizeTasteImportItem(
  item: TasteImportItem,
  overrides: Partial<TailorEvidenceItem> = {},
): TailorEvidenceItem {
  const provider = (item.extractedMetadata?.provider as TasteProvider) || 'manual';
  const sourceType = PROVIDER_TO_SOURCE[provider] ?? 'upload';
  const collectionId =
    (item.extractedMetadata?.sourceCollectionId as string | undefined) ||
    (item.extractedMetadata?.boardTitle
      ? `pinterest_${String(item.extractedMetadata.boardTitle).slice(0, 48)}`
      : undefined);

  return {
    id: overrides.id ?? createIntakeId(),
    sourceType,
    sourceUrl: item.sourceUrl,
    sourceCollectionId: collectionId,
    title: item.title,
    description: item.description,
    mediaType: inferMediaType(item.sourceType, item),
    thumbnailUrl: item.thumbnailUrl,
    dataUrl: item.dataUrl,
    rawMetadata: { ...item.extractedMetadata },
    scope: overrides.scope ?? 'session',
    status: overrides.status ?? 'ready',
    confidence: confidenceLabelToNumber(item.extractedMetadata?.confidence),
    capturedAt: overrides.capturedAt ?? new Date().toISOString(),
    userConfirmed: overrides.userConfirmed ?? false,
    evidenceSourceType: item.sourceType,
    selected: overrides.selected ?? true,
    ...overrides,
  };
}

/**
 * Group Pinterest (or other) items that share a sourceCollectionId into
 * one representative collection card plus expandable children.
 */
export function groupIntoCollections(items: TailorEvidenceItem[]): {
  rows: TailorEvidenceItem[];
  childrenByCollection: Map<string, TailorEvidenceItem[]>;
} {
  const childrenByCollection = new Map<string, TailorEvidenceItem[]>();
  const singles: TailorEvidenceItem[] = [];

  for (const item of items) {
    if (item.sourceType === 'pinterest' && item.sourceCollectionId && !item.isCollection) {
      const list = childrenByCollection.get(item.sourceCollectionId) ?? [];
      list.push(item);
      childrenByCollection.set(item.sourceCollectionId, list);
    } else if (!item.isCollection) {
      singles.push(item);
    }
  }

  const rows: TailorEvidenceItem[] = [...singles];
  for (const [collectionId, children] of childrenByCollection) {
    if (children.length <= 1) {
      rows.push(...children);
      continue;
    }
    const first = children[0];
    const boardTitle =
      (first.rawMetadata?.boardTitle as string) ||
      (first.rawMetadata?.sourceLabel as string) ||
      'Pinterest collection';
    rows.push({
      id: `col_${collectionId}`,
      sourceType: 'pinterest',
      sourceCollectionId: collectionId,
      sourceUrl: first.sourceUrl,
      title: boardTitle,
      description: `${children.length} references from this board`,
      mediaType: 'collection',
      thumbnailUrl: first.thumbnailUrl,
      rawMetadata: {
        ...first.rawMetadata,
        collectionSize: children.length,
        childIds: children.map((c) => c.id),
      },
      scope: first.scope,
      status: 'ready',
      confidence: first.confidence,
      capturedAt: first.capturedAt,
      userConfirmed: false,
      evidenceSourceType: 'moodboard',
      selected: children.every((c) => c.selected !== false),
      isCollection: true,
      childIds: children.map((c) => c.id),
    });
  }

  return { rows, childrenByCollection };
}

export function uiScopeToStorage(scope: TailorEvidenceScope): 'session' | 'persistent' {
  return scope;
}

export function storageScopeToUiLabel(scope: TailorEvidenceScope): string {
  return scope === 'persistent' ? 'Add to my profile' : 'This reading only';
}

/** Legacy UI used project|profile — map both directions. */
export function legacyScopeToEvidenceScope(scope: 'project' | 'profile' | TailorEvidenceScope): TailorEvidenceScope {
  if (scope === 'profile' || scope === 'persistent') return 'persistent';
  return 'session';
}

export function evidenceScopeToLegacy(scope: TailorEvidenceScope): 'project' | 'profile' {
  return scope === 'persistent' ? 'profile' : 'project';
}

/**
 * Truthful progress from accepted evidence — never claims "strong read"
 * before analysis has run.
 */
export function deriveReadProgress(input: {
  acceptedEvidence: EvidenceNode[];
  stagedCount?: number;
  analysisAvailable?: boolean;
  analysisConfidence?: number;
}): ReadProgressState {
  const accepted = input.acceptedEvidence;
  const acceptedCount = accepted.length;
  const stagedCount = input.stagedCount ?? 0;
  const referenceCount = acceptedCount + stagedCount;
  const analysisAvailable = Boolean(input.analysisAvailable);
  const analysisConfidence = input.analysisConfidence ?? 0;

  const providers = new Set<string>();
  for (const node of accepted) {
    const provider = node.extractedMetadata?.provider;
    if (typeof provider === 'string' && provider) providers.add(provider);
    else providers.add(node.sourceType);
  }
  const sourceVariety = providers.size;

  if (referenceCount === 0) {
    return {
      stage: 'empty',
      label: '0 references added',
      referenceCount: 0,
      sourceVariety: 0,
      acceptedCount: 0,
      analysisAvailable,
    };
  }

  // Analysis-backed stages only when analysis has actually run
  if (analysisAvailable && acceptedCount >= 3 && (analysisConfidence >= 0.55 || sourceVariety >= 2)) {
    return {
      stage: 'ready_to_interpret',
      label: 'Ready to interpret',
      referenceCount,
      sourceVariety,
      acceptedCount,
      analysisAvailable,
    };
  }

  if (acceptedCount >= 8 && sourceVariety >= 3) {
    return {
      stage: 'dimensional_read',
      label: analysisAvailable ? 'A dimensional read' : 'Your read is taking shape',
      referenceCount,
      sourceVariety,
      acceptedCount,
      analysisAvailable,
    };
  }

  if (acceptedCount >= 3 && sourceVariety >= 2) {
    return {
      stage: 'pattern_forming',
      label: 'A pattern is forming',
      referenceCount,
      sourceVariety,
      acceptedCount,
      analysisAvailable,
    };
  }

  if (acceptedCount >= 1 || stagedCount >= 1) {
    return {
      stage: 'first_clues',
      label: referenceCount === 1 ? '1 reference added' : `${referenceCount} references added · First clues`,
      referenceCount,
      sourceVariety,
      acceptedCount,
      analysisAvailable,
    };
  }

  return {
    stage: 'empty',
    label: '0 references added',
    referenceCount: 0,
    sourceVariety: 0,
    acceptedCount: 0,
    analysisAvailable,
  };
}

export function buildCuriosityHandoff(
  selectedIds: CuriosityPromptId[],
  customText: string,
  options: { persistCuriosity?: boolean } = {},
): Pick<IntakeCompilationHandoff, 'intendedHelp' | 'requestedOutputs' | 'sessionCuriosity' | 'persistentCuriosity'> {
  const prompts = CURIOSITY_PROMPTS.filter((p) => selectedIds.includes(p.id));
  const intendedHelp = [
    ...prompts.map((p) => p.label),
    ...(customText.trim() ? [customText.trim()] : []),
  ];
  const artifactTypes = prompts.map((p) => p.outputHint);
  const sessionCuriosity = intendedHelp;
  const persistentCuriosity = options.persistCuriosity ? intendedHelp : [];

  return {
    intendedHelp,
    requestedOutputs: {
      artifactTypes,
      formatDirection: customText.trim() || 'editorial reading',
      mediumRequirements: [],
      reusableComponents: [],
      persistentComponents: persistentCuriosity,
      acceptanceCriteria: [
        'Every major claim cites evidence IDs',
        'Direct user statements outrank inference',
        'Contradictions are surfaced, not flattened',
      ],
    },
    sessionCuriosity,
    persistentCuriosity,
  };
}

export function buildDirectStatementEvidence(
  text: string,
  scope: TailorEvidenceScope = 'session',
): TailorEvidenceItem | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const id = createIntakeId('stmt');
  return {
    id,
    sourceType: 'direct_statement',
    title: 'Direct statement',
    description: trimmed,
    mediaType: 'text',
    rawMetadata: {
      provider: 'manual',
      ingestionMethod: 'file_upload',
      authority: 'user_declared',
      confidence: 'high',
      kind: 'direct_statement',
      sourceLabel: 'User statement',
      provenance: 'direct_user_evidence',
    },
    scope,
    status: 'accepted',
    confidence: 0.95,
    capturedAt: new Date().toISOString(),
    userConfirmed: true,
    evidenceSourceType: 'note',
    selected: true,
  };
}

/**
 * Build provenance-safe claim drafts. Never invents unsupported paths —
 * only emits claims backed by evidence IDs and an explicit method.
 */
export function buildProvenanceClaims(input: {
  evidenceItems: TailorEvidenceItem[];
  path: string;
  method: ProvenanceClaimDraft['method'];
  confidence: number;
  userConfirmed?: boolean;
  provisional?: boolean;
}): ProvenanceClaimDraft {
  const derivedFrom = input.evidenceItems.map((e) => e.id).filter(Boolean);
  if (!derivedFrom.length) {
    throw new Error('Cannot create a claim without evidence IDs.');
  }
  if (!input.path.trim()) {
    throw new Error('Claim path is required.');
  }
  const confidence = Math.max(0, Math.min(1, input.confidence));
  return {
    path: input.path,
    method: input.method,
    derivedFrom,
    confidence,
    userConfirmed: Boolean(input.userConfirmed),
    provisional: input.provisional ?? !input.userConfirmed,
    timestamp: new Date().toISOString(),
  };
}

/** Authority ranking for compile — lower index wins. */
export const EVIDENCE_AUTHORITY_ORDER = [
  'user_correction',
  'user_declared',
  'cross_source_pattern',
  'single_source_pattern',
  'one_off_inference',
  'unsupported',
] as const;

export type EvidenceAuthorityRank = (typeof EVIDENCE_AUTHORITY_ORDER)[number];

export function rankAuthority(authority: string | undefined): EvidenceAuthorityRank {
  switch (authority) {
    case 'user_correction':
    case 'user_confirmed':
      return 'user_correction';
    case 'user_declared':
      return 'user_declared';
    case 'user_behavior':
      return 'single_source_pattern';
    case 'platform_inferred':
    case 'model_observed':
      return 'one_off_inference';
    default:
      return 'unsupported';
  }
}

export function shouldPersistClaim(claim: ProvenanceClaimDraft, authority?: string): boolean {
  if (!claim.derivedFrom.length) return false;
  if (claim.method === 'user_stated' || claim.method === 'user_confirmed') return true;
  if (claim.userConfirmed && claim.confidence >= 0.55) return true;
  const rank = rankAuthority(authority);
  if (rank === 'unsupported') return false;
  if (rank === 'one_off_inference' && !claim.userConfirmed) return false;
  return claim.confidence >= 0.55 && !claim.provisional;
}

export function assignScopeBatch(
  items: TailorEvidenceItem[],
  ids: string[],
  scope: TailorEvidenceScope,
): TailorEvidenceItem[] {
  const idSet = new Set(ids);
  return items.map((item) => (idSet.has(item.id) ? { ...item, scope } : item));
}

export function toEvidenceUploadPayload(item: TailorEvidenceItem): {
  title: string;
  sourceType: EvidenceSourceType;
  dataUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  description?: string;
  extractedMetadata: Record<string, unknown>;
} {
  return {
    title: item.title,
    sourceType: item.evidenceSourceType,
    dataUrl: item.dataUrl,
    thumbnailUrl: item.thumbnailUrl,
    sourceUrl: item.sourceUrl,
    description: item.description,
    extractedMetadata: {
      ...item.rawMetadata,
      scope: evidenceScopeToLegacy(item.scope),
      intakeScope: item.scope,
      intakeSourceType: item.sourceType,
      intakeId: item.id,
      sourceCollectionId: item.sourceCollectionId,
      snapshotLabel: item.snapshotLabel,
      userConfirmed: item.userConfirmed,
      interpretation: item.interpretationCorrected || item.interpretation,
      mediaType: item.mediaType,
      capturedAt: item.capturedAt,
    },
  };
}

export function compileIntakeHandoff(input: {
  evidenceItems: TailorEvidenceItem[];
  curiosityIds: CuriosityPromptId[];
  customCuriosity: string;
  directContext: string;
  persistCuriosity?: boolean;
}): IntakeCompilationHandoff {
  const curiosity = buildCuriosityHandoff(input.curiosityIds, input.customCuriosity, {
    persistCuriosity: input.persistCuriosity,
  });
  const statement = buildDirectStatementEvidence(input.directContext, 'session');
  const evidenceItems = statement
    ? [...input.evidenceItems, statement]
    : [...input.evidenceItems];

  const claims: ProvenanceClaimDraft[] = [];
  if (statement) {
    claims.push(
      buildProvenanceClaims({
        evidenceItems: [statement],
        path: 'sourceMaterial.directStatements',
        method: 'user_stated',
        confidence: 0.95,
        userConfirmed: true,
        provisional: false,
      }),
    );
  }
  // Curiosity is session-scoped user intent; attribute only when we have a
  // concrete statement or at least one evidence ID to hang provenance on.
  if (curiosity.intendedHelp.length && evidenceItems.length) {
    claims.push(
      buildProvenanceClaims({
        evidenceItems: [evidenceItems[0]],
        path: 'scope.intendedHelp',
        method: 'user_stated',
        confidence: 0.9,
        userConfirmed: true,
        provisional: false,
      }),
    );
  }

  return {
    ...curiosity,
    directStatements: statement
      ? [
          {
            id: statement.id,
            text: statement.description || '',
            authority: 'user_declared',
            scope: statement.scope,
            capturedAt: statement.capturedAt,
          },
        ]
      : [],
    claims,
    evidenceItems,
  };
}

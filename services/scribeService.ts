import { z } from 'zod';
import type { MemoryAtom, PocketItem, TasteGraphNode, CreativeLaw, EvidenceNode, Observation, TailorProject } from '../types';
import { fetchMemoryAtoms } from './memoryService';
import { auth } from './firebaseInit';
import { getTasteGraph } from './tasteGraphService';
import { 
  listTailorProjects, 
  getTailorProject, 
  listCreativeLaws, 
  listEvidenceNodes, 
  listObservations, 
  listDolls,
  listDollMasks
} from './tailorService';
import {
  ACTIVE_DOLL_STORAGE_KEY,
  buildDollCompanionBundle,
} from './dollEngine';

export type ScribeContextKind = 
  | 'taste_signal'       // Taste Graph node
  | 'research_record'    // Saved Research / Observations
  | 'memory_atom'        // Approved Memory Atom
  | 'specimen'           // Active/Unprocessed Specimen (Pocket item)
  | 'tailor_intake'      // Tailor Intake (Project configuration)
  | 'approved_decision'  // Approved Strategic Decision (CreativeLaw)
  | 'doll_identity';     // Active Doll companion projection

export interface ScribeContextItem {
  id: string;
  kind: ScribeContextKind;
  title: string;
  excerpt: string;
  approvalStatus: 'approved' | 'unapproved' | 'rejected' | 'superseded';
  relevance: number;
  retrievalReason: string;
  sourceUrl?: string;
}

export interface ScribeAnswer {
  evidence: Array<{ id: string; statement: string; contextIds: string[] }>;
  inferences: Array<{
    id: string;
    statement: string;
    confidence: number;
    evidenceIds: string[];
    proposalId?: string;
  }>;
  recommendations: Array<{
    id: string;
    action: string;
    rationale: string;
    inferenceIds: string[];
    proposalId?: string;
  }>;
  usedContext: ScribeContextItem[];
  execution?: {
    via: 'gateway';
    workflowRunId: string;
    aiRunId: string;
    credits: {
      reserved: number;
      charged: number;
      released: number;
      remaining: number;
    };
  };
}

const scribeOperationResponseSchema = z.object({
  workflowRunId: z.string().uuid(),
  aiRunId: z.string().uuid(),
  status: z.literal('succeeded'),
  result: z.object({
    evidence: z.array(z.object({
      id: z.string(),
      statement: z.string(),
      contextIds: z.array(z.string()),
    })),
    inferences: z.array(z.object({
      id: z.string(),
      statement: z.string(),
      confidence: z.number(),
      evidenceIds: z.array(z.string()),
      proposalId: z.string().uuid(),
    })),
    recommendations: z.array(z.object({
      id: z.string(),
      action: z.string(),
      rationale: z.string(),
      inferenceIds: z.array(z.string()),
      proposalId: z.string().uuid(),
    })),
  }),
  credits: z.object({
    reserved: z.number().int().nonnegative(),
    charged: z.number().int().nonnegative(),
    released: z.number().int().nonnegative(),
    remaining: z.number().int().nonnegative(),
  }),
});

const memoryApprovalResponseSchema = z.object({
  status: z.literal('approved'),
  atoms: z.array(z.object({ id: z.string().uuid() })).min(1),
});

const operationalMemoryResponseSchema = z.object({
  atoms: z.array(z.object({
    id: z.string().uuid(),
    projectId: z.string().nullable(),
    atomType: z.string(),
    content: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
  })),
});

async function fetchOperationalMemoryAtoms(
  userId: string,
  projectId?: string,
): Promise<MemoryAtom[]> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) return [];
  const token = await currentUser.getIdToken();
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  const response = await fetch(
    `/api/memory/atoms${params.size ? `?${params.toString()}` : ''}`,
    { headers: { 'x-user-token': `Bearer ${token}` } },
  );
  if (!response.ok) return [];
  const parsed = operationalMemoryResponseSchema.safeParse(
    await response.json().catch(() => ({})),
  );
  if (!parsed.success) return [];
  return parsed.data.atoms.map((atom) => {
    const text =
      typeof atom.content.statement === 'string'
        ? atom.content.statement
        : typeof atom.content.action === 'string'
          ? [
              atom.content.action,
              typeof atom.content.rationale === 'string'
                ? atom.content.rationale
                : '',
            ].filter(Boolean).join('\n\n')
          : JSON.stringify(atom.content);
    return {
      id: atom.id,
      projectId: atom.projectId || 'global',
      content: text,
      title:
        atom.atomType === 'scribe_recommendation'
          ? 'Approved Scribe recommendation'
          : 'Approved Scribe inference',
      timestamp: Date.parse(atom.createdAt),
      source: 'The Scribe · Neon',
      tags: ['approved', 'scribe', atom.atomType],
      kind: 'memory_atom',
    };
  });
}

// Word matcher for search score
const words = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
const matchScore = (queryWords: Set<string>, value: string) => {
  const candidate = words(value);
  if (queryWords.size === 0) return 0;
  const matches = [...queryWords].filter((term) => candidate.has(term)).length;
  return matches / queryWords.size;
};

// Modifiers representing the Retrieval Authority Model
const AUTHORITY_MODIFIERS: Record<ScribeContextKind, number> = {
  tailor_intake: 0.7,
  approved_decision: 0.6,
  memory_atom: 0.5,
  specimen: 0.4,
  taste_signal: 0.3,
  research_record: 0.1,
  doll_identity: 0.55,
};

function readClientActiveDollId(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(ACTIVE_DOLL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function retrieveScribeContext(
  userId: string, 
  question: string, 
  pocket: PocketItem[], 
  projectId?: string
): Promise<ScribeContextItem[]> {
  if (!userId || userId === 'ghost') return [];

  const queryWords = words(question);

  // Fetch from all sources in parallel (incl. Doll companion projections)
  const [
    projects,
    legacyAtoms,
    operationalAtoms,
    graph,
    activeProject,
    creativeLaws,
    evidenceNodes,
    observations,
    dolls,
  ] = await Promise.all([
    listTailorProjects(userId).catch(() => [] as TailorProject[]),
    fetchMemoryAtoms(userId).catch(() => [] as MemoryAtom[]),
    fetchOperationalMemoryAtoms(userId, projectId).catch(() => [] as MemoryAtom[]),
    getTasteGraph(userId).catch(() => ({ nodes: [] as TasteGraphNode[], edges: [] as any[] })),
    projectId ? getTailorProject(userId, projectId).catch((): null => null) : Promise.resolve(null),
    projectId ? listCreativeLaws(userId, projectId).catch(() => [] as CreativeLaw[]) : Promise.resolve([] as CreativeLaw[]),
    projectId ? listEvidenceNodes(userId, projectId).catch(() => [] as EvidenceNode[]) : Promise.resolve([] as EvidenceNode[]),
    projectId ? listObservations(userId, projectId).catch(() => [] as Observation[]) : Promise.resolve([] as Observation[]),
    listDolls(userId).catch((): Awaited<ReturnType<typeof listDolls>> => []),
  ]);
  const atoms = [...new Map(
    [...operationalAtoms, ...legacyAtoms].map((atom) => [atom.id, atom]),
  ).values()];

  const candidates: ScribeContextItem[] = [];

  // 0. Active Doll companion — only when Studio/chamber explicitly activated a doll
  const preferredId = readClientActiveDollId();
  if (preferredId && dolls.length > 0) {
    const activeDoll = dolls.find((d) => d.id === preferredId);
    if (activeDoll) {
      const masks = await listDollMasks(userId, activeDoll.id).catch(
        (): Awaited<ReturnType<typeof listDollMasks>> => [],
      );
      const bundle = buildDollCompanionBundle(activeDoll, masks, activeDoll.activeMaskId);
      const dollText = `${activeDoll.name} ${activeDoll.creativePhilosophy} ${activeDoll.visualLanguage.join(' ')} ${bundle.activeMaskRole || ''}`;
      const bScore = matchScore(queryWords, dollText);
      candidates.push({
        id: `doll-${activeDoll.id}`,
        kind: 'doll_identity',
        title: `Doll: ${activeDoll.name}`,
        excerpt: bundle.scribeExcerpt,
        approvalStatus: 'approved',
        relevance: Math.max(0.72, bScore * 0.4 + AUTHORITY_MODIFIERS.doll_identity),
        retrievalReason:
          'Active Doll companion — symbolic Taste Graph projection for identity-consistent counsel.',
        sourceUrl:
          activeDoll.identityReferences?.portraitUrl || activeDoll.generatedImageUrl,
      });
    }
  }

  // 1. Tailor Intakes
  if (activeProject) {
    const intakeText = JSON.stringify(activeProject.intent || {});
    candidates.push({
      id: `intake-${activeProject.id}`,
      kind: 'tailor_intake',
      title: `Project: ${activeProject.title}`,
      excerpt: activeProject.blurb || intakeText.slice(0, 300),
      approvalStatus: 'approved',
      relevance: 1.0, // Active project is always highest relevance
      retrievalReason: 'Active project goals and design constraints.'
    });
  } else {
    for (const p of projects) {
      const intakeText = JSON.stringify(p.intent || {});
      const bScore = matchScore(queryWords, `${p.title} ${p.blurb || ''} ${intakeText}`);
      candidates.push({
        id: `intake-${p.id}`,
        kind: 'tailor_intake',
        title: `Project: ${p.title}`,
        excerpt: p.blurb || intakeText.slice(0, 300),
        approvalStatus: 'approved',
        relevance: bScore * 0.3 + AUTHORITY_MODIFIERS.tailor_intake,
        retrievalReason: 'A saved project context matching your query.'
      });
    }
  }

  // 2. Approved Strategic Decisions (Creative Laws)
  for (const law of creativeLaws) {
    const text = `${law.title} ${law.principle} ${law.explanation}`;
    const bScore = matchScore(queryWords, text);
    candidates.push({
      id: law.id,
      kind: 'approved_decision',
      title: law.title,
      excerpt: `${law.principle}: ${law.explanation}`,
      approvalStatus: law.userStatus === 'accepted' ? 'approved' : 'unapproved',
      relevance: bScore * 0.4 + AUTHORITY_MODIFIERS.approved_decision,
      retrievalReason: 'An approved strategic decision rule for your brand.'
    });
  }

  // 3. Approved Memory Atoms
  for (const atom of atoms) {
    const text = `${atom.title || ''} ${atom.content}`;
    const bScore = matchScore(queryWords, text);
    candidates.push({
      id: atom.id,
      kind: 'memory_atom',
      title: atom.title || 'Memory atom',
      excerpt: atom.content,
      approvalStatus: 'approved',
      relevance: bScore * 0.5 + AUTHORITY_MODIFIERS.memory_atom,
      retrievalReason: 'A previously saved and approved memory atom.'
    });
  }

  // 4. Specimens (Pocket items + project evidence nodes)
  for (const item of pocket) {
    const content = typeof item.content === 'string' ? item.content : JSON.stringify(item.content || {});
    const bScore = matchScore(queryWords, `${item.title || ''} ${item.notes || ''} ${content}`);
    candidates.push({
      id: item.id,
      kind: 'specimen',
      title: item.title || item.content?.metadata?.title || 'Pocket specimen',
      excerpt: (item.notes || content).slice(0, 300),
      approvalStatus: item.content?.approvalStatus || 'approved',
      relevance: bScore * 0.5 + AUTHORITY_MODIFIERS.specimen,
      retrievalReason: 'Active specimen from your pocket references.',
      sourceUrl: item.content?.provenance?.sourceUrl || item.content?.sourceUrl
    });
  }

  for (const ev of evidenceNodes) {
    const text = `${ev.title} ${ev.description || ''} ${ev.userCaption || ''}`;
    const bScore = matchScore(queryWords, text);
    candidates.push({
      id: ev.id,
      kind: 'specimen',
      title: ev.title,
      excerpt: ev.description || ev.userCaption || 'Project specimen image/reference',
      approvalStatus: ev.analysisStatus === 'analyzed' ? 'approved' : 'unapproved',
      relevance: bScore * 0.5 + AUTHORITY_MODIFIERS.specimen,
      retrievalReason: 'A visual specimen linked to this project.',
      sourceUrl: ev.sourceUrl
    });
  }

  // 5. Passive Taste Signals (Taste Graph nodes)
  for (const node of graph.nodes) {
    const bScore = matchScore(queryWords, `${node.label} ${node.explanation || ''}`);
    candidates.push({
      id: node.id,
      kind: 'taste_signal',
      title: node.label,
      excerpt: node.explanation || `${node.type} signal with weight ${node.weight}.`,
      approvalStatus: node.userStatus === 'accepted' ? 'approved' : 'unapproved',
      relevance: bScore * 0.5 + AUTHORITY_MODIFIERS.taste_signal,
      retrievalReason: 'Taste signal representing recurring patterns in your work.',
      sourceUrl: node.sourceUrl
    });
  }

  // 6. Research Records (Observations)
  for (const obs of observations) {
    const text = `${obs.label} ${obs.description}`;
    const bScore = matchScore(queryWords, text);
    candidates.push({
      id: obs.id,
      kind: 'research_record',
      title: obs.label,
      excerpt: obs.description,
      approvalStatus: obs.userStatus === 'accepted' ? 'approved' : 'unapproved',
      relevance: bScore * 0.5 + AUTHORITY_MODIFIERS.research_record,
      retrievalReason: 'An extracted machine research signal matching query.'
    });
  }

  // Filter out rejected or superseded records, then sort and return the top 10
  return candidates
    .filter((item) => item.approvalStatus !== 'rejected' && item.approvalStatus !== 'superseded')
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10);
}

export async function askScribeExplainable(
  userId: string,
  question: string,
  contextItems: ScribeContextItem[],
  projectId?: string,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<ScribeAnswer> {
  const effectiveContext = contextItems.length > 0
    ? contextItems
    : [{
      id: 'current-question',
      kind: 'memory_atom',
      title: 'Current context',
      excerpt: question,
      approvalStatus: 'approved',
      relevance: 1.0,
      retrievalReason: 'Highest authority.'
    } satisfies ScribeContextItem];

  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error('Sign in again before asking Scribe.');
  }

  const token = await currentUser.getIdToken();
  const response = await fetch('/api/ai/operations/scribe.propose-atoms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-token': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      workspaceId: null,
      input: {
        question,
        projectId,
        contextItems: effectiveContext,
      },
      sourceIds: effectiveContext.map((item) => item.id),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.code === 'INSUFFICIENT_CREDITS'
        ? `Scribe needs ${payload.required} credits; ${payload.available} are available.`
        : payload?.message || payload?.error || 'Scribe could not complete this read.';
    throw Object.assign(new Error(message), {
      code: payload?.code,
      status: response.status,
      terminal: payload?.terminal === true,
      workflowRunId: payload?.workflowRunId,
    });
  }
  const parsedPayload = scribeOperationResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error('Scribe returned an invalid operational response. No memory was approved.');
  }
  const operation = parsedPayload.data;

  return {
    evidence: operation.result.evidence,
    inferences: operation.result.inferences,
    recommendations: operation.result.recommendations,
    usedContext: effectiveContext,
    execution: {
      via: 'gateway',
      workflowRunId: operation.workflowRunId,
      aiRunId: operation.aiRunId,
      credits: operation.credits,
    },
  };
}

export async function approveScribeInference(
  userId: string,
  _projectId: string,
  _text: string,
  proposalId?: string,
  idempotencyKey: string = crypto.randomUUID(),
) {
  if (!proposalId) {
    throw new Error('This inference has no durable proposal to approve.');
  }
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error('Sign in again before approving memory.');
  }
  const token = await currentUser.getIdToken();
  const response = await fetch('/api/memory/proposals/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-token': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ proposalIds: [proposalId] }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(
      new Error(payload?.message || payload?.error || 'Memory approval failed.'),
      {
        code: payload?.code,
        status: response.status,
      },
    );
  }
  const parsedPayload = memoryApprovalResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error('Memory approval returned an invalid response.');
  }
  return parsedPayload.data.atoms[0].id;
}

export async function saveScribeDecision(
  userId: string,
  projectId: string,
  _title: string,
  action: string,
  rationale: string,
  proposalId?: string,
  idempotencyKey: string = crypto.randomUUID(),
) {
  return approveScribeInference(
    userId,
    projectId,
    `${action}\n\n${rationale}`,
    proposalId,
    idempotencyKey,
  );
}

import { Type } from '@google/genai';
import { withResilience } from './geminiClient';
import type { MemoryAtom, PocketItem, TasteGraphNode, CreativeLaw, EvidenceNode, Observation, TailorProject } from '../types';
import { fetchMemoryAtoms, saveMemoryAtom } from './memoryService';
import { getTasteGraph } from './tasteGraphService';
import { 
  listTailorProjects, 
  getTailorProject, 
  listCreativeLaws, 
  listEvidenceNodes, 
  listObservations, 
  saveCreativeLaws 
} from './tailorService';

export type ScribeContextKind = 
  | 'taste_signal'       // Taste Graph node
  | 'research_record'    // Saved Research / Observations
  | 'memory_atom'        // Approved Memory Atom
  | 'specimen'           // Active/Unprocessed Specimen (Pocket item)
  | 'tailor_intake'      // Tailor Intake (Project configuration)
  | 'approved_decision';   // Approved Strategic Decision (CreativeLaw)

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
  inferences: Array<{ id: string; statement: string; confidence: number; evidenceIds: string[] }>;
  recommendations: Array<{ id: string; action: string; rationale: string; inferenceIds: string[] }>;
  usedContext: ScribeContextItem[];
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
};

export async function retrieveScribeContext(
  userId: string, 
  question: string, 
  pocket: PocketItem[], 
  projectId?: string
): Promise<ScribeContextItem[]> {
  if (!userId || userId === 'ghost') return [];

  const queryWords = words(question);

  // Fetch from all 6 sources in parallel
  const [
    projects,
    atoms,
    graph,
    activeProject,
    creativeLaws,
    evidenceNodes,
    observations
  ] = await Promise.all([
    listTailorProjects(userId).catch(() => [] as TailorProject[]),
    fetchMemoryAtoms(userId).catch(() => [] as MemoryAtom[]),
    getTasteGraph(userId).catch(() => ({ nodes: [] as TasteGraphNode[], edges: [] as any[] })),
    projectId ? getTailorProject(userId, projectId).catch((): null => null) : Promise.resolve(null),
    projectId ? listCreativeLaws(userId, projectId).catch(() => [] as CreativeLaw[]) : Promise.resolve([] as CreativeLaw[]),
    projectId ? listEvidenceNodes(userId, projectId).catch(() => [] as EvidenceNode[]) : Promise.resolve([] as EvidenceNode[]),
    projectId ? listObservations(userId, projectId).catch(() => [] as Observation[]) : Promise.resolve([] as Observation[])
  ]);

  const candidates: ScribeContextItem[] = [];

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
  projectId?: string
): Promise<ScribeAnswer> {
  if (contextItems.length === 0) {
    contextItems.push({
      id: 'current-question',
      kind: 'memory_atom',
      title: 'Current context',
      excerpt: question,
      approvalStatus: 'approved',
      relevance: 1.0,
      retrievalReason: 'Highest authority.'
    });
  }

  const contextBlock = contextItems
    .map(
      (item) =>
        `ID: ${item.id}\nKind: ${item.kind}\nTitle: ${item.title}\nExcerpt: ${item.excerpt}\nApproval: ${item.approvalStatus}\nRelevance: ${item.relevance}\nReason: ${item.retrievalReason}`
    )
    .join('\n\n---\n\n');

  try {
    return await withResilience(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are Mimi Scribe — the explainable temporal memory engine of Mimizine.
Your purpose is to answer the user's creative inquiries by synthesizing their historical archive, taste signals, design constraints, and visual specimens.

You MUST structure your response into THREE distinct sections in a valid JSON format according to the schema:
1. "evidence": Direct, grounded statements extracted from the retrieved context items. Each must point to the contextIds they are based on.
2. "inferences": Cognitive bridges, pattern identifications, and semantic links drawn from the evidence. Each must point to the evidenceIds they are based on and have a confidence percentage.
3. "recommendations": Concrete, actionable creative maneuvers or strategic moves for the brand. Each must point to the inferences or instructions they are based on.

RETRIEVED CONTEXT:
${contextBlock}

USER QUESTION:
"${question}"

Tone/Style requirements:
- Ethereal, classily provocative, highly sophisticated.
- Use canonical Mimizine vocabulary: "semantic density", "material tensions", "sovereign choices", "curatorial posture".
- Ground your evidence and inferences strictly in the retrieved context. Never invent ungrounded facts.

JSON Output Schema format:
{
  "evidence": [
    { "id": "evidence-1", "statement": "Statement of fact from retrieved documents", "contextIds": ["retrieved-context-id"] }
  ],
  "inferences": [
    { "id": "inference-1", "statement": "Inferred pattern or visual tension connecting evidence", "confidence": 90, "evidenceIds": ["evidence-1"] }
  ],
  "recommendations": [
    { "id": "recommendation-1", "action": "Actionable creative maneuver", "rationale": "Why this aligns with taste identity", "inferenceIds": ["inference-1"] }
  ]
}

Only return valid JSON matching this schema.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              evidence: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    statement: { type: Type.STRING },
                    contextIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['id', 'statement', 'contextIds']
                }
              },
              inferences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    statement: { type: Type.STRING },
                    confidence: { type: Type.INTEGER },
                    evidenceIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['id', 'statement', 'confidence', 'evidenceIds']
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    action: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    inferenceIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['id', 'action', 'rationale', 'inferenceIds']
                }
              }
            },
            required: ['evidence', 'inferences', 'recommendations']
          }
        }
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(text);
      return {
        evidence: parsed.evidence || [],
        inferences: parsed.inferences || [],
        recommendations: parsed.recommendations || [],
        usedContext: contextItems
      };
    });
  } catch (err) {
    console.error('MIMI // Scribe Explainable failed, returning fallback:', err);
    return fallbackAnswer(question, contextItems);
  }
}

function fallbackAnswer(question: string, contextItems: ScribeContextItem[]): ScribeAnswer {
  const used = contextItems.length ? contextItems : [{
    id: 'current-question', kind: 'memory_atom' as const, title: 'Current instruction', excerpt: question,
    approvalStatus: 'approved' as const, relevance: 1, retrievalReason: 'Highest authority.'
  }];
  const evidence = used.slice(0, 4).map((item, index) => ({
    id: `evidence-${index + 1}`,
    statement: `${item.title}: ${item.excerpt}`,
    contextIds: [item.id],
  }));
  const approved = used.filter((item) => item.approvalStatus === 'approved');
  const inferences = [{
    id: 'inference-1',
    statement: approved.length
      ? `The strongest current direction is the overlap between ${approved.slice(0, 3).map((item) => item.title).join(', ')}.`
      : 'The archive suggests a direction, but it still needs explicit approval before becoming taste memory.',
    confidence: Math.min(95, 55 + used.length * 5),
    evidenceIds: evidence.map((item) => item.id),
  }];
  return {
    evidence,
    inferences,
    recommendations: [{
      id: 'recommendation-1',
      action: `Use the retrieved context to answer “${question}” as a project decision, then approve or revise the interpretation before applying it.`,
      rationale: 'This preserves authorship and prevents passive references from silently becoming identity.',
      inferenceIds: ['inference-1'],
    }],
    usedContext: used,
  };
}

export async function approveScribeInference(userId: string, projectId: string, text: string) {
  const id = `scribe_${Date.now()}`;
  await saveMemoryAtom(userId, { 
    id, 
    projectId, 
    content: text, 
    title: 'Approved Scribe inference', 
    timestamp: Date.now(), 
    source: 'The Scribe', 
    tags: ['approved', 'scribe'] 
  });
  return id;
}

export async function saveScribeDecision(
  userId: string,
  projectId: string,
  title: string,
  principle: string,
  explanation: string
) {
  return await saveCreativeLaws(userId, projectId, [{
    title,
    principle,
    explanation,
    supportingPatternClusterIds: [],
    supportingEvidenceNodeIds: [],
    confidence: 100,
    claimType: 'user_confirmed',
    userStatus: 'accepted',
    applications: [],
    avoidances: [],
  }]);
}

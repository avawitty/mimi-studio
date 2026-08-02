/**
 * Tailor foundation integrity checks (Prompt A hardening on main).
 * Run: npm run verify:tailor-foundation
 */
import { stripUndefined } from '../lib/stripUndefined';
import { buildCurationEventPayload, buildPatternClusterCurationPatch } from '../services/tailorCuration';
import { validatePatternSplit } from '../services/tailorPatternSplit';
import {
  assertProjectGraphBinding,
  filterDollsForGraph,
  ProjectProjectionMismatchError,
  resolveDollInGraph,
} from '../services/tailorProjection';
import {
  evaluateGenerationReadiness,
  isGenerationBlocked,
  isMarketingAssetType,
  MARKETING_ASSET_TYPES,
} from '../services/tailorReadiness';
import {
  createMarketingJobBodySchema,
  parseBody,
  patternPatchBodySchema,
} from '../services/tailorApiValidation';
import {
  mimiYouTabPath,
  parseMimiYouTabFromPath,
  resolveMimiYouTab,
} from '../lib/mimiYouRoutes';
import type { CreativeLaw, Doll, PatternCluster, TailorProject } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

console.log('verify:tailor-foundation — starting');

// ─── 1. Curation event serialization (no undefined) ──────────────────────────
const statusOnly = buildCurationEventPayload({
  userId: 'u1',
  projectId: 'p1',
  targetType: 'pattern_cluster',
  targetId: 'c1',
  kind: 'status_change',
  status: 'accepted',
  claimType: 'user_confirmed',
});
assert(statusOnly.status === 'accepted', 'status-only event keeps status');
assert(!('annotation' in statusOnly), 'status-only event omits undefined annotation');
assert(!('weight' in statusOnly), 'status-only event omits undefined weight');
assert(!Object.values(statusOnly).some((v) => v === undefined), 'no undefined values in event');

const patch = buildPatternClusterCurationPatch('accepted');
assert(patch.userStatus === 'accepted', 'status patch');
assert(!('userAnnotation' in patch), 'status patch omits empty annotation');
assert(JSON.stringify(stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: 2 } })) === '{"a":1,"c":{"e":2}}', 'stripUndefined nested');

// ─── 2. Pattern split integrity ──────────────────────────────────────────────
const tooFew = validatePatternSplit(['o1'], [
  { name: 'A', observationIds: ['o1'] },
  { name: 'B', observationIds: [] },
]);
assert(!tooFew.ok, 'reject split with <2 source observations');

const emptyPart = validatePatternSplit(['o1', 'o2'], [
  { name: 'A', observationIds: ['o1', 'o2'] },
  { name: 'B', observationIds: [] },
]);
assert(!emptyPart.ok, 'reject empty partition');

const overlap = validatePatternSplit(['o1', 'o2', 'o3'], [
  { name: 'A', observationIds: ['o1', 'o2'] },
  { name: 'B', observationIds: ['o2', 'o3'] },
]);
assert(!overlap.ok, 'reject overlapping partitions');

const incomplete = validatePatternSplit(['o1', 'o2', 'o3'], [
  { name: 'A', observationIds: ['o1'] },
  { name: 'B', observationIds: ['o2'] },
]);
assert(!incomplete.ok, 'reject incomplete union');

const dupInPart = validatePatternSplit(['o1', 'o2'], [
  { name: 'A', observationIds: ['o1', 'o1'] },
  { name: 'B', observationIds: ['o2'] },
]);
assert(!dupInPart.ok, 'reject duplicate observation in partition');

const okSplit = validatePatternSplit(['o1', 'o2', 'o3'], [
  { name: 'A', observationIds: ['o1'] },
  { name: 'B', observationIds: ['o2', 'o3'] },
]);
assert(okSplit.ok, 'valid split accepted');

// ─── 3. Project / projection integrity ───────────────────────────────────────
const project: TailorProject = {
  id: 'p1',
  userId: 'u1',
  title: 't',
  intent: 'brand',
  tasteGraphId: 'g1',
  evidenceCount: 2,
  readConfidence: 'initial',
  analysisStatus: 'analyzed',
  createdAt: 1,
  updatedAt: 1,
};

assertProjectGraphBinding(project, 'g1');
let threw = false;
try {
  assertProjectGraphBinding(project, 'g-other');
} catch (e) {
  threw = e instanceof ProjectProjectionMismatchError;
}
assert(threw, 'mismatched tasteGraphId fails closed');

const baseDoll = {
  userId: 'u1',
  description: '',
  visualLanguage: [] as string[],
  palette: [] as string[],
  materials: [] as string[],
  silhouette: '',
  motifs: [] as string[],
  emotionalRegister: '',
  creativePhilosophy: '',
  creativeLawIds: [] as string[],
  strengths: [] as string[],
  blindSpots: [] as string[],
  preferredMediums: [] as string[],
  favoriteShapes: [] as string[],
  favoriteContrasts: [] as string[],
  signatureMotifs: [] as string[],
  suggestedExperiments: [] as string[],
  sourceEvidenceIds: [] as string[],
  maskIds: [] as string[],
};

const dolls: Doll[] = [
  {
    ...baseDoll,
    id: 'd1',
    projectId: 'p1',
    tasteGraphId: 'g1',
    name: 'A',
    createdAt: 1,
    updatedAt: 1,
  },
  {
    ...baseDoll,
    id: 'd2',
    projectId: 'p2',
    tasteGraphId: 'g2',
    name: 'B',
    createdAt: 2,
    updatedAt: 2,
  },
];

assert(filterDollsForGraph(dolls, 'g1').length === 1, 'filter dolls by graph');
assert(resolveDollInGraph(dolls, 'g1', 'd1').id === 'd1', 'resolve doll in graph');
threw = false;
try {
  resolveDollInGraph(dolls, 'g1', 'd2');
} catch (e) {
  threw = e instanceof ProjectProjectionMismatchError;
}
assert(threw, 'cross-graph doll resolve fails closed');

// ─── 4. Route state (mimi.you tabs) ───────────────────────────────────────────
assert(parseMimiYouTabFromPath('/mimi-dolls/dolls') === 'dolls', 'deep link dolls');
assert(parseMimiYouTabFromPath('/mimi-you/field-notes') === 'field-notes', 'alias deep link');
assert(parseMimiYouTabFromPath('/mimi-dolls') === null, 'shell root has no hub tab');
assert(resolveMimiYouTab('/mimi-dolls/art-history') === 'art-history', 'refresh art-history');
assert(resolveMimiYouTab('/mimi-dolls/universe') === 'overview', 'universe alias');
assert(mimiYouTabPath('overview') === '/mimi-dolls/overview', 'canonical overview path');
assert(mimiYouTabPath('field-notes') === '/mimi-dolls/field-notes', 'canonical field-notes path');

// ─── 5. Generation readiness (no silent exits) ───────────────────────────────
const emptyPatterns: PatternCluster[] = [];
const emptyLaws: CreativeLaw[] = [];

const blockedMarketing = evaluateGenerationReadiness({
  action: 'marketing_asset',
  project,
  evidenceCount: 3,
  patterns: emptyPatterns,
  laws: emptyLaws,
  assetType: 'brand_statement',
});
if (!isGenerationBlocked(blockedMarketing)) {
  throw new Error('marketing without accepted laws blocks');
}
assert(blockedMarketing.prerequisite === 'no_accepted_laws', 'prerequisite coded');
assert(blockedMarketing.recoveryAction.length > 0, 'recovery action present');

const badType = evaluateGenerationReadiness({
  action: 'marketing_asset',
  project,
  evidenceCount: 3,
  patterns: emptyPatterns,
  laws: [
    {
      id: 'l1',
      userId: 'u1',
      projectId: 'p1',
      title: 'Law',
      principle: 'p',
      explanation: 'e',
      supportingPatternClusterIds: [],
      supportingEvidenceNodeIds: [],
      confidence: 0.5,
      claimType: 'user_confirmed',
      userStatus: 'accepted',
      applications: [],
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  assetType: 'not_a_real_type',
});
assert(isGenerationBlocked(badType) && badType.prerequisite === 'invalid_asset_type', 'invalid assetType blocks');

assert(isMarketingAssetType('brand_statement'), 'known asset type');
assert(!isMarketingAssetType('flyer'), 'unknown asset type rejected');
assert(MARKETING_ASSET_TYPES.includes('visual_prompt'), 'catalog includes visual_prompt');

const mismatch = evaluateGenerationReadiness({
  action: 'doll',
  project,
  evidenceCount: 1,
  patterns: emptyPatterns,
  laws: emptyLaws,
  expectedTasteGraphId: 'wrong',
});
assert(
  isGenerationBlocked(mismatch) && mismatch.prerequisite === 'project_graph_mismatch',
  'graph mismatch blocks',
);

// ─── 6. API validation ───────────────────────────────────────────────────────
const badAsset = parseBody(createMarketingJobBodySchema, {
  assetType: 'flyer',
  tasteGraphId: 'g1',
});
assert(!badAsset.ok, 'API rejects invalid assetType before queue');

const goodAsset = parseBody(createMarketingJobBodySchema, {
  assetType: 'poster',
  tasteGraphId: 'g1',
});
assert(goodAsset.ok, 'API accepts valid assetType');

const loosePatch = parseBody(patternPatchBodySchema, {
  userStatus: 'accepted',
  evilField: true,
});
assert(!loosePatch.ok, 'pattern patch rejects unknown fields');

const okPatch = parseBody(patternPatchBodySchema, { userStatus: 'rejected' });
assert(okPatch.ok, 'pattern patch accepts closed-union status');

console.log('verify:tailor-foundation — all checks passed');

/**
 * Verifies scope assignment + claim provenance helpers for Let Mimi Read You.
 * Run: npm run verify:tailor-intake
 */
import {
  assignScopeBatch,
  buildCuriosityHandoff,
  buildDirectStatementEvidence,
  buildProvenanceClaims,
  compileIntakeHandoff,
  createIntakeId,
  canRequestEvidenceRead,
  deriveReadProgress,
  evidenceScopeToLegacy,
  groupIntoCollections,
  legacyScopeToEvidenceScope,
  normalizeTasteImportItem,
  rankAuthority,
  shouldPersistClaim,
  storageScopeToUiLabel,
  toEvidenceUploadPayload,
  type TailorEvidenceItem,
} from '../services/tailorEvidenceIntake';
import {
  mergeEvidenceWithLocal,
  slimEvidenceForFirestore,
} from '../services/tailorEvidenceLocalStore';
import { toUserFacingError, isFirestoreQuotaError } from '../lib/formatUserError';
import type { EvidenceNode } from '../types';
import { resolveLetterboxdFeedUrl } from '../lib/letterboxdFeed';
import { normalizeLetterboxdInput, importFromLink } from '../services/tasteImportService';
import { consumeApifyQuota } from '../lib/youSearch';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function makeItem(partial: Partial<TailorEvidenceItem> & Pick<TailorEvidenceItem, 'title'>): TailorEvidenceItem {
  return {
    id: partial.id ?? createIntakeId(),
    sourceType: partial.sourceType ?? 'upload',
    title: partial.title,
    evidenceSourceType: partial.evidenceSourceType ?? 'image',
    scope: partial.scope ?? 'session',
    status: partial.status ?? 'ready',
    capturedAt: partial.capturedAt ?? '2026-07-29T12:00:00.000Z',
    userConfirmed: partial.userConfirmed ?? false,
    selected: partial.selected ?? true,
    ...partial,
  };
}

function makeNode(id: string, provider: string): EvidenceNode {
  return {
    id,
    userId: 'u1',
    projectId: 'p1',
    sourceType: 'image',
    title: id,
    analysisStatus: 'pending',
    createdAt: 1,
    updatedAt: 1,
    extractedMetadata: { provider },
  };
}

console.log('verify:tailor-intake — starting');

// --- Letterboxd username normalization ---
assert(
  resolveLetterboxdFeedUrl('criterion').href === 'https://letterboxd.com/criterion/rss/',
  'bare username should resolve to public RSS',
);
assert(
  normalizeLetterboxdInput('criterion') === 'https://letterboxd.com/criterion/',
  'normalizeLetterboxdInput bare username',
);
assert(
  resolveLetterboxdFeedUrl('https://letterboxd.com/criterion/').pathname.includes('/criterion/rss'),
  'profile URL should map to RSS',
);

// Bare tokens must not auto-route to Letterboxd from the shared importer
// (Pinterest field uses the same helper).
await (async () => {
  let pinterestBareFailed = false;
  try {
    await importFromLink('my-moodboard', { preferProvider: 'pinterest' });
  } catch (e: any) {
    pinterestBareFailed = /Pinterest board URL/i.test(String(e?.message || e));
  }
  assert(pinterestBareFailed, 'bare Pinterest token must not hit Letterboxd');

  let unscopedBareFailed = false;
  try {
    await importFromLink('someuser');
  } catch (e: any) {
    unscopedBareFailed = /full link|Letterboxd field/i.test(String(e?.message || e));
  }
  assert(unscopedBareFailed, 'unscoped bare token must not auto-Letterboxd');
})();

// Apify quota helper: first N calls ok, then blocked within the window
{
  const uid = `quota-test-${Date.now()}`;
  const now = Date.now();
  for (let i = 0; i < 10; i++) {
    assert(consumeApifyQuota(uid, now) === true, `apify quota allow #${i + 1}`);
  }
  assert(consumeApifyQuota(uid, now) === false, 'apify quota blocks after window max');
  assert(consumeApifyQuota(uid, now + 60 * 60 * 1000 + 1) === true, 'apify quota resets after window');
}

// --- Scope mapping ---
assert(storageScopeToUiLabel('session') === 'This reading only', 'session label');
assert(storageScopeToUiLabel('persistent') === 'Add to my profile', 'persistent label');
assert(legacyScopeToEvidenceScope('profile') === 'persistent', 'legacy profile → persistent');
assert(legacyScopeToEvidenceScope('project') === 'session', 'legacy project → session');
assert(evidenceScopeToLegacy('persistent') === 'profile', 'persistent → profile');

const batchItems = [
  makeItem({ id: 'a', title: 'A', scope: 'session' }),
  makeItem({ id: 'b', title: 'B', scope: 'session' }),
  makeItem({ id: 'c', title: 'C', scope: 'session' }),
];
const batched = assignScopeBatch(batchItems, ['a', 'c'], 'persistent');
assert(batched[0].scope === 'persistent', 'batch scope a');
assert(batched[1].scope === 'session', 'batch scope b unchanged');
assert(batched[2].scope === 'persistent', 'batch scope c');

// --- Progress stages (truthful — no strong-read before analysis) ---
const empty = deriveReadProgress({ acceptedEvidence: [] });
assert(empty.stage === 'empty' && empty.label === '0 references added', 'empty progress');

const first = deriveReadProgress({
  acceptedEvidence: [makeNode('1', 'letterboxd')],
  stagedCount: 0,
});
assert(first.stage === 'first_clues', 'first clues');
assert(!/strong read/i.test(first.label), 'must not claim strong read early');

const pattern = deriveReadProgress({
  acceptedEvidence: [
    makeNode('1', 'letterboxd'),
    makeNode('2', 'pinterest'),
    makeNode('3', 'instagram'),
  ],
});
assert(pattern.stage === 'pattern_forming', 'pattern forming with variety');

const ready = deriveReadProgress({
  acceptedEvidence: [
    makeNode('1', 'letterboxd'),
    makeNode('2', 'pinterest'),
    makeNode('3', 'upload'),
  ],
  analysisAvailable: true,
  analysisConfidence: 0.7,
});
assert(ready.stage === 'ready_to_interpret', 'ready only after analysis');

// --- Collection grouping ---
const pinItems = [
  normalizeTasteImportItem({
    title: 'Pin 1',
    sourceType: 'moodboard',
    thumbnailUrl: 'https://example.com/1.jpg',
    extractedMetadata: {
      provider: 'pinterest',
      sourceCollectionId: 'board_1',
      boardTitle: 'Quiet Interiors',
      confidence: 'medium',
    },
  }),
  normalizeTasteImportItem({
    title: 'Pin 2',
    sourceType: 'moodboard',
    thumbnailUrl: 'https://example.com/2.jpg',
    extractedMetadata: {
      provider: 'pinterest',
      sourceCollectionId: 'board_1',
      boardTitle: 'Quiet Interiors',
      confidence: 'medium',
    },
  }),
];
const { rows, childrenByCollection } = groupIntoCollections(pinItems);
assert(rows.length === 1 && rows[0].isCollection === true, 'pins group into one collection card');
assert(rows[0].childIds?.length === 2, 'collection retains child ids');
assert((childrenByCollection.get('board_1') || []).length === 2, 'children map populated');
assert(/2 references/.test(rows[0].description || ''), 'collection describes count');

// --- Direct statement authority ---
const statement = buildDirectStatementEvidence('I prefer matte ceramics and quiet rooms.');
assert(statement !== null, 'statement created');
assert(statement!.sourceType === 'direct_statement', 'direct_statement type');
assert(statement!.rawMetadata?.authority === 'user_declared', 'user_declared authority');
assert(statement!.confidence === 0.95, 'high confidence for direct statement');

// --- Provenance claims ---
let threw = false;
try {
  buildProvenanceClaims({
    evidenceItems: [],
    path: 'compiledProfile.aestheticDNA.primaryCodes',
    method: 'model_inference',
    confidence: 0.4,
  });
} catch {
  threw = true;
}
assert(threw, 'claim without evidence IDs must throw');

const claim = buildProvenanceClaims({
  evidenceItems: [statement!],
  path: 'sourceMaterial.directStatements',
  method: 'user_stated',
  confidence: 0.95,
  userConfirmed: true,
  provisional: false,
});
assert(claim.derivedFrom.includes(statement!.id), 'claim cites evidence id');
assert(claim.userConfirmed === true, 'user confirmed');
assert(shouldPersistClaim(claim, 'user_declared') === true, 'persist user-stated claim');

const weak = buildProvenanceClaims({
  evidenceItems: [makeItem({ title: 'one-off' })],
  path: 'compiledProfile.aestheticDNA.eraBias',
  method: 'model_inference',
  confidence: 0.3,
  provisional: true,
});
assert(shouldPersistClaim(weak, 'model_observed') === false, 'do not persist weak inference');
assert(rankAuthority('user_declared') === 'user_declared', 'authority rank');
assert(rankAuthority('model_observed') === 'one_off_inference', 'model observed is weak');

// --- Curiosity → intendedHelp / requestedOutputs ---
const curiosity = buildCuriosityHandoff(['wear', 'patterns'], 'How do I show restraint?');
assert(curiosity.intendedHelp.includes('What should I wear?'), 'chip → intendedHelp');
assert(curiosity.intendedHelp.some((h) => h.includes('restraint')), 'custom curiosity');
assert(curiosity.requestedOutputs.artifactTypes.includes('wardrobe_guidance'), 'output hint');
assert(curiosity.persistentCuriosity.length === 0, 'curiosity session-scoped by default');

const handoff = compileIntakeHandoff({
  evidenceItems: [makeItem({ title: 'Film still' })],
  curiosityIds: ['words'],
  customCuriosity: '',
  directContext: 'I collect quiet objects.',
});
assert(handoff.directStatements.length === 1, 'direct context becomes statement');
assert(handoff.claims.some((c) => c.path === 'sourceMaterial.directStatements'), 'statement claim');
assert(handoff.claims.every((c) => c.derivedFrom.length > 0), 'every claim has provenance');
assert(handoff.intendedHelp.includes('What words describe my style?'), 'curiosity in handoff');

// --- Read CTA unlock: 3 references OR 3 curiosity prompts OR free-text ---
const blocked = canRequestEvidenceRead({ acceptedCount: 0, stagedSelectedCount: 0, customCuriosity: '' });
assert(blocked.canRequest === false && blocked.referencesNeeded === 3, 'empty intake blocked');
assert(blocked.curiosityNeeded === 3, 'empty curiosity needed');

const twoRefs = canRequestEvidenceRead({ acceptedCount: 2, stagedSelectedCount: 0 });
assert(twoRefs.canRequest === false && twoRefs.referencesNeeded === 1, 'two refs still blocked');

const twoChips = canRequestEvidenceRead({
  acceptedCount: 0,
  curiosityIds: ['patterns', 'communicate'],
});
assert(twoChips.canRequest === false && twoChips.curiosityNeeded === 1, 'two chips need one more');

const threeRefs = canRequestEvidenceRead({ acceptedCount: 3 });
assert(threeRefs.canRequest === true && threeRefs.unlockedBy === 'references', 'three accepted unlock');

const stagedPath = canRequestEvidenceRead({ acceptedCount: 1, stagedSelectedCount: 2 });
assert(stagedPath.canRequest === true && stagedPath.unlockedBy === 'references', 'staged counts toward min');

const threeChips = canRequestEvidenceRead({
  acceptedCount: 0,
  curiosityIds: ['patterns', 'communicate', 'drawn'],
});
assert(threeChips.canRequest === true && threeChips.unlockedBy === 'curiosity_prompts', 'three chips unlock');

const customPath = canRequestEvidenceRead({
  acceptedCount: 0,
  customCuriosity: 'How can I achieve this',
});
assert(customPath.canRequest === true && customPath.unlockedBy === 'custom_curiosity', 'custom curiosity unlocks');

const whitespaceCustom = canRequestEvidenceRead({ acceptedCount: 1, customCuriosity: '   ' });
assert(whitespaceCustom.canRequest === false, 'whitespace custom does not unlock');

// --- Upload payload retains scope + intake provenance ---
const payload = toEvidenceUploadPayload(
  makeItem({
    id: 'ev_1',
    title: 'Closet photo',
    scope: 'persistent',
    sourceType: 'upload',
    rawMetadata: { provider: 'manual', confidence: 'high' },
  }),
);
assert(payload.extractedMetadata.intakeScope === 'persistent', 'intakeScope persisted');
assert(payload.extractedMetadata.scope === 'profile', 'legacy scope for firestore');
assert(payload.extractedMetadata.intakeId === 'ev_1', 'intake id retained');

// --- Local evidence slim + friendly errors ---
assert(
  isFirestoreQuotaError('Free daily read units per project (free tier database) per day'),
  'quota phrase detected',
);
const friendly = toUserFacingError(
  '{"error":"quota exceeded","authInfo":{"userId":"x","email":"a@b.com"}}',
);
assert(!friendly.includes('authInfo'), 'JSON auth blob not shown to user');
assert(friendly.includes('device') || friendly.includes('Cloud'), 'friendly quota copy');

const hugeUrl = `data:image/png;base64,${'A'.repeat(15000)}`;
const slim = slimEvidenceForFirestore({
  id: 'ev_big',
  userId: 'u1',
  projectId: 'p1',
  sourceType: 'image',
  title: 'Big',
  uploadedFileUrl: hugeUrl,
  thumbnailUrl: hugeUrl,
  analysisStatus: 'pending',
  createdAt: 1,
  updatedAt: 1,
});
assert(!slim.uploadedFileUrl, 'oversized upload stripped for cloud');
assert(slim.extractedMetadata?.localMediaKey === 'ev_big', 'local media key on slim node');

const merged = mergeEvidenceWithLocal(
  [
    {
      id: 'ev_big',
      userId: 'u1',
      projectId: 'p1',
      sourceType: 'image',
      title: 'Big',
      analysisStatus: 'pending',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  [
    {
      id: 'ev_big',
      userId: 'u1',
      projectId: 'p1',
      sourceType: 'image',
      title: 'Big',
      uploadedFileUrl: hugeUrl,
      analysisStatus: 'pending',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
);
assert(merged[0].uploadedFileUrl === hugeUrl, 'local blobs hydrate cloud metadata');

console.log('verify:tailor-intake — all checks passed');

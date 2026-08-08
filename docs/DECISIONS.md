# Mimi Studio — Architecture Decisions (ADR-lite)

Append-only log. One entry per architectural decision: **date**, **decision**, **alternatives rejected**, **why**.

For full architecture narrative see [`mimi-system-architecture.md`](./mimi-system-architecture.md). Update [`STATE.md`](./STATE.md) when implementation status changes.

---

## 2026-08-08 — Signature memory vs publication consent

**Decision:** Split Taste Signature into **memory approval** (`status: "approved"`, `mark_signature`) and **publication consent** (`publishedAt` required for `/u/:handle/signature`, public card excerpt, and OG). Approve reading ≠ publish plate. Legacy `/@:handle` redirects to `/u/:handle` without rendering private `tasteProfile` fields.

**Alternatives rejected:** (1) Single approve button for memory + public. (2) Treat `status: approved` as implicit publish. (3) Keep legacy `PublicSharePage` taste graph UI.

**Why:** Inference/memory/publication are three distinct consents; public routes must fail closed without explicit publication.

**Ref:** `lib/signature/signatureConsent.ts`, `SignatureApproveBar`, `lib/publicProfileCard.ts`, `components/PublicSharePage.tsx`

---

## 2026-08-08 — Observatory follow-up: Mesopic live, cycles, withdraw, windows

**Decision:** Extend `/api/collective/mmm-report` to return **Mesopic** findings from below-threshold consented signals; infer **cycle notes** from window-half velocity on promoted profiles; add **7/14/30/90d** window selector in UI; enable **in-chamber withdraw** (`withdrawMmmContributionFields`) and unpublish without Pocket.

**Alternatives rejected:** (1) Mesopic as separate API route (same corpus, one fetch). (2) Cycle labels from volume alone without velocity gate. (3) Pocket-only withdraw (user asked for chamber action).

**Ref:** `buildMesopicReport.ts`, `inferCycleNotes.ts`, `ObservatoryContributionPanel.tsx`, `ObservatoryWindowSelector.tsx`

---

## 2026-08-08 — Observatory unified chamber + live collective MMM API

**Decision:** Collapse Observatory UX into one void-plate chamber with segments (Overview · Mean Median Mode · Mesopic). Default readout loads **`GET /api/collective/mmm-report`** — aggregates consented public zines from sovereign archive or Firestore, never silent demonstration fixtures. Demonstration specimens are explicit opt-in. Contribution panel surfaces corpus stats + Proscenium/Pocket CTAs. MMM strips hand off to Residue via `?q=` prefill. Forecast cultural vector consumes the same live API (honest empty when corpus insufficient).

**Alternatives rejected:** (1) Merging Residue into Observatory (namespace + consent confusion). (2) Default demonstration dashboard (violates honest collective states). (3) Client-only Firestore aggregation (misses sovereign Floor corpus).

**Why:** Perception loop needs one instrument surface, visible opt-in, and traceable actions while preserving Residue per-run MMM as a separate engine.

**Ref:** `components/chambers/ObservatoryChamber.tsx`, `lib/collectiveMmmReportRoute.ts`, `services/collective/buildMeanMedianModeReport.ts`

---

## 2026-08-08 — Public profile OG + bio editing

**Decision:** Add server-visible SEO for `/u/:handle` via `lib/publicProfileSeo.ts`, Express `app.get("/u/:handle")` metadata injection, and Vercel bot rewrite to `api/og/profile.ts`. Add bio textarea to `UserProfileView` (280 chars) saved to `profiles_public`. Client SPA navigation updates meta via `setPublicProfileMetaTags` on `PublicShowcasePage`.

**Alternatives rejected:** (1) Client-only SEO for share previews (crawlers need server HTML). (2) Separate bio field on `publicShowcase` snapshot (bio is identity, not doll token).

**Why:** Completes the public card loop — creators can write bio in settings; link previews show doll portrait, bio, and handle.

**Ref:** `lib/publicProfileSeo.ts`, `api/og/profile.ts`, `server.ts`, `components/UserProfileView.tsx`, `vercel.json`

---

## 2026-08-08 — Unified `PublicProfileCard` for `/u/:handle`

**Decision:** Extract a shared `PublicProfileCard` (`components/public-face/PublicProfileCard.tsx`) backed by `lib/publicProfileCard.ts` helpers. Canonical mimi.you showcase composes identity (photo, display name, bio, handle), taste signature excerpt (`aestheticSignature` → `semantic_signature` → doll philosophy), opt-in inverse reading teaser when `publicRip` is published, doll specimen, public zine grid, Keep Tabs, and cross-links to mimi.fish / mimi.rip.

**Alternatives rejected:** (1) Continue duplicating layout across `PublicShowcasePage`, `PublicSharePage`, and directory tiles. (2) Expose full private taste graph on the public card. (3) Inline rip reading on mimi.you instead of linking to mimi.rip.

**Why:** Product asked for a single public profile card surface; prior `/u/:handle` showed doll + zines only and ignored bio, avatar, signature report, and rip opt-in. Public-face kit + token colors align with PRD-07.

**Ref:** `components/public-face/PublicProfileCard.tsx`, `lib/publicProfileCard.ts`, `services/publicShowcaseService.ts`, `components/PublicShowcasePage.tsx`

---

## 2026-08-08 — Omni Loop Cult dolls: onboarding + art-history time travel

**Decision:** Ship Omni Loop Cult as `omni-loop-resin-v1` staple (ball-jointed resin BJD species). Doll onboarding: user photo + 2+ aesthetic refs + user-declared likeness attributes → Gemini analysis → `saveDoll` + shell portrait via `/api/mimi-image`. Time travel: era picker + Met public-domain refs → `generateRedepictionPrompt` (when Tailor project exists) or fallback shell prompt → scene image with doll + artwork + friend portrait refs. Persist scenes in `users/{uid}/dollScenes`; public gallery tab for shared scenes.

**Alternatives rejected:** (1) Require full Tailor evidence loop before any doll. (2) Copy artwork compositions without transformative prompt layer. (3) Separate API routes for doll scenes (reuse Firestore + mimi-image).

**Why:** Product vision needs a direct dolls chamber entry (photo + motif refs) and generative art-history reinterpretation for memes/marketing; existing `generateRedepictionPrompt` was unused.

**Ref:** `services/dollOnboardingService.ts`, `services/dollSceneService.ts`, `services/dollLikeness.ts`, `components/tailor/DollOnboardingFlow.tsx`, `components/tailor/TimeTravelStudio.tsx`, `services/dollEngine/staplePrompt.ts`

---

---

---

## 2026-08-08 — Scribe + Tailor curation ingest into taste spine

**Decision:** Mirror Scribe `MemoryAtom` saves to deterministic `EvidenceAtom` ids (`scribe_{memoryId}`) with content refresh on update. On Tailor pattern/law curation, upsert matching `TasteAssertion` rows (`tailor_{targetType}_{id}`) with LIKES/DISLIKES from user status. Merge server + local Used Context on hydrate (latest `addedAt` wins per atom+target).

**Alternatives rejected:** (1) Keep Scribe memory as a separate taste silo. (2) Assertions only from manual correction chips. (3) Server overwrite of local Used Context tray.

**Why:** Substantial taste data requires every capture and approval path to feed the same canonical spine; curation in Tailor should immediately surface in `getTasteState()` without waiting for a separate compiler-only path.

**Ref:** `lib/taste/scribeAtomBridge.ts`, `lib/taste/curationAssertionBridge.ts`, `services/taste/mirrorScribeToEvidenceAtom.ts`, `services/tasteModelService.ts` (`syncCurationToAssertion`), `services/usedContextService.ts`

---

## 2026-08-08 — Floor publish, evidence embeddings, Used Context conflicts

**Decision:** Mirror public Stand Floor zines to `EvidenceAtom` (`floor_{zineId}`) when `mirrorZineToSovereign` succeeds with `isPublic`. After evidence analyze, embed `semanticDescription` via Gateway into `evidenceAtomEmbeddings/{atomId}` and set `embeddingRef`. On taste model compile, attach `diagnostics.embeddingCentroid` from recent atom embeddings; `scoreTasteCandidate` blends label affinity with cosine similarity when `candidate.embedding` is provided. Used Context tray detects server/local conflicts and offers keep-local vs keep-server resolution.

**Alternatives rejected:** (1) Floor-only sovereign rows without taste mirror. (2) Embedding similarity without storing vectors on atoms. (3) Silent overwrite on hydrate without user-visible conflict state.

**Why:** Completes ingest from published work, makes scoring semantically aware when vectors exist, and handles cross-device Used Context honestly.

**Ref:** `lib/taste/floorAtomBridge.ts`, `lib/taste/evidenceAtomAnalysis.ts`, `lib/tasteModel/scoreTasteCandidate.ts`, `services/taste/evidenceAtomEmbeddings.ts`, `components/UsedContextTray.tsx`

---

## 2026-08-08 — Candidate embedding enrichment + Floor backfill script

**Decision:** When a taste snapshot has `diagnostics.embeddingCentroid` but a scoring candidate lacks `embedding`, auto-embed candidate text via `POST /api/mimi/embed` before `scoreTasteCandidate` (`enrichCandidateForScoring`). Scry taste rerank embeds the query once per run and blends query↔centroid cosine similarity into lane `embeddingScore`. Historical public Floor zines backfill via `npm run taste:backfill-floor-atoms` (Admin SDK, idempotent `floor_{zineId}` atoms).

**Alternatives rejected:** (1) Require every caller to supply embeddings manually. (2) Scry-only lexical rerank when centroid exists. (3) One-off client-only backfill without Admin script.

**Why:** Makes centroid diagnostics actionable in Studio scoring and Scry without N duplicate embed calls per hit; backfill closes the gap for publishes before the live mirror shipped.

**Ref:** `lib/taste/enrichCandidateEmbedding.ts`, `services/embedClient.ts`, `lib/scry/tasteScryRerank.ts`, `scripts/backfillFloorEvidenceAtoms.ts`

---

## 2026-08-08 — Darkroom → EvidenceAtom mirror (treatments + fragments)

**Decision:** Mirror saved Darkroom `StyleTreatment` rows and `saveToDarkroom` fragments into deterministic `darkroom_{id}` EvidenceAtoms with `ingestSource: darkroom`. Batch export to Pocket remains on the Pocket mirror path; this closes the gap for curated treatments and the dormant darkroom collection writer.

**Alternatives rejected:** (1) Rely only on Pocket export for all Darkroom signal. (2) Duplicate treatment rows as Pocket items automatically.

**Why:** Treatment extraction is primary Darkroom output that never touched Pocket; `saveToDarkroom` exists but had zero taste ingest.

**Ref:** `lib/taste/darkroomAtomBridge.ts`, `services/taste/mirrorDarkroomToEvidenceAtom.ts`, `components/DarkroomView.tsx`, `services/archiveManager.ts`

---

## 2026-08-08 — Darkroom treatments backfill script

**Decision:** Add `npm run taste:backfill-darkroom-treatments` to scan `profiles_public` (or `--user=uid`) and idempotently create `darkroom_{treatmentId}` EvidenceAtoms from `savedTreatments`.

**Alternatives rejected:** (1) Require manual re-save in Darkroom UI. (2) Store treatments in a separate collection for easier collectionGroup scan.

**Why:** Historical curated treatments pre-mirror never entered the taste spine; profile scan is the only durable source.

**Ref:** `scripts/backfillDarkroomTreatments.ts`

---

## 2026-08-08 — Sovereign Floor backfill + batch evidence analyze scripts

**Decision:** Add `npm run taste:backfill-floor-sovereign` to read public zines from the sovereign archive (`is_public = 1`) and mirror to `floor_{zineId}` Firestore EvidenceAtoms. Add `npm run taste:analyze-evidence-atoms` to run `runEvidenceAtomAnalysis` (interpret + embed) on pending/failed atoms via Admin + `AI_GATEWAY_API_KEY`.

**Alternatives rejected:** (1) Floor backfill only from Firestore (empty public zine set in prod). (2) Manual per-atom API calls from the client for ops backfill.

**Why:** Production Floor lives in sovereign; ops needs a one-shot path to taste spine + embeddings without UI.

**Ref:** `scripts/backfillFloorEvidenceAtomsFromSovereign.ts`, `scripts/analyzePendingEvidenceAtoms.ts`

---

## 2026-08-08 — Unified Taste Graph summary read path

**Decision:** Add `GET /api/mimi/taste-graph/summary` as the canonical server read for Taste Graph chambers: `TasteState` + latest `TasteModelSnapshot` + projected graph (`projectTasteModelToGraph` preferred over legacy `tasteGraphNodes` when signal is richer) + readiness gaps + server Used Context. Remove demonstration nodes from `/taste-graph` when empty. Mirror Pocket saves into deterministic `EvidenceAtom` ids (`pocket_{itemId}`) via `mirrorPocketItemToEvidenceAtom`. Persist Used Context tray to Firestore (`users/{uid}/studioMeta/usedContext`) with `GET/PUT /api/mimi/used-context` and client hydrate on empty local store.

**Alternatives rejected:** (1) Keep three parallel read paths (map nodes, Tailor graph, snapshot) without a summary API. (2) Demo orbital nodes for anonymous/empty signed-in users. (3) Used Context localStorage-only forever.

**Why:** Substantial taste data requires one honest read surface, traceable ingest from every capture chamber, and durable approved context for cross-device generation. Projection from compiled snapshot aligns map UI with Tailor curation without duplicating authoritative node storage.

**Ref:** `lib/mimiTasteGraphSummaryRoute.ts`, `lib/taste/tasteGraphSummary.ts`, `lib/taste/pocketAtomBridge.ts`, `services/taste/mirrorPocketToEvidenceAtom.ts`, `lib/mimiUsedContextRoute.ts`, `components/TasteGraph.tsx`

---

## 2026-08-08 — Taste Signature as evidence-backed editorial reading

**Decision:** Expand `/signature` from DNA-card + charts into a layered artifact: exportable **plate** (unchanged public face) → **editorial reading** (thesis, confidence, Used Context refs) → semiotic touchpoints, creative directions, recommendations, anti-signature, drift notes → collapsed analytics. Generation pulls zines, Tailor draft, approved Used Context, and taste model snapshot via AI Gateway (`textDeep`) with Gemini JSON fallback. Explicit **Approve signature** persists `status: approved` and records `mark_signature` through `recordAndRecompile`; **Repair** routes to Tailor.

**Alternatives rejected:** (1) Dashboard-first layout with charts above the fold. (2) Personality-diagnosis copy without provenance. (3) Signature as pure LLM summary of zines only (ignores approved context and taste model).

**Why:** Product canon places Signature in the **Approve** phase; creators need a sufficient, citable reading they can approve or repair before it becomes durable taste memory. Plate stays shareable; reading stays honest about confidence and evidence.

**Ref:** `services/signatureService.ts`, `lib/signature/signatureSchema.ts`, `components/SignatureView.tsx`, `components/signature/SignatureReading.tsx`, `types.ts` (`AestheticSignature`)

---

---

## 2026-08-08 — Public signature route + incremental evidence patch

**Decision:** Ship `/u/:handle/signature` as a public plate surface (approved signatures only) with server-visible OG HTML on Express (`server.ts`) and Vercel crawler rewrite (`api/og/signature.ts`). Share links point to this URL. When only approved Used Context atoms change, `patchSignatureFromEvidence` updates the reading in-place (debounced) and resets approval to draft; full Re-sync remains for zine/Tailor/taste-model changes.

**Alternatives rejected:** (1) Publishing draft signatures publicly. (2) Full gateway re-generation on every atom toggle. (3) Client-only OG (no crawlable meta).

**Why:** Share cards need a stable public URL and honest visibility (approved only). Evidence approval is frequent enough that full re-sync felt heavy; fingerprint-gated patches keep the reading current without recomputing the whole signature.

**Ref:** `components/PublicSignaturePage.tsx`, `lib/signature/publicSignature.ts`, `lib/signature/signatureFingerprint.ts`, `api/og/signature.ts`, `vercel.json`, `server.ts`, `components/SignatureView.tsx`

---

## 2026-08-08 — Oracle chamber reports (local-first cyberdeck UX)

**Decision:** Redesign `/oracle` with cyberdeck instrument plates (matching `TheScribe` atmosphere). Persist Cyberdeck sessions locally via `services/oracleChamberService.ts` on chamber close/export; surface **Chamber Reports** (past transmissions) and **Recurring Themes** (client-side frequency extraction) on the Oracle page. Pocket export remains the durable archive path.

**Alternatives rejected:** (1) Firestore collection for every voice snippet (quota + latency). (2) AI-generated theme summaries on each page load (cost + latency). (3) Flattening Oracle to quiet public kit (product exempts Oracle cyberdeck density).

**Why:** Users need continuity across communes without manual Pocket export; local storage is honest for unsigned/offline use and matches other chamber-local patterns (`mimi_audits_*`, quiet studio ops).

**Ref:** `components/TheOracle.tsx`, `components/oracle/*`, `components/TheScribe.tsx`, `services/oracleChamberService.ts`

---

## 2026-08-08 — AI Gateway funding for TTS + Oracle Cyberdeck live voice

**Decision:** Route Gemini-compat TTS (`responseModalities: AUDIO`, `*-tts-*` models) through `generateGatewaySpeech` in `/api/proxy/gemini` with funded-gateway metering. Mint Oracle Cyberdeck live sessions via `gateway.experimental_realtime.getToken` in `/api/live/token` when `AI_GATEWAY_API_KEY` is configured; client connects with `GatewayLiveConnection` (WebSocket codec). Keep Gemini ephemeral tokens as fallback when gateway is absent or for BYOK `x-api-key`.

**Alternatives rejected:** (1) Requiring `GEMINI_API_KEY` for all vocal features despite funded credits. (2) One-shot TTS only for Cyberdeck (product needs bidirectional live). (3) Adding `@ai-sdk/react` solely for `useRealtime` in this pass.

**Why:** Lab users with plan-funded gateway credits were blocked on vocal sync and narration because live/TTS paths hard-depended on a server Gemini key. Gateway catalog already exposes `tts` and realtime models (`lib/models.ts`).

**Ref:** `lib/ai/generate.ts`, `lib/aiGatewayCompat.ts`, `api/live/token.ts`, `hooks/gatewayLiveConnection.ts`, `hooks/useLiveSession.ts`, `services/liveAuth.ts`

---

## 2026-08-08 — Pocket why-saved prompt queue (a11y)

**Decision:** Serialize multi-image why-saved prompts through `useWhySavedPrompt` artifact queue (one sheet at a time; Done exits queue; dismiss advances). Per-hypothesis review pending/error state; `epistemicLabelForHypothesis` centralizes Inferred/Observed/Creator labels; `useModalFocus` traps focus in `WhySavedSheet`.

**Alternatives rejected:** (1) Prompting only the final image in a batch (loses per-artifact capture). (2) Global `loading` disabling all hypothesis actions during one review.

**Why:** Prevents racing propose requests and overlapping review state; meets dialog a11y contract without a parallel sheet primitive.

**Ref:** `hooks/useWhySavedPrompt.ts`, `components/pocket/WhySavedSheet.tsx`, `lib/a11y/useModalFocus.ts`, `lib/tasteIntelligence/savedReason.ts`

---

## 2026-08-08 — Pocket why-saved surface (Taste Intelligence #13)

**Decision:** Wire `proposeSavedReasonHypotheses` / `applySavedReasonReview` to Pocket capture via `WhySavedSheet` + `/api/mimi/taste-intelligence/saved-reason/*` routes. Hypotheses persist in Neon `saved_reason_hypotheses`; language distinguishes Inferred / Observed / Creator confirmed / Creator rejected.

**Alternatives rejected:** (1) Reusing legacy `DeltaVerdictCard` as why-saved. (2) Client-only hypotheses without Neon persistence.

**Why:** Completes Capture → Interpret → Approve for Pocket without touching the generation pipeline; bounded post-capture sheet after image stash.

**Ref:** `components/pocket/WhySavedSheet.tsx`, `hooks/useWhySavedPrompt.ts`, `lib/tasteIntelligence/savedReason.ts`

---

## 2026-08-08 — Studio compiler/critic cards + Tailor v2 contract reconciliation

**Decision:** Ship Studio-facing compiler and critic UI wired through `/api/mimi/taste-intelligence/compiler/compile` and `/critic/critique`, with `mergeGenerationContracts` reconciling Taste Intelligence compiler output against Tailor Profile v2 `generationContract` before prompt injection.

**Alternatives rejected:**
- Client-only compile without persistence (loses audit trail for critiques).
- Replacing Tailor v2 `generationContract` with TI compiler output (breaks existing zine/Tailor prompt paths).

**Rationale:** Studio needs visible, pre-generation contracts and post-generation critique without forking Tailor's canonical profile contract. Merge keeps both sources authoritative: Tailor strategic rules + TI evidence-linked compiler modes.

---

## 2026-08-08 — Safe undo semantics for Taste Intelligence model edits

**Decision:** Limit undo to single-edit reversal (most recent forward model edit only) with explicit UI copy; server recomputes authoritative snapshot via `replayTasteSnapshot` from derived baseline + immutable edit/refusal log instead of trusting client snapshot. Returns `409 UNDO_NOT_ALLOWED` when undo target is not the latest forward edit.

**Alternatives rejected:** Full historical rollback UI (misleading without full event replay); client-authoritative undo (non-deterministic on reload).


---

## 2026-08-08 — Graph merge/split + embedding similarity in critic alignment

**Decision:** Ship merge/split snapshot edits in `applyEditsToSnapshot` with Pattern Graph inspector UI gated by `tasteGraphMergeSplit` (`TASTE_GRAPH_MERGE_SPLIT=1` server, `VITE_TASTE_GRAPH_MERGE_SPLIT=1` client). Add `embeddingSimilarity` component to `scoreTasteCandidate` (12% coefficient) using deterministic hash embeddings with optional real vectors on candidates/features; flows into post-generation critic via existing `critiqueAgainstContract` → `scoreTasteCandidate` path.

**Alternatives rejected:** (1) Client-only merge without API gate. (2) LLM embedding calls inside scoring hot path. (3) Replacing tag overlap with embeddings only.

**Why:** Completes the graph editor vertical slice and improves critic alignment for semantically similar artifacts without breaking deterministic offline scoring.

**Ref:** `lib/tasteIntelligence/applySnapshotEdits.ts`, `lib/tasteModel/embeddingSimilarity.ts`, `components/taste/TasteModelInspector.tsx`

---

## 2026-08-08 — Negative taste + graph model editing (Tailor Pattern Graph slice)

**Decision:** Ship creator-facing negative taste and direct model editing inside Tailor `PatternGraphScreen` + `TasteModelInspector`, backed by existing Taste Intelligence OS v2 contracts (`taste_refusals`, `taste_model_edits`, `computeModelDelta`, `applyEditsToSnapshot`). New API routes: `POST /api/mimi/taste-intelligence/refusals`, `POST /model-edits`, `POST /model-edits/undo`. Merge/split remain behind `TASTE_GRAPH_MERGE_SPLIT=1`.

**Alternatives rejected:** (1) New top-level chamber. (2) Client-only React state without Neon persistence. (3) Reviving parallel `lib/tasteCalibration/*` stack.

**Why:** Makes v2 refusal/model-edit logic usable in the primary Tailor curation flow with mobile-first inspector + bottom-sheet refine controls.

**Ref:** `components/tailor/PatternGraphScreen.tsx`, `hooks/useTasteSignalEditor.ts`, `lib/tasteIntelligence/signalRefine.ts`, `docs/taste-calibration-lab.md`

---

## 2026-08-08 — Taste Intelligence OS v2 (Neon operational layer + Calibration Lab)

**Decision:** Extend the v1 computational taste model into a coherent intelligence layer without a second Taste Graph. New operational writes go to Neon (`mimi.taste_*` tables) via authenticated `/api/mimi/taste-intelligence/*` routes; `services/tasteModelService.ts` dual-writes/dual-reads during Firestore migration. Calibration Lab lives at `/tailor/calibrate` with deterministic active-learning pair selection and Bradley-Terry-style calibration deltas. Sentinel memory policy is a separate headless layer (`lib/tasteIntelligence/sentinelPolicy.ts` + `SentinelMemoryReview`) — `CaptiveSentinel` remains the in-app browser guard only.

**Alternatives rejected:** (1) Second canonical taste graph. (2) Replacing Tailor Profile v2. (3) LLM as hidden scoring function. (4) React → Neon direct connections. (5) Repurposing CaptiveSentinel for agent memory.

**Why:** ADR 001 alignment, explainable learning loop, and vertical-slice delivery (persistence + API + UI + tests) over mock-only screens.

**Ref:** `docs/taste-intelligence-os-v2.md`, `lib/tasteIntelligence/`, `schemas/tasteIntelligenceContracts.ts`, migration `0001_taste_intelligence`

---

## 2026-08-08 — Scry taste rerank + visible why-matched

**Decision:** After the four Scry evidence lanes settle, `runSpecimenScry` loads the latest taste snapshot + refusals (graceful no-op when unsigned out or API unavailable) and reranks hits **within each lane** via `lib/scry/tasteScryRerank.ts` → `rerankTasteSearchResults`. Each `ResearchResult` may carry `tasteScore` and `whyMatched` (semantic fit, linked features, trajectory, refusal contradiction). ScryView merges lanes sorted by taste score and exposes an expandable “Why matched” panel per card.

**Alternatives rejected:** (1) New schema columns for search provenance. (2) Cross-lane overwrite into a single blended blob. (3) Client-only rerank in ScryView without service-layer attachment.

**Why:** Completes the search vertical slice with explainable retrieval tied to the approved taste model; preserves lane honesty from ADR 2026-08-02.

**Ref:** `lib/scry/tasteScryRerank.ts`, `services/scryService.ts`, `components/ScryView.tsx`, `schemas/scryContracts.ts`

---

## 2026-08-08 — Client taste model sync via API (not Neon imports)

**Decision:** `services/tasteModelService.ts` must not import `infrastructure/database/neon/*` — even dynamic imports get bundled into the Vite client graph and break Vercel builds (`node:crypto` in `creditRepository`). Neon snapshot persist/read goes through `/api/mimi/taste-intelligence/snapshot/*` via `tasteIntelligenceClient`.

**Alternatives rejected:** Vite `external` hacks for the whole neon tree; keeping dual-write in client service.

**Why:** React must never connect to Neon; client bundles must stay server-free.

**Ref:** `services/tasteModelService.ts`, `lib/tasteIntelligenceRoute.ts`, `services/tasteIntelligenceClient.ts`

---

## 2026-08-08 — Taste Calibration MVP (parallel PR — superseded by Taste Intelligence OS v2)

**Decision:** A parallel `lib/tasteCalibration/*` stack with normalized Neon columns (`taste_calibration_*` migration `0001_taste_calibration`) was prototyped on branch `metaste-calibration-mvp-278f`. **Merged into main by adopting the existing Taste Intelligence OS v2 architecture** (`lib/tasteIntelligence/*`, JSONB payload columns, `/api/mimi/taste-intelligence/calibration/*`, `CalibrationLab.tsx`) rather than maintaining duplicate repositories and API surfaces.

**Alternatives rejected:** Running two calibration persistence stacks side-by-side.

**Why:** Same product surface (`/tailor/calibrate`), same ADR-001 constraints, but main already shipped the broader OS v2 spine; duplicate schema/API would fork operational truth.

**Ref:** `docs/taste-calibration-lab.md` (algorithm notes retained), `docs/taste-intelligence-os-v2.md` (canonical architecture)

---

## 2026-08-08 — Taste model hotfix: idempotent events + scoped compilation

**Decision:** (1) Use stable dedupe keys as Firestore document IDs for explicit curation events (`event.id === dedupeKey`). (2) Default `compileAndSaveTasteModel` scope to `project` when `projectId` is set — project recompilation must not overwrite `tasteModelSnapshots/global`.

**Alternatives rejected:** (1) Append-only events with post-hoc dedupe at compile time only. (2) Always recompiling both global and project on every curation. (3) Time-bucketed dedupe for explicit corrections (allows double-weight on replay).

**Why:** Replay-safe curation and isolated project models are correctness requirements for trustworthy taste learning; global snapshot is a cross-project aggregate and must only be rebuilt from all events.

**Ref:** `services/tasteModelService.ts`, `__tests__/tasteModelService.test.ts`, `docs/computational-taste-model.md`

---

## 2026-08-08 — EvidenceAtom/TasteState vs TasteModelSnapshot (single truth boundary)

**Decision:** Maintain **one canonical evidence/assertion plane** and **one derived computational cache**:

| Layer | Role | Canonical? |
| --- | --- | --- |
| `EvidenceAtom` + `TasteState` / taste assertions | Canonical evidence intake, analysis, corrections, semantic retrieval | **Yes** |
| Tailor graph (`EvidenceNode`, `Observation`, `PatternCluster`, `CreativeLaw`) | Project-scoped interpretive graph (migrating toward atom linkage) | Canonical per project |
| `TasteModelSnapshot` | Deterministic compiled taste weights, trajectories, interaction rules | **Derived cache only** |

No duplicate preference truth stores. Migration/adapter boundary lives at `lib/taste/evidenceNodeBridge.ts` + `lib/tasteModel/normalizeTasteEvents.ts` — atoms and graph entities feed compilation; snapshots never write back to canonical stores.

**Alternatives rejected:** (1) Parallel taste preference collections in Firestore. (2) Making `TasteModelSnapshot` authoritative for generation. (3) Merging EvidenceAtom and TasteEventV2 into one schema prematurely.

**Why:** Preserves traceable evidence → assertion → derived model flow; enables Phase 1–3 Taste Intelligence without forking the computational model from #224.

**Ref:** `docs/taste-intelligence-phase1.md`, `docs/computational-taste-model.md`, `lib/taste/`, `lib/tasteModel/`

---

## 2026-08-08 — Computational Taste Model (derived snapshot, v1)

**Decision:** Introduce `TasteModelSnapshot` as a **derived cache** compiled deterministically from canonical Tailor graph entities (`EvidenceNode`, `Observation`, `PatternCluster`, `CreativeLaw`) plus immutable `TasteEventV2` learning events. Pure compilation in `lib/tasteModel/`; persistence at `users/{uid}/tasteLearningEvents` and `users/{uid}/tasteModelSnapshots/{global|project-{id}}`. Legacy `TasteEvent` normalized additively via `normalizeTasteEvent()`. Candidate scoring returns fit score (0–100, not probability), confidence, and evidence-linked explanation — no LLM in the scoring path.

**Alternatives rejected:** (1) A third canonical taste source separate from the WO-7 graph. (2) Replacing Tailor Profile v2. (3) LLM-generated scores without provenance. (4) Silent migration of existing Firestore documents. (5) Making TasteGraphNode/Edge canonical.

**Why:** Closes the product loop: evidence → curation → explainable taste model → candidate scoring → user correction. Deterministic, versioned, and correctable beats a black-box classifier. Presentation projection via `projectTasteModelToGraph()` keeps existing Taste Graph UI compatible.

**Ref:** `lib/tasteModel/`, `services/tasteModelService.ts`, `docs/computational-taste-model.md`, `components/taste/TasteModelInspector.tsx`

---

## 2026-08-05 — Proof-mode stock plate mode + Unsplash attribution

**Decision:** Add `plateMediaMode` on Studio orientation intake (`photography-first` | `generated` | `references-only`). Hi-fi `bakeZineVisualPlates` resolves Unsplash stock via server `/api/inspo/search` when mode is photography-first; skips AI generation for `references-only`. Stock attribution lands on `ZinePageSpec` and `SpecimenPage` footer.

**Alternatives rejected:** (1) Client-side Unsplash keys. (2) Silent AI fallback when stock misses (honest empty/failure instead). (3) Remounting full InputStudio on `/studio` for the toggle.

**Why:** Serves AI-averse blog/article ideation with attributed real photography while preserving generated plates as explicit opt-in; connects Studio entry to the zine passport concept without forking the calm orientation shell.

**Ref:** `lib/bakeZinePlates.ts`, `lib/unsplashClient.ts`, `components/studio/StudioOrientationEntry.tsx`, `api/inspo/search.ts`

---

## 2026-08-05 — Proof-mode stock plate swap + Studio Pinterest board import

**Decision:** (1) Add `swapZinePlateStock` and a **Swap stock plate** control in `ZineProofMode` (owner-only) so draft issues can cycle Unsplash alternates without full regen. (2) Add optional Pinterest board URL import on Studio orientation intake (public scrape / API path via `/api/pinterest`), capping at 8 reference thumbnails.

**Alternatives rejected:** (1) Full issue regen for every plate dissatisfaction. (2) Client-side Pinterest token handling on Studio. (3) Remounting Scribe Pinterest desk without routing work.

**Why:** Closes the ideation loop for photography-first and board-curated workflows on the calm Studio shell; keeps attribution honest on swap via existing `ZinePageSpec` passport fields.

**Ref:** `lib/swapZinePlateStock.ts`, `components/zine/ZineProofMode.tsx`, `components/studio/StudioOrientationEntry.tsx`

---

## 2026-08-05 — Imagen-first Studio toolbar + inspo carousel

**Decision:** Default `/studio` plate path is **Imagen** (`generated`). Stock and References are compact toolbar toggles, not equal-weight cards. Add an **Inspos** carousel (attached references + Unsplash previews from prompt) with **Publish my rendition →** — always routes through Imagen, seeding from the selected inspo.

**Alternatives rejected:** (1) Photography-first as co-equal default beside Imagen. (2) Full InputStudio inspo panel remount on `/studio`. (3) “Publish” meaning literal stock republish without AI rendition.

**Why:** Matches product intent: AI-developed plates first; stock/references are explicit opt-ins; inspo browsing supports ideation without leaving the calm orientation shell.

**Ref:** `components/studio/StudioPlateMediaToolbar.tsx`, `components/studio/StudioInspoCarousel.tsx`, `lib/fetchStudioInspos.ts`

---

## 2026-08-04 — Pinterest board preview: API-first for token owner, HTML fallback

**Decision:** When `PINTEREST_ACCESS_TOKEN` is set (Production Limited / Standard), resolve board previews via Pinterest API v5 (`boards` + `boards/{id}/pins`) for boards owned by the token account; fall back to existing public HTML scrape for other users' boards or when API resolution fails.

**Alternatives rejected:** (1) Sandbox-only development (cannot read real curated boards). (2) Replace scrape entirely with API (trial tokens cannot read arbitrary public boards). (3) Official OAuth before proving read path.

**Why:** Token owner's boards get full pin lists and stable image URLs; arbitrary public board URLs keep working without OAuth approval; aligns with zine/Tailor intake that accepts pasted board links.

**Ref:** `lib/pinterestApi.ts`, `lib/pinterestBoardPreview.ts`, `npm run verify:pinterest-api`

---

## 2026-08-04 — Public editorial surfaces: single scroll owner

**Decision:** Public editorial plates (`editorial-home`, `stand`, `signature`, `proscenium`, `showcase`, `archival`) scroll only on `<main>` via `mainShellClassName`. Child `PublicField` shells use `min-h-full`, `bleed` (no duplicate field fill), and must not set `overflow-y-auto` or `h-full` height locks. `<main>`, app root, and `studio-chrome[data-chrome="public-face"]` all paint `--mimi-field` so the surface reads as the page — not a white card inside a gray/dark shell.

**Alternatives rejected:** (1) Per-surface internal scroll on `PublicField`. (2) Auditing all ~40 dark-plate chambers in the same pass.

**Why:** Nested `overflow-y-auto` + `h-full` on white public plates produced a “container within container” feel and double scrollbars; dark-plate chambers intentionally own their own full-height panels.

**Ref:** `lib/chamberChrome.ts`, `components/public-face/PublicField.tsx`, `App.tsx`

---

## 2026-08-08 — The Press Export Chamber wired end-to-end

**Decision:** Wire `ExportChamber` into `PublisherDashboard` so destination cards and the Release desk open the artifact export surface in-place — with destination-aware initial modes (PDF, asset ZIP, Shopify pack), publish consent for web issues, and Firestore `exportState` recording after successful exports.

**Alternatives rejected:** (1) Keep routing export actions to `/studio`. (2) Duplicate export UI inside PublisherDashboard. (3) Silent publish without Proscenium consent modal.

**Why:** The Press release desk already derives readiness and destinations; creators need one honest handoff to extract artifacts and publish without leaving the chamber. Studio remains the proof/edit surface; export and publication happen after approval in The Press.

**Ref:** `components/PublisherDashboard.tsx`, `components/ExportChamber.tsx`, `lib/publisher/artifactExportActions.ts`

---


**Decision:** Restructure The Press around **Release** (artifact readiness, destinations, approvals) and **Performance** (post-publication metrics only when connected). Derive readiness deterministically from proof diagnostics, export manifest, Intel handoff, and Shopify pack inspection — no simulated reach/revenue/deliverability cards.

**Alternatives rejected:** (1) Retain aggregate analytics dashboard as first viewport. (2) AI-generated release recommendations without explicit check rules. (3) Toast-only sponsor approvals.

**Why:** Mimi is a private editorial OS for taste, evidence, and approval — not a generic creator analytics product. Creators need to know if an artifact is safe to release before seeing performance data.

**Ref:** `lib/publisher/releaseReadiness.ts`, `components/PublisherDashboard.tsx`

---

## 2026-08-04 — Taste Corpus embedding explorer (offline CLIP + UMAP)

**Decision:** Ship a public `/taste-corpus` route that loads precomputed 2D coordinates from `public/data/embeddings.json`. CLIP inference and UMAP (`n_neighbors=15`, `min_dist=0.1`) run only in `scripts/embed.ts` (dev/CI). Client renders SVG for ≤1500 points, canvas above that. Server injects an `sr-only` `<ul>` of specimen titles/links into HTML for crawlers; canvas is `aria-hidden`.

**Alternatives rejected:** (1) Client-side CLIP/UMAP in the browser. (2) Canvas-only with no crawlable fallback. (3) Per-user shadow-memory map as v1 (requires auth + Firestore reads).

**Why:** Keeps inference off the client and off request path; preserves indexability despite canvas; separates vector-free public artifact from title/href index for SEO and click-through.

**Ref:** `scripts/embed.ts`, `components/taste-corpus/`, `lib/taste-corpus/serverInject.ts`

---

## 2026-08-02 — Data plane ownership (Firebase vs Sovereign vs IndexedDB)

**Alternatives rejected:** (1) Sovereign as full application store replacing Firestore. (2) Firestore for all public Floor reads indefinitely.

**Why:** Firestore quota exhaustion and public-read cost; Sovereign gives owned discovery without forking private knowledge auth. Sovereign must not become a silent second source of truth for private atoms.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §1

---

## 2026-08-02 — Memory Atoms stay on Firestore (for now)

**Decision:** Do not migrate Memory Atoms / Context Runs to Sovereign Postgres in the current phase.

**Alternatives rejected:** Immediate Postgres migration for all knowledge objects.

**Why:** Requires private-read auth parity, deletion tombstones, and atom schema sync — not yet satisfied.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §3

---

## 2026-08-02 — Shared embedding space contract

**Decision:** Introduce `EmbeddingSpaceId` (`provider`, executed `model`, `dims`, `schemaVersion`). Cosine similarity only within matching spaces. Model changes version by executed model id; personal reindex is UID-gated; Sovereign reindex is ops/ingest-keyed.

**Alternatives rejected:** Ad-hoc embedding comparisons across model generations; silent dimension mixing in Shadow Memory and Floor search.

**Why:** Prevents invisible retrieval corruption when Gateway models change.

**Ref:** `schemas/embeddingContracts.ts`, [`architecture-update-21.md`](./architecture-update-21.md) §5–6

---

## 2026-08-02 — The Edit: one chamber, three panels

**Decision:** Keep `/the-edit` as a single chamber with **Signal** (default), **Issue**, and **Forecast** panels. Query param `?panel=signal|issue|forecast`.

**Alternatives rejected:** Separate top-level routes for editorial signal vs spread composition vs commerce forecast.

**Why:** One editorial job with distinct modes; avoids route proliferation and duplicate mastheads.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §7

---

## 2026-08-02 — Observatory does not write to Taste Graph

**Decision:** Observatory / Mean Median Mode remain **collective cultural context only**. Aggregate stats must not silently become personal taste.

**Alternatives rejected:** Pipeline from collective MMM into personal Taste Graph without per-claim approval.

**Why:** Preserves creator authority and consent boundaries.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §8

---

## 2026-08-02 — Collective consent revoke semantics

**Decision:** Unpublish/withdraw stops **future** live-window contribution; persist `mmmContributionStatus: "withdrawn"`. Frozen historical reports may retain anonymized aggregates (disclosed at contribute time). No promise to scrub frozen windows.

**Alternatives rejected:** Retroactive removal from all historical aggregate snapshots.

**Why:** Honest disclosure vs impossible perfect erasure of published statistical snapshots.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §9

---

## 2026-08-02 — Scry lane honesty

**Decision:** Scry runs **distinct evidence lanes** (archive, web, reading, shadow). No shared result overwrite. Empty personal memory is **empty**, not partial. Shadow lane uses Shadow Memory only — never padded from public Floor.

**Alternatives rejected:** Single blended retrieval blob; padding missing lanes with public data.

**Why:** Evidence-first product promise; prevents false completeness.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §4, `lib/productCanon.ts` (Scry notes)

---

## 2026-08-02 — Express + Vite single service

**Decision:** One Express host mounts Vite dev middleware and `/api` routes. Production serves `dist/` with SPA fallback. Public SEO routes inject meta server-side before HTML send.

**Alternatives rejected:** Separate frontend/backend deployables for dev; client-only OG for share URLs.

**Why:** Simpler Cloud Agent / local dev; crawlers and iMessage previews need server-visible HTML (`/s/:zineId` pattern).

**Ref:** `server.ts`, `AGENTS.md`

---

## 2026-08-02 — AI models via Gateway catalog

**Decision:** Server AI calls use `modelFor(role, "gateway")` / `suggestedGatewayModel(role)` from `services/modelConfig.ts`. Avoid hardcoded provider model strings.

**Alternatives rejected:** Per-feature stale model pins (`gemini-1.5-flash`, etc.) scattered in services.

**Why:** Central catalog tracks Vercel AI Gateway curation; env overrides via `AI_GATEWAY_*_MODEL`.

**Ref:** `AGENTS.md`, `.env.example`

---

## 2026-08-02 — Mimi Dolls shell-first

**Decision:** Dolls chamber leads with **porcelain BJD staple shell** (`services/dollEngine/staplePrompt.ts`). Realtime shader lab is secondary tab.

**Alternatives rejected:** Shader-first identity surface; per-creator species drift.

**Why:** One house species; wardrobe/motifs vary; earned identity projection from Taste Graph.

**Ref:** `prd/doll-staple-shell.md`

---

## 2026-08-07 — mimi.fish / mimi.rip host skins (product intent)

**Decision:** One SPA, three public skins keyed by hostname (`lib/siteHost.ts`):

| Skin | Host | Job |
| --- | --- | --- |
| `you` | `mimi.you`, localhost, `*.vercel.app` | Full studio — capture, approve, remember |
| `fish` | `mimi.fish` | **Share / attention plane** — anything shareable (“fishing for compliments”): public zine plates, token shares, creator shelves; canonical outbound URL `https://mimi.fish/s/:zineId` |
| `rip` | `mimi.rip` | **Inversion plane** — mirrors `mimi.you` structure but surfaces **opt-in inverted** user data (inverse readings, dark diagnostic plates); not canonical identity |

Fish and Rip are public faces, not separate products. Identity and studio chrome stay on `mimi.you`. Local QA: `?skin=fish|rip` or `localStorage.mimi_site_skin`.

**Alternatives rejected:** Separate deploys per domain; routing all shares through `mimi.you/s/:id`; treating Rip as anonymous-only with no studio chamber.

**Why:** Distinct crawl/share URLs and inverted aesthetic without forking the codebase; fish OG must not leak studio chrome in previews.

**Ref:** `lib/siteHost.ts`, `App.tsx` host branches, `scripts/setupMimiFishDomains.mjs`, `scripts/setupMimiRipDomains.mjs`, Lovable parallel project (host routing queued 2026-08-07).

---

## 2026-08-04 — Cursor Cloud secrets → `.env.local` bridge

**Decision:** Cloud Agent installs run `npm run sync:cloud-env`, which copies dashboard-injected secrets (notably `AI_GATEWAY_API_KEY`, alias `AI_GATEWAY_KEY`) into git-ignored `.env.local` so `npm run dev` and verify scripts share the same credentials as the agent shell.

**Alternatives rejected:** Committing keys in `environment.json`; requiring manual `.env.local` copy each session.

**Why:** Cursor secrets are runtime env vars; Mimi loads `.env.local` via dotenv. The bridge keeps dev server terminals and scripts aligned without leaking credentials into the repo.

**Ref:** `scripts/syncCloudAgentEnv.ts`, `.cursor/environment.json`, `AGENTS.md`

---

## 2026-08-04 — Persistent project memory files

**Decision:** Maintain `.cursor/rules/mimi-context.mdc`, `docs/STRATEGY.md`, `docs/STATE.md`, and this file as living project memory. Agents update STATE + DECISIONS after architectural or module-shipping work without asking permission.

**Alternatives rejected:** Ad-hoc handoff docs only; relying on `AGENTS.md` alone for module status.

**Why:** Cloud agents and contributors need accurate, grep-friendly status between sessions.

**Ref:** This change set.

---

## 2026-08-04 — `/studio` primary route is orientation intake (not archival desk)

**Decision:** Mount `StudioOrientationEntry` at `/studio`. Keep `StudioWorktable` only at `/studio/worktable-legacy`, explicitly labeled legacy/experimental. Route-level tests forbid `FIG. 01`, `Spark · Generate`, and the six-folder DESK/SCRY rail on the primary entry.

**Alternatives rejected:** (1) Continue polishing the archival worktable on `/studio` (PR #201 scope). (2) Removing the worktable entirely before migration completes.

**Why:** Product intent is calm orientation + multimodal intake on the primary Studio route; the archival desk remains available for migration without blocking the intake ship. Worktable UX fixes from #201 stay scoped to the legacy route and full console.

**Ref:** PR #191 merged after rebase onto main (#190 Neon spine, #199 docs); PR #201 merged earlier but superseded for `/studio` primary surface.

---

## 2026-08-04 — Lightweight UX research instrumentation (`?research=1`)

**Decision:** Add opt-in session telemetry behind `?research=1` (sticky via `sessionStorage`). Events use schema `{sessionId, taskName, event, elementId, ts}`; capture task start, first meaningful click, dead clicks, time-to-first-action, abandonment, and observer notes. Persist to Firestore `research_sessions` when authenticated; always buffer locally with raw JSON export. Dismissible in-app note widget — no dashboard.

**Alternatives rejected:** (1) Reuse Firebase Analytics / taste_events (consent-gated, wrong schema). (2) Build an admin review dashboard in-app.

**Why:** Facilitates moderated usability studies without polluting production analytics or requiring a separate tool chain.

**Ref:** `lib/researchMode.ts`, `services/researchInstrumentation.ts`, `components/ResearchNoteWidget.tsx`

---

## 2026-08-05 — Studio footnote dock + instrument rail extraction

**Decision:** Extract `StudioInstrumentRail` (scrollable bottom icons) and `StudioFootnoteDock` (Continuum · Pocket · Telemetry mini sheets opened from the footnote emblem). Dedicated icons: pipette = Treatments, repeat loop = Continuum, archive = Pocket. Auto monotonic cover issue index (`SYS // COV-NNN`) on legacy compose console. Zine reader pill toolbar gains COMMENTS + PUBLISH (owner `isPublic` path, distinct from STAGE broadcast).

**Alternatives rejected:** (1) Stuff Continuum/Pocket/Telemetry into a single “card” toolbar icon. (2) Replace Studio OS Map·seal·Find anchors with the instrument rail globally.

**Why:** Matches the elevated-notes mockup: one **floating cylindrical toolbar** scrolls all compose/zine tools inside a single pill — not a modular footnote dock + edge rail.

**Ref:** `components/ui/FloatingCylinderToolbar.tsx`, `components/studio/StudioInstrumentRail.tsx`, `AnalysisDisplay.tsx`

---

## 2026-08-07 — Lovable parallel track phased advisory (menu, toolbar, Tailor, Scry, Press)

**Decision:** Execute product expansion on Lovable project `82416757-f4d9-45c3-9665-4f043ec226e8` in phases: P0 menu + functional Studio toolbar + `/tailor` chamber with generation-contract wiring; P1 Profile/public card + Edit/Pocket/fish-rip; P2 Dolls onboarding + Omni Loop + Mesopic; P3 Scry curiosity profile + Used Context colophon + `/the-press` export chamber. Persist build canon via Lovable `set_project_knowledge`. Track queue status in `docs/STATE.md`.

**Alternatives rejected:** (1) Blocking all Lovable work until queue drains to one message. (2) Requiring Perplexity for Scry v1. (3) Folding Tailor only into `/mimi-you` without dedicated chamber and contract injection.

**Why:** Lovable queue is long but parallel messages preserve phased delivery; production canon (Tailor contract, colophon, Press, Scry lanes) maps cleanly onto TanStack stack; Scry can use existing research.server + credits.

**Ref:** Lovable messages `umsg_01kzetkx9…` (P0), `umsg_01kzetm5…` (P2), `umsg_01kzetrb0…` (P3 Scry/colophon), `umsg_01kzetra4…` (P3 Press); `prd/aesthetic-05-provenance-colophon.md`, `prd/doll-staple-shell.md`

---

## 2026-08-08 — Taste Intelligence Phase 1 (EvidenceAtom spine)

**Decision:** Introduce canonical `EvidenceAtom`, `TasteAssertion`, `TasteConcept`, and computed `TasteState` under `users/{uid}/` Firestore subcollections. Ingest via `POST /api/mimi/evidence` (session-verified) and client `createEvidenceAtom`. Mirror Tailor `EvidenceNode` writes non-blockingly into `evidenceAtoms`. Corrections write `interactionEvents` audit rows. First UI surface: `TasteEvidenceAtomsPanel` on Taste Graph Intel Memo tab.

**Alternatives rejected:** (1) Store taste atoms in Neon on day one — memory approvals live in Neon but taste evidence is still Firebase-scoped in Phase 1. (2) Replace Tailor `EvidenceNode` immediately — bridge only until migration Phase 2.

**Why:** Unifies taste-relevant evidence with explicit source vs inference separation, correction loop, and a single `getTasteState()` interface for generation — without blocking on full Tailor/Pocket migration.

**Ref:** `docs/taste-intelligence-phase1.md`, `lib/taste/`, `services/taste/`, `lib/mimiEvidenceRoute.ts`

---

## 2026-08-08 — Taste Intelligence Phase 1.5 hooks

**Decision:** After evidence ingest, queue server-side interpretation (`queueEvidenceAtomAnalysis`) when AI Gateway is configured. Client creates call `POST /api/mimi/evidence/analyze`. Inject `getServerTastePromptContext()` into `generate-text` and `create-zine` for signed-in users. Expose `GET /api/mimi/taste-state`.

**Alternatives rejected:** (1) Client-only analysis — cannot access Admin Firestore or reliably fund gateway on mirror path. (2) Blocking ingest on analysis — keeps ingest fast; honest pending/failed states in UI.

**Why:** Closes the loop from capture → interpretation → correction → generation without requiring a separate analyze step from the user.

**Ref:** `lib/taste/evidenceAtomAnalysis.ts`, `lib/taste/serverTasteState.ts`, `lib/mimiGenerateTextRoute.ts`

---

## 2026-08-08 — Post-generation Taste Critic evaluates artifact output

**Decision:** Taste Critic runs only after successful Studio zine generation. `GeneratedArtifactForTasteCritique` normalizes zine pages/text/images; deterministic (+ optional Gateway) feature extraction feeds `critiqueAgainstContract`. Source prompt tags are provenance only. Critique persists against real artifact ID, contract ID, snapshot ID, and critic version. Alignment score displays as `N / 100` (model score, not probability).

**Alternatives rejected:** (1) Critique on `isThinking` flip — critiques pre-generation tags, not output. (2) LLM-assigned final score — deterministic critic consumes extracted features; AI only proposes feature claims.

**Why:** Post-generation critique must evaluate what was produced, with honest partial states when imagery cannot be analyzed.

**Ref:** `hooks/useStudioTasteCompiler.ts`, `lib/tasteIntelligence/generatedArtifact.ts`, `lib/tasteIntelligence/extractArtifactFeatures.ts`, `lib/tasteIntelligence/critiqueCandidate.ts`

---

## 2026-08-08 — Mesopic Lens chamber + curiosity tracking (Scry + personal twilight readings)

**Decision:** Ship **Mesopic Lens** (`/mesopic-lens`) as a personal twilight Q&A chamber — profile × celestial calibration × Gemini web grounding, synthesis via AI Gateway. Log questions as **curiosity records** (localStorage + Firestore `users/{uid}/curiosities`) for deterministic pattern reports. Extend **Scry** with the same curiosity chips, web-grounded + celestial-informed reading lane, and pattern panel.

**Alternatives rejected:** Repurposing legacy `/obsidian-mirror` Lyria route (would break existing music chamber); Neon table for curiosity (Firestore matches taste-event patterns and works unsigned with local fallback); collective Observatory Mesopic as the personal oracle (wrong consent/scope).

**Rationale:** Mesopic vision metaphor matches low-light reading honesty; curiosity as a distinct data form enables pattern reports without approving Taste Graph memory. Observatory Mesopic remains collective faint signals only.

**Ref:** `components/chambers/MesopicLensChamber.tsx`, `services/mesopicLensService.ts`, `services/curiosityStore.ts`, `schemas/curiosityContracts.ts`, `lib/curiosity/curiosityAnalytics.ts`, `services/scryService.ts`, `npm run verify:curiosity-tracking`

---

## 2026-08-08 — Studio zine generation: direct engine + layout enhancement

**Decision:** `createZine` no longer runs the editorial issue-plan / proof pipeline (`realizeZineContentFromPlan`). Raw model output is post-processed with `enhanceZineGenerationLayout` — stable page IDs, grammars, and default spread layouts via `buildDefaultSpreadElements`. Hi-fi plate bake develops any page with an `imagePrompt` (no plan slot filter). Proof mode UI removed from zine reveal.

**Alternatives rejected:** (1) Keep issue-plan compression in the generation hot path — added compile/proof complexity without improving first reveal. (2) Delete all plan/proof libraries — retained for legacy artifact hydration and Edit/Press export; not wired into Studio generation.

**Why:** Creators asked for operable generation with better layout, not an extra proof/compile gate before reading the issue.

**Ref:** `lib/zine/enhanceZineGenerationLayout.ts`, `services/zineGenerator.ts`, `lib/bakeZinePlates.ts`, `components/AnalysisDisplay.tsx`

---

## 2026-08-08 — Zines stamp ephemeris-backed celestial calibration

**Decision:** After `createZine` returns model JSON, `applyCelestialToZine` overwrites `celestial_calibration` with authoritative ephemeris data from `astronomy-engine` (already a project dependency). When Celestial Calibration is enabled on the Tailor profile, natal Sun/Moon/Rising (when resolvable) and seasonal alignment are persisted on `content.celestial_readout`. Every issue also records issue-moment sky at composition time.

**Alternatives rejected:** (1) Let the model invent poetic celestial copy — drifts from chamber math. (2) Add a new ephemeris package — `astronomy-engine` + existing `lib/celestial/ephemeris.ts` already cover natal positions.

**Why:** Creators who opt into Celestial Calibration should see their calibrated timing in the finished zine, not only in generation prompts.

**Ref:** `lib/celestial/applyCelestialToZine.ts`, `services/zineGenerator.ts`, `components/AnalysisDisplay.tsx`, `schemas/celestialCalibrationContracts.ts`

---

## 2026-08-08 — Tailor defaults: opt-out, not opt-in

**Decision:** Tailor capabilities default **on**. Celestial Calibration `enabled` defaults to `true` for new and legacy profiles where the flag was never set. Algo Firewall uses `disabledAlgos` (opt-out list); all five algos run until explicitly disabled. Legacy `enabledAlgos` opt-in arrays migrate on read.

**Alternatives rejected:** (1) Keep opt-in toggles — creators had to discover features before zines used them. (2) Force-migrate explicit `enabled: false` saves — respect intentional disables.

**Why:** Studio output should include celestial timing and core algos without a setup gate; users turn off what they don't want.

**Ref:** `lib/tailor/tailorDefaults.ts`, `contexts/UserContext.tsx`, `components/chambers/CelestialCalibrationChamber.tsx`

---

## 2026-08-08 — Editorial calibration plates + public zine refractions

**Decision:** `enhanceZineGenerationLayout` prepends four optional calibration grammars when data exists: `screenwrite` (`screenwrite_excerpt`), `celestial` (`celestial_readout`), `signal-index` (`semiotic_signals`), `sonic` (`sonic_layer`). Reveal renders them via `ZinePageRenderer` in the Visual Plates section; standalone Celestial section is suppressed when a celestial plate is present. Published zines (`isPublic`) show an inline **Refractions** thread at the bottom — text + voice memo comments (`ZineComments` `variant="inline"`). Firestore `zine_comments` reads are public; writes remain auth-gated.

**Alternatives rejected:** (1) Keep celestial/sonic as reveal-only sections — plates make calibration exportable in the flipbook spine. (2) Server comment API in v1 — existing Firestore + Storage path reused with relaxed read rules.

**Why:** Creators asked for screenplay, celestial, sonic, and signal plates in the issue, plus interactive commentary on published shares.

**Ref:** `lib/zine/insertEditorialPlates.ts`, `components/zine/grammars/*`, `components/ZineComments.tsx`, `components/AnalysisDisplay.tsx`, `firestore.rules`

---

## 2026-08-08 — Editorial plate opt-out (Tailor Algo Firewall area)

**Decision:** Calibration plates (`screenwrite`, `celestial`, `signal-index`, `sonic`) default **on**. Profile field `disabledPlates` opts out per plate; UI lives in Tailor **Editorial Plates** field group beside Algo Firewall. Celestial plate also respects `celestialCalibration.enabled` (synced with Celestial chamber “Exclude from zines” and the plate toggle).

**Alternatives rejected:** (1) Per-zine plate picker at generation time — adds friction; Tailor is the right defaults surface. (2) Opt-in plates — inconsistent with algo firewall opt-out model.

**Ref:** `lib/tailor/tailorDefaults.ts`, `lib/zine/insertEditorialPlates.ts`, `components/TailorView.tsx`, `contexts/UserContext.tsx`

---

## 2026-08-08 — Chromatic + owner carousel editorial plates

**Decision:** Add `chromatic` plate (palette from Tailor `chromaticRegistry` + issue `strict_palette`) and `owner-carousel` plate (`owner_plates[]` with text/image slides). Owner edits slides in zine reveal via `ZineOwnerPlatesEditor`; profile `ownerPlateTemplates` seed new issues. Both plates opt-out via `disabledPlates` in Tailor Editorial Plates.

**Ref:** `lib/zine/chromaticPlatePalette.ts`, `components/zine/grammars/ChromaticPlatePage.tsx`, `components/zine/grammars/OwnerCarouselPage.tsx`, `components/ZineOwnerPlatesEditor.tsx`

---

## 2026-08-08 — Owner slide templates UI (Tailor)

**Decision:** Expose `ownerPlateTemplates` in Tailor **Owner Slide Templates** field group (below Editorial Plates). Reuses `ZineOwnerPlatesEditor` with `variant="template"`; `updateOwnerPlateTemplates` persists to `userPreferences` alongside `disabledPlates` / `disabledAlgos`.

**Alternatives rejected:** (1) Templates only editable per-zine in reveal — forces re-entry every issue. (2) Separate template component — duplicates upload/text UX already in `ZineOwnerPlatesEditor`.

**Ref:** `components/TailorView.tsx`, `components/ZineOwnerPlatesEditor.tsx`, `contexts/UserContext.tsx`, `lib/zine/applyEditorialStamps.ts`

---

## 2026-08-08 — Provenance + intake editorial plates (batch)

**Decision:** Add four calibration plates to the editorial stack: `contact-sheet` (intake image grid), `material-specimen` (Tailor materiality), `forecast-drift` (Tailor strategic vectors — not live Forecast chamber demo), and `used-context` (approved atoms as spread). Plate order: contact → screenwrite → chromatic → material → forecast → celestial → signal → used context → sonic → owner. Hide legacy Used Context colophon section when the plate is present.

**Alternatives rejected:** (1) Keep Used Context as footer-only — loses composition grammar. (2) Wire forecast-drift to demonstration MMM fixtures — honest labeling requires Tailor-sourced vectors until Forecast ships live data.

**Ref:** `lib/zine/buildPlateStampData.ts`, `lib/zine/insertEditorialPlates.ts`, `lib/zine/enrichEditorialPlateContent.ts`, `components/zine/grammars/*PlatePage.tsx`

---

## 2026-08-08 — Forecast intake + Apify-backed evidence

**Decision:** Forecast chamber requires lightweight **profile intake** (personal) or **brand intake** (Brand OS scope) before Overview/Content vectors run. Intake persists on `UserProfile.forecastIntake` and drives personalized search queries through existing `/api/you-search` (You.com → Apify `rag-web-browser` → Gateway fallback).

**Alternatives rejected:** (1) Force Tailor/GEO completion first — too heavy for a first forecast read. (2) Duplicate full `BrandIntakeView` inside Forecast — link to full report instead.

**Why:** Makes Forecast operable without full DNA/GEO calibration; brand scope gets real positioning inputs; reuses billable Apify path already wired for search.

**Ref:** `lib/forecastIntake.ts`, `components/forecast/ForecastIntakePanel.tsx`, `components/TheForecast.tsx`, `services/researchService.ts`

---

## 2026-08-08 — Forecast server compose + Residue handoff

**Decision:** Add `POST /api/forecast` to server-compose `ForecastReport` (You.com/Apify evidence + demonstration MMM), persist on `userPreferences.forecastSnapshot`, and surface latest `ResidueForecastArtifact` in `/forecast` Overview and Cultural vectors.

**Alternatives rejected:** (1) Client-only persistence — no cross-device sync. (2) Merging Residue scenarios into collective cultural trajectories — keep namespaces distinct with explicit provenance.

**Why:** Completes the Residue → Forecast handoff; gives signed-in users a durable snapshot without re-fetching on every device.

**Ref:** `lib/forecast/serverComposeForecast.ts`, `lib/forecastRoute.ts`, `api/forecast.ts`, `components/forecast/ForecastResiduePanel.tsx`

---

## 2026-08-08 — Proscenium showcases collective consent on Stage

**Decision:** Stage wing surfaces Mean Median Mode consent states on each transmission (`ProsceniumContributionBadge`) and a collective brief panel with Observatory / MMM handoffs (`ProsceniumCollectiveBrief`). Local Echoes demo specimens illustrate contributing, staged-only, and withdrawn states — never mixed into live counts.

**Why:** Collective intelligence consent shipped in Pocket / ZineCard / AnalysisDisplay but Proscenium had no visible readout of what staging means for Observatory aggregates.

**Ref:** `components/proscenium/ProsceniumContributionBadge.tsx`, `components/proscenium/ProsceniumCollectiveBrief.tsx`, `components/ProsceniumView.tsx`


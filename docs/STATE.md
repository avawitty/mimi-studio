# Mimi Studio — Module State

**Last updated:** 2026-08-08  
**Source of truth for routes:** `lib/productCanon.ts` · **Validation:** `npm run validate:canon`

## Status legend

| Status | Meaning |
| --- | --- |
| **shipped** | Live route + component; primary job uses real persistence or deterministic logic |
| **partial** | Live but incomplete handoffs, prototype maturity, hardening in progress, or key paths key-gated |
| **stub** | Mock, hardcoded, or demonstration fixtures are the **default** path for core outputs (must be labeled in UI) |

---

## Core loop

| Module | Route | Status | Known debt | Next action |
| --- | --- | --- | --- | --- |
| **Scribe** | `/scribe` | shipped | ResearchMemory nested in Atomize tab | Mobile density pass on long capture sessions |
| **Tailor** | `/tailor` | shipped | Style Lab / Diagnostics aliased routes; **Owner Slide Templates** UI; 10 editorial calibration plates (incl. Used Context, contact sheet, material specimen, forecast drift); evidence intake **local-first** (IndexedDB blobs + `tailorLocalArchive` when Firestore quota/offline); Let Mimi Read You flow simplified | Wire Doll ↔ Rip handoff CTAs (`prd/chamber-loop-…`) |
| **Studio (orientation intake)** | `/studio` | shipped | Imagen-first toolbar (Stock / References toggles); inspo carousel + “Publish my rendition”; Unsplash via `/api/inspo/search`; Pinterest board import | Promote compose shell (instrument rail + footnote dock) from legacy console after intake |
| **Studio (compose console)** | `/studio?console=1` | **partial** | Unified floating pill toolbar + Tools drawer (Anchors, Continuum, Treatments, Context, noise); compact cover colophon; funded gateway patron/trial credit heal; `InputStudio` escape hatch from orientation; legacy archival desk at `/studio/worktable-legacy` | Live telemetry beyond decorative dash; promote instrument rail + footnote dock post-intake without full console density on primary route |
| **The Edit** | `/the-edit` | partial | **stub:** `MOCK_PRODUCTS` in commerce/Forecast panel via `commerceService` | Replace mock catalog with live product docs or Shopify search |
| **The Press** | `/the-press` | shipped | Release history is artifact-derived until server audit log | Wire analytics provider for Performance tab; Export Chamber wired from Publisher Console destinations |
| **Pocket** | `/pocket` | shipped | Ghost IndexedDB vs Firestore sync edge cases | Continue Sovereign mirror when online |
| **The Stand** | `/stand` | partial | Sovereign Floor preferred but Firestore fallback remains | Finish Stand/Floor/Mine ownership clarity (Update 21 open items) |
| **Taste Signature** | `/signature` | shipped | Expanded reading; **approved** (memory) vs **published** (public snapshot) split; public `/u/:handle/signature` reads published snapshot only; incremental evidence patch | Publish/unpublish UX polish |
| **Taste Graph** | `/taste-graph` | partial | Summary API + trajectory/tensions; Phase 1 `EvidenceAtom` layer + correction UI; embedding centroid; Studio/Scry auto-embed; ingest mirrors + Used Context conflict UI | Ops backfill/analyze scripts; shadow audit after Gateway model bumps |
| **Computational Taste Model** | — (derived) | **shipped** | Snapshot embedding centroid + blended candidate scoring (label + cosine); server-side recompile on ingest | Embedding space migrations on model change |
| **Taste Intelligence (EvidenceAtom)** | — | partial | Pocket + Scribe + Floor + Darkroom mirrors; embed on analyze; Used Context merge hydrate; legacy graph coexists | Semantic retrieval (#223) |
| **Taste Intelligence OS v2** | `/tailor/calibrate` | **partial** | Calibration Lab + Neon APIs; Pocket why-saved sheet shipped (queued multi-upload, per-hypothesis review, a11y); negative taste + graph editing with deterministic single-edit undo + replay; Scry rerank; Studio compiler + **post-generation critic** (artifact feature extraction → contract critique on reveal); Tailor v2 contract reconciliation | merge/split graph ops; embedding similarity in critic score |

---

## Intelligence & evidence

| Module | Route | Status | Known debt | Next action |
| --- | --- | --- | --- | --- |
| **Scry** | `/scry` | shipped | Curiosity records (local + Firestore); readings ground on profile + celestial + web; unified retrieval service still deferred | Keep lane honesty + curiosity `verify:curiosity-tracking` |
| **Mesopic Lens** | `/mesopic-lens` | **shipped** | Personal twilight Q&A; scrollable void shell; curiosity pattern reports | Celestial handoff when calibration inactive |
| **IntelHub** | `/intelhub` | shipped | Does not publish directly | Document Press handoff in chamber empty states |
| **GeoEngine** | `/geoengine` | shipped | Opt-in location only | — |
| **Residue** | `/residue` | partial | Offline heuristics first; live Apify acquisition token-gated | Phase 9 acquisition UX + adapter handoffs to Edit/Forecast |
| **Observatory** | `/observatory` | **partial** | Live MMM + Mesopic API, cycle notes, window selector (7–90d), in-chamber withdraw | Mesopic promotion rules tuning; cycle inference calibration |
| **Mean Median Mode** | `/mean-median-mode` | **partial** | In-chamber segment (same shell as Observatory) | Route alias only — no separate UI fork |
| **Forecast** | `/forecast` | partial | Intake + Apify queries + **POST /api/forecast** snapshot + Residue artifact panel; cultural vector uses **live** MMM API (empty when no corpus) | Remove residual costume metrics; approved RSS ingest |
| **Celestial Calibration** | `/celestial-calibration` | shipped | Place autocomplete + autosave; rising/houses need time + geocoded place | — |
| **Oracle** | `/oracle` | **partial** | Cyberdeck voice overlay shipped; chamber reports + theme analysis now local-first (`oracleChamberService`); not in `CANON_MODULES` yet; celestial readings ephemeral | Register in canon; optional Neon sync for cross-device reports |

---

## Production & library

| Module | Route | Status | Known debt | Next action |
| --- | --- | --- | --- | --- |
| **Mood Board** | `/moodboard` | shipped | Legacy `/dossier` alias | — |
| **Darkroom** | `/darkroom` | shipped | Generation requires Gateway/Gemini keys | — |
| **The House** | `/house` | shipped | Local-first (`mimi.studio.v2`) | — |
| **Private Studio** | `/private-studio` | shipped | Legacy `/case-study` alias | — |
| **Wardrobe** | `/wardrobe` | shipped | — | — |
| **Thimble** | `/thimble` | shipped | Marketplace links are outbound framing, not live inventory API | — |
| **Sanctuary** | `/sanctuary` | shipped | Local-only boundary | — |
| **The Ward** | `/ward` | shipped | — | — |
| **Atelier** | `/atelier` | shipped | Soft cap 40 objects | Verify Shopify touchpoint metadata path |
| **The Proscenium** | `/proscenium` | **partial** | Stage shows consent badges + Observatory handoff; Local Echoes demo specimens illustrate MMM states | Live transmission corpus still thin without signed-in staging |
| **Studio Map** | `/chamber-map` | shipped | — | — |
| **Codex** | `/codex` | shipped | — | — |

---

## Identity mirror

| Module | Route | Status | Known debt | Next action |
| --- | --- | --- | --- | --- |
| **Mimi Dolls** | `/mimi-dolls` | partial | Omni Loop onboarding + time-travel scenes shipped; Rip uses `dolls[0]` only | Rip CTA; cross-user public scene feed |
| **mimi.rip** | `/rip` | shipped | Deterministic inverse read (v0, no AI enrichment) | Public OG via server HTML on publish routes |
| **Aesthetic Intelligence** | `/aesthetic-intelligence` | shipped | Aliased → `/tailor/diagnostics` | — |
| **Art Style Scryer** | `/art-style` | shipped | Aliased → `/tailor/style-lab` | — |

---

## Infrastructure (not chamber routes)

| Module | Status | Known debt | Next action |
| --- | --- | --- | --- |
| **Sovereign data plane** | partial | `hardening` in canon; Vercel needs Postgres URL | Neon path + SSE on long-lived host |
| **Sovereign search** | shipped | Reindex ops (`npm run sovereign:reindex`) | — |
| **AI Gateway embeddings** | shipped | Model catalog drift | Re-verify against `https://ai-gateway.vercel.sh/v1/models` on bumps |
| **AI Gateway TTS + live** | shipped | Gateway realtime visualizer uses output bus (no analyser tap yet) | Re-verify `AI_GATEWAY_TTS_MODEL` / `AI_GATEWAY_LIVE_MODEL` on catalog bumps |
| **Shadow memory migration** | shipped | UID-gated reindex | — |
| **Gateway entitlements** | shipped | Stripe + promo paths | — |
| **Serverless lazy graphs** | shipped | CI: `verify:api-lazy-graphs` | — |
| **Taste Intelligence (Phase 1)** | infrastructure | Analysis queue on ingest; `GET /api/mimi/taste-state`; taste context in generate-text + create-zine | Pocket mirror; embed pipeline |
| **Taste Corpus explorer** | `/taste-corpus` | shipped | Demonstration seed manifest (20 specimens) | Wire `--from-sovereign` export; expand corpus from Floor covers |
| **Public face kit** | — | shipped | `PublicField` + `isPublicEditorialFlowMode` single-scroll contract | Audit remaining dark-plate chambers for nested scroll only if reported |
| **Mobile shell contract** | — | partial | `lib/mobileShell.ts` quiet chrome + flat rows; Scribe + Codex migrated | Roll flat mobile pattern to House, Oracle, Intel Hub |

---

## Public / infrastructure routes

| Route / host | Status | Notes |
| --- | --- | --- |
| `mimi.you` (skin `you`) | shipped | Full app; canonical identity |
| `mimi.fish` (skin `fish`) | partial | Share plates + creator shelf; domains attached — run `setup:mimi-fish-domains` for Firebase Auth |
| `mimi.rip` (skin `rip`) | partial | Inverse public plates + `/rip` chamber; domains attached — run `setup:mimi-rip-domains` |
| `/u/:handle` | shipped | `PublicProfileCard` + compact directory tiles + OG + external links; public doll/profile cards (skin selects rip/fish/you variant on host) |
| `/s/:zineId` | shipped | **Server-side OG injection** (`server.ts`); canonical share origin `mimi.fish`; inline **Refractions** (text + voice) on published issues |
| `/u/:handle/feed.xml` | shipped | Keep Tabs RSS |
| `/api/feed` | shipped | Creator feed API |

---

## Stub & mock inventory (flagged)

| Location | What | Impact |
| --- | --- | --- |
| `services/commerceService.ts` | `MOCK_PRODUCTS` + mock vector search | The Edit commerce / personalized edit panels |
| `functions/src/commerceService.ts` | Duplicate `MOCK_PRODUCTS` | Firebase functions path |
| `components/TheEdit.tsx` | Resolves product cards from `MOCK_PRODUCTS` | Forecast/commerce UI |
| `services/tailorMockAnalyzer.ts` | `runMockTailorAnalysis` / `createMockTailorAnalysisOutput` | **Unused in app** — dead stub path; remove or gate behind explicit dev flag |
| `services/collective/loadMeanMedianModeReport.ts` | Sync `demonstration` / `empty` for tests & opt-in preview | verify scripts, Observatory demo toggle |
| `services/collective/loadMesopicReport.ts` | Default `"demonstration"` source | Observatory Mesopic lens |
| `fixtures/collective/demo*.ts` | Labeled demo reports | Collective intelligence offline review |
| `components/ProsceniumView.tsx` | `mock_1`…`mock_3` transmissions | Local Echoes demo specimens |
| `components/chambers/ObservatoryChamber.tsx` | Live API fetch + opt-in demo | Collective UI default |
| `services/geminiClient.ts` | `mockAi` object when keys absent | Test/dev fallback only — must not surface as live output |

---

## Cross-cutting debt

1. **Perception loop handoffs** — Observatory → Forecast → Edit not fully wired; Forecast intake, server snapshot, and Residue panel shipped; live collective MMM still demonstration.
2. **Identity loop handoffs** — Dolls ↔ Rip ↔ Tailor CTAs incomplete; Rip reads first doll only.
3. **Demonstration labeling** — Collective modules label demos; commerce mock catalog does not yet say "demonstration".
4. **Font stack drift** — Shell uses Geist Variable; house style names DM Sans — converge on tokens in new UI.
5. **Research instrumentation** — `?research=1` + optional `?task=` enables session event logger (`research_sessions` Firestore + local JSON export); no dashboard.
5. **Server-visible HTML** — Only `/s/:zineId` has rich injection today; new public routes must follow the same Express pattern (see `.cursor/rules/mimi-context.mdc`).

---

## Verification commands

```bash
npm run validate:canon
npm run verify:used-context
npm run verify:collective
npm run verify:residue
npm run review:mobile                    # dev server on :3000
npm run build
```

When status changes, update this file and append rationale to [`DECISIONS.md`](./DECISIONS.md).

---

## Lovable parallel track (Mimi Studios)

**Project:** `82416757-f4d9-45c3-9665-4f043ec226e8` · TanStack Start + Supabase (not production Express host).  
**Preview:** `https://id-preview--82416757-f4d9-45c3-9665-4f043ec226e8.lovable.app`

| Phase | Scope | Status |
| --- | --- | --- |
| P0 | Unified menu, Studio toolbar instruments, `/tailor` + contract wiring, `/scry` + `/mesopic` stubs | **queued** (Lovable build queue) |
| P1 | Profile identity + `/u/$handle`, Pocket polish, The Edit chamber, fish/rip hosts | **queued** |
| P2 | Dolls onboarding (avatar + refs), Omni Loop layout, Mesopic full reading | **partial** — Omni Loop onboarding + time-travel in production Express; Mesopic Lens chamber shipped (#251) |
| P3 | Scry curiosity loop + `curiosity_events`, Used Context colophon (PRD-05), `/the-press` export chamber | **shipped** — curiosity records + pattern reports in Mesopic Lens + Scry (`verify:curiosity-tracking`); Export Chamber opens from The Press destinations with PDF/ZIP/Shopify export + publish consent |
| P4a | Workflow bar wired to issue pipeline (COLLECT→SAVE) | **queued** |
| P4b | Registry completion + handoff chips + chamber map | **queued** |
| P4c | Identity strip (Dolls↔Rip↔Tailor), Rip doll picker | **queued** |
| P4d | Observatory + Forecast perception loop (honest demo) | **queued** |
| P5 | Darkroom: Pinterest board + multi-image extract + `imageEditingRules` / `applicationLogic` | **queued** |
| P5b | Thimble / Brief / Darkroom Studio handoffs | **queued** |
| P5c | Aesthetic entry plates + mobile Studio layout | **queued** |
| P6 | Unified `instrument-query-panel` (Intel/Scry/Mesopic/Oracle) | **partial** — Mesopic Lens chamber shipped; panel unification still queued |
| **Platform** | Lovable Cloud + Lovable AI as default stack; migrate AI to edge fns | **queued** |
| **Refactor** | Align P0–P6 AI paths with Lovable AI + Cloud (no BYOK /api) | **queued** |
| P7 | Scribe, Stand, Signature, Residue/Proscenium stubs, Find anchor, OG/RSS, notifications | **queued** |

Project + workspace knowledge on Lovable encodes Cloud/AI platform rules and product canon. Production `mimi.you` remains separate (Express/Firebase/Neon); merge or port after Lovable phases land.

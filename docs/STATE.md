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
| **Tailor** | `/tailor` | shipped | Style Lab / Diagnostics aliased routes | Wire Doll ↔ Rip handoff CTAs (`prd/chamber-loop-…`) |
| **Studio (orientation intake)** | `/studio` | shipped | Imagen-first toolbar (Stock / References toggles); inspo carousel + “Publish my rendition”; Unsplash via `/api/inspo/search`; Pinterest board import; proof-mode stock swap | Promote compose shell (instrument rail + footnote dock) from legacy console after intake |
| **Studio (compose console)** | `/studio/worktable-legacy` | partial | Extracted `StudioInstrumentRail`, footnote dock (Continuum · Pocket · Telemetry), polaroid media bar, auto cover index; spectrogram reverse-transcribe not wired | Mount post-intake on `/studio`; live telemetry beyond decorative dash |
| **The Edit** | `/the-edit` | partial | **stub:** `MOCK_PRODUCTS` in commerce/Forecast panel via `commerceService` | Replace mock catalog with live product docs or Shopify search |
| **The Press** | `/the-press` | shipped | Release history is artifact-derived until server audit log | Wire analytics provider for Performance tab |
| **Pocket** | `/pocket` | shipped | Ghost IndexedDB vs Firestore sync edge cases | Continue Sovereign mirror when online |
| **The Stand** | `/stand` | partial | Sovereign Floor preferred but Firestore fallback remains | Finish Stand/Floor/Mine ownership clarity (Update 21 open items) |
| **Taste Signature** | `/signature` | shipped | — | Public-face mobile review after chrome changes |
| **Taste Graph** | `/taste-graph` | partial | Phase 1 `EvidenceAtom` layer + correction UI; computational model (#224) inspector wired | Wire embedding similarity into candidate score; complete atom migration |
| **Computational Taste Model** | — (derived) | **shipped** | MVP compiler + scoring; no embedding similarity in candidate score yet | Server-side recompile trigger; atom bridge completion |
| **Taste Intelligence (EvidenceAtom)** | — | partial | Analysis pipeline + TasteState; legacy graph coexists | Semantic retrieval (#223); embedding backfill |

---

## Intelligence & evidence

| Module | Route | Status | Known debt | Next action |
| --- | --- | --- | --- | --- |
| **Scry** | `/scry` | shipped | Unified retrieval service deferred | Keep lane honesty tests in `verify:*` scripts |
| **IntelHub** | `/intelhub` | shipped | Does not publish directly | Document Press handoff in chamber empty states |
| **GeoEngine** | `/geoengine` | shipped | Opt-in location only | — |
| **Residue** | `/residue` | partial | Offline heuristics first; live Apify acquisition token-gated | Phase 9 acquisition UX + adapter handoffs to Edit/Forecast |
| **Observatory** | `/observatory` | **stub** | **Default `loadMeanMedianModeReport("demonstration")`** + demo Mesopic | Live aggregates gated on Proscenium consent pipeline |
| **Mean Median Mode** | `/mean-median-mode` | **stub** | Same demonstration fixture as Observatory | Collapse or differentiate from Observatory overview |
| **Forecast** | `/forecast` | partial | Observed panel uses **demonstration** MMM; content vectors key-gated | Remove any residual costume metrics; add Forecast to menu (`prd/chamber-loop-…`) |
| **Celestial Calibration** | `/celestial-calibration` | shipped | Rising/houses need time + geocoded place | — |

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
| **The Proscenium** | `/proscenium` | **stub** | **`mock_1`…`mock_3` Local Echoes** hardcoded in `ProsceniumView` | Replace demo specimens with consented live transmissions or honest empty |
| **Studio Map** | `/chamber-map` | shipped | — | — |
| **Codex** | `/codex` | shipped | — | — |

---

## Identity mirror

| Module | Route | Status | Known debt | Next action |
| --- | --- | --- | --- | --- |
| **Mimi Dolls** | `/mimi-dolls` | partial | Shell-first shipped; **scenario projection deferred**; Rip uses `dolls[0]` only | Add Rip CTA; doll picker for Rip input |
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
| **Shadow memory migration** | shipped | UID-gated reindex | — |
| **Gateway entitlements** | shipped | Stripe + promo paths | — |
| **Serverless lazy graphs** | shipped | CI: `verify:api-lazy-graphs` | — |
| **Taste Intelligence (Phase 1–2)** | infrastructure | Pocket mirror; embed pipeline; taste in dossier + zine bake | Semantic retrieval from `embeddingRef`; deprecate duplicate EvidenceNode reads |
| **Taste Corpus explorer** | `/taste-corpus` | shipped | Demonstration seed manifest (20 specimens) | Wire `--from-sovereign` export; expand corpus from Floor covers |
| **Public face kit** | — | shipped | `PublicField` + `isPublicEditorialFlowMode` single-scroll contract | Audit remaining dark-plate chambers for nested scroll only if reported |

---

## Public / infrastructure routes

| Route | Status | Notes |
| --- | --- | --- |
| `/u/:handle` | shipped | Public doll/profile cards |
| `/s/:zineId` | shipped | **Server-side OG injection** (`server.ts`) |
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
| `services/collective/loadMeanMedianModeReport.ts` | Default `"demonstration"` source | Observatory, Forecast observed panel |
| `services/collective/loadMesopicReport.ts` | Default `"demonstration"` source | Observatory Mesopic lens |
| `fixtures/collective/demo*.ts` | Labeled demo reports | Collective intelligence offline review |
| `components/ProsceniumView.tsx` | `mock_1`…`mock_3` transmissions | Local Echoes demo specimens |
| `components/chambers/ObservatoryChamber.tsx` | Loads demonstration reports on mount | Collective UI default |
| `services/geminiClient.ts` | `mockAi` object when keys absent | Test/dev fallback only — must not surface as live output |

---

## Cross-cutting debt

1. **Perception loop handoffs** — Observatory → Forecast → Edit not fully wired; Forecast missing from live menu (see `prd/chamber-loop-forecast-observatory-rip-dolls.md`).
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

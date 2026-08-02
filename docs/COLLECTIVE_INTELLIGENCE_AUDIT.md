# COLLECTIVE INTELLIGENCE — Phase 1 Repository Audit

**Status:** Complete — planning only; no production collective-intelligence code yet  
**Date:** 2026-08-02  
**Scope:** Inspect Mimi Studio for Mean Median Mode / Observatory readiness; separate Residue per-run MMM from collective MMM; surface consent, Forecast, and naming gaps  
**Source of truth:** `docs/CURSOR_HANDOFF_COLLECTIVE_INTELLIGENCE.md`  
**Companion plans:** `docs/COLLECTIVE_INTELLIGENCE_SPEC.md`, `docs/mmm-chamber-implementation-plan.md`

---

## Verdict

Collective **Mean Median Mode** and **The Observatory** are **spec-only**. What ships today is:

1. **Residue per-run MMM** — real literal + interpretive analysis over a single Cultural/Emotional run (`/residue` → M/M/M tab).
2. **Simulated Forecast** — UI spine exists; research payloads and drift are costume.
3. **Proscenium publish without MMM consent** — `isPublic` / `public_transmissions` write with no disclosure that structure may enter collective stats.
4. **“Social Floor” / “Community Floor” leftovers** — legal and layout naming that claim anonymized trends the collective pipeline does not implement.

Phases 1–8 of the collective-intelligence handoff are **not started** in code (this audit completes Phase 1 docs).

---

## 1. Repository findings

### 1.1 Two different “MMM” products (do not merge)

| Product | Scope | Contract | Status |
| --- | --- | --- | --- |
| **Residue M/M/M** | One residue run | `MeanMedianModeResult` — narrative mean/median/mode + optional literal numerics | **Shipped** (Phases 5 + 8 of Residue) |
| **Collective Mean Median Mode** | Consent-gated public signals over a time window | `CentralTendencyProfile` — numeric mean/median/mode + summation diagnostics | **Spec only** |

Namespaces must stay distinct. Canon today aliases Residue as `"MMM"` (`lib/productCanon.ts`), and nav keywords `"mean median mode"` / `"mmm"` route to **Residue**. Collective work must register **separate** canon/nav entries and must not reuse Residue’s `mmm` tab as the collective dashboard.

### 1.2 Residue per-run MMM (exists — sibling, not substitute)

| Layer | Path |
| --- | --- |
| Helpers | `services/residue/shared/meanMedianMode.ts` |
| Adapter | `services/residue/adapters/meanMedianModeAdapter.ts` |
| Schema | `services/residue/validation.ts` → `meanMedianModeResultSchema` |
| UI | `components/residue/ResiduePanels.tsx` (`ResidueMmmPanel`) |
| Chamber | `components/chambers/ResidueChamber.tsx` (result tab `mmm`) |
| Contract copy | `lib/residueChamberContract.ts` — tab label `"Mean / Median / Mode"` |
| Verify | `npm run verify:residue` |
| Route / canon | `/residue`; aliases include `"MMM"` |

Optional cross-link later: “Per-run analysis lives in Residue” from Observatory — never the reverse (Residue is not the collective readout).

### 1.3 Collective MMM / The Observatory (absent)

| Expected | Status |
| --- | --- |
| Routes `/observatory`, `/mean-median-mode` | **None** |
| Chamber components | **None** |
| `CentralTendencyProfile`, `CollectiveSignal`, `MeanMedianModeReport`, `MesopicFinding`, `ContributionReceipt`, `ProsceniumPublishConsent` | **Zero** TypeScript hits (handoff only) |
| `docs/COLLECTIVE_INTELLIGENCE_AUDIT.md` / `_SPEC.md` | Audit = this doc; Spec = companion |
| Firestore collections for signals / aggregates / receipts | **None** in `firestore.rules` |
| Mesopic Lens / Starry-Eyed / Shadow Fields (collective) | **None** (unrelated “mesopic” copy exists in Lens / Obsidian Mirror / prompts) |

**Collective Moods:** rename exists only in the handoff. No UI/service uses that label. Practical leftovers are **Social Floor** and **Community Floor**.

### 1.4 Forecast (spine yes, evidence no)

| Piece | Path | Reality |
| --- | --- | --- |
| UI | `components/TheForecast.tsx` | Scopes personal/company; vectors overview/content/culture |
| Adapter | `services/researchService.ts` | `fetchContentForecast` → **always simulated** payloads keyed by whether an API key exists |
| Route | `App.tsx` → `viewMode === "forecast"` → `/forecast` | Live |
| Main menu | `components/navigationConfig.ts` | **No Forecast entry** |
| Legacy top nav | `components/TopNavigation.tsx` | Forecast under System |
| Canon | `lib/productCanon.ts` | **No Forecast module** |
| Residue handoff | `lib/residueChamberContract.ts` | Can navigate to `forecast` |

Costume behaviors still present:

- Drift Probability fallback: `Math.random()` in `TheForecast.tsx`
- Culture vector: hard-coded “Post-Authenticity” / “Memetic Velocity: High”
- Content vector: mock `ResearchSynthesisResponse` with invented scores / credibility URLs

**RSS today:** creator Keep Tabs (`/api/feed`, `/u/:handle/feed.xml`, `lib/rssFeed.ts`) — **not** the approved-feed freshness spine for Forecast (handoff Phase 7).

Residue’s own `forecastAdapter.ts` emits **per-run scenario proposals** — distinct from collective Forecast baselines.

### 1.5 Proscenium publish path & consent

| Path | Behavior | MMM consent? |
| --- | --- | --- |
| `ZineCard.handlePublishToggle` | One-click `isPublic` + toast “Zine Published to Press.” | **No** |
| `firebaseUtils.saveZineToProfile` when `isPublic` | Also writes `public_transmissions` | **No** |
| `AnalysisDisplay` broadcast | `addDoc(public_transmissions)` → “Manifest Broadcasted to Proscenium.” | **No** |
| `Pocket.tsx` | Can write `public_transmissions` | **No** |
| `ProsceniumView` | Reads stage; demo specimens labeled; witness / vibe notes | Consume-side only |

Types: `ZineMetadata.isPublic` / `publishedAt` only. No `contributeToMeanMedianMode`, disclosure version, or contribution receipt.

Firestore: `zines` (public read if `isPublic`), `public_transmissions` (public read, auth create). No collective-signal collections.

### 1.6 Legal / nav / naming adjacency

| Surface | Content |
| --- | --- |
| `components/LegalOverlay.tsx` | **“Swan Persistence & The Social Floor”** — anonymized trends from embeddings/vectors |
| `lib/legalContent.ts` | Full privacy/terms; **no** Social Floor / MMM / Observatory language |
| `ZineCard` `isSocialFloor?` | Layout flag (wider card); used by `CliqueRadar.tsx` |
| `TopNavigation` Nebula note | **“Community Floor”** |
| Proscenium | Live chamber `/proscenium` (+ wings); e2e `e2e/proscenium.spec.ts` |
| Observatory / collective MMM | Not in nav, canon, or Guide as chambers |

Nav keyword collision:

```
navigationConfig.ts → Residue keywords include "mean median mode", "mmm"
productCanon.ts → Residue aliases include "MMM"
```

### 1.7 Public artifact / signal substrates (usable later)

| Substrate | Notes |
| --- | --- |
| Public zines (`isPublic`) | Primary consent-gated candidate once disclosure lands |
| `public_transmissions` | Proscenium stage documents |
| Tags / motifs on zines | Partial structure; no canonical signal taxonomy yet |
| Scry / Tailor / private memory | **Must stay excluded by default** |
| Residue runs | Private / session by default — **not** collective inputs |

### 1.8 Charts / verification patterns to reuse

| Asset | Use |
| --- | --- |
| `recharts` / `d3` | Bind only to real series or empty states — no decorative “live” bars |
| `npm run verify:residue` | Pattern for `verify:collective` |
| `schemas/scryContracts.ts` | Pattern for Zod collective contracts |
| ChamberShell / ArchiveChamberShell | Observatory shell should match house plate language |
| Playwright Proscenium specs | Extend for publish disclosure |

---

## 2. Gaps vs handoff phases

| Phase | Expected | Gap |
| --- | --- | --- |
| **1 Audit** | This document | **Done** |
| **2 Spec** | `docs/COLLECTIVE_INTELLIGENCE_SPEC.md` | Companion doc |
| **3 Contracts** | Zod: `CentralTendencyProfile`, `CollectiveSignal`, … | Missing |
| **4 Vertical slice** | public zine → consent → signals → aggregate → receipt | Missing end-to-end |
| **5 MMM prototype** | Read-only dashboard from real (or labeled demo) aggregates | Missing UI/route |
| **6 Mesopic Lens** | Weak-signal UI | Missing |
| **7 RSS freshness** | Approved feeds → server fetch → Forecast spine | Missing |
| **8 Forecast repair** | Live provider + MMM baselines + `ForecastReport` | Still simulated |

Also absent from the finishing-prompt suite (out of MMM chamber scope unless pulled in): `FUNCTIONALITY_REGISTRY.md`, `FORECAST_METRIC_DICTIONARY.md`, `PROSCENIUM_INTEGRITY_AUDIT.md`.

---

## 3. Risks and gaps (planning-critical)

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| **Naming collision: Residue MMM vs collective MMM** | Canon/nav already send “MMM” to Residue | Separate canon ids; Residue alias stays “Residue M/M/M” or keep `"MMM"` only on Residue with Observatory using full **Mean Median Mode**; Guide must disambiguate |
| **Silent publish = false consent** | Handoff locks Proscenium publish as the consent moment | Confirm modal + `ProsceniumPublishConsent` before contribution |
| **Legal/product vocabulary drift** | “Social Floor” claims trends that do not exist | Rename/redirect to Mean Median Mode / Observatory; align `legalContent.ts` |
| **Fake / costume stats** | Forecast random drift, mock research, Nebula “Community Floor” | Never present costume as Observatory telemetry; empty/insufficient states |
| **Privacy / deanonymization** | Sparse public corpus + exact contributor counts | Contributor bands; sensitivity filters; suppress below thresholds |
| **Mixing demo + live** | Proscenium demos labeled; Forecast mocks often not | Demo fixtures must say **demonstration only** |
| **Scope creep via Residue adapters** | Residue forecast/MMM are per-run proposals | Do not feed Residue results into collective aggregates without consent + central-tendency contract |
| **RSS confusion** | Keep Tabs ≠ Phase 7 approved feeds | Separate types and APIs |
| **Mesopic naming collision** | `TheLens` “Mesopic” ≠ Observatory Mesopic Lens | Full title **Mesopic Lens** under Observatory only |

---

## 4. Proposed architecture (summary)

```
Public artifact
→ Proscenium publish confirm (consent + contributeToMeanMedianMode)
→ Signal extraction (topic / motif / inquiry / form) + sensitivity filter
→ Anonymized CollectiveSignal docs
→ Windowed aggregation → CentralTendencyProfile[]
→ Mean Median Mode chamber (present atmosphere)
→ (later) Mesopic Lens ← low-volume candidates
→ (later) Forecast ← MMM baselines + live research + RSS
→ The Observatory preserves the longer record
```

Parent chamber: **The Observatory**  
Primary dashboard child: **Mean Median Mode**  
Sibling children (later): Mesopic Lens, Forecast (Forecast UI already exists at `/forecast` — Observatory links; does not absorb research APIs into MMM).

Full architecture, data model, privacy, IA, and file plan: see Spec + Implementation Plan.

---

## 5. Exact file plan (create / change)

### Create (Phases 2–5 vertical slice)

| Candidate | Purpose |
| --- | --- |
| `docs/COLLECTIVE_INTELLIGENCE_SPEC.md` | Phase 2 product/engineering spec |
| `docs/mmm-chamber-implementation-plan.md` | Sequenced MMM chamber build plan |
| `schemas/collectiveIntelligenceContracts.ts` | Zod contracts |
| `services/collective/` | Extract, aggregate, contribute, methodology |
| `components/chambers/ObservatoryChamber.tsx` | Parent shell |
| `components/observatory/MeanMedianModePanel.tsx` (+ methodology / empty states) | Required M/M/M + summation strip |
| `components/proscenium/ProsceniumPublishConsentModal.tsx` | Stage + contribute disclosure |
| `scripts/verifyCollectiveIntelligence.ts` | Consent, thresholds, insufficient_evidence |
| `e2e/observatory.spec.ts` / extend `e2e/proscenium.spec.ts` | Smoke + publish disclosure |
| Optional `fixtures/collective/` | Labeled demonstration aggregates |

### Change

| File | Change |
| --- | --- |
| `App.tsx` | Routes: `observatory`, `mean-median-mode` |
| `lib/productCanon.ts` | Observatory + Mean Median Mode modules; **do not** alias collective MMM to Residue `"MMM"` |
| `components/navigationConfig.ts` | Observatory / Mean Median Mode; Residue keywords stay Residue-scoped |
| `components/GuideModal.tsx` | Disambiguate Residue M/M/M vs collective Mean Median Mode |
| `components/LegalOverlay.tsx` (+ `lib/legalContent.ts`) | Social Floor → Mean Median Mode / Observatory |
| `components/ZineCard.tsx` | Confirm modal; persist consent; toast staged + contributing |
| `services/firebaseUtils.ts`, broadcast paths | Same consent gate on all public/transmission writes |
| `types.ts` | Thin pointers or side-doc fields for consent |
| `firestore.rules` (+ indexes) | Signals / aggregates / receipts; no low-volume client deanonymization |
| `package.json` | `verify:collective` |

Phase 8 (later): `services/researchService.ts`, `components/TheForecast.tsx` — live provider + consume MMM baselines.

---

## 6. Migration plan (high level)

1. **Docs first** (this audit + spec + chamber plan) — no runtime change.
2. **Contracts** — Zod only; no UI.
3. **Consent on publish** — opt-in contribution flag; default true only after disclosure acknowledgment; no aggregation until extractors exist (flag may be inert but persisted).
4. **Offline / fixture MMM chamber** — labeled demo profiles OR empty `insufficient_evidence` until live corpus exists.
5. **Live extract → aggregate** — once public consented artifacts exist.
6. **Legal / nav rename** — Social Floor → Mean Median Mode in the same PR wave as chamber registration.
7. **Forecast consumption** — only after Phase 5 produces real `CentralTendencyProfile[]`.

Frozen historical reports: define policy before deleting aggregates (handoff: unpublish stops *future* contribution; frozen windows may retain anonymized aggregates already computed).

---

## 7. Test plan (acceptance seeds)

- Private / no-consent zines never aggregate
- Publish without disclosure acknowledgment does not set contribution flag
- Default publish confirm (`contributeToMeanMedianMode=true`) creates a contribution receipt
- Advanced opt-out stages publicly without aggregating
- Unpublish stops future contribution
- Sensitive signals removed; low-volume suppressed
- Mean, median, mode from the same windowed sample and unit basis
- Spike-driven when mean substantially exceeds median
- Multimodal sets do not invent a single dominant mood
- Insufficient sample → `insufficient_evidence`, not fabricated central tendency
- No private excerpts in public reports
- Methodology panel shows window, sample size, math, uncertainty, exclusions, last updated
- **What Mimi May Be Missing** section required
- Mobile + a11y for dashboard
- Legal / publish copy name Mean Median Mode (not “Social Floor” only)
- Residue `/residue` M/M/M tab still works and remains per-run

---

## 8. What this audit does *not* decide

- Which research provider ships first for Forecast (Exa vs You.com) — Phase 8
- Whether Observatory is a single route with tabs vs nested routes — Spec recommends parent + child routes
- Firestore vs server-computed aggregate materialization — Spec prefers server-side aggregation with client read of public reports only
- Exact numeric thresholds for `insufficient` / `tentative` / `moderate` / `strong` — Spec sets defaults; tune with corpus

---

## 9. Recommended next agent actions

1. Treat `docs/COLLECTIVE_INTELLIGENCE_SPEC.md` + `docs/mmm-chamber-implementation-plan.md` as the implementation brief.
2. Implement **smallest complete vertical slice**: Zod contracts → publish consent persistence → read-only Mean Median Mode chamber (demo fixtures labeled OR honest empty) → `verify:collective`.
3. Do **not** start with an ornamental dashboard or Forecast repair before consent + central-tendency contracts exist.
4. Keep Residue MMM untouched except optional Guide/canon disambiguation copy.

---

## Related docs / code

- `docs/CURSOR_HANDOFF_COLLECTIVE_INTELLIGENCE.md` — locked product architecture
- `docs/COLLECTIVE_INTELLIGENCE_SPEC.md` — Phase 2
- `docs/mmm-chamber-implementation-plan.md` — sequenced chamber build
- `docs/residue-engine-phase1-audit.md` / phase5–8 status — Residue sibling MMM
- `docs/CHAMBER_EVIDENCE_AUDIT.md` — chamber routing honesty
- `docs/EVIDENCE_FOR_MIMI.md` — evidence/provenance thesis
- `components/TheForecast.tsx`, `services/researchService.ts` — Forecast spine
- `components/chambers/ResidueChamber.tsx` — per-run M/M/M

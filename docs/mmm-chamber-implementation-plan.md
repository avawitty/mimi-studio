# Mean Median Mode Chamber — Implementation Plan

**Status:** Phases 3–5 vertical slice implemented (see `docs/mmm-chamber-phase5-status.md`)  
**Date:** 2026-08-02  
**Product:** Collective **Mean Median Mode** under **The Observatory**  
**Not in scope:** Residue per-run M/M/M (already shipped at `/residue`)  
**Depends on:** `docs/COLLECTIVE_INTELLIGENCE_AUDIT.md`, `docs/COLLECTIVE_INTELLIGENCE_SPEC.md`, `docs/CURSOR_HANDOFF_COLLECTIVE_INTELLIGENCE.md`

---

## Goal

Ship the **smallest complete vertical slice** of collective Mean Median Mode:

1. Zod contracts for `CentralTendencyProfile` + consent/receipt types  
2. Proscenium publish disclosure that persists `contributeToMeanMedianMode`  
3. Read-only Observatory → Mean Median Mode chamber with real math over fixtures **or** honest `insufficient_evidence` empty state  
4. `verify:collective` covering consent, thresholds, and namespace separation from Residue  
5. Canon + nav + legal rename away from “Social Floor”

Do **not** start with ornamental dashboards, Mesopic Lens, RSS spine, or Forecast repair.

---

## Current-state findings (compressed)

| System | Reality |
| --- | --- |
| Residue M/M/M | Live per-run analysis; canon alias `"MMM"` |
| Collective MMM / Observatory | Spec only |
| Proscenium publish | Silent `isPublic` — no MMM disclosure |
| Forecast | Simulated research + random drift |
| Legal | “Social Floor” claims anonymized trends |

Full audit: `docs/COLLECTIVE_INTELLIGENCE_AUDIT.md`.

---

## Risks (chamber-specific)

| Risk | Mitigation in this plan |
| --- | --- |
| Agents/users confuse Residue MMM with collective MMM | Separate canon ids; Guide copy; Residue keeps short `"MMM"` alias; collective uses full **Mean Median Mode** + `/observatory` |
| Fake stats in prototype | Fixtures labeled `demonstration: true`; empty state preferred over invented live telemetry |
| Consent without aggregation pipeline | Persist consent + receipt shape first; extraction may be stub that records eligibility only |
| Scope creep into Forecast | Observatory links to `/forecast`; no research APIs inside MMM panels |
| Privacy leaks via demo data | Demo fixtures use synthetic artifact ids; no real user excerpts |

---

## Proposed architecture (chamber slice)

```
ZineCard / broadcast paths
  → ProsceniumPublishConsentModal
  → persist ProsceniumPublishConsent (+ ContributionReceipt stub)
  → (Phase 4b) extract CollectiveSignal[] when contribute=true

services/collective/aggregateCentralTendency.ts
  → CentralTendencyProfile[]
  → MeanMedianModeReport

ObservatoryChamber
  → MeanMedianModePanel (sections 1–12, methodology + missing)
```

Parent shell owns quiet chrome; child panel owns statistical readout.

---

## Data model (implement in Zod first)

File: `schemas/collectiveIntelligenceContracts.ts`

Export (minimum for slice):

- `collectiveSignalCategorySchema`
- `collectiveSignalSchema`
- `centralTendencyProfileSchema`
- `cyclePositionSchema`
- `contributionReceiptSchema`
- `prosceniumPublishConsentSchema`
- `meanMedianModeReportSchema`
- `methodologyRecordSchema` (window, version, limitations)

Re-export selected types from `services/collective/types.ts` if needed. Avoid bloating `types.ts` — thin pointers only.

**Do not** reuse `services/residue/validation.ts` `meanMedianModeResultSchema` for collective reports.

---

## Privacy decisions (locked for implementers)

1. Default contribute = **true only after** disclosure acknowledgment.  
2. No acknowledgment → no contribution flag → no signals.  
3. Advanced opt-out: `contributeToMeanMedianMode: false` still stages publicly.  
4. Unpublish clears future eligibility; frozen reports policy documented in methodology constants.  
5. Public MMM UI never shows `contextExcerpt` or private studio text.  
6. Contributor counts only as **bands**.

Disclosure version string: start at `mmm-consent-v1` and bump when copy meaning changes.

---

## Cycle-position methodology (Phase 5 stub)

For the prototype, cycle positions may be:

- Omitted when `insufficient_evidence`, or  
- Derived from simple rules on velocity + modality (document in `services/collective/methodology.ts`), or  
- Present only on labeled demonstration fixtures

Never invent “Emergent” from volume alone. Prefer omitting cycle chips over costume labels until Phase 5 rules are tested.

---

## UI information architecture (build order)

### Observatory parent (`/observatory`)

- Masthead: **The Observatory**  
- One-line role copy from Spec  
- Navigation tiles/links: Mean Median Mode (primary), Forecast (existing route), Mesopic Lens (coming soon / disabled honest)  
- No duplicate Mimi wordmark under self-branded plate  
- Quiet chrome

### Mean Median Mode (`/mean-median-mode` + `/observatory/mmm`)

Ship in two UI increments:

**5a — Instrument strip (required)**

- Present Atmosphere (text from report)  
- Mean · Median · Mode strip + summation interpretation  
- Why Mimi Thinks This  
- What Mimi May Be Missing  
- Demonstration / empty banner

**5b — Atmosphere sections**

- What People Are Seeking  
- Motifs in Ascent  
- Quiet Signals  
- Collective Tensions / Saturation / Countercurrents / Recurrent / Artifact Forms  

Empty subsections collapse with a single “not enough evidence” note rather than fake cards.

Aesthetic: house white/ink chamber plate; ephemeris tone; no KPI card grid; no purple glow theater.

---

## Exact file plan

### Phase 3 — Contracts (no UI)

| Create | Notes |
| --- | --- |
| `schemas/collectiveIntelligenceContracts.ts` | Zod source of truth |
| `services/collective/types.ts` | Re-exports |
| `services/collective/methodology.ts` | Versions, thresholds, contributor bands |
| `services/collective/aggregateCentralTendency.ts` | Pure functions: mean/median/mode + summation |
| `scripts/verifyCollectiveIntelligence.ts` | Schema + math + insufficient_evidence cases |
| `package.json` | `"verify:collective": "tsx scripts/verifyCollectiveIntelligence.ts"` |

### Phase 4 — Consent vertical slice

| Create | Notes |
| --- | --- |
| `components/proscenium/ProsceniumPublishConsentModal.tsx` | Disclosure + contribute toggle |
| `lib/prosceniumPublishConsent.ts` | Disclosure version, copy helpers, persist helpers |

| Change | Notes |
| --- | --- |
| `components/ZineCard.tsx` | Replace silent toggle with confirm flow |
| `services/firebaseUtils.ts` | Gate `public_transmissions` / public save on consent |
| Broadcast paths (`AnalysisDisplay`, `Pocket` if applicable) | Same gate |
| `types.ts` or zine side fields | `contributeToMeanMedianMode`, `disclosedAt`, `disclosureVersion` |
| `firestore.rules` | Allow owner consent fields; receipts rules as needed |
| `e2e/proscenium.spec.ts` | Disclosure acknowledgment cases |
| `scripts/verifyCollectiveIntelligence.ts` | Consent logic unit tests |

Extraction stub (same phase or 4b):

| Create | Notes |
| --- | --- |
| `services/collective/extractSignals.ts` | Rule-based minimal extract from public zine metadata/tags; model-proposed later |
| `services/collective/contribute.ts` | If consent → extract → filter → receipt |

### Phase 5 — Chamber prototype

| Create | Notes |
| --- | --- |
| `components/chambers/ObservatoryChamber.tsx` | Parent shell |
| `components/observatory/MeanMedianModePanel.tsx` | Dashboard sections |
| `components/observatory/MmmStrip.tsx` | Mean/median/mode + summation |
| `components/observatory/MmmMethodology.tsx` | Why / missing |
| `fixtures/collective/demoMeanMedianModeReport.ts` | Labeled demonstration only |
| `services/collective/loadMeanMedianModeReport.ts` | Demo fixture **or** live aggregate; never silent mix |
| `e2e/observatory.spec.ts` | Route smoke + strip visibility |
| `docs/mmm-chamber-phase5-status.md` | Status after ship (follow Residue status pattern) |

| Change | Notes |
| --- | --- |
| `App.tsx` | `observatory`, `mean-median-mode` view modes; lazy load |
| `lib/productCanon.ts` | Register Observatory + Mean Median Mode; **do not** add Residue `"MMM"` to Observatory |
| `components/navigationConfig.ts` | Intelligence → Observatory / Mean Median Mode; keep Residue keywords Residue-scoped; add “collective” / “observatory” keywords |
| `components/GuideModal.tsx` | Disambiguation blurb |
| `components/LegalOverlay.tsx` | Social Floor → Mean Median Mode / Observatory |
| `lib/legalContent.ts` | Align privacy language |
| `docs/mimi-chamber-implementation-audit.md` | Add Observatory / MMM rows when live |

### Explicitly deferred (do not open in the vertical slice PR)

| Item | Phase |
| --- | --- |
| Mesopic Lens full UI | 6 |
| Approved RSS Forecast spine | 7 |
| Live research provider + kill Forecast random drift | 8 |
| Model-proposed signal extraction with human approval queue | After 4b |
| Collective Firestore materialization at scale | After 5a proves UI + math |
| Renaming Residue tab away from M/M/M | Optional later; not required |

---

## Migration plan

| Step | Action | Rollback |
| --- | --- | --- |
| M1 | Land contracts + verify script | Delete new files; no runtime impact |
| M2 | Add consent fields (default absent = not contributing) | Old clients ignore new fields |
| M3 | Require modal on publish paths | Feature-flag if needed: `VITE_MMM_CONSENT=1` |
| M4 | Ship Observatory chamber with `demonstration` fixture **or** empty report | Route-only rollback |
| M5 | Legal/nav rename Social Floor | Copy-only revert |
| M6 | Enable live aggregation behind server path when corpus exists | Keep fixture path for empty environments |

**Existing public zines:** treat as **not contributed** until the owner re-confirms publish disclosure (or a one-time migration prompt). Do not backfill consent from historical `isPublic`.

---

## Test plan

### `npm run verify:collective` (required)

- Parse valid / invalid `CentralTendencyProfile`  
- Mean/median/mode computed from same sample  
- Spike-driven when mean >> median  
- Multimodal → contested / no single invented mood  
- Below threshold → `insufficient_evidence`  
- Private / `contribute=false` never produces eligible signals  
- Disclosure version required on consent objects  
- Residue schema fixtures still parse via `verify:residue` (run both; no cross-import of result types)

### Playwright

- `/observatory` and `/mean-median-mode` render without console errors  
- Demonstration banner visible when fixture mode  
- Mean, median, mode labels all present in strip (or empty-state copy when no profiles)  
- Proscenium publish: cancel → not public / not contributing; confirm default → contributing; opt-out → public without contribute  

### Manual mobile checklist (AGENTS.md)

After UI lands: Front Page unaffected; Observatory quiet chrome; no pocket/oracle on public face; Stand/Studio regressions none.

---

## Implementation sequence (PRs)

| PR | Title focus | Exit |
| --- | --- | --- |
| **A (this)** | Docs: audit + spec + chamber plan | Plans merged |
| **B** | `feat(collective): Zod contracts + central-tendency math + verify:collective` | Phase 3 |
| **C** | `feat(proscenium): Mean Median Mode publish consent` | Phase 4 |
| **D** | `feat(observatory): Mean Median Mode chamber prototype` | Phase 5a (+ 5b if small) |
| **E** | Legal/nav Social Floor → Mean Median Mode (can merge with D) | Copy alignment |
| **F+** | Mesopic / RSS / Forecast | Phases 6–8 |

Each PR: inspect → evidence → narrow change → extend verify/Playwright → no ship claims without tests.

---

## Agent operating checklist (before coding B–D)

Return / confirm against Spec:

1. Current-state findings — Audit §1  
2. Risks and gaps — Audit §3 / this plan Risks  
3. Proposed architecture — this plan  
4. Data model — Spec §5  
5. Privacy decisions — Spec §6 / this plan  
6. Cycle-position methodology — Spec §5 + this plan stub  
7. UI IA — Spec §7 / this plan  
8. Exact file plan — this plan  
9. Migration plan — this plan  
10. Test plan — this plan  

Then implement only the smallest complete vertical slice for that PR.

After implementation, return: changed files · DB/rules/env · migration notes · tests · commands · results · limitations · next phase.

---

## Commands (target)

```bash
npm run verify:collective
npm run verify:residue          # sibling still green
npm run validate:canon          # after canon registration
npm run lint
npm run test:e2e -- e2e/observatory.spec.ts e2e/proscenium.spec.ts
```

Open in app (after Phase 5): `/observatory`, `/mean-median-mode`

---

## Success definition (Phase 5 done)

- A signed-in user cannot contribute to Mean Median Mode without seeing disclosure that names it.  
- Observatory Mean Median Mode shows mean, median, mode, and summation interpretation for every promoted profile — or an honest insufficient/empty/demonstration state.  
- Residue `/residue` M/M/M remains a separate per-run instrument.  
- No research-API cosplay inside the MMM chamber.  
- `verify:collective` passes in CI.

---

## Related

- `docs/CURSOR_HANDOFF_COLLECTIVE_INTELLIGENCE.md`  
- `docs/COLLECTIVE_INTELLIGENCE_AUDIT.md`  
- `docs/COLLECTIVE_INTELLIGENCE_SPEC.md`  
- `docs/residue-engine-phase5-status.md` — Residue MMM sibling  
- `docs/residue-engine-phase8-status.md` — Residue UI chamber pattern to mirror for Observatory shell

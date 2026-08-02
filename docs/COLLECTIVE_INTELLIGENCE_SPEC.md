# COLLECTIVE INTELLIGENCE — Phase 2 Specification

**Status:** Spec complete — ready for typed contracts + vertical slice  
**Date:** 2026-08-02  
**Depends on:** `docs/COLLECTIVE_INTELLIGENCE_AUDIT.md`, `docs/CURSOR_HANDOFF_COLLECTIVE_INTELLIGENCE.md`  
**Chamber build sequence:** `docs/mmm-chamber-implementation-plan.md`

---

## 1. Product thesis

### Personal intelligence loop (existing)

```
Capture → Interpret → Approve → Remember → Retrieve → Generate → Compose → Export
```

### Collective intelligence loop (this spec)

```
Public artifact
→ Consent and eligibility check
→ Signal extraction
→ Anonymized aggregation
→ Pattern detection
→ Cycle interpretation
→ Collective readout (Mean Median Mode)
→ Forecast (later)
→ Historical archive (The Observatory)
```

**Mean Median Mode** answers:

- What are people wondering about?
- What help are they seeking from AI (broad, non-diagnostic categories)?
- Which motifs, tensions, formats, and references keep appearing?
- How do public zines reveal collective attention and inner-world *expression* (artifact-level, never person diagnosis)?
- Which signals are emerging, loud, saturated, or returning altered?
- What do the **mean**, **median**, and **mode** of collective signal activity say — separately and together — about the present atmosphere?

**Not:** Explore feed, leaderboard, or “popular = good.”  
**Yes:** “This signal’s central tendency looks like X: mean intensity Y, median Z, modal motif W — with these contradictions, at this cycle stage.”

---

## 2. Naming (locked)

| Public name | Role |
| --- | --- |
| **Mean Median Mode** | Primary chamber / dashboard name |
| Collective Moods | Docs-only alias — never primary UI label |
| **The Observatory** | Parent chamber containing Mean Median Mode, Mesopic Lens, Forecast |
| Residue **Mean / Median / Mode** | Per-run tab inside `/residue` — different product |

Core copy (use consistently):

- **The Proscenium** — Public artifacts and their social afterlives.
- **The Observatory** — Where collective cultural signals are observed over time.
- **Mean Median Mode** — A statistical reading of what people are seeking, expressing, questioning, and beginning to make together.
- **Mesopic Lens** — Twilight vision for the collective archive.
- **Starry-Eyed** — A constellation of signals not yet bright enough to call a trend.
- **Shadow Fields** — Patterns gathering outside the center of attention.
- **Forecast** — Evidence-backed trajectories from research APIs, RSS, and observed Mean Median Mode baselines.

---

## 3. Chamber architecture

| Chamber | Role | Answers |
| --- | --- | --- |
| **The Proscenium** | Public performance | What entered public view? |
| **The Observatory** | Collective perception parent | Measures, interprets, archives public cultural signals |
| **Mean Median Mode** | Present statistical readout | Atmosphere via mean, median, mode, joint profile |
| **Mesopic Lens** | Weak-signal perception | Dim correspondences before they become trends |
| **Forecast** | Trajectory / research-API projections | Forward scenarios from live providers + observed baselines + RSS |
| **Scry** | Research + source gathering | Answer across memory and current sources |
| **Tailor** | Personal evidence → approved taste knowledge | Private; never auto-enters collective analytics |
| **Residue** | Per-run cultural/emotional analysis | Includes per-run M/M/M — not collective |

### Flow

```
Scry gathers evidence (personal / query-time)
        ↓
Collective signals normalized (consent-gated from Proscenium)
        ↓
Mesopic Lens detects faint relationships
        ↓
Mean Median Mode describes the present (via central tendency)
        ↓
Forecast proposes trajectories
        ↓
The Observatory preserves the longer record
```

### Time orientation (locked)

| Chamber | Time | Primary inputs | Job |
| --- | --- | --- | --- |
| Mean Median Mode | Present | Consented public Mimi signals | Observe — mean / median / mode / summation |
| Forecast | Forward | Research APIs + RSS + MMM aggregates + personal/brand scope | Project — trajectories with citations |
| Scry | Query-time | Personal memory + web + reading + shadow | Gather evidence for a question |
| Mesopic Lens | Early / faint | Low-volume aggregates before central-tendency thresholds | Detect weak structure |

**Do not** put research-API trend projection inside Mean Median Mode.  
**Do not** pretend Forecast’s overview weather/drift panels are Mean Median Mode.

---

## 4. Analytical contract — Mean · Median · Mode

Primary data representation of the dashboard — not a metaphor on fake KPIs.

| Function | Cultural meaning | Measures |
| --- | --- | --- |
| **Mean** | Average presence | Mean occurrence intensity / frequency across the window (spike-sensitive) |
| **Median** | Typical presence | Middle of the distribution without viral skew |
| **Mode** | Dominant motif | Most frequent canonical label / category (the actual common mood) |
| **Summation** | Joint profile | All three + relationship diagnostics |

### Required return shape

```ts
interface CentralTendencyProfile {
  signalId: string;
  windowStart: number;
  windowEnd: number;
  unit: "occurrences_per_day" | "share_of_artifacts" | "normalized_intensity";
  mean: number;
  median: number;
  mode: {
    label: string;
    count: number;
    share: number;
  };
  summation: {
    combinedIndex: number;
    skewHint: "mean_above_median" | "aligned" | "median_above_mean";
    modality: "unimodal" | "bimodal" | "multimodal" | "insufficient";
    interpretation:
      | "spike_driven"
      | "broadly_shared"
      | "contested"
      | "insufficient_evidence";
  };
  sampleSize: number;
  uniqueArtifactCount: number;
  uniqueContributorBand: string;
  methodologyVersion: string;
}
```

### Product rules

1. Every panel shows **mean, median, and mode** as first-class fields — not one vanity percentage.
2. **Summation** is derived (`combinedIndex` + skew/modality) — never `Math.random()` confidence.
3. When mean and median diverge, UI must say so (spike-driven vs broadly shared).
4. Mode is a **canonical label**, never a person’s identity.
5. Below evidence thresholds: `insufficient_evidence` — do not invent a mood.
6. Mesopic Lens may surface low-volume candidates; MMM only promotes them when thresholds are met.

### Namespace vs Residue

| Residue | Collective |
| --- | --- |
| `MeanMedianModeResult` | `CentralTendencyProfile` |
| `analysisKind: literal-statistical \| interpretive-metaphor` | Always windowed statistics (+ separate interpretive copy if needed) |
| Per-run coded signals | Consent-gated public aggregates |

---

## 5. Data model

### Signal categories

```ts
type CollectiveSignalCategory =
  | "query"
  | "topic"
  | "motif"
  | "mood"
  | "tension"
  | "reference"
  | "material"
  | "silhouette"
  | "color"
  | "technology"
  | "social_condition"
  | "assistance_type"
  | "artifact_form"
  | "expressive_mode";
```

### CollectiveSignal (core event)

```ts
interface CollectiveSignal {
  id: string;
  canonicalLabel: string;
  aliases: string[];
  category: CollectiveSignalCategory;
  sourceArtifactId: string;
  sourceType:
    | "public_zine"
    | "public_scry"
    | "proscenium_transmission"
    | "public_remix"
    | "rss"
    | "approved_external_source";
  observedAt: number;
  extractedAt: number;
  extractionMethod:
    | "user_tagged"
    | "rule_based"
    | "model_proposed"
    | "human_approved";
  confidence?: number; // measured/derived only; never Math.random
  contextExcerpt?: string; // never shown in public MMM readout
  publicContributionAllowed: boolean;
  anonymizationStatus: "pending" | "eligible" | "excluded";
  sensitivityFlags: string[];
  provenance: {
    sourceId: string;
    sourceKind: string;
    modelRunId?: string;
    extractorVersion: string;
  };
}
```

Aggregates must include: window, occurrence/unique-artifact counts, **contributor bands** (not tiny exact counts), source-type diversity, velocity, contradiction count, cycle position, confidence label (`insufficient` | `tentative` | `moderate` | `strong`), methodology version.

### Cycle positions (exact labels)

| Position | Meaning |
| --- | --- |
| Latent | Faint, distributed; no shared identity yet |
| Emergent | Accelerating across independent sources |
| Coalescing | Shared language / visual codes forming |
| Saturated | Broad, repetitive, shorthand risk |
| Fragmenting | Splitting into subcultures / counter-readings |
| Residual | No longer dominant; still available |
| Recurrent | Returning with altered meaning |

Cycle ≠ volume alone. Weight rate of change, diversity, consistency, remix, contradiction, history, evidence quality. Always show evidence behind the label.

### Public zine signal types

- **Content** — subject, motif, reference, mood, materials, assistance sought, contradictions
- **Inquiry** — explanation, research, emotional processing, identity exploration, aesthetic interpretation, decision support, ideation, planning, cultural analysis, naming, rewriting, meaning-making… (broad, non-diagnostic)
- **Form** — essay, collage, question-led, manifesto, moodboard, timeline, dossier, diary, speculative fiction… → expressive *modes* labeled at **artifact** level only. Never “this user is X.”

### Consent & receipts

```ts
interface ContributionReceipt {
  artifactId: string;
  contributedSignalIds: string[];
  excludedSignals: string[];
  exclusionReasons: string[];
  aggregationWindows: string[];
  createdAt: number;
}

interface ProsceniumPublishConsent {
  artifactId: string;
  stagedPublicly: true;
  contributeToMeanMedianMode: boolean;
  disclosedAt: number;
  disclosureVersion: string;
}
```

### MeanMedianModeReport (chamber payload)

```ts
interface MeanMedianModeReport {
  runId: string;
  status: "success" | "partial" | "empty" | "failed" | "demonstration";
  windowStart: number;
  windowEnd: number;
  profiles: CentralTendencyProfile[];
  presentAtmosphere: string; // derived from joint profiles; not a fake KPI
  seekingModes: { label: string; share: number; sampleSize: number }[];
  cycleNotes: { signalId: string; position: CyclePosition; evidence: string[] }[];
  methodologyVersion: string;
  limitations: string[];
  whatMayBeMissing: string[]; // required
  lastUpdated: number;
  demonstration?: boolean;
}
```

---

## 6. Privacy & consent (non-negotiable)

- Private Scry / Tailor / memory **excluded by default**
- **Publishing to The Proscenium is the consent moment for Mean Median Mode**
- Do not silently treat `isPublic = true` as analytics contribution without disclosure
- Locked product rule:

| Act | Meaning |
| --- | --- |
| **Publish to The Proscenium** | Public view **and** eligible to contribute anonymized signals to Mean Median Mode (default after disclosure) |
| **Unpublish** | Leaves the stage; stops future contribution |
| **Advanced opt-out** | Stage publicly **without** contributing — secondary control |

Suggested publish-confirm copy (tone editable; meaning locked):

> **Stage on The Proscenium**  
> This places your work in public view.  
> Eligible structure from this artifact — themes, motifs, inquiry types, and form — may contribute anonymized signals to **Mean Median Mode**, Mimi’s collective statistical reading.  
> Your private studio, Tailor memory, and personal Scry remain excluded.  
> Exact wording and private excerpts are not shown in the collective readout.

Optional secondary line:

> You can unpublish later to stop future contribution. Frozen historical reports may retain anonymized aggregates already computed.

Additional controls: exclude quotations; exclude from Forecast; revoke future contribution; contribution receipt.

Sensitivity filtering; no low-volume deanonymization; no person ranking; no diagnosis/identity inference from form.

Legal: replace “Social Floor” language in `LegalOverlay` with **Mean Median Mode** / **The Observatory**; align `lib/legalContent.ts`.

### Publish UX requirements

1. Confirm step (modal or inline) first time per session or when contribution settings change.
2. Primary CTA: **Stage on The Proscenium** (or equivalent).
3. Disclosure must name **Mean Median Mode** explicitly.
4. Show what is / is not contributed.
5. Toast/receipt: staged + contributing (or staged without contribution if opted out).
6. Unpublish equally discoverable.
7. Tests cover disclosure, default contribute, opt-out, unpublish.

---

## 7. UI information architecture — Mean Median Mode

Aesthetic: cultural ephemeris / observatory — not Bloomberg cosplay, not generic KPI cards. Every poetic label needs a functional explanation. Mean/median/mode remain readable as real statistics.

House plate: quiet chamber chrome (Menu + identity); dark plates get dark chrome; one `Mimi` wordmark; never CSS `uppercase` brand strings that render readable `MIMI`.

### Required sections

1. Present Atmosphere (from joint central-tendency profiles)
2. What People Are Seeking (modal inquiry / assistance categories)
3. Mean · Median · Mode strip (required: all three + summation interpretation)
4. Motifs in Ascent
5. Quiet Signals (Mesopic teaser — Phase 6 may expand)
6. Collective Tensions
7. Saturation Watch
8. Countercurrents
9. Recurrent Forms
10. Artifact Forms
11. Why Mimi Thinks This (window, sample size, mean/median/mode math, uncertainty, exclusions, last updated)
12. What Mimi May Be Missing (**required**)

### Routes (recommended)

| Route | Surface |
| --- | --- |
| `/observatory` | Parent chamber — overview + links to children |
| `/observatory/mmm` or `/mean-median-mode` | Mean Median Mode dashboard |
| `/forecast` | Existing Forecast (Observatory links here; Phase 8 hardens) |
| `/proscenium` | Publish / stage (consent UX) |

Alias both `/mean-median-mode` and `/observatory/mmm` to the same view mode for discoverability.

### Empty / demonstration states

| Condition | UI |
| --- | --- |
| No consented corpus | Honest empty: insufficient_evidence; explain how contribution works |
| Fixture-only prototype | Banner: **Demonstration specimens — not live collective data** |
| Partial aggregation failure | `partial` status + which windows failed |
| Below threshold signals | Listed under Quiet Signals / Mesopic — not main strip |

---

## 8. Analytical integrity

Classify every metric as: **measured | derived | model-estimated | manually curated | speculative | decorative**.

Decorative metrics must not appear as data. No randomized confidence/sync scores. Popularity ≠ cultural importance.

Default confidence thresholds (tunable; store in methodology constants):

| Label | Default gate (illustrative) |
| --- | --- |
| `insufficient` | sampleSize &lt; 5 **or** uniqueArtifactCount &lt; 3 |
| `tentative` | uniqueArtifactCount 3–9 |
| `moderate` | uniqueArtifactCount 10–29 |
| `strong` | uniqueArtifactCount ≥ 30 **and** source-type diversity ≥ 2 |

Contributor bands (example): `"1–2"`, `"3–9"`, `"10–49"`, `"50+"` — never expose exact 1–2 as a precise identity leak when combined with rare labels (suppress those signals instead).

---

## 9. Storage model

Prefer **server-side aggregation** with clients reading published reports, not raw low-volume signal dumps.

| Collection / path | Contents | Access |
| --- | --- | --- |
| `zines/{id}` (+ consent fields or side doc) | `ProsceniumPublishConsent` fields | Owner write |
| `contributionReceipts/{id}` | Receipts | Owner read; admin/server write |
| `collectiveSignals/{id}` | Eligible anonymized signals | Server write; **no** public client list of sparse sets |
| `collectiveAggregates/{windowId}` | Windowed aggregates | Public read of **promoted** reports only |
| `meanMedianModeReports/{id}` | `MeanMedianModeReport` snapshots | Public read |

Firestore rules must prevent client queries that deanonymize (e.g. filter by rare label + tiny contributor count).

Until live pipeline ships, Phase 5 may serve **in-memory / fixture** reports labeled `demonstration: true`.

---

## 10. Implementation phases (collective)

| Phase | Work | Exit criteria |
| --- | --- | --- |
| **1** | Audit | `COLLECTIVE_INTELLIGENCE_AUDIT.md` |
| **2** | Spec | This document |
| **3** | Typed contracts (Zod) | Schemas + unit parse tests |
| **4** | Vertical slice: publish → consent → signals → receipt | Consent tests green; private never aggregates |
| **5** | Mean Median Mode prototype chamber | Read-only dashboard; real or labeled-demo aggregates; methodology + missing section |
| **6** | Mesopic Lens | Weak-signal UI; never certainty |
| **7** | RSS freshness | Approved feeds → server fetch → Forecast evidence |
| **8** | Forecast repair | Live provider + consume `CentralTendencyProfile[]`; kill random drift |

See `docs/mmm-chamber-implementation-plan.md` for Phases 3–5 file-level sequencing.

---

## 11. Forecast contract (Phase 8 target — do not implement inside MMM)

```
Mean Median Mode profiles (observed)
+ RSS freshness spine (approved feeds)
+ ONE live research provider
+ optional personal / brand scope
→ ForecastReport {
    status, observed: CentralTendencyProfile[],
    external: ResearchSynthesisResponse,
    trajectories, contradictions,
    evidenceWindow, methodology, what-might-be-missing
  }
```

---

## 12. Product principle

> **Mean Median Mode** is not a leaderboard.  
> It is an instrument for noticing what many separate practices have begun to say together — measured as mean presence, median typicality, and modal motif, then read as their joint profile.  
> Build it like an observatory with receipts: dim enough to perceive, precise enough to believe, and careful about whose inner world it has been allowed to read.

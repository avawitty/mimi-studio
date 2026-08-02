# CURSOR HANDOFF — Mimi Collective Intelligence + Finishing Pass

**Status:** Implementation-ready product handoff  
**Audience:** Cursor agents / senior engineers  
**Principle:** Inspect before building. Prove every result. Do not invent functionality.

**Plans landed (2026-08-02):**

- Phase 1 audit → [`docs/COLLECTIVE_INTELLIGENCE_AUDIT.md`](./COLLECTIVE_INTELLIGENCE_AUDIT.md)
- Phase 2 spec → [`docs/COLLECTIVE_INTELLIGENCE_SPEC.md`](./COLLECTIVE_INTELLIGENCE_SPEC.md)
- MMM chamber build sequence → [`docs/mmm-chamber-implementation-plan.md`](./mmm-chamber-implementation-plan.md)

Next code PR: Phase 3 Zod contracts + `verify:collective` (see chamber plan PR **B**).

---

## Question summary

**What Ava is asking**

1. Audit every Mimi input, return, integration, connector, and research workflow so finishing work can distinguish real systems from decorative simulations.
2. Design **Mean Median Mode** (formerly Collective Moods) — a shared analytics layer whose readout is literally grounded in central-tendency statistics over consented public signals (not an Explore page).
3. Let public zines contribute anonymized collective data about what people seek, wonder, share, and express — including inquiry categories and artifact-form signals.
4. Lock the approved chamber architecture and naming system for implementation.

**Why**

Mimi is approaching its finishing pass. Chambers exist; contracts do not. Disabled integrations can look live. Simulated research and random confidence undermine trust. Collective intelligence should read culture as cycles and tensions, not popularity.

**Underlying objective**

Ship a coherent creative-intelligence product whose code, outputs, provenance, and poetic language belong to the same constellation — an atelier with receipts, not a foggy oracle.

---

## Product thesis

### Personal intelligence loop

```
Capture → Interpret → Approve → Remember → Retrieve → Generate → Compose → Export
```

### Collective intelligence loop

```
Public artifact
→ Consent and eligibility check
→ Signal extraction
→ Anonymized aggregation
→ Pattern detection
→ Cycle interpretation
→ Collective readout
→ Forecast
→ Historical archive
```

**Mean Median Mode** must answer:

- What are people wondering about?
- What help are they seeking from AI (broad, non-diagnostic categories)?
- Which motifs, tensions, formats, and references keep appearing?
- How do public zines reveal collective attention and inner-world *expression* (artifact-level, never person diagnosis)?
- Which signals are emerging, loud, saturated, or returning altered?
- What do the **mean**, **median**, and **mode** of collective signal activity say — separately and together — about the present atmosphere?

**Not:** Explore feed, leaderboard, or “popular = good.”  
**Yes:** “This signal’s central tendency looks like X: mean intensity Y, median Z, modal motif W — with these contradictions, at this cycle stage.”

### Naming decision (locked)

| Public name | Role |
| --- | --- |
| **Mean Median Mode** | Primary chamber / dashboard name (replaces “Collective Moods” as the user-facing title) |
| Collective Moods | Optional conceptual alias in docs only — do not use as the primary UI label |
| The Observatory | Parent chamber that contains Mean Median Mode, Mesopic Lens, Forecast |

**Mean Median Mode** is both a poetic title and a literal analytical contract: every readout must expose measurable central-tendency functions, not decorative “mood” language alone.

---

## Approved chamber architecture

| Chamber | Role | Answers |
| --- | --- | --- |
| **The Proscenium** | Public performance | What entered public view? What is shared, witnessed, absorbed, refracted? |
| **The Observatory** | Collective perception chamber | Measures, interprets, and archives public cultural signals over time |
| **Mean Median Mode** | Current dashboard / statistical readout | Present atmosphere via mean, median, mode, and their joint profile |
| **Mesopic Lens** | Weak-signal perception | Dim correspondences before they become trends |
| **Starry-Eyed** | Mesopic mode | Constellation of signals not yet bright enough to call a trend |
| **Shadow Fields** | Mesopic mode | Patterns gathering outside the center of attention |
| **Forecast** | Trajectory / research-API projections | Forward scenarios from live research providers + observed baselines + RSS |
| **Scry** | Research + source gathering | Answer across approved memory and current sources — layers kept distinct |
| **Tailor** | Personal evidence → approved taste knowledge | Private by default; never auto-enters collective analytics |

### Flow

```
Scry gathers evidence
        ↓
Collective signals normalized (consent-gated)
        ↓
Mesopic Lens detects faint relationships
        ↓
Mean Median Mode describes the present (via central tendency)
        ↓
Forecast proposes trajectories
        ↓
The Observatory preserves the longer record
```

### Core copy (use consistently)

- **The Proscenium** — Public artifacts and their social afterlives.
- **The Observatory** — Where collective cultural signals are observed over time.
- **Mean Median Mode** — A statistical reading of what people are seeking, expressing, questioning, and beginning to make together.
- **Mesopic Lens** — Twilight vision for the collective archive.
- **Starry-Eyed** — A constellation of signals not yet bright enough to call a trend.
- **Shadow Fields** — Patterns gathering outside the center of attention.
- **Forecast** — Evidence-backed trajectories from research APIs, RSS, and observed Mean Median Mode baselines.
- **Scry** — Research across approved memory and current sources.
- **Tailor** — Personal evidence transformed into user-approved knowledge.

### Mean · Median · Mode — analytical contract

Yes: this is possible, and it should be the **primary data representation** of the dashboard — not a metaphor pasted on top of fake KPIs.

For each eligible signal (or signal family) in an evidence window, compute and display:

| Function | Cultural meaning | What it measures |
| --- | --- | --- |
| **Mean** | Average presence | Mean occurrence intensity / frequency across the window (sensitive to spikes) |
| **Median** | Typical presence | Middle of the distribution — what “most of the window” looks like without viral skew |
| **Mode** | Dominant motif | Most frequent canonical label / category in the set (the actual common mood) |
| **Summation / joint profile** | How the three agree or disagree | A derived analytical object that returns all three plus relationship diagnostics |

#### Required return shape

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
  /** Joint analytical summary — not a random score */
  summation: {
    /** mean + median + mode.share (same unit basis after normalization) */
    combinedIndex: number;
    skewHint: "mean_above_median" | "aligned" | "median_above_mean";
    modality: "unimodal" | "bimodal" | "multimodal" | "insufficient";
    interpretation:
      | "spike_driven"      // mean >> median: a few loud artifacts
      | "broadly_shared"    // mean ≈ median; clear mode
      | "contested"         // multimodal / weak mode
      | "insufficient_evidence";
  };
  sampleSize: number;
  uniqueArtifactCount: number;
  uniqueContributorBand: string;
  methodologyVersion: string;
}
```

#### Product rules

1. Every Mean Median Mode panel must show **mean, median, and mode** as first-class fields — not hide them behind a single vanity percentage.
2. The **summation** is a derived profile (`combinedIndex` + skew/modality interpretation), not `Math.random()` confidence.
3. When mean and median diverge, UI must say so (spike-driven vs broadly shared).
4. Mode is a **canonical label**, never a person’s identity.
5. Below evidence thresholds: return `insufficient_evidence` — do not invent a mood.
6. Mesopic Lens may surface low-volume candidates, but Mean Median Mode only promotes them into the main readout when central-tendency thresholds are met.

### Forecast = research-API projection layer (locked architecture)

**Best hypothetical architecture (confirmed from existing `TheForecast` + `researchService` shape):**

| Chamber | Time orientation | Primary inputs | Job |
| --- | --- | --- | --- |
| **Mean Median Mode** | Present | Consented public Mimi signals (zines, tags, inquiries, forms) | Observe — return mean / median / mode / summation |
| **Forecast** | Forward | Research APIs + RSS + Mean Median Mode aggregates + personal/brand scope | Project — return trajectory hypotheses with citations |
| **Scry** | Query-time | Personal memory + web + reading + shadow | Gather evidence for a question |
| **Mesopic Lens** | Early / faint | Low-volume aggregates before they clear central-tendency thresholds | Detect weak structure |

Do **not** put research-API trend projection inside Mean Median Mode.  
Do **not** pretend Forecast’s overview weather/drift panels are Mean Median Mode.

#### What already exists (use as the Forecast spine)

Inspected in-repo and matching uploaded production bundles:

- `components/TheForecast.tsx` — scopes (`personal` / `company`), vectors (`overview` / `content` / `culture`), Content Forecasting UI that already expects provider-labeled synthesis + trends + sourced citations.
- `services/researchService.ts` — provider-neutral return shape:

```ts
interface ResearchSynthesisResponse {
  synthesis: string;
  trends: ForecastTrend[]; // format, velocity, score, analysis, sources[]
  provider: string;
}
```

Provider candidates already sketched in that adapter: Exa, Perplexity, Tavily, ThinkingLabs.

#### What is currently costume (must be repaired, not celebrated)

- `fetchContentForecast` returns **simulated** provider payloads keyed off whether an API key exists — not live research.
- Overview **Drift Probability** falls back to `Math.floor(Math.random() * 30 + 10)`.
- Cultural Shifts vector is hard-coded copy (“Post-Authenticity”, “Memetic Velocity: High”).
- Trend `score` / `credibility` in mocks are invented.

#### Correct Forecast contract going forward

```
Mean Median Mode profiles (observed)
        +
RSS freshness spine (approved feeds)
        +
ONE live research provider (Exa or You.com initially; others feature-flagged)
        +
optional personal Thimble / Brand OS scope
        ↓
ForecastReport {
  status: success | partial | empty | failed | speculative
  observed: CentralTendencyProfile[]      // from Mean Median Mode
  external: ResearchSynthesisResponse     // real provider, schema-validated
  trajectories: TrajectoryHypothesis[]    // model-interpreted, labeled
  contradictions: EvidenceItem[]
  evidenceWindow / source diversity / methodology / what-might-be-missing
}
```

Rules:

1. Research APIs belong to **Forecast** (and secondarily Scry), not to Mean Median Mode.
2. Forecast may *consume* Mean Median Mode as the observed baseline it projects from.
3. Personal vs Brand OS scope stays on Forecast (already in UI) — Mean Median Mode stays collective/anonymous.
4. Replace simulated `fetchContentForecast` with a real adapter + honest empty/partial states.
5. Velocity labels (`Surging` / `Rising` / `Decaying`) must derive from measured change or provider fields — never hardcoded mock scores presented as live telemetry.
6. Cartesian/chart surfaces (Recharts bundle context) may visualize Forecast trajectories and Mean Median Mode distributions, but charts must bind to real series or show empty states — no decorative “live” bars.

#### Product distinction (one line each)

- **Mean Median Mode:** What the consented collective *is doing* right now, statistically.
- **Forecast:** What research APIs + observed baselines suggest *may be gathering force* next — with receipts.
- **Scry:** Answer *this* question across memory and sources.
- **Mesopic Lens:** Notice the faint pattern before it clears the mean/median/mode bar.

### Proscenium social vocabulary

| Conventional | Mimi term | Meaning |
| --- | --- | --- |
| Like | Resonate | Artifact struck a chord |
| Likes | Resonance | Accumulated response |
| Followers | Resonants | People attuned to your work |
| Following feed | Resonant Field | Work from people you follow |
| Suggested people | Tangents | Adjacent through one point of contact |
| Mutuals | Consonants | Reciprocal attention |
| Group | Clique | Named, opt-in circle (not all connections) |
| Feed post | Transmission | Published artifact/signal |
| Comment | Vibe Note / Marginalia | Lightweight vs deeper annotation |
| Share | Transmit | Send public path elsewhere |
| Save to studio | Absorb | Bring into private context with origin |
| Remix | Refract | Transform with visible lineage |
| Aesthetic Siblings → | Near Relations | Overlap without forced intimacy |

**Do not** rename followers to Tangents. Tangents = adjacent discoveries, not ongoing follows.

### Contemplative superintelligence (aesthetic spine)

Avoid: speed, glowing omniscience, command-center prediction theater.  
Prefer: patience, low-light perception, restraint before conclusion, ambiguity held carefully, “not enough evidence,” cultural astronomy.  
Mesopic intelligence = superintelligence under low light — weak signals noticed without falsely declaring them bright.

---

## Finishing priorities (trust first)

P0 risks already identified in review — verify with code before changing:

1. **Scry state races** — personal search, web, Scribe reading, and shadow memory overwrite shared `results` / `scribeReading`. Need a typed `ScryRun` with separate source lanes.
2. **Simulated confidence** — `Math.random()`-style scores in Scry / Trend Scryer must become real explainable scores or visibly labeled simulation (removed from production interpretation).
3. **Fabricated research fallbacks** — polished mock theses / fake Vogue·WGSN URLs on failure. Replace with honest empty/failed states; speculative mode must be opt-in and labeled.
4. **`searchGrounding` dumps full zine/Pocket corpora into Gemini** — retrieve first, send only top excerpts; schema-validate; resist prompt injection.
5. **Proscenium demo data** — “Local Archive” must read as demonstration specimens; never mix simulated and live counts.
6. **Community writes** — witness/likes, vibe notes: auth, replay, length, unbounded arrays, moderation, rules.
7. **API Key Ring copy** — “zero backend exposure” is overclaim; verify every path; prefer honest storage language / server-managed credentials for maturity.
8. **Extend existing audits** — Playwright, route/Tailor/Shopify/Intel Hub/Pinterest/Used Context verifiers — do not invent a parallel ritual that dies in chat.

### Integration portfolio (smallest useful set)

| Job | Recommendation |
| --- | --- |
| Search / discovery | One of You.com **or** Exa (Exa for semantic adjacency; You.com for broad current research) |
| Extraction / scheduled observation | Apify — not default Scry search |
| Synthesis | Existing model gateway (OpenAI/Gemini/Vercel) — interprets evidence; is not the evidence |
| Freshness | **RSS/Atom first** as Forecast temporal spine |
| Projection / research APIs | **Forecast only** — reuse `ResearchSynthesisResponse`; one live provider first (Exa or You.com); others flagged |
| Collective present-tense stats | **Mean Median Mode only** — no research-API cosplay inside the dashboard |
| Reject for now | Extra Keychain entries without adapters, health checks, consuming workflows, error states, privacy docs |

---

## Ordered Cursor prompt suite (finishing pass)

Run in order. Each: inspect → evidence → narrowly scoped change. Extend existing verify scripts and Playwright.

| # | Prompt | Deliverable | Code changes? |
| --- | --- | --- | --- |
| 1 | Functionality registry | `FUNCTIONALITY_REGISTRY.md` — every control traced; route/input/integration tables; top 10 false-functionality findings | No |
| 2 | Input contracts | `docs/INPUT_CONTRACT_AUDIT.md`, `schemas/inputContracts.ts`, high-risk tests | Narrow only |
| 3 | Information returns | Typed `ResultEnvelope`; Scry as reference adapter; label/remove fake certainty | Scry-first |
| 4 | Repair Scry as evidence system | Four layers: My Archive / Open Web / Mimi’s Reading / Shadow Memory; one `ScryRun`; Playwright | Yes — vertical slice |
| 5 | Connector readiness | `docs/CONNECTOR_READINESS.md` | Docs |
| 6 | Provider adapter | `ResearchProvider` + one production adapter + feature flags + contract tests | Yes |
| 7 | Apify correctly | Proposal only: 3 actor workflows; no crawl without allowlists/limits/provenance | Proposal |
| 8 | Forecast from evidence | `docs/FORECAST_METRIC_DICTIONARY.md`; replace simulated `fetchContentForecast` with one live provider; remove random drift; wire Mean Median Mode baselines into ForecastReport; one honest example | Contract + adapter + example |
| 9 | Proscenium integrity | `docs/PROSCENIUM_INTEGRITY_AUDIT.md` + rules model + backlog | No rename/copy this pass |
| 10 | Release tribunal | Run verify/lint/build/e2e; `RELEASE_TRIBUNAL.md`; SHIP / SHIP WITH LIMITATIONS / DO NOT SHIP | Fix real failures only |

### Target `ScryRun` shape (Prompt 3–4)

```ts
interface ScryRun {
  id: string;
  query: string;
  startedAt: number;
  completedAt?: number;
  sources: {
    personalMemory: ResearchResult[];
    web: ResearchResult[];
    generatedReading?: GeneratedReading;
    shadowMemory: ResearchResult[];
  };
  failures: ProviderFailure[];
  confidence?: ConfidenceAssessment; // real or absent — never random costume
  usedContext: ContextReference[];
}
```

### Target `ResultEnvelope` (shared AI/research boundary)

```ts
type ResultStatus =
  | "success"
  | "partial"
  | "empty"
  | "failed"
  | "simulated"
  | "speculative";

interface ResultEnvelope<T> {
  runId: string;
  status: ResultStatus;
  data?: T;
  sources: SourceReference[];
  usedContext: ContextReference[];
  providerRuns: ProviderRun[];
  warnings: string[];
  startedAt: number;
  completedAt: number;
}
```

---

## Collective intelligence — implementation phases

Do **not** start with an ornamental dashboard. Inspect repo first.

### Phase 1 — Audit (no production code) — **done**

Inspect: public zine schema, public/private flags, Proscenium publish path, Scry storage, Forecast, tags/memory atoms, analytics/simulated metrics, Firestore collections/rules, deletion, consent UI, RSS support.

**Created:** [`docs/COLLECTIVE_INTELLIGENCE_AUDIT.md`](./COLLECTIVE_INTELLIGENCE_AUDIT.md)

### Phase 2 — Spec — **done**

**Created:** [`docs/COLLECTIVE_INTELLIGENCE_SPEC.md`](./COLLECTIVE_INTELLIGENCE_SPEC.md)  
Architecture, event/signal taxonomies, cycle methodology, privacy/consent, thresholds, retention, deletion, provenance, failure/uncertainty language, IA.

Chamber sequencing: [`docs/mmm-chamber-implementation-plan.md`](./mmm-chamber-implementation-plan.md).

### Phase 3 — Typed contracts (Zod, no `any`)

`CollectiveSignal`, `CollectiveSignalAggregate`, `CentralTendencyProfile`, `CyclePosition`, `PublicArtifactContribution`, `ContributionReceipt`, `ApprovedFeed`, `FeedEntry`, `ForecastReport`, `MeanMedianModeReport`, `MesopicFinding`, `SourceReference`, `MethodologyRecord`.

### Phase 4 — Vertical slice: public zine → signals

```
public zine → consent → topic/format extraction → model-proposed signals
→ validation → sensitivity filter → eligible aggregate → contribution receipt
```

Model-proposed ≠ auto-canonical without validation.

### Phase 5 — Mean Median Mode prototype (read-only, real aggregates)

Present atmosphere from joint central-tendency profiles; inquiry categories (modal assistance types); motifs in ascent; quiet signals; cycle positions; artifact formats; required mean/median/mode + summation strip; methodology; limitations. Demo fixtures labeled demonstration only. No fake statistics.

### Phase 6 — Mesopic Lens

Weak-signal analysis + Starry-Eyed + Shadow Fields; recommend primary UI. Never present weak signals as certainty.

### Phase 7 — RSS freshness

Approved feeds → scheduled fetch → normalize → dedupe → store → extract → Forecast evidence. Small curated set; SSRF/allowlist; server-side only.

### Phase 8 — Forecast (research-API projection chamber)

Harden the existing Forecast spine (`TheForecast.tsx` + `researchService.ts`):

- one live research provider → real `ResearchSynthesisResponse`
- consume Mean Median Mode `CentralTendencyProfile[]` as observed baseline
- RSS signals as freshness spine
- remove random drift / hard-coded cultural shifts presented as live
- one evidence-backed `ForecastReport` with contradictions + uncertainty
- no forecast below thresholds; speculative mode labeled if used

---

## Data model (collective)

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
  contextExcerpt?: string;
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

- **Content** — subject, motif, reference, mood, materials, assistance sought, contradictions, etc.
- **Inquiry** — explanation, research, emotional processing, identity exploration, aesthetic interpretation, decision support, ideation, planning, cultural analysis, naming, rewriting, meaning-making… (broad, non-diagnostic).
- **Form** — essay, collage, question-led, manifesto, moodboard, timeline, dossier, diary, speculative fiction… → expressive *modes* (exploratory, declarative, archival…) labeled at **artifact** level only. Never “this user is X.”

---

## Mean Median Mode UI sections

1. Present Atmosphere (from joint central-tendency profiles)
2. What People Are Seeking (modal inquiry / assistance categories)
3. Mean · Median · Mode strip (required: all three + summation interpretation)
4. Motifs in Ascent
5. Quiet Signals (Mesopic)
6. Collective Tensions
7. Saturation Watch
8. Countercurrents
9. Recurrent Forms
10. Artifact Forms
11. Why Mimi Thinks This (window, sample size, mean/median/mode math, uncertainty, exclusions, last updated)
12. What Mimi May Be Missing (**required**)

Aesthetic: cultural ephemeris / observatory — not Bloomberg cosplay, not generic KPI cards. Every poetic label needs a functional explanation. Mean/median/mode must remain readable as real statistics.

---

## Privacy & consent (non-negotiable)

- Private Scry / Tailor / memory **excluded by default**
- **Publishing to The Proscenium is the consent moment for Mean Median Mode** — users must be told, before the artifact enters public view, that this act contributes anonymized signals to the collective statistical readout
- Do not silently treat `isPublic = true` as analytics contribution without disclosure (current `ZineCard` publish toggle + “Zine Published to Press.” toast is insufficient)
- Preferred product rule (locked unless product later splits the controls):

| Act | Meaning |
| --- | --- |
| **Publish to The Proscenium** | Artifact enters public view **and** becomes eligible to contribute anonymized topic / motif / format / inquiry signals to **Mean Median Mode** |
| **Unpublish** | Leaves the stage and stops future contribution to Mean Median Mode aggregates |
| **Advanced opt-out** (settings or publish confirm) | Stage publicly **without** contributing to Mean Median Mode — available, but secondary |

- Suggested publish-confirm copy (tone may be edited; meaning must remain):

> **Stage on The Proscenium**  
> This places your work in public view.  
> Eligible structure from this artifact — themes, motifs, inquiry types, and form — may contribute anonymized signals to **Mean Median Mode**, Mimi’s collective statistical reading.  
> Your private studio, Tailor memory, and personal Scry remain excluded.  
> Exact wording and private excerpts are not shown in the collective readout.

- Optional secondary line:

> You can unpublish later to stop future contribution. Frozen historical reports may retain anonymized aggregates already computed.

- Align existing legal language: `LegalOverlay` currently describes “Social Floor” anonymized trends — rename/redirect that concept to **Mean Median Mode** / **The Observatory** so legal, publish UI, and product vocabulary match
- Additional fine-grained controls (still useful): exclude quotations; exclude from Forecast; revoke future contribution; contribution receipt
- Sensitivity filtering; no low-volume deanonymization; no person ranking; no diagnosis/identity inference from form
- Deletion / unpublish updates future aggregates; define frozen-report policy
- Contribution receipts for transparency

```ts
interface ContributionReceipt {
  artifactId: string;
  contributedSignalIds: string[];
  excludedSignals: string[];
  exclusionReasons: string[];
  aggregationWindows: string[];
  createdAt: number;
}

/** Set at Proscenium publish confirm */
interface ProsceniumPublishConsent {
  artifactId: string;
  stagedPublicly: true;
  contributeToMeanMedianMode: boolean; // default true when user confirms publish disclosure
  disclosedAt: number;
  disclosureVersion: string;
}
```

### Publish UX requirements

1. Replace one-click silent publish with a confirm step (modal or inline disclosure) the first time per session or whenever contribution settings change.
2. Primary CTA: **Stage on The Proscenium** (or equivalent) — not only “Publish.”
3. Disclosure must name **Mean Median Mode** explicitly.
4. Show what is and is not contributed (structure/signals vs private text/identity).
5. After publish, toast/receipt should say both staged + contributing (or staged without contribution if opted out).
6. Unpublish path must be equally discoverable.
7. Tests: publish without acknowledging disclosure does not set contribution flag; acknowledging with default contributes; opt-out stages without aggregating; unpublish stops future aggregation.

---

## Analytical integrity

Classify every metric as: measured | derived | model-estimated | manually curated | speculative | decorative.  
Decorative metrics must not appear as data. No randomized confidence/sync scores. Popularity ≠ cultural importance.

---

## Testing requirements (collective)

- Private / no-consent zines never aggregate  
- Proscenium publish without disclosure acknowledgment does not contribute to Mean Median Mode  
- Default publish confirm (contributeToMeanMedianMode=true) creates a contribution receipt  
- Publish with advanced opt-out stages publicly but does not aggregate  
- Unpublish stops future contribution  
- Consent creates receipt; sensitive signals removed; low-volume suppressed  
- Deletion stops future contribution; aliases canonicalize  
- Volume alone ≠ Emergent; Recurrent needs history  
- RSS failure preserves prior entries; duplicates deduped  
- Speculative labeled; model failure invents nothing; no random confidence  
- Mean, median, and mode are computed from the same windowed sample and unit basis  
- Spike-driven interpretation fires when mean substantially exceeds median  
- Multimodal sets do not invent a single dominant mood  
- Insufficient sample returns `insufficient_evidence`, not fabricated central tendency  
- Methodology shown; no private excerpts in public reports  
- Mobile + a11y for dashboard  
- Legal / publish copy name Mean Median Mode (not a leftover “Social Floor” only)

---

## Agent operating instructions

### Before editing code, return

1. Current-state findings  
2. Risks and gaps  
3. Proposed architecture  
4. Data model  
5. Privacy decisions  
6. Cycle-position methodology  
7. UI information architecture  
8. Exact file plan  
9. Migration plan  
10. Test plan  

### Then

Implement only the **smallest complete vertical slice**.

### After implementation, return

Changed files · DB/rules/env changes · migration instructions · tests · commands run · results · known limitations · next phase  

**Do not claim functionality without tracing and testing it.**

### Product principle

> **Mean Median Mode** is not a leaderboard.  
> It is an instrument for noticing what many separate practices have begun to say together — measured as mean presence, median typicality, and modal motif, then read as their joint profile.  
> Build it like an observatory with receipts: dim enough to perceive, precise enough to believe, and careful about whose inner world it has been allowed to read.

---

## Suggested execution order for the next agent

1. Prompt 1 registry (or fold into Phase 1 collective audit if scoped to public/research surfaces).  
2. Prompt 4 Scry evidence repair (unblocks trustworthy collective inputs).  
3. Phase 1–4 collective intelligence vertical slice (include `CentralTendencyProfile`).  
4. Phase 5 Mean Median Mode prototype with literal mean/median/mode + summation.  
5. Prompt 8 Forecast repair: live research provider via existing `ResearchSynthesisResponse`, consume Mean Median Mode baselines, kill random drift.  
6. Prompt 9 Proscenium integrity before social vocabulary copy changes.  
7. Prompt 10 release tribunal before any “ship” claim.

---

## Related existing docs / code

- `docs/mimi-system-architecture.md` — canonical personal workflow grammar  
- `docs/CHAMBER_EVIDENCE_AUDIT.md` — chamber routing honesty  
- `docs/EVIDENCE_FOR_MIMI.md` — evidence/provenance thesis  
- `components/TheForecast.tsx` — Forecast UI spine (scopes, vectors, content forecasting)  
- `services/researchService.ts` — provider-normalized projection shape (currently simulated)  
- Existing `npm run verify:*` and Playwright suites — extend; do not replace

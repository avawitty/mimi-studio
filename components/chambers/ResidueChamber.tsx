/**
 * Residue Engine chamber — Phase 8 thin-slice UI.
 * Offline-first cultural / emotional runs with read-only report / MMM / outputs.
 */

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  FileText,
  Heart,
  Layers,
  Loader2,
  Package,
  Play,
  Sparkles,
} from "lucide-react";
import {
  ArchiveChamberShell,
  ArchiveContextPanel,
} from "./ArchiveChamberShell";
import {
  adaptResidueToIntelligenceReport,
  adaptResidueToMeanMedianMode,
  buildResidueProductOutputBundle,
  emotionalSafetyNotice,
  runCulturalResidue,
  runEmotionalResidue,
  type CulturalResidueResult,
  type EmotionalResidueResult,
  type IntelligenceReport,
  type MeanMedianModeResult,
} from "../../services/residue";

type ResidueMode = "cultural" | "emotional";
type PanelTab = "compose" | "report" | "mmm" | "outputs";

type ResidueResult = CulturalResidueResult | EmotionalResidueResult;

export const ResidueChamber: React.FC = () => {
  const [mode, setMode] = useState<ResidueMode>("cultural");
  const [panel, setPanel] = useState<PanelTab>("compose");
  const [query, setQuery] = useState("indie sleaze");
  const [researchQuestion, setResearchQuestion] = useState(
    "How did indie sleaze travel from niche nightlife media into retail?",
  );
  const [experience, setExperience] = useState("feeling left behind");
  const [notes, setNotes] = useState(
    "Indie sleaze emerged from party blogs and nightlife photography, then amplified on short-form revival feeds.\nRetail lookbooks absorbed thrifted partywear codes; some users now report fatigue and backlash.",
  );
  const [sourceUrls, setSourceUrls] = useState("https://example.com/indie-sleaze-explainer");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResidueResult | null>(null);
  const [usedLlm, setUsedLlm] = useState(false);

  const safetyNotice = emotionalSafetyNotice();

  const report: IntelligenceReport | null = useMemo(
    () => (result ? adaptResidueToIntelligenceReport(result) : null),
    [result],
  );
  const mmm = useMemo(
    () => (result ? adaptResidueToMeanMedianMode(result, { includeLiteralCompanion: true }) : null),
    [result],
  );
  const outputs = useMemo(
    () => (result ? buildResidueProductOutputBundle(result) : null),
    [result],
  );

  const workflowStep =
    running ? "collect" : result ? (panel === "compose" ? "read" : "apply") : "collect";

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const urls = sourceUrls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const userNotes = notes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      if (mode === "cultural") {
        const out = await runCulturalResidue(
          {
            query: query.trim() || "untitled cultural inquiry",
            researchQuestion: researchQuestion.trim() || undefined,
            sourceUrls: urls,
            userNotes,
            analysisDepth: "standard",
            retention: "temporary",
            consentToStore: false,
          },
          { llm: { offline: true } },
        );
        setResult(out.result);
        setUsedLlm(out.usedLlm);
      } else {
        const out = await runEmotionalResidue(
          {
            experience: experience.trim() || "reported experience",
            userNotes,
            sourceUrls: urls,
            includeCommunitySources: true,
            includeResearchSources: true,
            retention: "temporary",
            consentToStore: false,
          },
          {
            llm: { offline: true },
            sources: [
              {
                sourceId: "src_research_ui",
                title: "Research review (manual)",
                url: urls[0],
                sourceType: "academic-research",
                accessedAt: new Date().toISOString(),
                evidenceLayer: "A",
                excerpt:
                  "Research discusses social comparison processes and reported envy-adjacent experiences without diagnosing readers.",
              },
              {
                sourceId: "src_forum_ui",
                title: "Community language (manual)",
                sourceType: "forum",
                accessedAt: new Date().toISOString(),
                evidenceLayer: "C",
                excerpt:
                  "People describing similar experiences often mention checking feeds and feeling left behind.",
                metadata: {
                  fullText: userNotes.join(" ") || notes,
                },
              },
            ],
          },
        );
        setResult(out.result);
        setUsedLlm(out.usedLlm);
      }
      setPanel("report");
    } catch (e) {
      console.error("MIMI // Residue run failed:", e);
      setError(e instanceof Error ? e.message : "Residue run failed");
    } finally {
      setRunning(false);
    }
  };

  const contextDrawer = (
    <ArchiveContextPanel
      title={mode === "cultural" ? "Cultural Residue" : "Emotional Residue"}
      subtitle={
        mode === "cultural"
          ? "How ideas travel through society — provenance-forward"
          : "How reported experiences travel through language — non-diagnostic"
      }
    >
      <div className="space-y-3">
        <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
          What this means
        </p>
        <p className="font-serif italic text-sm leading-relaxed archive-text-ink">
          {mode === "cultural"
            ? "Trace definition, lineage, codes, absorption, and countersignals. Model-proposed claims stay labeled."
            : "Map interpretive neighborhoods across research and community language. This does not determine what is true about you."}
        </p>
      </div>
      {mode === "emotional" ? (
        <div className="rounded-sm border border-amber-700/30 bg-amber-50/40 px-3 py-3">
          <p className="font-mono text-[8px] uppercase tracking-widest text-amber-900/70 mb-1">
            Safety
          </p>
          <p className="font-sans text-[11px] leading-relaxed text-amber-950/80">{safetyNotice}</p>
        </div>
      ) : null}
      <div className="space-y-3 pt-2 border-t archive-border">
        <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
          What to do next
        </p>
        <ul className="font-sans text-[10px] archive-text-muted space-y-2 list-none">
          <li>Compose an inquiry and run offline (no gateway required).</li>
          <li>Read the Intelligence Report and Mean / Median / Mode panels.</li>
          <li>Inspect product outputs as proposals — nothing auto-merges to Memory or Taste Graph.</li>
          <li>Hand structured results to Intel Hub / The Edit when ready.</li>
        </ul>
      </div>
      {result ? (
        <div className="space-y-2 pt-2 border-t archive-border">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            Last run
          </p>
          <p className="font-mono text-[10px] archive-text-ink">
            {result.metadata.runId}
          </p>
          <p className="font-sans text-[10px] archive-text-muted">
            Sources {result.sources.length} · Evidence {result.evidence.length} · Confidence{" "}
            {result.confidenceSummary.overallConfidence.toFixed(2)} · Layer{" "}
            {result.confidenceSummary.strongestEvidenceLayer}
            {usedLlm ? " · LLM" : " · Offline"}
          </p>
        </div>
      ) : null}
    </ArchiveContextPanel>
  );

  return (
    <ArchiveChamberShell
      moduleId="residue"
      activeWorkflowStep={workflowStep}
      workflowSteps={["collect", "read", "apply"]}
      headerNote={
        mode === "cultural"
          ? "Cultural Residue · offline-first travel map with provenance and uncertainty."
          : "Emotional Residue · interpretive neighborhoods · never a diagnosis."
      }
      contextDrawer={contextDrawer}
      contextDrawerOpen
      spine={
        <>
          <button
            type="button"
            title="Cultural Residue"
            onClick={() => {
              setMode("cultural");
              setPanel("compose");
            }}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              mode === "cultural" ? "is-active border-white/20" : ""
            }`}
          >
            <Layers size={14} />
          </button>
          <button
            type="button"
            title="Emotional Residue"
            onClick={() => {
              setMode("emotional");
              setPanel("compose");
            }}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              mode === "emotional" ? "is-active border-white/20" : ""
            }`}
          >
            <Heart size={14} />
          </button>
          <div className="w-6 h-px bg-white/10 my-1" />
          <button
            type="button"
            title="Compose"
            onClick={() => setPanel("compose")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              panel === "compose" ? "is-active border-white/20" : ""
            }`}
          >
            <Sparkles size={14} />
          </button>
          <button
            type="button"
            title="Intelligence Report"
            disabled={!result}
            onClick={() => setPanel("report")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent disabled:opacity-30 ${
              panel === "report" ? "is-active border-white/20" : ""
            }`}
          >
            <FileText size={14} />
          </button>
          <button
            type="button"
            title="Mean / Median / Mode"
            disabled={!result}
            onClick={() => setPanel("mmm")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent disabled:opacity-30 ${
              panel === "mmm" ? "is-active border-white/20" : ""
            }`}
          >
            <BarChart3 size={14} />
          </button>
          <button
            type="button"
            title="Product outputs"
            disabled={!result}
            onClick={() => setPanel("outputs")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent disabled:opacity-30 ${
              panel === "outputs" ? "is-active border-white/20" : ""
            }`}
          >
            <Package size={14} />
          </button>
        </>
      }
      canvas={
        <div className="h-full min-h-0 overflow-y-auto p-4 md:p-8 space-y-4">
          {mode === "emotional" ? (
            <div className="rounded-sm border border-amber-700/25 bg-amber-50/50 px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-amber-900/70 mb-1">
                Non-diagnostic notice
              </p>
              <p className="font-sans text-[12px] leading-relaxed text-amber-950/85">{safetyNotice}</p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-sm border border-rose-400/40 bg-rose-50/40 px-4 py-3 font-mono text-[11px] text-rose-700">
              {error}
            </div>
          ) : null}

          {panel === "compose" ? (
            <ComposePanel
              mode={mode}
              query={query}
              setQuery={setQuery}
              researchQuestion={researchQuestion}
              setResearchQuestion={setResearchQuestion}
              experience={experience}
              setExperience={setExperience}
              notes={notes}
              setNotes={setNotes}
              sourceUrls={sourceUrls}
              setSourceUrls={setSourceUrls}
              running={running}
              onRun={() => void run()}
            />
          ) : null}

          {panel === "report" && report ? <ReportPanel report={report} /> : null}
          {panel === "mmm" && mmm ? <MmmPanel interpretive={mmm.interpretive} literal={mmm.literal} /> : null}
          {panel === "outputs" && outputs ? <OutputsPanel outputs={outputs} /> : null}

          {(panel === "report" || panel === "mmm" || panel === "outputs") && !result ? (
            <EmptyRunHint onCompose={() => setPanel("compose")} />
          ) : null}
        </div>
      }
    />
  );
};

function ComposePanel(props: {
  mode: ResidueMode;
  query: string;
  setQuery: (v: string) => void;
  researchQuestion: string;
  setResearchQuestion: (v: string) => void;
  experience: string;
  setExperience: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  sourceUrls: string;
  setSourceUrls: (v: string) => void;
  running: boolean;
  onRun: () => void;
}) {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] archive-text-muted mb-2">
          Composer · offline-first
        </p>
        <h2 className="font-serif italic text-2xl archive-text-ink">
          {props.mode === "cultural" ? "Cultural inquiry" : "Reported experience"}
        </h2>
        <p className="font-sans text-[11px] archive-text-muted mt-2 leading-relaxed">
          Runs against the Residue engine without AI Gateway. Live enrichment and Apify acquisition
          stay optional for later phases.
        </p>
      </div>

      {props.mode === "cultural" ? (
        <>
          <Field label="Query">
            <input
              value={props.query}
              onChange={(e) => props.setQuery(e.target.value)}
              className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-serif text-sm archive-text-ink"
              placeholder="indie sleaze"
            />
          </Field>
          <Field label="Research question">
            <input
              value={props.researchQuestion}
              onChange={(e) => props.setResearchQuestion(e.target.value)}
              className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-serif text-sm archive-text-ink"
            />
          </Field>
        </>
      ) : (
        <Field label="Experience (redacted on store)">
          <input
            value={props.experience}
            onChange={(e) => props.setExperience(e.target.value)}
            className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-serif text-sm archive-text-ink"
            placeholder="feeling left behind"
          />
        </Field>
      )}

      <Field label="Notes / excerpts (one per line)">
        <textarea
          value={props.notes}
          onChange={(e) => props.setNotes(e.target.value)}
          rows={6}
          className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-serif text-sm leading-relaxed resize-y min-h-[120px] archive-text-ink"
        />
      </Field>

      <Field label="Source URLs (optional)">
        <textarea
          value={props.sourceUrls}
          onChange={(e) => props.setSourceUrls(e.target.value)}
          rows={2}
          className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-mono text-[11px] resize-y archive-text-ink"
          placeholder="https://…"
        />
      </Field>

      <button
        type="button"
        onClick={props.onRun}
        disabled={props.running}
        className="inline-flex items-center gap-2 px-5 py-3 border archive-border bg-archive-ink text-white font-mono text-[9px] uppercase tracking-[0.25em] disabled:opacity-50 hover:opacity-90"
      >
        {props.running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        {props.running ? "Running…" : "Run Residue (offline)"}
      </button>
    </div>
  );
}

function ReportPanel({ report }: { report: IntelligenceReport }) {
  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2 border-b archive-border pb-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] archive-text-muted">
          Intelligence Report · read-only
        </p>
        <h2 className="font-serif italic text-2xl archive-text-ink">{report.title}</h2>
        <p className="font-sans text-[12px] archive-text-muted">{report.dek}</p>
        {report.safetyNotice ? (
          <p className="font-sans text-[11px] text-amber-900/80 border border-amber-700/20 bg-amber-50/40 px-3 py-2">
            {report.safetyNotice}
          </p>
        ) : null}
      </header>

      <Section title="Executive summary">
        <p className="font-serif text-[15px] leading-relaxed archive-text-ink">{report.executiveSummary}</p>
      </Section>

      <Section title="Research question">
        <p className="font-sans text-[13px] archive-text-ink">{report.researchQuestion}</p>
      </Section>

      <Section title="Major findings">
        <ul className="space-y-3">
          {report.majorFindings.map((f) => (
            <li key={f.claimId} className="border archive-border px-3 py-3">
              <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted mb-1">
                {f.status} · conf {f.confidence.toFixed(2)}
              </p>
              <p className="font-sans text-[13px] archive-text-ink leading-relaxed">{f.statement}</p>
            </li>
          ))}
          {report.majorFindings.length === 0 ? (
            <p className="font-mono text-[10px] archive-text-muted">No major findings in this run.</p>
          ) : null}
        </ul>
      </Section>

      <Section title="Map / timeline">
        <div className="grid md:grid-cols-2 gap-3">
          {report.culturalOrInterpretiveMap.map((item) => (
            <div key={item.id} className="border archive-border px-3 py-3">
              <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                {item.kind}
              </p>
              <p className="font-serif italic text-sm archive-text-ink mt-1">{item.label}</p>
              <p className="font-sans text-[11px] archive-text-muted mt-1 leading-relaxed">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
        {report.timeline.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {report.timeline.map((t) => (
              <li key={t.id} className="font-sans text-[12px] archive-text-ink">
                <span className="font-mono text-[9px] archive-text-muted mr-2">
                  {t.startYear ?? "—"}
                </span>
                <span className="font-serif italic">{t.label}</span> — {t.summary}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Uncertainty & next questions">
        <ul className="list-disc pl-4 space-y-1 font-sans text-[12px] archive-text-muted">
          {report.uncertainty.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
        <ul className="mt-3 space-y-1">
          {report.recommendedNextResearchQuestions.map((q) => (
            <li key={q} className="font-serif italic text-sm archive-text-ink">
              {q}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evidence audit">
        <p className="font-mono text-[10px] archive-text-muted">
          Evidence {report.evidenceAudit.evidenceCount} · Model-proposed{" "}
          {report.evidenceAudit.modelProposedClaimCount} · Strongest layer{" "}
          {report.evidenceAudit.strongestLayer} · Sources {report.sourceManifest.total}
        </p>
      </Section>
    </div>
  );
}

function MmmPanel({
  interpretive,
  literal,
}: {
  interpretive: MeanMedianModeResult;
  literal?: MeanMedianModeResult;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2 border-b archive-border pb-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] archive-text-muted">
          Mean / Median / Mode
        </p>
        <h2 className="font-serif italic text-2xl archive-text-ink">{interpretive.subject}</h2>
        <p className="font-mono text-[10px] archive-text-muted">
          analysisKind: {interpretive.analysisKind}
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-3">
        <MmmCard
          title="Mean"
          body={interpretive.mean.synthesis}
          meta={interpretive.mean.caveats.join(" · ")}
        />
        <MmmCard
          title="Median"
          body={interpretive.median.centralPosition}
          meta={interpretive.median.excludedOrDownweightedOutliers.join(" · ") || "—"}
        />
        <MmmCard
          title="Mode"
          body={interpretive.mode.dominantPattern}
          meta={`frequency ${interpretive.mode.frequency ?? "—"}`}
        />
      </div>

      {interpretive.counterMode.length > 0 ? (
        <Section title="Counter-mode">
          <ul className="space-y-2">
            {interpretive.counterMode.map((c) => (
              <li
                key={c.claimId}
                className="font-sans text-[12px] archive-text-ink border archive-border px-3 py-2"
              >
                <span className="font-mono text-[8px] uppercase tracking-widest archive-text-muted mr-2">
                  {c.status}
                </span>
                {c.statement}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {literal ? (
        <Section title="Literal companion (not interpretive)">
          <p className="font-mono text-[10px] archive-text-muted mb-2">
            analysisKind: {literal.analysisKind}
          </p>
          <p className="font-sans text-[12px] archive-text-ink">
            Mean {literal.mean.numericValue?.toFixed?.(3) ?? literal.mean.synthesis} · Median{" "}
            {literal.median.numericValue?.toFixed?.(3) ?? literal.median.centralPosition} · Mode{" "}
            {literal.mode.dominantPattern}
          </p>
          <p className="font-sans text-[11px] archive-text-muted mt-2">
            {literal.mean.caveats[0]}
          </p>
        </Section>
      ) : null}
    </div>
  );
}

function OutputsPanel({
  outputs,
}: {
  outputs: ReturnType<typeof buildResidueProductOutputBundle>;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2 border-b archive-border pb-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] archive-text-muted">
          Product outputs · proposals only
        </p>
        <h2 className="font-serif italic text-2xl archive-text-ink">Downstream artifacts</h2>
        <p className="font-sans text-[12px] archive-text-muted">
          Memory atoms and Taste Graph nodes stay unapproved until a human accepts them. Nothing
          auto-writes to live Memory.
        </p>
      </header>

      <Section title={`Zine · ${outputs.zine.pages.length} pages`}>
        <ul className="space-y-2">
          {outputs.zine.pages.map((p) => (
            <li key={p.pageNumber} className="border archive-border px-3 py-2">
              <p className="font-mono text-[8px] archive-text-muted">Page {p.pageNumber}</p>
              <p className="font-serif italic text-sm archive-text-ink">{p.headline}</p>
              <p className="font-sans text-[11px] archive-text-muted mt-1 line-clamp-3">{p.bodyCopy}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="The Edit · editorial direction">
        <p className="font-mono text-[9px] uppercase tracking-widest archive-text-muted mb-1">
          {outputs.editorialDirection.approvalState}
        </p>
        <p className="font-serif italic text-base archive-text-ink">{outputs.editorialDirection.thesis}</p>
        <p className="font-sans text-[12px] archive-text-muted mt-2">{outputs.editorialDirection.lead}</p>
      </Section>

      <Section title="Forecast · scenarios">
        <ul className="space-y-2">
          {outputs.forecast.scenarios.map((s) => (
            <li key={s.id} className="border archive-border px-3 py-2">
              <p className="font-mono text-[8px] archive-text-muted">{s.kind}</p>
              <p className="font-serif italic text-sm archive-text-ink">{s.label}</p>
              <p className="font-sans text-[11px] archive-text-muted mt-1">{s.summary}</p>
            </li>
          ))}
        </ul>
        <p className="font-mono text-[9px] archive-text-muted mt-2">{outputs.forecast.provenanceNote}</p>
      </Section>

      <Section title={`Taste Graph · ${outputs.tasteGraphDelta.nodes.length} suggested nodes`}>
        <p className="font-sans text-[11px] archive-text-muted mb-2">
          {outputs.tasteGraphDelta.curationNote}
        </p>
        <ul className="flex flex-wrap gap-2">
          {outputs.tasteGraphDelta.nodes.slice(0, 12).map((n) => (
            <li
              key={n.id}
              className="font-mono text-[9px] uppercase tracking-wider border archive-border px-2 py-1 archive-text-ink"
            >
              {n.label.slice(0, 40)}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Memory atom proposals · ${outputs.memoryAtomProposals.length}`}>
        <ul className="space-y-2">
          {outputs.memoryAtomProposals.slice(0, 6).map((p) => (
            <li key={p.proposalId} className="border archive-border px-3 py-2">
              <p className="font-mono text-[8px] archive-text-muted">
                {p.approvalState} · {p.claimStatus}
              </p>
              <p className="font-sans text-[12px] archive-text-ink mt-1">{p.atomicClaim}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function EmptyRunHint({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 py-12">
      <p className="font-serif italic text-xl archive-text-ink">No residue run yet.</p>
      <button
        type="button"
        onClick={onCompose}
        className="font-mono text-[9px] uppercase tracking-widest border archive-border px-4 py-2"
      >
        Open composer
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[8px] uppercase tracking-[0.25em] archive-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-mono text-[8px] uppercase tracking-[0.3em] archive-text-muted">{title}</h3>
      {children}
    </section>
  );
}

function MmmCard({ title, body, meta }: { title: string; body: string; meta: string }) {
  return (
    <div className="border archive-border px-3 py-3 space-y-2">
      <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">{title}</p>
      <p className="font-serif italic text-sm archive-text-ink leading-relaxed">{body}</p>
      <p className="font-sans text-[10px] archive-text-muted leading-relaxed">{meta}</p>
    </div>
  );
}

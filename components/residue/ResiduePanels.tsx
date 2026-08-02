import React from "react";
import type {
  CulturalResidueResult,
  EmotionalResidueResult,
  EvidenceRecord,
  MeanMedianModeResult,
  ResidueClaim,
  SourceReference,
} from "../../services/residue/validation";
import type { ResidueZineArtifact } from "../../services/residue/adapters/zineAdapter";
import type { ResidueEditorialDirection } from "../../services/residue/adapters/editAdapter";
import type { ResidueForecastArtifact } from "../../services/residue/adapters/forecastAdapter";
import type { ResidueTasteGraphDelta } from "../../services/residue/adapters/tasteGraphAdapter";
import type { ResidueMemoryAtomProposal } from "../../services/residue/adapters/memoryAtomAdapter";
import { RESIDUE_CHAMBER_COPY } from "../../lib/residueChamberContract";
import { ResidueSafetyBanner } from "./ResidueSafetyBanner";

const monoLabel =
  "font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle";

function ClaimCard({ claim }: { claim: ResidueClaim }) {
  return (
    <article className="border border-nous-border bg-white px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <span className={monoLabel}>{claim.status}</span>
        <span className={monoLabel}>
          conf {(claim.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <p className="font-serif text-[15px] leading-snug text-nous-text">
        {claim.statement}
      </p>
      {claim.uncertaintyFlags.length > 0 ? (
        <p className="font-mono text-[8px] tracking-wide text-nous-subtle">
          {claim.uncertaintyFlags.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}

function ClaimStack({
  title,
  claims,
}: {
  title: string;
  claims: ResidueClaim[];
}) {
  if (claims.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className={monoLabel}>{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {claims.map((claim) => (
          <ClaimCard key={claim.claimId} claim={claim} />
        ))}
      </div>
    </section>
  );
}

export function ResidueCulturalSynthesis({
  result,
}: {
  result: CulturalResidueResult;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-3 max-w-3xl">
        <p className={monoLabel}>Definition · {result.query}</p>
        <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
          {result.definition.statement}
        </p>
        <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-nous-subtle">
          Overall confidence{" "}
          {(result.confidenceSummary.overallConfidence * 100).toFixed(0)}% ·{" "}
          {result.confidenceSummary.summary}
        </p>
      </section>

      {result.lineage.length > 0 ? (
        <section className="space-y-3">
          <h3 className={monoLabel}>Lineage</h3>
          <ol className="space-y-3">
            {result.lineage.map((stage) => (
              <li
                key={stage.stageId}
                className="border-l border-nous-border pl-4 py-1"
              >
                <p className={monoLabel}>
                  {stage.stage}
                  {stage.startYear ? ` · ${stage.startYear}` : ""}
                  {stage.endYear ? `–${stage.endYear}` : ""}
                </p>
                <p className="font-serif text-[15px] text-nous-text mt-1">
                  {stage.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {result.culturalCodes.length > 0 ? (
        <section className="space-y-3">
          <h3 className={monoLabel}>Cultural codes</h3>
          <div className="flex flex-wrap gap-2">
            {result.culturalCodes.map((code) => (
              <span
                key={code.codeId}
                className="border border-nous-border px-3 py-1.5 font-mono text-[9px] tracking-wide text-nous-text bg-white"
              >
                {code.category}: {code.label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <ClaimStack title="Surviving meanings" claims={result.survivingMeanings} />
      <ClaimStack title="Lost meanings" claims={result.lostMeanings} />
      <ClaimStack
        title="Computationally introduced"
        claims={result.computationallyIntroducedMeanings}
      />
      <ClaimStack
        title="Commercial absorption"
        claims={result.commercialAbsorption}
      />
      <ClaimStack title="Counter-signals" claims={result.counterSignals} />

      {result.evidenceGaps.length > 0 ? (
        <section className="space-y-2">
          <h3 className={monoLabel}>Evidence gaps</h3>
          <ul className="space-y-1">
            {result.evidenceGaps.map((gap) => (
              <li
                key={gap}
                className="font-sans text-[12px] text-nous-subtle leading-relaxed"
              >
                {gap}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function ResidueEmotionalSynthesis({
  result,
}: {
  result: EmotionalResidueResult;
}) {
  return (
    <div className="space-y-8">
      <ResidueSafetyBanner notice={result.safetyNotice} />

      <section className="space-y-3 max-w-3xl">
        <p className={monoLabel}>Normalized experience</p>
        <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
          {result.normalizedExperience}
        </p>
        <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-nous-subtle">
          Overall confidence{" "}
          {(result.confidenceSummary.overallConfidence * 100).toFixed(0)}%
        </p>
      </section>

      {result.interpretiveNeighborhoods.length > 0 ? (
        <section className="space-y-3">
          <h3 className={monoLabel}>Interpretive neighborhoods</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {result.interpretiveNeighborhoods.map((n) => (
              <article
                key={n.neighborhoodId}
                className="border border-nous-border bg-white px-4 py-3 space-y-2"
              >
                <div className="flex justify-between gap-2">
                  <span className={monoLabel}>{n.status}</span>
                  <span className={monoLabel}>
                    {(n.relevanceScore * 100).toFixed(0)}% · {n.scoreMeaning}
                  </span>
                </div>
                <p className="font-serif text-[16px] text-nous-text">{n.label}</p>
                <p className="font-sans text-[12px] text-nous-subtle leading-relaxed">
                  {n.description}
                </p>
                {n.distinctions.length > 0 ? (
                  <p className="font-mono text-[8px] text-nous-subtle tracking-wide">
                    {n.distinctions.join(" · ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <ClaimStack title="Neighboring feelings" claims={result.neighboringFeelings} />
      <ClaimStack title="Common triggers" claims={result.commonTriggers} />
      <ClaimStack
        title="Common interpretations"
        claims={result.commonInterpretations}
      />
      <ClaimStack
        title="Alternative interpretations"
        claims={result.alternativeInterpretations}
      />
      <ClaimStack title="Community patterns" claims={result.communityPatterns} />
      <ClaimStack title="Cognitive patterns" claims={result.cognitivePatterns} />

      {result.adaptiveResponses.length > 0 ? (
        <section className="space-y-3">
          <h3 className={monoLabel}>Adaptive responses (reported)</h3>
          <div className="space-y-3">
            {result.adaptiveResponses.map((r) => (
              <article
                key={r.responseId}
                className="border border-nous-border bg-white px-4 py-3 space-y-1"
              >
                <p className={monoLabel}>
                  {r.category} · {r.evidenceStrength}
                </p>
                <p className="font-serif text-[15px] text-nous-text">{r.label}</p>
                <p className="font-sans text-[12px] text-nous-subtle leading-relaxed">
                  {r.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ResidueEvidencePanel({
  evidence,
  sources,
}: {
  evidence: EvidenceRecord[];
  sources: SourceReference[];
}) {
  const sourceById = new Map(sources.map((s) => [s.sourceId, s]));
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className={monoLabel}>Sources · {sources.length}</h3>
        <div className="space-y-2">
          {sources.map((s) => (
            <div
              key={s.sourceId}
              className="border border-nous-border bg-white px-4 py-3 flex flex-col md:flex-row md:items-baseline md:justify-between gap-1"
            >
              <div>
                <p className="font-serif text-[14px] text-nous-text">
                  {s.title || s.url || s.sourceId}
                </p>
                {s.excerpt ? (
                  <p className="font-sans text-[11px] text-nous-subtle mt-1 leading-relaxed">
                    {s.excerpt}
                  </p>
                ) : null}
              </div>
              <p className={monoLabel}>
                layer {s.evidenceLayer} · {s.sourceType}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={monoLabel}>Evidence · {evidence.length}</h3>
        <div className="space-y-2">
          {evidence.map((ev) => {
            const src = sourceById.get(ev.sourceId);
            return (
              <article
                key={ev.evidenceId}
                className="border border-nous-border bg-white px-4 py-3 space-y-1"
              >
                <p className={monoLabel}>
                  {ev.evidenceStrength} · layer {ev.evidenceLayer}
                  {src ? ` · ${src.sourceType}` : ""}
                </p>
                <p className="font-serif text-[14px] text-nous-text">
                  {ev.claimSupported}
                </p>
                <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
                  {ev.excerpt}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ResidueMmmPanel({
  interpretive,
  literal,
}: {
  interpretive: MeanMedianModeResult;
  literal?: MeanMedianModeResult;
}) {
  const renderMmm = (mmm: MeanMedianModeResult, title: string) => (
    <section className="space-y-4 border border-nous-border bg-white px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif italic text-xl text-nous-text">{title}</h3>
        <span className={monoLabel}>{mmm.analysisKind}</span>
      </div>
      <p className="font-sans text-[12px] text-nous-subtle">{mmm.subject}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className={monoLabel}>Mean</p>
          <p className="font-serif text-[14px] text-nous-text leading-snug">
            {mmm.mean.synthesis}
          </p>
        </div>
        <div className="space-y-1">
          <p className={monoLabel}>Median</p>
          <p className="font-serif text-[14px] text-nous-text leading-snug">
            {mmm.median.centralPosition}
          </p>
        </div>
        <div className="space-y-1">
          <p className={monoLabel}>Mode</p>
          <p className="font-serif text-[14px] text-nous-text leading-snug">
            {mmm.mode.dominantPattern}
          </p>
        </div>
      </div>
      <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-nous-subtle">
        Spread {mmm.spread.level} — {mmm.spread.description}
      </p>
      <ClaimStack title="Outliers" claims={mmm.outliers} />
      <ClaimStack title="Counter-mode" claims={mmm.counterMode} />
    </section>
  );

  return (
    <div className="space-y-6">
      {renderMmm(interpretive, "Interpretive metaphor")}
      {literal ? renderMmm(literal, "Literal companion scores") : null}
    </div>
  );
}

export interface ResidueProductBundleView {
  zine: ResidueZineArtifact;
  editorialDirection: ResidueEditorialDirection;
  forecast: ResidueForecastArtifact;
  tasteGraphDelta: ResidueTasteGraphDelta;
  memoryAtomProposals: ResidueMemoryAtomProposal[];
}

export function ResidueProductsPanel({
  bundle,
}: {
  bundle: ResidueProductBundleView;
}) {
  return (
    <div className="space-y-6">
      <p className="font-sans text-[12px] text-nous-subtle leading-relaxed max-w-2xl">
        {RESIDUE_CHAMBER_COPY.productsNote}
      </p>

      <section className="border border-nous-border bg-white px-5 py-4 space-y-2">
        <p className={monoLabel}>Zine pages · proposed</p>
        <p className="font-serif text-lg text-nous-text">{bundle.zine.title}</p>
        <ul className="space-y-2 mt-2">
          {bundle.zine.pages.slice(0, 4).map((page) => (
            <li key={`${page.pageNumber}-${page.headline}`}>
              <p className="font-serif text-[14px] text-nous-text">{page.headline}</p>
              <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
                {page.bodyCopy}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-nous-border bg-white px-5 py-4 space-y-2">
        <p className={monoLabel}>
          The Edit · {bundle.editorialDirection.approvalState}
        </p>
        <p className="font-serif italic text-[16px] text-nous-text">
          {bundle.editorialDirection.thesis}
        </p>
        <p className="font-sans text-[12px] text-nous-subtle leading-relaxed">
          {bundle.editorialDirection.lead}
        </p>
      </section>

      <section className="border border-nous-border bg-white px-5 py-4 space-y-2">
        <p className={monoLabel}>Forecast · residue projection</p>
        <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
          {bundle.forecast.provenanceNote}
        </p>
        <ul className="space-y-1 mt-2">
          {bundle.forecast.scenarios.slice(0, 3).map((s) => (
            <li key={s.id} className="font-serif text-[14px]">
              {s.label}: {s.summary}
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-nous-border bg-white px-5 py-4 space-y-2">
        <p className={monoLabel}>
          Taste Graph delta ·{" "}
          {bundle.tasteGraphDelta.nodes.length} suggested nodes
        </p>
        <p className="font-sans text-[11px] text-nous-subtle">
          {bundle.tasteGraphDelta.curationNote}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {bundle.tasteGraphDelta.nodes.slice(0, 8).map((n) => (
            <span
              key={n.id}
              className="border border-nous-border px-2 py-1 font-mono text-[8px] tracking-wide"
            >
              {n.label} · {n.userStatus}
            </span>
          ))}
        </div>
      </section>

      <section className="border border-nous-border bg-white px-5 py-4 space-y-2">
        <p className={monoLabel}>
          Memory atom proposals ·{" "}
          {bundle.memoryAtomProposals.length} (approval required)
        </p>
        <ul className="space-y-2">
          {bundle.memoryAtomProposals.slice(0, 5).map((p) => (
            <li key={p.proposalId} className="font-serif text-[14px] text-nous-text">
              {p.atomicClaim}
              <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-1">
                {p.approvalState} · conf {(p.confidence * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

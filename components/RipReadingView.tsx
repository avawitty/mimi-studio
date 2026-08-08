import React, { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  EyeOff,
  FlaskConical,
  Info,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import type {
  RipInverseFunction,
  RipReading,
  RipSavableInsightKind,
  RipSourceKind,
} from "../types";
import { labelInverseFunction } from "../services/ripEngine";

interface RipReadingViewProps {
  reading: RipReading;
  handle?: string;
  isOwner?: boolean;
  onRegenerate?: () => void;
  onTogglePublish?: () => void;
  onSaveInsight?: (input: {
    kind: RipSavableInsightKind;
    label: string;
    value: string;
    inverseFunction?: RipInverseFunction;
  }) => void;
  onRemoveInsight?: (insightId: string) => void;
  savedInsights?: Array<{ id: string; kind: RipSavableInsightKind; value: string }>;
  publishing?: boolean;
  regenerating?: boolean;
  compact?: boolean;
  /** Inside Studio chamber — skip duplicate mimi.rip eyebrow (chrome already brands). */
  embedded?: boolean;
}

const SOURCE_LABELS: Record<RipSourceKind, string> = {
  likeness_manifest: "Likeness",
  evidence_dossier: "Dossier",
  doll_projection: "Doll",
  tailor_draft: "Tailor draft",
  synthesized: "Synthesized",
};

function insightKey(kind: RipSavableInsightKind, value: string): string {
  return `${kind}::${value}`;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-rose-400/70 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[8px] text-stone-500">{pct}%</span>
    </div>
  );
}

function SavePinButton({
  kind,
  label,
  value,
  inverseFunction,
  saved,
  onSave,
  onRemove,
  savedId,
}: {
  kind: RipSavableInsightKind;
  label: string;
  value: string;
  inverseFunction?: RipInverseFunction;
  saved?: boolean;
  onSave?: (input: {
    kind: RipSavableInsightKind;
    label: string;
    value: string;
    inverseFunction?: RipInverseFunction;
  }) => void;
  onRemove?: (id: string) => void;
  savedId?: string;
}) {
  if (!onSave) return null;
  return (
    <button
      type="button"
      onClick={() => {
        if (saved && savedId && onRemove) {
          onRemove(savedId);
        } else {
          onSave({ kind, label, value, inverseFunction });
        }
      }}
      className={`p-1.5 border shrink-0 ${
        saved
          ? "border-rose-400/50 text-rose-200 bg-rose-500/10"
          : "border-white/10 text-stone-500 hover:text-stone-200 hover:border-white/20"
      }`}
      title={saved ? "Remove saved insight" : "Save to rip insights"}
    >
      {saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
    </button>
  );
}

export const RipReadingView: React.FC<RipReadingViewProps> = ({
  reading,
  handle,
  isOwner,
  onRegenerate,
  onTogglePublish,
  onSaveInsight,
  onRemoveInsight,
  savedInsights,
  publishing,
  regenerating,
  compact,
  embedded,
}) => {
  const [showDecisionSupport, setShowDecisionSupport] = useState(false);
  const accent =
    reading.oppositePalette.find((p) => p.startsWith("#")) || "#5c1a2e";
  const isPublic = reading.visibility === "public";
  const coverage = reading.inputCoverage;
  const coveragePct = coverage ? Math.round(coverage.coverageScore * 100) : null;

  const savedKeySet = new Set(
    savedInsights?.map((i) => insightKey(i.kind, i.value)) ?? [],
  );

  const findSavedId = (kind: RipSavableInsightKind, value: string) =>
    savedInsights?.find((i) => i.kind === kind && i.value === value)?.id;

  const isSaved = (kind: RipSavableInsightKind, value: string) =>
    savedKeySet.has(insightKey(kind, value));

  return (
    <div
      className={`text-stone-100 ${compact ? "" : "min-h-full"}`}
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, #1a0f14 0%, #0a0a0c 45%, #050506 100%)",
      }}
    >
      <div
        className={
          compact
            ? "p-6 space-y-6"
            : "max-w-3xl mx-auto px-5 sm:px-8 py-8 md:py-10 space-y-8"
        }
      >
        <header className="space-y-3 border-b border-white/10 pb-6">
          {!embedded ? (
            <p className="font-mono text-[9px] tracking-[0.28em] text-rose-300/70">
              mimi.rip · inverse taste projection
            </p>
          ) : (
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-rose-300/70">
              Inverse taste projection
            </p>
          )}
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight">{reading.title}</h1>
          {handle ? (
            <p className="font-mono text-[10px] tracking-widest text-stone-500">
              @{handle}
            </p>
          ) : null}
          {coverage ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-400/60 rounded-full transition-all"
                    style={{ width: `${coveragePct}%` }}
                  />
                </div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                  Graph coverage {coveragePct}%
                </span>
              </div>
              {coverage.dollName ? (
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-600">
                  via {coverage.dollName}
                </span>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {coverage.activeSources.map((src) => (
                  <span
                    key={src}
                    className="font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 border border-white/10 text-stone-500"
                  >
                    {SOURCE_LABELS[src]}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <p className="font-serif italic text-lg text-stone-300 max-w-2xl leading-relaxed">
            {reading.shadowThesis}
          </p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-stone-600">
            Not identity · Not diagnosis · Projection of refusals & blind spots
          </p>
        </header>

        {isOwner && (onRegenerate || onTogglePublish) ? (
          <div className="flex flex-wrap gap-2">
            {onRegenerate ? (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="px-3 py-2 border border-white/15 font-mono text-[9px] uppercase tracking-widest hover:bg-white/5 flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={11} className={regenerating ? "animate-spin" : ""} />
                Re-derive from graph
              </button>
            ) : null}
            {onTogglePublish ? (
              <button
                type="button"
                onClick={onTogglePublish}
                disabled={publishing}
                className={`px-3 py-2 border font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50 ${
                  isPublic
                    ? "border-rose-400/40 text-rose-200 bg-rose-500/10"
                    : "border-white/15 hover:bg-white/5"
                }`}
              >
                {isPublic ? <EyeOff size={11} /> : <Share2 size={11} />}
                {isPublic ? "Unpublish from mimi.rip" : "Publish to mimi.rip"}
              </button>
            ) : null}
            {reading.fieldAttributions?.length ? (
              <button
                type="button"
                onClick={() => setShowDecisionSupport((v) => !v)}
                className="px-3 py-2 border border-white/15 font-mono text-[9px] uppercase tracking-widest hover:bg-white/5 flex items-center gap-1.5"
              >
                <Info size={11} />
                {showDecisionSupport ? "Hide election data" : "How this was elected"}
              </button>
            ) : null}
          </div>
        ) : null}

        {showDecisionSupport && reading.fieldAttributions?.length ? (
          <section className="border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Election support · field attributions
            </h2>
            <div className="space-y-3">
              {reading.fieldAttributions.map((attr) => (
                <div
                  key={attr.field}
                  className="border-b border-white/5 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-rose-300/70">
                      {attr.field}
                    </span>
                    {attr.inverseFunction ? (
                      <span className="font-mono text-[7px] uppercase tracking-wider text-stone-600">
                        {labelInverseFunction(attr.inverseFunction)}
                      </span>
                    ) : null}
                    <ConfidenceBar value={attr.confidence} />
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{attr.rationale}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {attr.sources.map((s) => (
                      <span
                        key={s}
                        className="font-mono text-[7px] uppercase px-1 py-0.5 border border-white/10 text-stone-600"
                      >
                        {SOURCE_LABELS[s]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Anti-motifs
            </h2>
            <ul className="space-y-2">
              {reading.antiMotifs.map((m) => (
                <li
                  key={m}
                  className="font-serif text-sm text-stone-200 leading-relaxed border border-white/10 bg-white/[0.02] px-3.5 py-3 border-l-[3px] flex items-start justify-between gap-2"
                  style={{ borderLeftColor: accent }}
                >
                  <span>{m}</span>
                  {isOwner ? (
                    <SavePinButton
                      kind="anti_motif"
                      label="Anti-motif"
                      value={m}
                      inverseFunction="contrast"
                      saved={isSaved("anti_motif", m)}
                      savedId={findSavedId("anti_motif", m)}
                      onSave={onSaveInsight}
                      onRemove={onRemoveInsight}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Things to avoid (source)
            </h2>
            <ul className="space-y-2">
              {reading.thingsToAvoid.map((m) => (
                <li
                  key={m}
                  className="font-mono text-[11px] text-stone-400 leading-relaxed px-1 py-1"
                >
                  — {m}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-3 md:gap-4 md:items-start">
          <div className="border border-white/10 px-4 py-3 space-y-2.5">
            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
              Opposite palette
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {reading.oppositePalette.map((c) =>
                c.startsWith("#") ? (
                  <span
                    key={c}
                    className="w-8 h-8 border border-white/20 shrink-0"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ) : (
                  <span key={c} className="font-serif italic text-sm text-stone-200 leading-snug">
                    {c}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="border border-white/10 px-4 py-3 space-y-2.5">
            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
              Opposite silhouette
            </p>
            <p className="font-serif italic text-sm text-stone-200 leading-snug">
              {reading.oppositeSilhouette}
            </p>
          </div>
          <div className="border border-white/10 px-4 py-3 space-y-2.5">
            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
              Opposite register
            </p>
            <p className="font-serif italic text-sm text-stone-200 leading-snug">
              {reading.oppositeRegister}
            </p>
          </div>
        </section>

        {reading.blindSpots.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Blind spots
            </h2>
            <div className="flex flex-wrap gap-2">
              {reading.blindSpots.map((b) => (
                <span
                  key={b}
                  className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-white/10 text-stone-300 flex items-center gap-1.5"
                >
                  {b}
                  {isOwner ? (
                    <SavePinButton
                      kind="blind_spot"
                      label="Blind spot"
                      value={b}
                      inverseFunction="shadow_projection"
                      saved={isSaved("blind_spot", b)}
                      savedId={findSavedId("blind_spot", b)}
                      onSave={onSaveInsight}
                      onRemove={onRemoveInsight}
                    />
                  ) : null}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {reading.inversions.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500 flex items-center gap-2">
              <FlaskConical size={12} /> Inversions
            </h2>
            <div className="space-y-3">
              {reading.inversions.map((inv, i) => (
                <div
                  key={`${inv.becauseYouTendTo}-${i}`}
                  className="border border-white/10 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {inv.inverseFunction ? (
                      <span className="font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 border border-rose-400/30 text-rose-200/80">
                        {labelInverseFunction(inv.inverseFunction)}
                      </span>
                    ) : null}
                    {inv.confidence != null ? <ConfidenceBar value={inv.confidence} /> : null}
                    {inv.sources?.map((s) => (
                      <span
                        key={s}
                        className="font-mono text-[7px] uppercase text-stone-600"
                      >
                        {SOURCE_LABELS[s]}
                      </span>
                    ))}
                    {inv.evidenceRefIds?.length ? (
                      <span className="font-mono text-[7px] text-stone-600">
                        {inv.evidenceRefIds.length} evidence ref(s)
                      </span>
                    ) : null}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="font-mono text-[8px] uppercase tracking-widest text-stone-600 mb-1">
                        Because you tend to
                      </p>
                      <p className="text-sm text-stone-300">{inv.becauseYouTendTo}</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <p className="font-mono text-[8px] uppercase tracking-widest text-rose-300/60 mb-1">
                          Try instead
                        </p>
                        <p className="text-sm text-stone-100">{inv.tryInstead}</p>
                      </div>
                      {isOwner ? (
                        <SavePinButton
                          kind="inversion"
                          label="Inversion"
                          value={inv.tryInstead}
                          inverseFunction={inv.inverseFunction}
                          saved={isSaved("inversion", inv.tryInstead)}
                          savedId={findSavedId("inversion", inv.tryInstead)}
                          onSave={onSaveInsight}
                          onRemove={onRemoveInsight}
                        />
                      ) : null}
                    </div>
                  </div>
                  {inv.rationale ? (
                    <p className="font-mono text-[9px] text-stone-500 leading-relaxed border-t border-white/5 pt-2">
                      {inv.rationale}
                    </p>
                  ) : null}
                  {inv.semioticNode ? (
                    <p className="font-serif italic text-xs text-stone-500">
                      Semiotic node: {inv.semioticNode}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {reading.semioticTouchpoints && reading.semioticTouchpoints.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500 flex items-center gap-2">
              <Sparkles size={12} /> Inverse semiotic touchpoints
            </h2>
            <div className="space-y-3">
              {reading.semioticTouchpoints.map((tp) => (
                <div
                  key={tp.motif}
                  className="border border-white/10 p-4 space-y-2 bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="font-serif text-sm text-stone-100">{tp.motif}</p>
                      <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                        {tp.culturalNode}
                      </p>
                    </div>
                    {isOwner ? (
                      <SavePinButton
                        kind={tp.savableKind}
                        label="Touchpoint"
                        value={tp.motif}
                        inverseFunction={tp.inverseFunction}
                        saved={isSaved(tp.savableKind, tp.motif)}
                        savedId={findSavedId(tp.savableKind, tp.motif)}
                        onSave={onSaveInsight}
                        onRemove={onRemoveInsight}
                      />
                    ) : null}
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{tp.context}</p>
                  <p className="font-mono text-[9px] text-stone-500">{tp.inverseRationale}</p>
                  <p className="font-serif italic text-xs text-stone-400">
                    Visual: {tp.visualDirective}
                  </p>
                  <ConfidenceBar value={tp.resonance} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {reading.inverseRecommendations && reading.inverseRecommendations.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Inverse recommendations
            </h2>
            <ol className="space-y-3">
              {reading.inverseRecommendations.map((rec) => (
                <li
                  key={rec.title}
                  className="border border-white/10 p-4 flex gap-3 items-start"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-rose-300/70">
                      {rec.title} · {labelInverseFunction(rec.inverseFunction)}
                    </p>
                    <p className="text-sm text-stone-200">{rec.action}</p>
                    <p className="font-mono text-[9px] text-stone-500">{rec.rationale}</p>
                  </div>
                  {isOwner ? (
                    <SavePinButton
                      kind={rec.savableKind}
                      label={rec.title}
                      value={rec.action}
                      inverseFunction={rec.inverseFunction}
                      saved={isSaved(rec.savableKind, rec.action)}
                      savedId={findSavedId(rec.savableKind, rec.action)}
                      onSave={onSaveInsight}
                      onRemove={onRemoveInsight}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {reading.shadowExperiments.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Shadow experiments
            </h2>
            <ol className="space-y-2 list-decimal list-inside">
              {reading.shadowExperiments.map((ex) => (
                <li key={ex} className="font-serif text-sm text-stone-300 flex items-center gap-2">
                  <span>{ex}</span>
                  {isOwner ? (
                    <SavePinButton
                      kind="experiment"
                      label="Experiment"
                      value={ex}
                      inverseFunction="admission"
                      saved={isSaved("experiment", ex)}
                      savedId={findSavedId("experiment", ex)}
                      onSave={onSaveInsight}
                      onRemove={onRemoveInsight}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <footer className="border-t border-white/10 pt-4 space-y-2">
          <p className="font-mono text-[8px] uppercase tracking-widest text-stone-600">
            Provenance
          </p>
          <ul className="space-y-1">
            {reading.provenanceNotes.map((n) => (
              <li key={n} className="font-mono text-[9px] text-stone-500">
                {n}
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
};

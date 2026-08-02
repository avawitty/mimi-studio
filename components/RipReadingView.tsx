import React from "react";
import { EyeOff, FlaskConical, RefreshCw, Share2 } from "lucide-react";
import type { RipReading } from "../types";

interface RipReadingViewProps {
  reading: RipReading;
  handle?: string;
  isOwner?: boolean;
  onRegenerate?: () => void;
  onTogglePublish?: () => void;
  publishing?: boolean;
  regenerating?: boolean;
  compact?: boolean;
}

export const RipReadingView: React.FC<RipReadingViewProps> = ({
  reading,
  handle,
  isOwner,
  onRegenerate,
  onTogglePublish,
  publishing,
  regenerating,
  compact,
}) => {
  const accent =
    reading.oppositePalette.find((p) => p.startsWith("#")) || "#5c1a2e";
  const isPublic = reading.visibility === "public";

  return (
    <div
      className={`text-stone-100 ${compact ? "" : "min-h-full"}`}
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, #1a0f14 0%, #0a0a0c 45%, #050506 100%)",
      }}
    >
      <div className={compact ? "p-6 space-y-6" : "max-w-3xl mx-auto px-6 py-10 space-y-8"}>
        <header className="space-y-3 border-b border-white/10 pb-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-rose-300/70">
            mimi.rip · inverse taste projection
          </p>
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight">{reading.title}</h1>
          {handle ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              @{handle}
            </p>
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
          </div>
        ) : null}

        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Anti-motifs
            </h2>
            <ul className="space-y-1.5">
              {reading.antiMotifs.map((m) => (
                <li
                  key={m}
                  className="font-serif text-sm text-stone-200 border-l-2 pl-3"
                  style={{ borderColor: accent }}
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Things to avoid (source)
            </h2>
            <ul className="space-y-1.5">
              {reading.thingsToAvoid.map((m) => (
                <li key={m} className="font-mono text-[11px] text-stone-400">
                  — {m}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="border border-white/10 p-4 space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
              Opposite palette
            </p>
            <div className="flex flex-wrap gap-2">
              {reading.oppositePalette.map((c) =>
                c.startsWith("#") ? (
                  <span
                    key={c}
                    className="w-8 h-8 border border-white/20"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ) : (
                  <span key={c} className="font-mono text-[10px] text-stone-300">
                    {c}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="border border-white/10 p-4 space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
              Opposite silhouette
            </p>
            <p className="font-serif italic text-sm text-stone-200">{reading.oppositeSilhouette}</p>
          </div>
          <div className="border border-white/10 p-4 space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
              Opposite register
            </p>
            <p className="font-serif italic text-sm text-stone-200">{reading.oppositeRegister}</p>
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
                  className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-white/10 text-stone-300"
                >
                  {b}
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
                <div key={`${inv.becauseYouTendTo}-${i}`} className="border border-white/10 p-4 grid md:grid-cols-2 gap-3">
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-stone-600 mb-1">
                      Because you tend to
                    </p>
                    <p className="text-sm text-stone-300">{inv.becauseYouTendTo}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-rose-300/60 mb-1">
                      Try instead
                    </p>
                    <p className="text-sm text-stone-100">{inv.tryInstead}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {reading.shadowExperiments.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">
              Shadow experiments
            </h2>
            <ol className="space-y-2 list-decimal list-inside">
              {reading.shadowExperiments.map((ex) => (
                <li key={ex} className="font-serif text-sm text-stone-300">
                  {ex}
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

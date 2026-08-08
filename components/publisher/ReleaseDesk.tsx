import React from "react";
import type { ZineMetadata } from "../../types";
import type { ArtifactReleaseReadiness } from "../../lib/publisher/types";
import { ReadinessBadge, StageProgressRow } from "./ReadinessUI";

interface ReleaseDeskProps {
  readiness: ArtifactReleaseReadiness;
  onPrimaryAction: () => void;
  onReviewChecks: () => void;
  onPreview: () => void;
  onOpenExport?: () => void;
}

export const ReleaseDesk: React.FC<ReleaseDeskProps> = ({
  readiness,
  onPrimaryAction,
  onReviewChecks,
  onPreview,
  onOpenExport,
}) => {
  const topApproval = readiness.approvals.find((a) => a.status === "pending");

  return (
    <section
      className="border border-stone-850 bg-[#121112] p-5 md:p-6 space-y-5"
      aria-labelledby="release-desk-heading"
    >
      <div className="space-y-2">
        <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
          Current release
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="release-desk-heading" className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">
              {readiness.title}
            </h2>
            <p className="font-mono text-[9px] uppercase tracking-wider text-stone-500 mt-1">
              {readiness.artifactType} · v{readiness.version}
            </p>
          </div>
          <ReadinessBadge status={readiness.overallStatus} />
        </div>
        <p className="font-sans text-sm text-stone-300">{readiness.overallSummary}</p>
      </div>

      <div className="border border-stone-800 bg-stone-950/60 p-4 space-y-3">
        <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
          Mimi recommends
        </p>
        <p className="font-serif text-base md:text-lg text-stone-100 leading-relaxed">
          {readiness.recommendation.headline}
        </p>
        {readiness.recommendation.evidence.length > 0 && (
          <ul className="font-sans text-[11px] text-stone-500 space-y-1 list-none">
            {readiness.recommendation.evidence.slice(0, 6).map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        )}
      </div>

      {topApproval && (
        <div className="border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="font-mono text-[8px] uppercase tracking-widest text-amber-400/80">
            Highest priority
          </p>
          <p className="font-sans text-sm text-stone-200 mt-1">{topApproval.label}</p>
          <p className="font-sans text-[11px] text-stone-500 mt-0.5">{topApproval.summary}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        {readiness.unresolvedCount > 0 ? (
          <button
            type="button"
            onClick={onReviewChecks}
            className="min-h-11 px-4 py-2 border border-stone-600 text-stone-100 font-mono text-xs uppercase tracking-widest font-bold hover:border-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
          >
            Review {readiness.unresolvedCount} check{readiness.unresolvedCount === 1 ? "" : "s"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPreview}
          className="min-h-11 px-4 py-2 border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-mono text-xs uppercase tracking-widest font-bold hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
        >
          Preview issue
        </button>
        {onOpenExport ? (
          <button
            type="button"
            onClick={onOpenExport}
            className="min-h-11 px-4 py-2 border border-stone-500 bg-stone-100 text-stone-950 font-mono text-xs uppercase tracking-widest font-bold hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
          >
            Open Export Chamber
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrimaryAction}
          className="min-h-11 px-4 py-2 border border-stone-600 text-stone-300 font-mono text-xs uppercase tracking-widest hover:border-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
        >
          {readiness.recommendation.primaryActionLabel}
        </button>
      </div>

      <StageProgressRow
        stages={readiness.stages
          .filter((s) => s.id !== "publish")
          .map((s) => ({ label: s.label, status: s.status }))}
      />
    </section>
  );
};

export const ArtifactSelector: React.FC<{
  artifacts: ZineMetadata[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ artifacts, selectedId, onSelect }) => {
  if (artifacts.length === 0) {
    return (
      <div className="border border-dashed border-stone-800 p-6 text-center space-y-3">
        <p className="font-serif italic text-stone-400">No generated artifacts yet.</p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("mimi:route-request", { detail: { path: "/studio" } }),
            )
          }
          className="px-4 py-2 border border-stone-700 font-mono text-[8px] uppercase tracking-widest text-stone-300 hover:border-stone-500"
        >
          Generate an issue in Studio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="artifact-select"
        className="font-mono text-[8px] uppercase tracking-widest text-stone-500"
      >
        Artifact
      </label>
      <select
        id="artifact-select"
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-stone-950 border border-stone-800 text-stone-200 font-sans text-sm px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {artifacts.map((z) => (
          <option key={z.id} value={z.id}>
            {z.title || "Untitled"} · {new Date(z.timestamp || z.createdAt).toLocaleDateString()}
          </option>
        ))}
      </select>
    </div>
  );
};

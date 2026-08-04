import React, { useMemo, useState } from "react";
import type { ZineMetadata } from "../../types";
import type { ArtifactReleaseReadiness } from "../../lib/publisher/types";
import { buildExportManifest } from "../../services/exportManifestService";
import { hydrateLegacyZineMetadata } from "../../lib/zine/zineMigrations";
import { normalizeZineArtifact } from "../../lib/zine/normalizeZineArtifact";

type DetailTab = "overview" | "proof" | "context" | "files" | "manifest" | "history";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "proof", label: "Proof" },
  { id: "context", label: "Context" },
  { id: "files", label: "Files" },
  { id: "manifest", label: "Manifest" },
  { id: "history", label: "History" },
];

export const ArtifactDetailPanel: React.FC<{
  metadata: ZineMetadata;
  readiness: ArtifactReleaseReadiness;
}> = ({ metadata, readiness }) => {
  const [tab, setTab] = useState<DetailTab>("overview");
  const hydrated = hydrateLegacyZineMetadata(metadata);
  const manifest = useMemo(() => buildExportManifest(hydrated), [hydrated]);
  const artifact = useMemo(() => normalizeZineArtifact(hydrated), [hydrated]);

  const evolution = useMemo(() => {
    const revisions = metadata.revisions?.length ?? 0;
    const sources = metadata.fragmentsUsed?.length ?? 0;
    const approvalsDone =
      metadata.isLocked || metadata.lifecycleStatus === "approved" || metadata.isPublic
        ? 1
        : 0;
    return { revisions, sources, approvalsDone };
  }, [metadata]);

  return (
    <section className="border border-stone-850 bg-[#121112] overflow-hidden">
      <div className="flex overflow-x-auto border-b border-stone-850 no-scrollbar" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-3 font-mono text-[8px] uppercase tracking-widest transition-colors ${
              tab === t.id
                ? "text-white border-b-2 border-emerald-500"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto" role="tabpanel">
        {tab === "overview" && (
          <div className="space-y-3 font-sans text-sm text-stone-400">
            <p>
              <span className="text-stone-500 font-mono text-[8px] uppercase tracking-wider">
                Artifact ID
              </span>
              <br />
              <span className="text-stone-200">{readiness.artifactId}</span>
            </p>
            <p>
              <span className="text-stone-500 font-mono text-[8px] uppercase tracking-wider">
                Version
              </span>
              <br />
              <span className="text-stone-200">v{readiness.version}</span>
            </p>
            <p>
              <span className="text-stone-500 font-mono text-[8px] uppercase tracking-wider">
                Updated
              </span>
              <br />
              <span className="text-stone-200">
                {new Date(metadata.updatedAt || metadata.timestamp).toLocaleString()}
              </span>
            </p>
            <div className="border-t border-stone-800 pt-3 space-y-2">
              <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500">
                Artifact evolution
              </p>
              {evolution.revisions > 0 || evolution.sources > 0 ? (
                <ul className="text-[11px] space-y-1 list-none">
                  <li>{evolution.revisions} proof revision(s) recorded</li>
                  <li>{evolution.sources} source(s) attached</li>
                  <li>{evolution.approvalsDone} approval milestone(s) on artifact</li>
                </ul>
              ) : (
                <p className="text-[11px] italic">No revision history on this artifact yet.</p>
              )}
            </div>
          </div>
        )}

        {tab === "proof" && (
          <ul className="space-y-2 list-none">
            {readiness.stages
              .find((s) => s.id === "proof")
              ?.checks.map((c) => (
                <li
                  key={c.id}
                  className="border border-stone-800 p-3 text-[11px] text-stone-400"
                >
                  <span className="text-stone-200">{c.label}</span>
                  <p className="mt-1">{c.summary}</p>
                </li>
              ))}
          </ul>
        )}

        {tab === "context" && (
          <div className="space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500">
              fragmentsUsed ({manifest.fragmentsUsed.length})
            </p>
            <ul className="font-mono text-[10px] text-stone-400 space-y-1 list-none">
              {manifest.fragmentsUsed.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
            {manifest.editorialCompileMarkdown && (
              <div>
                <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500 mb-2">
                  Editorial compile
                </p>
                <pre className="border border-stone-800 p-3 text-[10px] text-stone-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {manifest.editorialCompileMarkdown.slice(0, 1200)}
                  {manifest.editorialCompileMarkdown.length > 1200 ? "…" : ""}
                </pre>
              </div>
            )}
            <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500">
              Approved context snapshots ({manifest.usedContextSnapshots.length})
            </p>
          </div>
        )}

        {tab === "files" && (
          <div className="space-y-2">
            <p className="font-sans text-sm text-stone-400">
              {artifact.pages.length} page(s) · cover{" "}
              {metadata.coverImageUrl ? "attached" : "not set"}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500">
              Export formats available from artifact Export chamber
            </p>
            <ul className="text-[11px] text-stone-500 list-none space-y-1">
              <li>Structured archival PDF</li>
              <li>Asset ZIP</li>
              <li>Shopify product pack</li>
            </ul>
          </div>
        )}

        {tab === "manifest" && (
          <div className="space-y-3">
            <p className="font-sans text-[11px] text-stone-500 leading-relaxed">
              What is inside this release, where it came from, and what will leave Mimi.
            </p>
            <ul className="space-y-1 list-none">
              {manifest.diagnostics.map((d) => (
                <li
                  key={d.id}
                  className="font-mono text-[9px] text-stone-500 flex gap-2"
                >
                  <span className={d.pass ? "text-emerald-500" : "text-amber-500"}>
                    {d.pass ? "✓" : "!"}
                  </span>
                  {d.label}: {d.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {readiness.history.length === 0 ? (
              <p className="font-sans text-sm text-stone-500 italic">
                No release history on this artifact yet.
              </p>
            ) : (
              <ul className="space-y-2 list-none">
                {readiness.history.map((entry) => (
                  <li
                    key={entry.id}
                    className="border border-stone-800 p-3 text-[11px] text-stone-400"
                  >
                    <span className="font-mono text-[8px] uppercase tracking-wider text-stone-500">
                      {entry.kind} · {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <p className="text-stone-200 mt-1">{entry.result}</p>
                    {entry.publicUrl && (
                      <p className="font-mono text-[9px] mt-1">{entry.publicUrl}</p>
                    )}
                    <p className="text-[9px] text-stone-600 mt-1">Source: {entry.source}</p>
                  </li>
                ))}
              </ul>
            )}
            {readiness.historyNote && (
              <p className="font-sans text-[10px] text-stone-600 italic">{readiness.historyNote}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

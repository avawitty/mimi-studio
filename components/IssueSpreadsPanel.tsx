import React, { useEffect, useState } from "react";
import { LayoutGrid, Loader2, PenTool, ArrowUpRight } from "lucide-react";
import type { ZineMetadata } from "../types";
import { useUser } from "../contexts/UserContext";
import { getLocalZines } from "../services/localArchive";
import { fetchUserZines } from "../services/firebaseUtils";
import { pageHasCustomLayout } from "../lib/zineSpreadLayout";

function openIssue(zineId: string): void {
  window.dispatchEvent(
    new CustomEvent("mimi:route-request", { detail: { path: `/zine/${zineId}` } }),
  );
}

/**
 * Edit-chamber worktable: recent owned issues with compose status.
 * Opens the issue reader where Visual Plates → Compose spread lives.
 */
export const IssueSpreadsPanel: React.FC = () => {
  const { user } = useUser();
  const [issues, setIssues] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const local = (await getLocalZines()) || [];
        let cloud: ZineMetadata[] = [];
        if (user?.uid) {
          try {
            cloud = (await fetchUserZines(user.uid)) || [];
          } catch {
            cloud = [];
          }
        }
        const byId = new Map<string, ZineMetadata>();
        [...local, ...cloud].forEach((z) => {
          if (!z?.id) return;
          if (user?.uid && z.userId && z.userId !== user.uid) return;
          const prev = byId.get(z.id);
          if (!prev || (z.timestamp || 0) >= (prev.timestamp || 0)) {
            byId.set(z.id, z);
          }
        });
        const sorted = [...byId.values()]
          .sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0))
          .slice(0, 6);
        if (active) setIssues(sorted);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  return (
    <section className="border archive-border space-y-4" data-surface="public">
      <div className="px-4 py-3 border-b archive-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid size={14} className="archive-text-muted" />
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.35em] archive-text-muted">
              Issue spreads
            </p>
            <p className="font-serif italic text-sm archive-text-ink mt-0.5">
              Compose plates before Press export.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest archive-text-muted py-6">
            <Loader2 size={12} className="animate-spin" /> Loading issues…
          </div>
        ) : issues.length === 0 ? (
          <p className="font-sans text-[10px] archive-text-muted py-4 leading-relaxed">
            No issues in this archive yet. Generate from Studio, then return here to open spreads.
          </p>
        ) : (
          <ul className="space-y-2 list-none">
            {issues.map((zine) => {
              const pages = zine.content?.pages || [];
              const composed = pages.filter((p) => pageHasCustomLayout(p)).length;
              return (
                <li
                  key={zine.id}
                  className="border archive-border bg-white flex flex-col sm:flex-row sm:items-center gap-3 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-serif italic text-sm archive-text-ink truncate">
                      {zine.title || "Untitled Manifest"}
                    </p>
                    <p className="font-mono text-[8px] uppercase tracking-wider archive-text-muted mt-1">
                      {pages.length} plate{pages.length === 1 ? "" : "s"}
                      {composed > 0 ? ` · ${composed} composed` : " · template spreads"}
                      {zine.isHighFidelity ? " · hi-fi" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openIssue(zine.id)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3 border archive-border font-mono text-[8px] uppercase tracking-widest archive-text-ink hover:border-[var(--mimi-olive,#5A5A40)]"
                    >
                      <ArrowUpRight size={12} /> Open issue
                    </button>
                    <button
                      type="button"
                      onClick={() => openIssue(zine.id)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3 bg-archive-ink text-archive-cream font-mono text-[8px] uppercase tracking-widest"
                    >
                      <PenTool size={12} /> Compose spreads
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

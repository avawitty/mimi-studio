import React, { useCallback, useEffect, useState } from "react";
import { LayoutGrid, Loader2, PenTool, ArrowUpRight, ChevronDown, Check } from "lucide-react";
import type { EditorElement, ZineMetadata, ZinePageSpec } from "../types";
import { useUser } from "../contexts/UserContext";
import { getLocalZines } from "../services/localArchive";
import { fetchUserZines, updateZineMetadata } from "../services/firebaseUtils";
import {
  defaultEditorTone,
  hydrateZineContentPages,
  pageHasCustomLayout,
  toEditableZinePage,
} from "../lib/zineSpreadLayout";
import { ZineLayoutEditor } from "./ZineLayoutEditor";
import { ZineSpreadCanvas } from "./ZineSpreadCanvas";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import {
  artifactRequiresRevision,
  createArtifactRevision,
  withCanonicalZinePages,
} from "../lib/zine/zineMigrations";
import { reconcileZineReadingOrder } from "../lib/zine/zineReadingOrder";

function openIssue(zineId: string): void {
  window.dispatchEvent(
    new CustomEvent("mimi:route-request", { detail: { path: `/zine/${zineId}` } }),
  );
}

/**
 * Edit-chamber worktable: recent owned issues with in-place spread compose.
 */
export const IssueSpreadsPanel: React.FC = () => {
  const { user } = useUser();
  const [issues, setIssues] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composing, setComposing] = useState<{
    zineId: string;
    pageIndex: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshIssues = useCallback(async () => {
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
        const hydrated = hydrateZineContentPages(z);
        const prev = byId.get(hydrated.id);
        if (!prev || (hydrated.timestamp || 0) >= (prev.timestamp || 0)) {
          byId.set(hydrated.id, hydrated);
        }
      });
      const sorted = [...byId.values()]
        .sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0))
        .slice(0, 6);
      setIssues(sorted);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refreshIssues();
  }, [refreshIssues]);

  const activeZine = composing
    ? issues.find((z) => z.id === composing.zineId) || null
    : null;
  const activePage: ZinePageSpec | null =
    activeZine && composing
      ? activeZine.content?.pages?.[composing.pageIndex] || null
      : null;

  const handleSaveSpread = async (
    elements: EditorElement[],
    trace?: { timestamp: number; note: string }[],
  ) => {
    if (!composing || !activeZine?.content?.pages) return;
    setSaving(true);
    try {
      const artifact = normalizeZineArtifact(activeZine);
      const revisionRequired = artifactRequiresRevision(artifact.status);
      const revisedArtifact = revisionRequired
        ? createArtifactRevision(artifact, {
            reason: `Spread ${composing.pageIndex + 1} revised from The Edit`,
            changedPageIds: [
              artifact.pages[composing.pageIndex]?.id ||
                `${activeZine.id}:page:${composing.pageIndex + 1}`,
            ],
          })
        : artifact;
      const pages = [...revisedArtifact.pages];
      const current = pages[composing.pageIndex];
      pages[composing.pageIndex] = {
        ...current,
        revision: revisedArtifact.revision,
        layoutRevision: (current.layoutRevision || 0) + 1,
        customLayout: {
          elements,
          readingOrder: reconcileZineReadingOrder(
            current.customLayout?.readingOrder,
            elements,
          ),
          editTrace: trace || current.customLayout?.editTrace || [],
        },
      };
      const updated: ZineMetadata = withCanonicalZinePages(
        {
          ...activeZine,
          artifactSchemaVersion: revisedArtifact.schemaVersion,
          lifecycleStatus: revisedArtifact.status,
          revision: revisedArtifact.revision,
          revisions: revisedArtifact.revisions,
        },
        pages,
      );
      const persisted = await updateZineMetadata(updated);
      if (!persisted) {
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "Could not save spread — sign in as the issue owner and try again.",
              type: "error",
            },
          }),
        );
        return;
      }
      setIssues((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
      setComposing(null);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Spread composed and saved from The Edit." },
        }),
      );
    } catch (error) {
      console.error(error);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: "Could not save spread — check connection and try again.",
            type: "error",
          },
        }),
      );
    } finally {
      setSaving(false);
    }
  };

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
              Compose plates here or open the issue — then Press.
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
            No issues in this archive yet. Generate from Studio, then return here to compose spreads.
          </p>
        ) : (
          <ul className="space-y-2 list-none">
            {issues.map((zine) => {
              const pages = zine.content?.pages || [];
              const composed = pages.filter((p) => pageHasCustomLayout(p)).length;
              const expanded = expandedId === zine.id;
              return (
                <li key={zine.id} className="border archive-border bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
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
                        onClick={() => setExpandedId(expanded ? null : zine.id)}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3 bg-archive-ink text-archive-cream font-mono text-[8px] uppercase tracking-widest"
                      >
                        <PenTool size={12} /> Compose spreads
                        <ChevronDown
                          size={12}
                          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t archive-border px-3 py-3 space-y-3 bg-[var(--mimi-field,#FFFFFF)]">
                      {pages.length === 0 ? (
                        <p className="font-sans text-[10px] archive-text-muted">
                          This issue has no plate pages to compose yet.
                        </p>
                      ) : (
                        pages.map((page, pageIndex) => {
                          const isComposed = pageHasCustomLayout(page);
                          return (
                            <div
                              key={`${zine.id}-p-${page.pageNumber ?? pageIndex}`}
                              className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 items-center border archive-border p-2"
                            >
                              <div className="w-full max-w-[140px]">
                                {isComposed ? (
                                  <ZineSpreadCanvas page={page} aspectClassName="aspect-[3/4]" />
                                ) : page.image_url ? (
                                  <img
                                    src={page.image_url}
                                    alt=""
                                    className="w-full aspect-[3/4] object-cover border border-[var(--mimi-hairline,#D4D4D4)]"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full aspect-[3/4] border border-dashed archive-border flex items-center justify-center font-mono text-[7px] uppercase tracking-widest archive-text-muted">
                                    Undeveloped
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                                  Plate {pageIndex + 1}
                                  {isComposed ? " · composed" : ""}
                                </p>
                                <p className="font-serif italic text-sm archive-text-ink truncate mt-1">
                                  {page.headline || "Untitled plate"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setComposing({ zineId: zine.id, pageIndex })
                                }
                                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 border archive-border font-mono text-[8px] uppercase tracking-widest archive-text-ink"
                              >
                                {isComposed ? (
                                  <>
                                    <Check size={12} /> Edit spread
                                  </>
                                ) : (
                                  <>
                                    <PenTool size={12} /> Compose
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {composing && activePage && activeZine && (
        <ZineLayoutEditor
          page={toEditableZinePage(activePage)}
          tone={defaultEditorTone(activeZine.tone)}
          initialTitle={activeZine.title || "Untitled Manifest"}
          onSave={(elements, trace) => {
            return handleSaveSpread(elements, trace);
          }}
          onCancel={() => {
            if (!saving) setComposing(null);
          }}
        />
      )}
    </section>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, Copy, FileOutput, Check, FileText, Loader2 } from "lucide-react";
import { UsedContextTray } from "./UsedContextTray";
import {
  getApprovedUsedContext,
  subscribeUsedContext,
} from "../services/usedContextService";
import type { UsedContextEntry } from "../types";
import {
  buildCompileMarkdown,
  readCompileDraft,
  syncEditorialCompileExport,
  writeCompileDraft,
  type CompileDraft,
} from "../lib/editCompileExport";
import { useUser } from "../contexts/UserContext";

export const TheEditCompile: React.FC = () => {
  const { user, profile } = useUser();
  const ownerUid = user?.uid || profile?.uid;
  const ownerHandle = profile?.handle;
  const [draft, setDraft] = useState<CompileDraft>(() => readCompileDraft(ownerUid, ownerHandle));
  const [approved, setApproved] = useState<UsedContextEntry[]>(() =>
    getApprovedUsedContext("the-edit", ownerUid),
  );
  const [copied, setCopied] = useState(false);
  const [commerceOpen, setCommerceOpen] = useState(false);
  const [isExportingDocs, setIsExportingDocs] = useState(false);

  useEffect(() => {
    const refresh = () => setApproved(getApprovedUsedContext("the-edit", ownerUid));
    refresh();
    return subscribeUsedContext(refresh);
  }, [ownerUid]);

  useEffect(() => {
    setDraft(readCompileDraft(ownerUid, ownerHandle));
  }, [ownerUid, ownerHandle]);

  useEffect(() => {
    writeCompileDraft(draft, ownerUid, ownerHandle);
  }, [draft, ownerUid, ownerHandle]);

  const activeEntries = useMemo(
    () => approved.filter((entry) => !draft.excludedAtomIds.includes(entry.atomId)),
    [approved, draft.excludedAtomIds],
  );

  const markdown = useMemo(
    () => buildCompileMarkdown(draft.thesis, draft.lead, activeEntries),
    [draft.thesis, draft.lead, activeEntries],
  );

  const handleExportDocs = useCallback(async () => {
    if (!markdown.trim()) return;
    setIsExportingDocs(true);
    try {
      const { connectGoogleDrive, exportToGoogleDocs } = await import("../services/googleDriveService");
      const token = await connectGoogleDrive();
      const docId = await exportToGoogleDocs(token, draft.thesis ? `The Edit Compile: ${draft.thesis.substring(0, 30)}` : "Mimi The Edit Compile", markdown);
      
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: "Compiled Brief successfully exported to Google Docs!",
            icon: <Check size={14} />,
            action: {
              label: "Open Doc",
              onClick: () => window.open(`https://docs.google.com/document/d/${docId}/edit`, "_blank")
            }
          }
        })
      );
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: `Export to Docs failed: ${e.message || e}`,
            type: "error"
          }
        })
      );
    } finally {
      setIsExportingDocs(false);
    }
  }, [markdown, draft.thesis]);

  useEffect(() => {
    if (!ownerUid) return;
    syncEditorialCompileExport({
      markdown,
      thesis: draft.thesis,
      lead: draft.lead,
      fragmentAtomIds: activeEntries.map((entry) => entry.atomId),
      compiledAt: Date.now(),
      profileLink: {
        version: 1,
        ownerUid,
        ownerHandle,
        workspaceId: activeEntries[0]?.projectId,
        sourceTarget: "the-edit",
        linkedAt: Date.now(),
      },
    });
  }, [markdown, draft.thesis, draft.lead, activeEntries, ownerUid, ownerHandle]);

  const toggleFragment = useCallback((atomId: string) => {
    setDraft((prev) => {
      const excluded = prev.excludedAtomIds.includes(atomId)
        ? prev.excludedAtomIds.filter((id) => id !== atomId)
        : [...prev.excludedAtomIds, atomId];
      return { ...prev, excludedAtomIds: excluded };
    });
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  const openPress = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("mimi:route-request", { detail: { path: "/the-press" } }),
    );
  }, []);

  const openScribe = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("mimi:route-request", { detail: { path: "/scribe" } }),
    );
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 border-b archive-border px-4 md:px-8 py-4 bg-archive-surface/40">
        <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted mb-3">
          Approved Scribe context for editorial compile
        </p>
        <UsedContextTray
          target="the-edit"
          compact={false}
          className="!border-archive-border !text-archive-ink [&_p]:!text-archive-muted [&_.font-serif]:!text-archive-ink"
          onOpenScribe={openScribe}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 space-y-8">
        <header className="border-b archive-border pb-6">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="archive-text-muted" />
            <p className="font-mono text-[8px] uppercase tracking-[0.35em] archive-text-muted">
              Editorial compile
            </p>
          </div>
          <h2 className="font-serif italic text-2xl md:text-3xl archive-text-ink leading-tight">
            Assemble the read before export.
          </h2>
          <p className="font-sans text-[10px] archive-text-muted mt-2 max-w-xl leading-relaxed">
            Approve atoms in the tray above, frame a thesis, then export markdown to The Press or copy for external publish.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-6">
            <label className="block space-y-2">
              <span className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                Thesis / diagnostic frame
              </span>
              <textarea
                value={draft.thesis}
                onChange={(e) => setDraft((prev) => ({ ...prev, thesis: e.target.value }))}
                rows={3}
                placeholder="What is this read arguing or surfacing?"
                className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-serif italic text-sm leading-relaxed resize-y"
              />
            </label>

            <label className="block space-y-2">
              <span className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                Lead paragraph
              </span>
              <textarea
                value={draft.lead}
                onChange={(e) => setDraft((prev) => ({ ...prev, lead: e.target.value }))}
                rows={4}
                placeholder="Opening editorial voice — optional bridge into fragments."
                className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-sans text-sm leading-relaxed resize-y"
              />
            </label>

            <div className="space-y-3">
              <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                Fragment order ({activeEntries.length} of {approved.length} included)
              </p>
              {approved.length === 0 ? (
                <p className="font-sans text-[10px] archive-text-muted border border-dashed archive-border p-4">
                  No approved atoms yet. Send fragments from Scribe → Retrieve, then approve in the tray.
                </p>
              ) : (
                <ul className="space-y-2 list-none">
                  {approved.map((entry) => {
                    const included = !draft.excludedAtomIds.includes(entry.atomId);
                    return (
                      <li
                        key={entry.atomId}
                        className={`border archive-border p-3 flex gap-3 items-start transition-opacity ${
                          included ? "bg-archive-surface/30" : "opacity-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleFragment(entry.atomId)}
                          className={`mt-0.5 w-5 h-5 border flex items-center justify-center shrink-0 ${
                            included
                              ? "border-archive-ink bg-archive-ink/10 archive-text-ink"
                              : "border-archive-border archive-text-muted"
                          }`}
                          title={included ? "Exclude from compile" : "Include in compile"}
                        >
                          {included ? <Check size={12} /> : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif italic text-sm archive-text-ink truncate">
                            {entry.title}
                          </p>
                          <p className="font-sans text-[10px] archive-text-muted line-clamp-2 mt-1">
                            {entry.content}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                Compile preview
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!markdown.trim()}
                  className="px-3 py-1.5 border archive-border font-mono text-[8px] uppercase tracking-widest archive-text-ink hover:bg-archive-cream disabled:opacity-40 flex items-center gap-1.5"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy MD"}
                </button>
                <button
                  type="button"
                  onClick={handleExportDocs}
                  disabled={isExportingDocs || !markdown.trim()}
                  className="px-3 py-1.5 border archive-border font-mono text-[8px] uppercase tracking-widest archive-text-ink hover:bg-archive-cream disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isExportingDocs ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                  Export to Docs
                </button>
                <button
                  type="button"
                  onClick={openPress}
                  className="px-3 py-1.5 bg-archive-ink text-archive-cream font-mono text-[8px] uppercase tracking-widest flex items-center gap-1.5"
                >
                  <FileOutput size={12} />
                  The Press
                </button>
              </div>
            </div>
            <pre className="border archive-border bg-archive-surface/20 p-4 font-mono text-[10px] archive-text-ink whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
              {markdown}
            </pre>
          </section>
        </div>

        <details
          className="border archive-border"
          open={commerceOpen}
          onToggle={(e) => setCommerceOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer px-4 py-3 font-mono text-[8px] uppercase tracking-widest archive-text-muted flex items-center gap-2 list-none">
            <ChevronDown
              size={14}
              className={`transition-transform ${commerceOpen ? "rotate-180" : ""}`}
            />
            Commerce & affiliate intelligence (secondary)
          </summary>
          <div className="border-t archive-border px-4 py-3">
            <p className="font-sans text-[10px] archive-text-muted mb-3">
              Forecast profiling and affiliate grid remain available — editorial compile is the primary workflow.
            </p>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:edit-open-commerce", { detail: { open: true } }),
                )
              }
              className="font-mono text-[8px] uppercase tracking-widest archive-text-ink underline"
            >
              Open full commerce view
            </button>
          </div>
        </details>
      </div>
    </div>
  );
};

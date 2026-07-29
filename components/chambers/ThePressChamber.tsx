import React, { useEffect, useMemo, useState } from "react";
import { FileOutput, Gauge, Package, ShoppingBag, X } from "lucide-react";
import {
  ArchiveChamberShell,
  ArchiveContextPanel,
  type ArchiveWorkflowStep,
} from "./ArchiveChamberShell";
import { PublisherDashboard } from "../PublisherDashboard";
import {
  EDITORIAL_COMPILE_CHANGED,
  getEditorialCompileExport,
  type EditorialCompileExport,
} from "../../lib/editCompileExport";
import {
  clearIntelHubPressHandoff,
  INTEL_HUB_HANDOFF_CHANGED,
  readIntelProjectRun,
  readIntelHubPressHandoff,
  updateIntelProjectRun,
  writeIntelProjectRun,
  type IntelHubPressHandoff,
} from "../../lib/intelHubWorkflow";
import { useUser } from "../../contexts/UserContext";

type PressTab = "console" | "manifest";

const TAB_WORKFLOW: Record<PressTab, ArchiveWorkflowStep> = {
  console: "apply",
  manifest: "save",
};

export const ThePressChamber: React.FC = () => {
  const { user, profile } = useUser();
  const ownerUid = user?.uid || profile?.uid;
  const [tab, setTab] = useState<PressTab>("console");
  const [pendingCompile, setPendingCompile] = useState<EditorialCompileExport | null>(() =>
    getEditorialCompileExport(ownerUid, true),
  );
  const [pendingIntelPack, setPendingIntelPack] = useState<IntelHubPressHandoff | null>(() =>
    readIntelHubPressHandoff(),
  );

  useEffect(() => {
    const refresh = () => setPendingCompile(getEditorialCompileExport(ownerUid, true));
    refresh();
    window.addEventListener(EDITORIAL_COMPILE_CHANGED, refresh);
    return () => window.removeEventListener(EDITORIAL_COMPILE_CHANGED, refresh);
  }, [ownerUid]);

  const updateIntelRun = (
    patch: Parameters<typeof updateIntelProjectRun>[1],
  ) => {
    const current = readIntelProjectRun();
    if (!current) return;
    writeIntelProjectRun(updateIntelProjectRun(current, patch));
  };

  useEffect(() => {
    const refresh = () => setPendingIntelPack(readIntelHubPressHandoff());
    refresh();
    window.addEventListener(INTEL_HUB_HANDOFF_CHANGED, refresh);
    return () => window.removeEventListener(INTEL_HUB_HANDOFF_CHANGED, refresh);
  }, []);

  const contextDrawer = useMemo(
    () => (
      <ArchiveContextPanel
        title={tab === "console" ? "Publisher Console" : "Export manifest"}
        subtitle={
          tab === "console"
            ? "Reach, sponsorship, and distribution health"
            : "Package approved artifacts with provenance intact"
        }
      >
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What this means
          </p>
          <p className="font-serif italic text-sm leading-relaxed archive-text-ink">
            {tab === "console"
              ? "The Press tracks how editorial work travels — subscriber reach, sponsor yield, and deliverability."
              : "Export manifests attach fragmentsUsed snapshots, editorial compile markdown from The Edit, media plates, and share-ready formats."}
          </p>
        </div>
        <div className="space-y-3 pt-2 border-t archive-border">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What to do next
          </p>
          <ul className="font-sans text-[10px] archive-text-muted space-y-2 list-none">
            {tab === "console" ? (
              <>
                <li>Review canonical reach and retention metrics.</li>
                <li>Confirm sponsor placements before issue drop.</li>
              </>
            ) : (
              <>
                <li>Generate a zine in Studio, then open Export from the reveal view.</li>
                <li>Review any Intel Hub artifact pack before choosing a Shopify or file export.</li>
                <li>Validate manifest includes fragmentsUsed and editorial-compile.md when context was applied.</li>
                <li>Share OG link — previews resolve at mimi.you/zine/:id.</li>
              </>
            )}
          </ul>
          {tab === "manifest" ? (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:route-request", { detail: { path: "/studio" } }),
                )
              }
              className="mt-2 w-full px-3 py-2 border archive-border font-mono text-[8px] uppercase tracking-widest archive-text-ink hover:bg-archive-cream transition-colors"
            >
              Open Studio
            </button>
          ) : null}
        </div>
      </ArchiveContextPanel>
    ),
    [tab],
  );

  return (
    <ArchiveChamberShell
      moduleId="the-press"
      activeWorkflowStep={TAB_WORKFLOW[tab]}
      workflowSteps={["apply", "save"]}
      headerNote="Package · export · distribute approved editorial artifacts."
      contextDrawer={contextDrawer}
      contextDrawerOpen
      spine={
        <>
          <button
            type="button"
            title="Publisher console"
            onClick={() => setTab("console")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "console" ? "is-active border-white/20" : ""
            }`}
          >
            <Gauge size={14} />
          </button>
          <button
            type="button"
            title="Export manifest"
            onClick={() => setTab("manifest")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "manifest" ? "is-active border-white/20" : ""
            }`}
          >
            <FileOutput size={14} />
          </button>
        </>
      }
      canvas={
        tab === "console" ? (
          <PublisherDashboard />
        ) : (
          <div className="flex flex-col h-full min-h-[420px] px-8 py-10 archive-text-muted overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full space-y-8">
              <div className="text-center">
                <Package size={32} className="mb-4 opacity-40 mx-auto" strokeWidth={1} />
                <p className="font-serif italic text-xl archive-text-ink mb-2">Export lives on the artifact</p>
                <p className="font-sans text-sm leading-relaxed mb-6">
                  Open a generated zine to access PDF, asset ZIP, Shopify packs, and share links with
                  full provenance manifest.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("mimi:route-request", { detail: { path: "/studio" } }),
                    )
                  }
                  className="px-6 py-3 border archive-border font-mono text-[9px] uppercase tracking-widest archive-text-ink hover:bg-archive-cream transition-colors"
                >
                  Go to Studio
                </button>
              </div>

              {pendingIntelPack ? (
                <section className="border archive-border p-5 space-y-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <ShoppingBag size={16} className="archive-text-muted mt-0.5" />
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                          Intel Hub artifact pack
                        </p>
                        <h3 className="font-serif italic text-lg archive-text-ink mt-1">
                          {pendingIntelPack.clientName}
                        </h3>
                      </div>
                    </div>
                    <span className="font-mono text-[7px] uppercase tracking-widest text-amber-700 dark:text-amber-400">
                      Human review required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="border archive-border p-3">
                      <p className="font-mono text-[7px] uppercase tracking-widest archive-text-muted">
                        Approved context
                      </p>
                      <p className="font-serif text-lg archive-text-ink mt-1">
                        {pendingIntelPack.approvedContext.length}
                      </p>
                    </div>
                    <div className="border archive-border p-3">
                      <p className="font-mono text-[7px] uppercase tracking-widest archive-text-muted">
                        Commerce candidate
                      </p>
                      <p className="font-serif text-sm archive-text-ink mt-1 truncate">
                        {pendingIntelPack.selectedCandidate?.title || "Not selected"}
                      </p>
                    </div>
                    <div className="border archive-border p-3">
                      <p className="font-mono text-[7px] uppercase tracking-widest archive-text-muted">
                        Destination
                      </p>
                      <p className="font-mono text-[8px] uppercase archive-text-ink mt-2">
                        Draft only
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-mono text-[7px] uppercase tracking-widest archive-text-muted">
                      Working thesis
                    </p>
                    <p className="font-serif italic text-sm archive-text-ink">
                      {pendingIntelPack.thesis}
                    </p>
                    <p className="font-sans text-[10px] archive-text-muted leading-relaxed">
                      Discovery query: {pendingIntelPack.commerceQuery}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateIntelRun({ pressStatus: "approved", stage: "artifact-pack" });
                        window.dispatchEvent(
                          new CustomEvent("mimi:route-request", { detail: { path: "/studio" } }),
                        );
                      }}
                      className="px-4 py-2 border archive-border font-mono text-[8px] uppercase tracking-widest archive-text-ink hover:bg-archive-cream transition-colors"
                    >
                      Build publishable artifact
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearIntelHubPressHandoff();
                        updateIntelRun({
                          artifactPackId: undefined,
                          selectedCandidateId: undefined,
                          pressStatus: "not_started",
                        });
                        setPendingIntelPack(null);
                      }}
                      className="px-4 py-2 border archive-border font-mono text-[8px] uppercase tracking-widest archive-text-muted hover:archive-text-ink transition-colors flex items-center gap-1.5"
                    >
                      <X size={10} /> Remove handoff
                    </button>
                  </div>
                </section>
              ) : null}

              {pendingCompile ? (
                <section className="border archive-border p-5 space-y-3 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                      Pending editorial compile
                    </p>
                    <span className="font-mono text-[7px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                      Auto-attached to export
                    </span>
                  </div>
                  <p className="font-sans text-[10px] archive-text-muted">
                    From The Edit · {pendingCompile.fragmentAtomIds.length} fragment(s) ·{" "}
                    {new Date(pendingCompile.compiledAt).toLocaleString()}
                  </p>
                  <pre className="border archive-border bg-archive-surface/20 p-4 font-mono text-[10px] archive-text-ink whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {pendingCompile.markdown}
                  </pre>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("mimi:route-request", { detail: { path: "/the-edit" } }),
                      )
                    }
                    className="font-mono text-[8px] uppercase tracking-widest archive-text-ink underline"
                  >
                    Edit compile
                  </button>
                </section>
              ) : (
                <p className="font-sans text-[10px] text-center archive-text-muted border border-dashed archive-border p-4">
                  No editorial compile queued. Approve context in The Edit to auto-attach markdown to the next export manifest.
                </p>
              )}
            </div>
          </div>
        )
      }
    />
  );
};

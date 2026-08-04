import React, { useEffect, useMemo, useState } from "react";
import { FileOutput, Gauge } from "lucide-react";
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
  INTEL_HUB_HANDOFF_CHANGED,
  readIntelHubPressHandoff,
  type IntelHubPressHandoff,
} from "../../lib/intelHubWorkflow";
import { useUser } from "../../contexts/UserContext";

type PressTab = "release" | "performance";

const TAB_WORKFLOW: Record<PressTab, ArchiveWorkflowStep> = {
  release: "apply",
  performance: "save",
};

export const ThePressChamber: React.FC = () => {
  const { user, profile } = useUser();
  const ownerUid = user?.uid || profile?.uid;
  const [tab, setTab] = useState<PressTab>("release");
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

  useEffect(() => {
    const refresh = () => setPendingIntelPack(readIntelHubPressHandoff());
    refresh();
    window.addEventListener(INTEL_HUB_HANDOFF_CHANGED, refresh);
    return () => window.removeEventListener(INTEL_HUB_HANDOFF_CHANGED, refresh);
  }, []);

  const contextDrawer = useMemo(
    () => (
      <ArchiveContextPanel
        title={tab === "release" ? "Release desk" : "Performance"}
        subtitle={
          tab === "release"
            ? "Artifact readiness before publication"
            : "Post-publication metrics when connected"
        }
      >
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What this means
          </p>
          <p className="font-serif italic text-sm leading-relaxed archive-text-ink">
            {tab === "release"
              ? "The Press verifies that an artifact is complete, sourced, approved, and packaged for each destination — then shows what will leave Mimi."
              : "Performance shows real reader and commerce data when an analytics provider is connected. Derived library counts are labeled."}
          </p>
        </div>
        <div className="space-y-3 pt-2 border-t archive-border">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What to do next
          </p>
          <ul className="font-sans text-[10px] archive-text-muted space-y-2 list-none">
            {tab === "release" ? (
              <>
                <li>Select the artifact you are publishing.</li>
                <li>Resolve release checks before external handoff.</li>
                <li>Export and publish from the artifact Export chamber after approval.</li>
                {pendingIntelPack ? (
                  <li className="text-amber-700 dark:text-amber-400">
                    Intel Hub pack awaits review in approval queue.
                  </li>
                ) : null}
                {pendingCompile ? (
                  <li>Editorial compile will attach to export manifest.</li>
                ) : null}
              </>
            ) : (
              <>
                <li>Connect analytics to see issue opens, reads, and shares.</li>
                <li>Public issue count is derived from your library until then.</li>
              </>
            )}
          </ul>
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
        </div>
      </ArchiveContextPanel>
    ),
    [tab, pendingIntelPack, pendingCompile],
  );

  return (
    <ArchiveChamberShell
      moduleId="the-press"
      activeWorkflowStep={TAB_WORKFLOW[tab]}
      workflowSteps={["apply", "save"]}
      headerNote="Verify · package · release approved editorial artifacts."
      contextDrawer={contextDrawer}
      contextDrawerOpen
      spine={
        <>
          <button
            type="button"
            title="Release desk"
            onClick={() => setTab("release")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "release" ? "is-active border-white/20" : ""
            }`}
          >
            <Gauge size={14} />
          </button>
          <button
            type="button"
            title="Performance"
            onClick={() => setTab("performance")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "performance" ? "is-active border-white/20" : ""
            }`}
          >
            <FileOutput size={14} />
          </button>
        </>
      }
      canvas={<PublisherDashboard forcedMode={tab} />}
    />
  );
};

import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, DollarSign } from "lucide-react";
import {
  ArchiveChamberShell,
  ArchiveContextPanel,
} from "./ArchiveChamberShell";
import { TheEdit } from "../TheEdit";
import { TheEditCompile } from "../TheEditCompile";

type EditTab = "compile" | "commerce";

export const TheEditChamber: React.FC = () => {
  const [tab, setTab] = useState<EditTab>("commerce");

  useEffect(() => {
    const onCommerceOpen = () => setTab("commerce");
    window.addEventListener("mimi:edit-open-commerce", onCommerceOpen);
    return () => window.removeEventListener("mimi:edit-open-commerce", onCommerceOpen);
  }, []);

  const contextDrawer = useMemo(
    () => (
      <ArchiveContextPanel
        title={tab === "compile" ? "Editorial compile" : "Commerce intelligence"}
        subtitle={
          tab === "compile"
            ? "Diagnostic framing over approved Scribe context"
            : "Primary forecast view · prototype decision support"
        }
      >
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What this means
          </p>
          <p className="font-serif italic text-sm leading-relaxed archive-text-ink">
            {tab === "compile"
              ? "The Edit is editorial intelligence — assemble approved atoms into a structured read before publish or export."
              : "The Forecast Edit makes opportunity signals primary. Current scores are decision-support previews; affiliate attribution and commissions require production integrations."}
          </p>
        </div>
        <div className="space-y-3 pt-2 border-t archive-border">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What to do next
          </p>
          <ul className="font-sans text-[10px] archive-text-muted space-y-2 list-none">
            {tab === "compile" ? (
              <>
                <li>Approve Used Context in the compile tray.</li>
                <li>Open an issue and Compose spreads on Visual Plates before Press.</li>
                <li>Frame thesis and preview markdown.</li>
                <li>Send compiled read to The Press for manifest export.</li>
              </>
            ) : (
              <>
                <li>Review the forecast as a hypothesis, not a verified live market feed.</li>
                <li>Return to compile when editorial read is ready.</li>
              </>
            )}
          </ul>
        </div>
      </ArchiveContextPanel>
    ),
    [tab],
  );

  return (
    <ArchiveChamberShell
      moduleId="the-edit"
      activeWorkflowStep={tab === "compile" ? "read" : "apply"}
      workflowSteps={["read", "approve", "apply"]}
      headerNote={
        tab === "compile"
          ? "Editorial compile · diagnostic framing over approved context."
          : "Forecast Edit · primary opportunity view · prototype data clearly labeled."
      }
      contextDrawer={contextDrawer}
      contextDrawerOpen
      spine={
        <>
          <button
            type="button"
            title="Editorial compile"
            onClick={() => setTab("compile")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "compile" ? "is-active border-white/20" : ""
            }`}
          >
            <BookOpen size={14} />
          </button>
          <button
            type="button"
            title="Commerce intelligence"
            onClick={() => setTab("commerce")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "commerce" ? "is-active border-white/20" : ""
            }`}
          >
            <DollarSign size={14} />
          </button>
        </>
      }
      canvas={
        tab === "compile" ? (
          <TheEditCompile />
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden h-full">
            <TheEdit />
          </div>
        )
      }
    />
  );
};

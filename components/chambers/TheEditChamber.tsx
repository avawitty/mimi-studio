import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, DollarSign, LayoutGrid } from "lucide-react";
import {
  ArchiveChamberShell,
  ArchiveContextPanel,
} from "./ArchiveChamberShell";
import { TheEdit } from "../TheEdit";
import { TheEditCompile } from "../TheEditCompile";
import { IssueSpreadsPanel } from "../IssueSpreadsPanel";

/** Architecture Update 21: one chamber, three panels — Signal / Issue / Forecast. */
type EditTab = "signal" | "issue" | "forecast";

const TAB_FROM_QUERY: Record<string, EditTab> = {
  signal: "signal",
  compile: "signal",
  issue: "issue",
  spreads: "issue",
  forecast: "forecast",
  commerce: "forecast",
};

function initialTab(): EditTab {
  if (typeof window === "undefined") return "signal";
  try {
    const panel = new URLSearchParams(window.location.search).get("panel") || "";
    return TAB_FROM_QUERY[panel] || "signal";
  } catch {
    return "signal";
  }
}

export const TheEditChamber: React.FC = () => {
  const [tab, setTab] = useState<EditTab>(initialTab);

  useEffect(() => {
    const onCommerceOpen = () => setTab("forecast");
    window.addEventListener("mimi:edit-open-commerce", onCommerceOpen);
    return () => window.removeEventListener("mimi:edit-open-commerce", onCommerceOpen);
  }, []);

  const contextDrawer = useMemo(
    () => (
      <ArchiveContextPanel
        title={
          tab === "signal"
            ? "Signal Edit"
            : tab === "issue"
              ? "Issue Edit"
              : "Forecast"
        }
        subtitle={
          tab === "signal"
            ? "Interpretive governance over approved Scribe context"
            : tab === "issue"
              ? "Spread composition and visual plates"
              : "Opportunity view · prototype decision support"
        }
      >
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What this means
          </p>
          <p className="font-serif italic text-sm leading-relaxed archive-text-ink">
            {tab === "signal"
              ? "Signal Edit assembles approved atoms into a structured editorial read before publish or export."
              : tab === "issue"
                ? "Issue Edit arranges spreads and visual plates on owned issues — composition governance, not taste approval."
                : "Forecast makes opportunity signals primary. Current scores are decision-support previews; affiliate attribution and commissions require production integrations."}
          </p>
        </div>
        <div className="space-y-3 pt-2 border-t archive-border">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What to do next
          </p>
          <ul className="font-sans text-[10px] archive-text-muted space-y-2 list-none">
            {tab === "signal" ? (
              <>
                <li>Approve Used Context in the compile tray.</li>
                <li>Frame thesis and preview markdown.</li>
                <li>Send compiled read to The Press for manifest export.</li>
                <li>Open Issue to compose spreads on Visual Plates.</li>
              </>
            ) : tab === "issue" ? (
              <>
                <li>Open an owned issue and Compose spreads on Visual Plates.</li>
                <li>Save composition metadata before Press export.</li>
                <li>Return to Signal when the editorial read still needs framing.</li>
              </>
            ) : (
              <>
                <li>Review the forecast as a hypothesis, not a verified live market feed.</li>
                <li>Return to Signal when editorial read is ready.</li>
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
      activeWorkflowStep={tab === "forecast" ? "apply" : "read"}
      workflowSteps={["read", "approve", "apply"]}
      headerNote={
        tab === "signal"
          ? "Signal Edit · diagnostic framing over approved context."
          : tab === "issue"
            ? "Issue Edit · spread composition on owned issues."
            : "Forecast · primary opportunity view · prototype data clearly labeled."
      }
      contextDrawer={contextDrawer}
      contextDrawerOpen
      spine={
        <>
          <button
            type="button"
            title="Signal Edit"
            aria-label="Signal Edit"
            onClick={() => setTab("signal")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "signal" ? "is-active border-white/20" : ""
            }`}
          >
            <BookOpen size={14} />
          </button>
          <button
            type="button"
            title="Issue Edit"
            aria-label="Issue Edit"
            onClick={() => setTab("issue")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "issue" ? "is-active border-white/20" : ""
            }`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            title="Forecast"
            aria-label="Forecast"
            onClick={() => setTab("forecast")}
            className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
              tab === "forecast" ? "is-active border-white/20" : ""
            }`}
          >
            <DollarSign size={14} />
          </button>
        </>
      }
      canvas={
        tab === "signal" ? (
          <TheEditCompile />
        ) : tab === "issue" ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6">
            <header className="border-b archive-border pb-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid size={16} className="archive-text-muted" />
                <p className="font-mono text-[8px] uppercase tracking-[0.35em] archive-text-muted">
                  Issue Edit
                </p>
              </div>
              <h2 className="font-serif italic text-2xl md:text-3xl archive-text-ink leading-tight">
                Compose spreads before Press.
              </h2>
              <p className="font-sans text-[10px] archive-text-muted mt-2 max-w-xl leading-relaxed">
                Arrange custom layouts on owned issues. Hi-fi plates bake at generate; composition metadata saves here.
              </p>
            </header>
            <IssueSpreadsPanel />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden h-full">
            <TheEdit />
          </div>
        )
      }
    />
  );
};

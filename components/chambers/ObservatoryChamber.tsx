import React from "react";
import { ChamberShell } from "./ChamberShell";
import { MeanMedianModePanel } from "../observatory/MeanMedianModePanel";
import { MesopicLensPanel } from "../observatory/MesopicLensPanel";
import {
  loadMeanMedianModeReport,
  loadMesopicReport,
} from "../../services/collective";
import {
  MEAN_MEDIAN_MODE_MODULE_ID,
  OBSERVATORY_CHAMBER_MODULE_ID,
  OBSERVATORY_COPY,
  OBSERVATORY_HANDOFF_TARGETS,
} from "../../lib/observatoryChamberContract";

export const ObservatoryChamber: React.FC<{
  navigate?: (path: string) => void;
  /** When opened via /mean-median-mode, still the same instrument. */
  focus?: "overview" | "mmm";
}> = ({ navigate, focus = "mmm" }) => {
  const report = loadMeanMedianModeReport("demonstration");
  const mesopic = loadMesopicReport("demonstration");
  const moduleId =
    focus === "mmm" ? MEAN_MEDIAN_MODE_MODULE_ID : OBSERVATORY_CHAMBER_MODULE_ID;

  const go = (view: string) => {
    if (navigate) {
      navigate(`/${view}`);
      return;
    }
    window.location.assign(`/${view}`);
  };

  return (
    <ChamberShell
      moduleId={moduleId}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {OBSERVATORY_HANDOFF_TARGETS.map((target) => (
            <button
              key={target.view}
              type="button"
              onClick={() => go(target.view)}
              className="px-3 py-1.5 border border-nous-border text-nous-subtle font-mono text-[8px] uppercase tracking-widest hover:text-nous-text hover:border-nous-text/40"
            >
              {target.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-nous-base">
        <div className="max-w-5xl mx-auto px-5 md:px-10 py-8 space-y-10">
          <div className="space-y-3 max-w-2xl">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-nous-subtle">
              Mean Median Mode{focus === "overview" ? " · Observatory" : ""}
            </p>
            <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
              {OBSERVATORY_COPY.mmmThesis}
            </p>
            <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
              {OBSERVATORY_COPY.residueDisambiguation}
            </p>
          </div>

          <MeanMedianModePanel report={report} />

          <div className="border-t border-nous-border pt-10">
            <MesopicLensPanel report={mesopic} />
          </div>
        </div>
      </div>
    </ChamberShell>
  );
};

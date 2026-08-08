import React from "react";
import type { MeanMedianModeReport } from "../../schemas/collectiveIntelligenceContracts";

export const MmmMethodology: React.FC<{
  report: MeanMedianModeReport;
  tone?: "default" | "void";
}> = ({ report, tone = "default" }) => {
  const subtle = tone === "void" ? "text-stone-500" : "text-nous-subtle";
  const text = tone === "void" ? "text-stone-100" : "text-nous-text";
  const border = tone === "void" ? "border-white/10" : "border-nous-border";
  const methodology = report.methodology;
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${subtle}`}>
          Why Mimi thinks this
        </h2>
        <ul className={`space-y-1 font-sans text-[12px] leading-relaxed ${text}`}>
          <li>
            Window{" "}
            <span className={`font-mono text-[11px] ${subtle}`}>
              {new Date(report.windowStart).toISOString().slice(0, 10)} →{" "}
              {new Date(report.windowEnd).toISOString().slice(0, 10)}
            </span>
          </li>
          <li>
            Methodology{" "}
            <span className={`font-mono text-[11px] ${subtle}`}>{report.methodologyVersion}</span>
          </li>
          {methodology ? (
            <li>
              Sample {methodology.sampleSize} · unique artifacts {methodology.uniqueArtifactCount}
            </li>
          ) : null}
          <li>
            Last updated{" "}
            <span className={`font-mono text-[11px] ${subtle}`}>
              {new Date(report.lastUpdated).toISOString()}
            </span>
          </li>
        </ul>
        {methodology?.exclusions?.length ? (
          <p className={`font-sans text-[11px] leading-relaxed ${subtle}`}>
            Exclusions: {methodology.exclusions.join(" · ")}
          </p>
        ) : null}
        <ul className={`space-y-1 font-sans text-[11px] leading-relaxed list-disc pl-4 ${subtle}`}>
          {report.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className={`space-y-2 border-t pt-4 ${border}`}>
        <h2 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${subtle}`}>
          What Mimi may be missing
        </h2>
        <ul className="space-y-1 font-sans text-[12px] text-nous-text leading-relaxed list-disc pl-4">
          {report.whatMayBeMissing.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

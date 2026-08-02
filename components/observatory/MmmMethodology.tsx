import React from "react";
import type { MeanMedianModeReport } from "../../schemas/collectiveIntelligenceContracts";

export const MmmMethodology: React.FC<{ report: MeanMedianModeReport }> = ({ report }) => {
  const methodology = report.methodology;
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
          Why Mimi thinks this
        </h2>
        <ul className="space-y-1 font-sans text-[12px] text-nous-text leading-relaxed">
          <li>
            Window{" "}
            <span className="font-mono text-[11px] text-nous-subtle">
              {new Date(report.windowStart).toISOString().slice(0, 10)} →{" "}
              {new Date(report.windowEnd).toISOString().slice(0, 10)}
            </span>
          </li>
          <li>
            Methodology{" "}
            <span className="font-mono text-[11px] text-nous-subtle">{report.methodologyVersion}</span>
          </li>
          {methodology ? (
            <li>
              Sample {methodology.sampleSize} · unique artifacts {methodology.uniqueArtifactCount}
            </li>
          ) : null}
          <li>
            Last updated{" "}
            <span className="font-mono text-[11px] text-nous-subtle">
              {new Date(report.lastUpdated).toISOString()}
            </span>
          </li>
        </ul>
        {methodology?.exclusions?.length ? (
          <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
            Exclusions: {methodology.exclusions.join(" · ")}
          </p>
        ) : null}
        <ul className="space-y-1 font-sans text-[11px] text-nous-subtle leading-relaxed list-disc pl-4">
          {report.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 border-t border-nous-border pt-4">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
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

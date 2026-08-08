import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { listCuriosityRecords } from "../../services/curiosityStore";
import { compileCuriosityPatternReport } from "../../lib/curiosity/curiosityAnalytics";
import type { CuriosityPatternReport } from "../../schemas/curiosityContracts";
import { CURIOSITY_PROMPTS } from "../../services/tailorEvidenceIntake";

export const CuriosityPatternPanel: React.FC<{
  userId?: string;
  variant?: "default" | "twilight";
}> = ({ userId, variant = "default" }) => {
  const [report, setReport] = useState<CuriosityPatternReport | null>(null);
  const [loading, setLoading] = useState(true);
  const isTwilight = variant === "twilight";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listCuriosityRecords({ userId, limit: 120 }).then((records) => {
      if (cancelled) return;
      setReport(compileCuriosityPatternReport(records));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const borderClass = isTwilight ? "border-white/15" : "border-nous-border";
  const textClass = isTwilight ? "text-[var(--mimi-bone)]" : "text-nous-text";
  const subtleClass = isTwilight ? "text-mimi-stone" : "text-nous-subtle";
  const labelClass = isTwilight
    ? "font-mono text-[8px] uppercase tracking-[0.28em] text-mimi-cobalt"
    : "font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle";

  if (loading) {
    return (
      <div className={`border ${borderClass} p-6 flex justify-center`}>
        <Loader2 size={18} className={`animate-spin ${subtleClass}`} />
      </div>
    );
  }

  if (!report) return null;

  return (
    <section
      className={`border ${borderClass} p-5 space-y-4`}
      data-testid="curiosity-pattern-panel"
    >
      <div className="space-y-1">
        <h3 className={labelClass}>Curiosity patterns</h3>
        <p className={`font-serif italic text-base leading-relaxed ${textClass}`}>
          {report.narrativeSummary}
        </p>
        <p className={`font-mono text-[9px] tabular-nums ${subtleClass}`}>
          {report.totalQuestions} questions · last {report.windowDays} days · Mesopic{" "}
          {report.sourceBreakdown["mesopic-lens"]} · Scry {report.sourceBreakdown.scry}
        </p>
      </div>

      {report.recurringThemes.length > 0 ? (
        <div className="space-y-2">
          <h4 className={labelClass}>Recurring themes</h4>
          <ul className="space-y-2">
            {report.recurringThemes.map((theme) => (
              <li
                key={theme.theme}
                className={`border ${borderClass} px-3 py-2 space-y-1`}
              >
                <div className="flex justify-between gap-2">
                  <span className={`font-serif text-sm ${textClass}`}>{theme.theme}</span>
                  <span className={`font-mono text-[9px] tabular-nums ${subtleClass}`}>
                    ×{theme.count}
                  </span>
                </div>
                {theme.sampleQuestions[0] ? (
                  <p className={`font-sans text-[11px] italic ${subtleClass} line-clamp-2`}>
                    e.g. “{theme.sampleQuestions[0]}”
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {Object.keys(report.curiosityChipFrequency).length > 0 ? (
        <div className="space-y-2">
          <h4 className={labelClass}>Curiosity chips</h4>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(report.curiosityChipFrequency)
              .sort((a, b) => b[1] - a[1])
              .map(([id, count]) => {
                const label =
                  CURIOSITY_PROMPTS.find((p) => p.id === id)?.label ?? id;
                return (
                  <li
                    key={id}
                    className={`font-mono text-[9px] px-2 py-1 border ${borderClass} ${subtleClass}`}
                  >
                    {label} · {count}
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}
    </section>
  );
};

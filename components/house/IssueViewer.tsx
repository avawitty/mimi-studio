import { ArrowLeft, Download } from "lucide-react";
import PlateVisual from "./PlateVisual";
import { useMimi } from "./store";
import { SysLabel } from "./shared";

export default function IssueViewer({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const { issues, plates } = useMimi();
  const issue = issues.find((i) => i.id === id);

  if (!issue) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-4xl">Issue not found</h1>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] border border-[var(--house-line)] px-6 py-3 hover:bg-[var(--house-ink)] hover:text-[var(--house-field)] transition-colors"
          >
            Return to studio
          </button>
        </div>
      </div>
    );
  }

  const activePlates = plates.filter((p) => issue.plateIds.includes(p.id));

  function exportJson() {
    const payload = { ...issue, plates: activePlates };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mimi-issue-${String(issue!.edition).padStart(3, "0")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="house-floor-enter">
      <header className="border-b border-[var(--house-line)] mb-8">
        <div className="flex items-center justify-between py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--house-stone)] hover:text-[var(--house-ink)]"
          >
            <ArrowLeft size={14} /> Studio
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] border border-[var(--house-line)] px-4 py-2 hover:border-[var(--house-ink)]"
          >
            <Download size={14} /> Export JSON
          </button>
        </div>
      </header>

      <div className="border border-[var(--house-line)] bg-[var(--house-field)] p-8 md:p-16 relative max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <SysLabel>Mimi Zine · Edition №{String(issue.edition).padStart(3, "0")}</SysLabel>
          <SysLabel>
            {new Date(issue.publishedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </SysLabel>
        </div>
        <h1 className="font-serif text-5xl md:text-7xl font-light mt-6 leading-none">
          {issue.title}
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--house-stone)] mt-3">
          {issue.archetype}
        </p>
        <hr className="border-0 border-t border-[var(--house-line)] my-8" />
        <blockquote className="font-serif italic text-xl md:text-2xl text-[var(--house-stone)] leading-relaxed max-w-2xl">
          {issue.manifesto}
        </blockquote>

        <div className="grid gap-6 sm:grid-cols-2 mt-12">
          {activePlates.map((p) => (
            <figure key={p.id} className="border border-[var(--house-line)]">
              <PlateVisual seed={p.seed} palette={p.palette} className="w-full aspect-[5/7] block" />
              <figcaption className="p-4 border-t border-[var(--house-line)]">
                <span className="font-serif text-xl">{p.title}</span>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--house-stone)] mt-1">
                  {p.mood}
                </p>
                <p className="text-sm text-[var(--house-stone)] mt-2 leading-relaxed">
                  {p.narrative}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="house-seal absolute top-6 right-6 w-20 h-20 rounded-full border-2 border-[var(--house-olive)] text-[var(--house-olive)] flex items-center justify-center rotate-[-8deg] pointer-events-none">
          <div className="text-center font-mono text-[8px] uppercase tracking-[0.14em] leading-tight">
            Mimi
            <br />
            Press
            <br />№{String(issue.edition).padStart(3, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}

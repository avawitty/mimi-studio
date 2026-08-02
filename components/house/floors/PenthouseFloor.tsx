import { useState } from "react";
import { Download } from "lucide-react";
import { EDITOR_VOICE } from "../editor";
import PlateVisual from "../PlateVisual";
import { getState, setState, uid, useMimi } from "../store";
import type { Issue } from "../types";
import { FloorHeader, MimiVoice, SysLabel } from "../shared";

export default function PenthouseFloor({
  onOpenIssue,
}: {
  onOpenIssue?: (id: string) => void;
}) {
  const { plates, issues, reading } = useMimi();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function publish() {
    if (!title.trim() || selected.length === 0) return;
    const issue: Issue = {
      id: uid(),
      title: title.trim(),
      manifesto: reading?.manifesto ?? "A position, privately held.",
      archetype: reading?.archetype ?? "The Unnamed",
      plateIds: selected,
      publishedAt: Date.now(),
      edition: getState().issues.length + 1,
    };
    setState({ issues: [issue, ...getState().issues] }, "publish-issue");
    setTitle("");
    setSelected([]);
    onOpenIssue?.(issue.id);
  }

  function exportIssue(issue: Issue) {
    const payload = {
      ...issue,
      plates: plates.filter((p) => issue.plateIds.includes(p.id)),
      reading,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mimi-issue-${String(issue.edition).padStart(3, "0")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="house-floor-enter">
      <FloorHeader
        index="FL 4"
        name="Penthouse"
        phase="Phase IV — Publication"
        blurb="The top floor. Bind your plates into a numbered edition, stamp it with the house seal, and put the position on record."
      />
      <MimiVoice>
        {EDITOR_VOICE.penthouseIdle}
        {selected.length
          ? ` ${selected.length} plate${selected.length === 1 ? "" : "s"} will be bound.`
          : ""}
        {reading
          ? ` Archetype on record: ${reading.archetype}.`
          : " No reading on record — the issue will go out unnamed."}
      </MimiVoice>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] mb-12">
        <section>
          <SysLabel className="mb-3 block">Select plates to bind</SysLabel>
          {plates.length === 0 ? (
            <p className="font-serif italic text-[var(--house-stone)]">
              Compose plates on Floor 3 before publishing.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {plates.map((p) => {
                const on = selected.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`w-full text-left border transition-colors ${
                        on
                          ? "border-[var(--house-ink)] bg-[var(--house-worktable)]"
                          : "border-[var(--house-line)] hover:border-[var(--house-stone)]"
                      }`}
                    >
                      <PlateVisual
                        seed={p.seed}
                        palette={p.palette}
                        className="w-full aspect-[5/7] block"
                      />
                      <div className="p-3 border-t border-[var(--house-line)]">
                        <span className="font-serif text-lg">{p.title}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="border border-[var(--house-line)] p-6 h-fit">
          <SysLabel className="mb-3 block">Issue title</SysLabel>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--house-line)] py-2 font-serif text-2xl focus:outline-none focus:border-[var(--house-ink)] mb-6"
            placeholder="Edition title"
          />
          <button
            type="button"
            onClick={publish}
            disabled={!title.trim() || selected.length === 0}
            className="w-full bg-[var(--house-ink)] text-[var(--house-field)] font-mono text-[11px] uppercase tracking-[0.18em] px-6 py-3 disabled:opacity-30 hover:opacity-85 transition-opacity"
          >
            Publish issue →
          </button>
        </aside>
      </div>

      <SysLabel className="mb-4 block">Archive — {issues.length}</SysLabel>
      {issues.length === 0 ? (
        <p className="font-serif italic text-[var(--house-stone)] text-lg">No editions yet.</p>
      ) : (
        <ul className="space-y-4">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="border border-[var(--house-line)] p-6 flex flex-wrap items-start justify-between gap-4"
            >
              <div>
                <SysLabel>
                  Edition №{String(issue.edition).padStart(3, "0")} · {issue.archetype}
                </SysLabel>
                <h3 className="font-serif text-3xl font-light mt-2">{issue.title}</h3>
                <p className="font-serif italic text-[var(--house-stone)] mt-2 max-w-xl line-clamp-2">
                  {issue.manifesto}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpenIssue?.(issue.id)}
                  className="border border-[var(--house-line)] font-mono text-[10px] uppercase tracking-[0.18em] px-4 py-2 hover:bg-[var(--house-ink)] hover:text-[var(--house-field)] transition-colors"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => exportIssue(issue)}
                  className="border border-[var(--house-line)] font-mono text-[10px] uppercase tracking-[0.18em] px-4 py-2 flex items-center gap-2 hover:border-[var(--house-ink)]"
                >
                  <Download size={12} /> JSON
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

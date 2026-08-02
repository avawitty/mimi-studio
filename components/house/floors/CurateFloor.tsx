import { useState } from "react";
import { EDITOR_VOICE, matchesHouseQuery, synthesizeReading } from "../editor";
import SearchBar from "../SearchBar";
import { getState, setState, useMimi } from "../store";
import { FloorHeader, MimiVoice, SysLabel, TagChip } from "../shared";

export default function CurateFloor() {
  const { debris, reading } = useMimi();
  const [query, setQuery] = useState("");

  const held = debris.filter(
    (d) => d.status === "held" && matchesHouseQuery(query, d.raw, d.tags),
  );
  const kept = debris.filter(
    (d) => d.status === "kept" && matchesHouseQuery(query, d.raw, d.tags),
  );
  const refused = debris.filter(
    (d) => d.status === "refused" && matchesHouseQuery(query, d.raw, d.tags),
  );

  function setStatus(id: string, status: "kept" | "refused" | "held") {
    setState(
      {
        debris: getState().debris.map((d) => (d.id === id ? { ...d, status } : d)),
      },
      status === "kept" ? "keep" : status === "refused" ? "refuse" : "return-held",
    );
  }

  function runReading() {
    const allKept = getState().debris.filter((d) => d.status === "kept");
    const allRefused = getState().debris.filter((d) => d.status === "refused");
    if (allKept.length < 3 || allRefused.length < 1) return;
    const next = synthesizeReading(allKept, allRefused);
    // Prefer palette from uploaded images when present
    const uploadPalette = allKept.find((d) => d.imagePalette?.length)?.imagePalette;
    setState(
      {
        reading: uploadPalette ? { ...next, palette: uploadPalette } : next,
      },
      "synthesize-reading",
    );
  }

  const keptCount = debris.filter((d) => d.status === "kept").length;
  const refusedCount = debris.filter((d) => d.status === "refused").length;
  const canRead = keptCount >= 3 && refusedCount >= 1;

  return (
    <div className="house-floor-enter">
      <FloorHeader
        index="FL 2"
        name="Curate"
        phase="Phase II — Absolute Negatives"
        blurb="Visual over-saturation blunts discernment. Taste is established in what you exclude. Keep what survives scrutiny; refuse what merely flatters."
      />
      <MimiVoice>{EDITOR_VOICE.curateIdle}</MimiVoice>

      <SearchBar value={query} onChange={setQuery} placeholder="Filter debris by text or tag…" />

      <div className="grid gap-6 lg:grid-cols-3 mb-10">
        {(
          [
            { title: "Held", items: held, action: null as null | "kept" | "refused" },
            { title: "Kept", items: kept, action: "kept" as const },
            { title: "Refused", items: refused, action: "refused" as const },
          ] as const
        ).map((col) => (
          <section key={col.title} className="border border-[var(--house-line)] p-4">
            <SysLabel className="mb-3 block">
              {col.title} — {col.items.length}
            </SysLabel>
            {col.items.length === 0 ? (
              <p className="font-serif italic text-[var(--house-stone)] text-sm">Empty.</p>
            ) : (
              <ul className="space-y-3">
                {col.items.map((d) => (
                  <li key={d.id} className="border-b border-[var(--house-line)] pb-3 last:border-0">
                    {d.imageUrl ? (
                      <img
                        src={d.imageUrl}
                        alt={d.raw}
                        className="w-full h-20 object-cover border border-[var(--house-line)] mb-2"
                      />
                    ) : null}
                    <p className="font-serif text-base leading-snug line-clamp-3">{d.raw}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.tags.map((t) => (
                        <TagChip key={t.label} label={t.label} intensity={t.intensity} />
                      ))}
                    </div>
                    {d.status === "held" ? (
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setStatus(d.id, "kept")}
                          className="flex-1 border border-[var(--house-ink)] bg-[var(--house-ink)] text-[var(--house-field)] font-mono text-[9px] uppercase tracking-[0.18em] py-2"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(d.id, "refused")}
                          className="flex-1 border border-[var(--house-line)] font-mono text-[9px] uppercase tracking-[0.18em] py-2 hover:border-[var(--house-ink)]"
                        >
                          Refuse
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStatus(d.id, "held")}
                        className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--house-stone)] hover:text-[var(--house-ink)]"
                      >
                        Return to held
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="border border-[var(--house-line)] p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SysLabel>Aesthetic reading</SysLabel>
            <p className="font-serif text-sm text-[var(--house-stone)] mt-2 max-w-xl">
              Mimi reads the kept against the refused and names your archetype. Requires at least
              three kept references and one anti-reference.
            </p>
          </div>
          <button
            type="button"
            onClick={runReading}
            disabled={!canRead}
            className="bg-[var(--house-olive)] text-[var(--house-field)] font-mono text-[11px] uppercase tracking-[0.18em] px-6 py-3 disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            Synthesize reading →
          </button>
        </div>

        {reading ? (
          <div className="mt-8 border-t border-[var(--house-line)] pt-6">
            <SysLabel>Current reading</SysLabel>
            <h3 className="font-serif text-4xl md:text-5xl font-light mt-3">{reading.archetype}</h3>
            <p className="font-serif italic text-xl text-[var(--house-stone)] mt-2">
              {reading.positioning}
            </p>
            <p className="mt-4 text-[var(--house-ink)]/80 leading-relaxed max-w-2xl">
              {reading.critique}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--house-olive)]">
              {reading.directive}
            </p>
            <div className="flex gap-2 mt-4">
              {reading.palette.map((c) => (
                <span
                  key={c}
                  className="w-9 h-9 border border-[var(--house-line)]"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

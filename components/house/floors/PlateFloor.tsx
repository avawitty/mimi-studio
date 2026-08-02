import { useState } from "react";
import { X } from "lucide-react";
import { EDITOR_VOICE, matchesHouseQuery } from "../editor";
import PlateVisual from "../PlateVisual";
import SearchBar from "../SearchBar";
import { getState, setState, uid, useMimi } from "../store";
import type { Plate } from "../types";
import { FloorHeader, MimiVoice, SysLabel } from "../shared";

export default function PlateFloor() {
  const { plates, reading } = useMimi();
  const [title, setTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [mood, setMood] = useState("");
  const [query, setQuery] = useState("");
  const palette = reading?.palette ?? ["#0A0A0A", "#FFFFFF", "#5A5A40", "#78716C", "#D4D4D4"];

  const filtered = plates.filter((p) =>
    matchesHouseQuery(query, p.title, [], [p.narrative, p.mood]),
  );

  function compose() {
    if (!title.trim() || !narrative.trim()) return;
    const plate: Plate = {
      id: uid(),
      title: title.trim(),
      narrative: narrative.trim(),
      mood: mood.trim() || "unresolved",
      palette,
      seed: Math.floor(Math.random() * 1e9),
      createdAt: Date.now(),
    };
    setState({ plates: [plate, ...getState().plates] }, "compose-plate");
    setTitle("");
    setNarrative("");
    setMood("");
  }

  function discard(id: string) {
    setState({ plates: getState().plates.filter((p) => p.id !== id) }, "discard-plate");
  }

  return (
    <div className="house-floor-enter">
      <FloorHeader
        index="FL 3"
        name="Plate"
        phase="Phase III — Composition"
        blurb="A plate is one page of your position, composed with intent. Each one draws from your reading palette — no stock imagery, no borrowed taste."
      />
      <MimiVoice>{EDITOR_VOICE.plateIdle}</MimiVoice>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <section className="border border-[var(--house-line)] p-6">
          <SysLabel className="mb-4 block">Compose</SysLabel>
          <label className="block mb-4">
            <SysLabel>Title</SysLabel>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-[var(--house-line)] py-2 font-serif text-2xl focus:outline-none focus:border-[var(--house-ink)]"
              placeholder="Name it like a gallery would"
            />
          </label>
          <label className="block mb-4">
            <SysLabel>Narrative</SysLabel>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={4}
              className="mt-1 w-full bg-transparent border border-[var(--house-line)] p-3 font-serif text-lg focus:outline-none focus:border-[var(--house-ink)] resize-y"
              placeholder="What does this plate argue?"
            />
          </label>
          <label className="block mb-6">
            <SysLabel>Mood</SysLabel>
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-[var(--house-line)] py-2 font-mono text-sm uppercase tracking-[0.14em] focus:outline-none focus:border-[var(--house-ink)]"
              placeholder="unresolved"
            />
          </label>
          <div className="flex gap-2 mb-6">
            {palette.map((c) => (
              <span
                key={c}
                className="w-8 h-8 border border-[var(--house-line)]"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={compose}
            disabled={!title.trim() || !narrative.trim()}
            className="bg-[var(--house-ink)] text-[var(--house-field)] font-mono text-[11px] uppercase tracking-[0.18em] px-6 py-3 disabled:opacity-30 hover:opacity-85 transition-opacity"
          >
            Compose plate →
          </button>
        </section>

        <section>
          <SearchBar value={query} onChange={setQuery} placeholder="Search plates…" />
          <SysLabel className="mb-4 block">Plates — {filtered.length}</SysLabel>
          {filtered.length === 0 ? (
            <p className="font-serif italic text-[var(--house-stone)] text-lg">
              No plates yet. Composition waits upstairs of judgement.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {filtered.map((p) => (
                <li key={p.id} className="border border-[var(--house-line)] group relative">
                  <button
                    type="button"
                    onClick={() => discard(p.id)}
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 bg-[var(--house-field)]/80 p-1 border border-[var(--house-line)]"
                    aria-label="Discard plate"
                  >
                    <X size={12} />
                  </button>
                  <PlateVisual
                    seed={p.seed}
                    palette={p.palette}
                    className="w-full aspect-[5/7] block"
                  />
                  <div className="p-3 border-t border-[var(--house-line)]">
                    <p className="font-serif text-xl">{p.title}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--house-stone)] mt-1">
                      {p.mood}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

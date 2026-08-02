import { useMemo, useState } from "react";
import { Link2, X } from "lucide-react";
import { EDITOR_VOICE, matchesHouseQuery } from "../editor";
import PlateVisual from "../PlateVisual";
import SearchBar from "../SearchBar";
import { copyHouseShareLink } from "../share";
import { getState, setState, uid, useMimi } from "../store";
import type { Plate } from "../types";
import { FloorHeader, MimiVoice, SysLabel } from "../shared";

const DEFAULT_PALETTE = ["#0A0A0A", "#FFFFFF", "#5A5A40", "#78716C", "#D4D4D4"];

export default function PlateFloor() {
  const { plates, reading, debris } = useMimi();
  const [title, setTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [mood, setMood] = useState("");
  const [query, setQuery] = useState("");
  const [paletteSource, setPaletteSource] = useState<"reading" | string>("reading");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const imagePalettes = useMemo(
    () =>
      debris.filter(
        (d) =>
          (d.status === "kept" || d.status === "held") &&
          d.imagePalette &&
          d.imagePalette.length >= 5,
      ),
    [debris],
  );

  const palette = useMemo(() => {
    if (paletteSource === "reading") {
      return reading?.palette ?? DEFAULT_PALETTE;
    }
    const fromImage = imagePalettes.find((d) => d.id === paletteSource)?.imagePalette;
    return fromImage && fromImage.length >= 5 ? fromImage : reading?.palette ?? DEFAULT_PALETTE;
  }, [paletteSource, reading, imagePalettes]);

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

  async function copyPlate(id: string) {
    const ok = await copyHouseShareLink("plate", id);
    if (ok) {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    }
  }

  return (
    <div className="house-floor-enter">
      <FloorHeader
        index="FL 3"
        name="Plate"
        phase="Phase III — Composition"
        blurb="A plate is one page of your position, composed with intent. Each one draws from your reading palette — or a palette extracted from an uploaded image."
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
          <label className="block mb-4">
            <SysLabel>Mood</SysLabel>
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-[var(--house-line)] py-2 font-mono text-sm uppercase tracking-[0.14em] focus:outline-none focus:border-[var(--house-ink)]"
              placeholder="unresolved"
            />
          </label>

          <div className="mb-4">
            <SysLabel className="mb-2 block">Palette source</SysLabel>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaletteSource("reading")}
                className={`font-mono text-[9px] uppercase tracking-[0.18em] border px-3 py-1.5 ${
                  paletteSource === "reading"
                    ? "border-[var(--house-ink)] bg-[var(--house-ink)] text-[var(--house-field)]"
                    : "border-[var(--house-line)]"
                }`}
              >
                Reading
              </button>
              {imagePalettes.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setPaletteSource(d.id)}
                  className={`font-mono text-[9px] uppercase tracking-[0.18em] border px-3 py-1.5 max-w-[10rem] truncate ${
                    paletteSource === d.id
                      ? "border-[var(--house-ink)] bg-[var(--house-ink)] text-[var(--house-field)]"
                      : "border-[var(--house-line)]"
                  }`}
                  title={d.raw}
                >
                  {d.raw}
                </button>
              ))}
            </div>
          </div>

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
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void copyPlate(p.id)}
                      className="bg-[var(--house-field)]/80 p-1 border border-[var(--house-line)]"
                      aria-label="Copy plate link"
                      title="Copy share link"
                    >
                      <Link2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => discard(p.id)}
                      className="bg-[var(--house-field)]/80 p-1 border border-[var(--house-line)]"
                      aria-label="Discard plate"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <PlateVisual
                    seed={p.seed}
                    palette={p.palette}
                    className="w-full aspect-[5/7] block"
                  />
                  <div className="p-3 border-t border-[var(--house-line)]">
                    <p className="font-serif text-xl">{p.title}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--house-stone)] mt-1">
                      {p.mood}
                      {copiedId === p.id ? " · link copied" : ""}
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

import { useCallback, useRef, useState, type DragEvent } from "react";
import { ImageIcon, Link, Type, Upload, X } from "lucide-react";
import { extractTags, EDITOR_VOICE, matchesHouseQuery } from "../editor";
import SearchBar from "../SearchBar";
import { extractPaletteFromImage, getState, setState, uid, useMimi } from "../store";
import type { Debris } from "../types";
import { FloorHeader, MimiVoice, SysLabel, TagChip } from "../shared";

const KINDS = [
  { id: "link" as const, label: "Paste a link", hint: "https://… — I will read the intent, not the metrics.", icon: Link },
  { id: "text" as const, label: "Drop a fragment", hint: "A sentence, a lyric, a product name, a rumor.", icon: Type },
  { id: "image" as const, label: "Describe an image", hint: "Subject, setting, color, material, light…", icon: ImageIcon },
  { id: "upload" as const, label: "Upload image", hint: "Drop an image to extract its palette.", icon: Upload },
] as const;

export default function IngestFloor() {
  const { debris } = useMimi();
  const [kind, setKind] = useState<Debris["kind"]>("text");
  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const held = debris.filter(
    (d) => d.status === "held" && matchesHouseQuery(query, d.raw, d.tags),
  );

  function ingest() {
    const value = raw.trim();
    if (!value) return;
    const item: Debris = {
      id: uid(),
      kind,
      raw: value,
      tags: extractTags(value),
      status: "held",
      ingestedAt: Date.now(),
    };
    setState({ debris: [item, ...getState().debris] }, "ingest");
    setRaw("");
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const palette = await extractPaletteFromImage(file);
      const url = URL.createObjectURL(file);
      const item: Debris = {
        id: uid(),
        kind: "upload",
        raw: file.name,
        tags: extractTags(file.name),
        status: "held",
        ingestedAt: Date.now(),
        imageUrl: url,
        imagePalette: palette,
      };
      setState({ debris: [item, ...getState().debris] }, "ingest-image");
    } finally {
      setUploading(false);
    }
  }

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleImageFile(file);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  function discard(id: string) {
    setState({ debris: getState().debris.filter((d) => d.id !== id) }, "discard-debris");
  }

  return (
    <div className="house-floor-enter">
      <FloorHeader
        index="FL 1"
        name="Ingest"
        phase="Phase I — Synthesizing Aesthetic"
        blurb="Everything you consume is a confession. Feed the intake and Mimi will extract the aesthetic coordinates hiding inside the noise."
      />

      <MimiVoice>{held.length === 0 ? EDITOR_VOICE.ingestIdle : EDITOR_VOICE.ingestDone(held.length)}</MimiVoice>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="flex gap-px border border-[var(--house-line)] w-fit mb-6 flex-wrap">
            {KINDS.map((k) => {
              const Icon = k.icon;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors flex items-center gap-2 ${
                    kind === k.id
                      ? "bg-[var(--house-ink)] text-[var(--house-field)]"
                      : "text-[var(--house-stone)] hover:bg-[var(--house-worktable)]"
                  }`}
                >
                  <Icon size={12} />
                  {k.label}
                </button>
              );
            })}
          </div>

          {kind === "upload" ? (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-[var(--house-ink)] bg-[var(--house-worktable)]"
                  : "border-[var(--house-line)] hover:border-[var(--house-stone)]"
              }`}
            >
              <Upload className="mx-auto mb-3 text-[var(--house-stone)]" size={24} />
              <p className="font-serif italic text-lg text-[var(--house-stone)]">
                {dragOver ? "Release to ingest" : "Drop an image, or click to browse"}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--house-stone)] mt-2">
                JPG, PNG, WEBP — palette will be extracted
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && void handleImageFile(e.target.files[0])}
              />
              {uploading ? (
                <p className="font-mono text-[10px] mt-4 animate-pulse">Extracting chromatic data…</p>
              ) : null}
            </div>
          ) : (
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ingest();
              }}
              rows={4}
              placeholder={KINDS.find((k) => k.id === kind)!.hint}
              className="w-full bg-transparent border border-[var(--house-line)] p-4 font-serif text-xl placeholder:text-[var(--house-stone)] placeholder:italic focus:outline-none focus:border-[var(--house-ink)] resize-y"
            />
          )}

          {kind !== "upload" ? (
            <div className="flex items-center justify-between mt-4">
              <SysLabel>⌘↵ to ingest</SysLabel>
              <button
                type="button"
                onClick={ingest}
                disabled={!raw.trim()}
                className="bg-[var(--house-ink)] text-[var(--house-field)] font-mono text-[11px] uppercase tracking-[0.18em] px-6 py-3 disabled:opacity-30 hover:opacity-85 transition-opacity"
              >
                Ingest debris →
              </button>
            </div>
          ) : null}
        </section>

        <aside>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Filter held debris…"
          />
          <SysLabel className="mb-4 block">Intake holding — {held.length}</SysLabel>
          {held.length === 0 ? (
            <p className="font-serif italic text-[var(--house-stone)] text-lg">
              The tray is empty. The algorithm is winning.
            </p>
          ) : (
            <ul className="space-y-4">
              {held.map((d, i) => (
                <li
                  key={d.id}
                  className="border border-[var(--house-line)] p-4 house-grain group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <SysLabel>
                      {String(held.length - i).padStart(2, "0")} / {d.kind}
                    </SysLabel>
                    <button
                      type="button"
                      onClick={() => discard(d.id)}
                      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--house-stone)] opacity-0 group-hover:opacity-100 hover:text-[var(--house-olive)] transition-opacity"
                      aria-label="Discard"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {d.imageUrl ? (
                    <div className="mt-2">
                      <img
                        src={d.imageUrl}
                        alt={d.raw}
                        className="w-full h-32 object-cover border border-[var(--house-line)] mb-2"
                      />
                      <div className="flex gap-1.5">
                        {d.imagePalette?.map((c) => (
                          <span
                            key={c}
                            className="w-5 h-5 border border-[var(--house-line)]"
                            style={{ background: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="font-serif text-lg leading-snug mt-2 break-words line-clamp-3">
                      {d.raw}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {d.tags.map((t) => (
                      <TagChip key={t.label} label={t.label} intensity={t.intensity} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

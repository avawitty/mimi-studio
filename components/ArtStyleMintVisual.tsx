import React, { useEffect, useMemo, useState } from "react";

export interface MintVisualRef {
  id: string;
  type: "image" | "text";
  data: string;
  previewUrl?: string;
  name: string;
}

interface ArtStyleMintVisualProps {
  primaryAxis: string;
  secondaryAxis: string;
  coreTrait: string;
  motifs: string[];
  palette: string[];
  tactile: { dominant: string; secondary: string };
  fonts: { serif: string; sans: string };
  cardId: string;
  refs: MintVisualRef[];
  mintedImageUrl?: string | null;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toLatCoords(seed: number): string {
  const a = ((seed % 900) + 100).toString(16).toUpperCase();
  const b = (((seed >>> 8) % 900) + 100).toString(16).toUpperCase();
  return `${a}-${b}`;
}

function GlyphTile({
  label,
  color,
  accent,
  fill = false,
}: {
  label: string;
  color: string;
  accent: string;
  /** When true, fill the parent (SCROLL mode) instead of sizing to content. */
  fill?: boolean;
}) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`relative border border-white/10 overflow-hidden flex flex-col justify-between ${
        fill ? "w-full h-full p-6" : "aspect-square p-2"
      }`}
      style={{
        background: `linear-gradient(145deg, ${color}ee, ${accent}55 60%, #0a0a0a)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 7px), repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(255,255,255,0.05) 6px, rgba(255,255,255,0.05) 7px)",
        }}
      />
      <span
        className={`relative z-10 font-mono uppercase tracking-[0.2em] text-white/70 truncate ${
          fill ? "text-[10px]" : "text-[7px]"
        }`}
      >
        {label}
      </span>
      <span
        className={`relative z-10 font-serif italic text-white/90 leading-none ${
          fill ? "text-6xl md:text-7xl" : "text-2xl"
        }`}
      >
        {initials || "·"}
      </span>
    </div>
  );
}

function CryptoLattice({
  seed,
  palette,
  motifs,
}: {
  seed: number;
  palette: string[];
  motifs: string[];
}) {
  const cells = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: 64 }, (_, i) => {
      const on = rand() > 0.55;
      const color = palette[Math.floor(rand() * Math.max(palette.length, 1))] || "#888888";
      const motif = motifs[i % Math.max(motifs.length, 1)] || "";
      return { on, color, motif, bit: rand() > 0.5 ? "1" : "0" };
    });
  }, [seed, palette, motifs]);

  return (
    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-px p-3 opacity-90">
      {cells.map((cell, i) => (
        <div
          key={i}
          className="relative overflow-hidden"
          style={{
            backgroundColor: cell.on ? `${cell.color}cc` : "rgba(255,255,255,0.04)",
            boxShadow: cell.on ? `inset 0 0 0 1px ${cell.color}66` : undefined,
          }}
          title={cell.motif}
        >
          <span className="absolute bottom-0 right-0 font-mono text-[5px] text-white/40 leading-none p-0.5">
            {cell.bit}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Mint outcome visual: contact sheet of evidence + cryptographic lattice data-art.
 * Works offline without Gemini image generation.
 */
export const ArtStyleMintVisual: React.FC<ArtStyleMintVisualProps> = ({
  primaryAxis,
  secondaryAxis,
  coreTrait,
  motifs,
  palette,
  tactile,
  fonts,
  cardId,
  refs,
  mintedImageUrl,
}) => {
  const seed = useMemo(
    () => hashSeed(`${primaryAxis}|${secondaryAxis}|${coreTrait}|${cardId}|${motifs.join(",")}`),
    [primaryAxis, secondaryAxis, coreTrait, cardId, motifs],
  );
  const sysCode = `SYS // ${(seed % 900 + 100).toString(16).toUpperCase()}-VEC`;
  const latCoords = `LAT_COORDS // ${toLatCoords(seed)}`;

  const imageRefs = refs.filter((r) => r.type === "image" && (r.previewUrl || r.data.startsWith("data:")));
  const contactFrames = useMemo(() => {
    const frames: Array<{ kind: "image" | "glyph" | "ai"; src?: string; label: string }> = [];
    if (mintedImageUrl) {
      frames.push({ kind: "ai", src: mintedImageUrl, label: "SYNTH PLATE" });
    }
    imageRefs.slice(0, 6).forEach((r, i) => {
      frames.push({
        kind: "image",
        src: r.previewUrl || r.data,
        label: `SPEC ${String(i + 1).padStart(2, "0")}`,
      });
    });
    motifs.slice(0, 4).forEach((m) => {
      frames.push({ kind: "glyph", label: m });
    });
    if (frames.length === 0) {
      frames.push({ kind: "glyph", label: primaryAxis || "AXIS" });
      frames.push({ kind: "glyph", label: secondaryAxis || "VECTOR" });
    }
    return frames;
  }, [mintedImageUrl, imageRefs, motifs, primaryAxis, secondaryAxis]);

  const [activeFrame, setActiveFrame] = useState(0);
  const [mode, setMode] = useState<"sheet" | "scroll" | "cipher">("sheet");

  useEffect(() => {
    if (mode !== "scroll" || contactFrames.length < 2) return;
    const id = window.setInterval(() => {
      setActiveFrame((prev) => (prev + 1) % contactFrames.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [mode, contactFrames.length]);

  const sheetCells = contactFrames.slice(0, 9);
  const accent = palette[2] || palette[0] || "#83907A";
  const base = palette[0] || "#1E1E1C";

  return (
    <div className="aspect-square border border-stone-800 bg-stone-900 relative overflow-hidden group">
      {/* Mode strip */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {(
            [
              ["sheet", "SHEET"],
              ["scroll", "SCROLL"],
              ["cipher", "CIPHER"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-widest border transition-colors ${
                mode === id
                  ? "bg-amber-100/90 text-stone-950 border-amber-200"
                  : "bg-black/50 text-stone-400 border-white/10 hover:text-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[6px] text-stone-500 uppercase tracking-widest">
          {sheetCells.length} FRAMES
        </span>
      </div>

      {/* Visual body */}
      <div className="absolute inset-0">
        {mode === "cipher" && (
          <>
            <div className="absolute inset-0" style={{ backgroundColor: base }} />
            <CryptoLattice seed={seed} palette={palette} motifs={motifs} />
            <div
              className="absolute inset-x-6 top-1/3 h-px opacity-60"
              style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
            />
            <div className="absolute inset-x-4 bottom-16 space-y-1 z-10">
              {motifs.slice(0, 3).map((m) => (
                <div
                  key={m}
                  className="font-mono text-[8px] uppercase tracking-[0.25em] text-white/70 truncate border-l border-white/20 pl-2"
                >
                  {m}
                </div>
              ))}
            </div>
          </>
        )}

        {mode === "scroll" && (
          <div className="absolute inset-0">
            {contactFrames.map((frame, i) => (
              <div
                key={`${frame.label}-${i}`}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === activeFrame ? "opacity-100" : "opacity-0"
                }`}
              >
                {frame.kind === "glyph" ? (
                  <div className="w-full h-full" style={{ backgroundColor: base }}>
                    <GlyphTile
                      label={frame.label}
                      color={palette[i % Math.max(palette.length, 1)] || "#444"}
                      accent={accent}
                      fill
                    />
                  </div>
                ) : (
                  <img
                    src={frame.src}
                    alt={frame.label}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-10 left-3 font-mono text-[8px] text-white/80 bg-black/50 px-1.5 py-0.5 tracking-widest">
                  {frame.label} · {i + 1}/{contactFrames.length}
                </div>
              </div>
            ))}
            {/* Film advance bar */}
            <div className="absolute bottom-14 left-3 right-3 h-0.5 bg-white/10 z-10">
              <div
                className="h-full bg-amber-200/80 transition-all duration-500"
                style={{ width: `${((activeFrame + 1) / contactFrames.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {mode === "sheet" && (
          <div className="absolute inset-0 p-3 pt-9 pb-12 grid grid-cols-3 gap-1.5 content-start">
            {Array.from({ length: 9 }).map((_, i) => {
              const frame = sheetCells[i];
              if (!frame) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square border border-dashed border-white/10 bg-black/20"
                  />
                );
              }
              if (frame.kind === "glyph") {
                return (
                  <GlyphTile
                    key={`g-${frame.label}-${i}`}
                    label={frame.label}
                    color={palette[i % Math.max(palette.length, 1)] || "#333"}
                    accent={accent}
                  />
                );
              }
              return (
                <div
                  key={`img-${frame.label}-${i}`}
                  className="relative aspect-square border border-white/10 overflow-hidden bg-black"
                >
                  <img src={frame.src} alt={frame.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 font-mono text-[6px] text-white/80 bg-black/60 px-1">
                    {frame.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Palette strip + meta footer */}
      <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-stone-950 via-stone-950/85 to-transparent pt-10 pb-3 px-3">
        <div className="flex gap-1 mb-2">
          {palette.slice(0, 5).map((c) => (
            <div key={c} className="h-1.5 flex-1 border border-white/10" style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex justify-between items-end gap-2 font-mono text-[8px] text-stone-400 uppercase tracking-widest">
          <span className="shrink-0">{sysCode}</span>
          <span className="shrink-0 text-right">{latCoords.replace("LAT_COORDS // ", "LAT // ")}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2 font-mono text-[7px] text-stone-600 uppercase tracking-wider">
          <span className="truncate">{tactile.dominant}</span>
          <span className="truncate text-right">
            {fonts.serif} · {fonts.sans}
          </span>
        </div>
      </div>
    </div>
  );
};

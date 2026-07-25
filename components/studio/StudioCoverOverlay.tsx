import React from "react";
import { Star, Type, Upload, X } from "lucide-react";
import type { StudioCoverOverlayLayer } from "./studioCoverTypes";
import { STUDIO_COVER_STICKERS, createImageLayer, createTextLayer } from "./studioCoverTypes";

export const StudioCoverOverlayCanvas: React.FC<{
  layers: StudioCoverOverlayLayer[];
  visible: boolean;
}> = ({ layers, visible }) => {
  if (!visible || layers.length === 0) return null;

  return (
    <>
      {layers.map((layer) =>
        layer.kind === "text" ? (
          <span
            key={layer.id}
            className="absolute pointer-events-none select-none font-serif italic leading-none drop-shadow-md z-[2]"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              fontSize: layer.fontSize,
              color: layer.color,
              transform: "translate(-50%, -50%)",
            }}
          >
            {layer.text}
          </span>
        ) : layer.url ? (
          <img
            key={layer.id}
            src={layer.url}
            alt={layer.label || "overlay"}
            className="absolute pointer-events-none object-contain z-[2]"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              opacity: layer.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        ) : (
          <Star
            key={layer.id}
            size={Math.max(16, layer.width * 1.2)}
            className="absolute text-[#FAF9F6] drop-shadow z-[2]"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              opacity: layer.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        ),
      )}
    </>
  );
};

export const StudioCoverOverlayPanel: React.FC<{
  layers: StudioCoverOverlayLayer[];
  onChange: (layers: StudioCoverOverlayLayer[]) => void;
  onAddLogo: (file: File) => void;
}> = ({ layers, onChange, onAddLogo }) => {
  const [draftText, setDraftText] = React.useState("");
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const addText = () => {
    if (!draftText.trim()) return;
    onChange([...layers, createTextLayer(draftText.trim())]);
    setDraftText("");
  };

  const removeLayer = (id: string) => onChange(layers.filter((layer) => layer.id !== id));

  return (
    <div className="space-y-3 border-t studio-border pt-3">
      <p className="font-mono text-[7px] uppercase tracking-[0.25em] studio-text-muted">
        Overlay — stickers, logos & text on cover
      </p>

      <div className="flex flex-wrap gap-1.5">
        {STUDIO_COVER_STICKERS.map((sticker) => (
          <button
            key={sticker.id}
            type="button"
            onClick={() =>
              onChange([
                ...layers,
                sticker.url
                  ? createImageLayer(sticker.url, sticker.label, sticker.id.includes("mimi") ? 32 : 18)
                  : createImageLayer("", sticker.label, 12),
              ])
            }
            className="px-2 py-1 border studio-border font-mono text-[7px] uppercase tracking-widest studio-text-muted hover:studio-text-ink"
          >
            {sticker.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          className="px-2 py-1 border studio-border font-mono text-[7px] uppercase tracking-widest studio-text-muted hover:studio-text-ink inline-flex items-center gap-1"
        >
          <Upload size={10} /> Logo
        </button>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAddLogo(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder="Add text overlay..."
          className="flex-1 bg-transparent border studio-border px-2 py-1.5 text-xs studio-text-ink placeholder:studio-text-muted outline-none"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addText();
            }
          }}
        />
        <button
          type="button"
          onClick={addText}
          className="px-2 border studio-border studio-text-muted hover:studio-text-ink"
          title="Add text"
        >
          <Type size={12} />
        </button>
      </div>

      {layers.length > 0 && (
        <ul className="space-y-1 max-h-24 overflow-y-auto">
          {layers.map((layer) => (
            <li
              key={layer.id}
              className="flex items-center justify-between gap-2 font-mono text-[7px] uppercase tracking-wide studio-text-muted"
            >
              <span className="truncate">
                {layer.kind === "text" ? `"${layer.text}"` : layer.label || "Image layer"}
              </span>
              <button type="button" onClick={() => removeLayer(layer.id)} className="shrink-0 hover:text-red-400">
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

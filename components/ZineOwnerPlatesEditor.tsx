import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, Type } from "lucide-react";
import type { ZineOwnerPlateSlide } from "../types";
import { archiveManager } from "../services/archiveManager";

function newSlideId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `owner-slide-${crypto.randomUUID()}`;
  }
  return `owner-slide-${Date.now()}`;
}

export const ZineOwnerPlatesEditor: React.FC<{
  slides: ZineOwnerPlateSlide[];
  ownerUid?: string;
  onChange: (slides: ZineOwnerPlateSlide[]) => void;
  variant?: "issue" | "template";
}> = ({ slides, ownerUid, onChange, variant = "issue" }) => {
  const [textDraft, setTextDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addTextSlide = () => {
    const body = textDraft.trim();
    if (!body) return;
    onChange([
      ...slides,
      {
        id: newSlideId(),
        kind: "text",
        title: titleDraft.trim() || undefined,
        body,
      },
    ]);
    setTextDraft("");
    setTitleDraft("");
  };

  const uploadImage = async (file: File) => {
    if (!ownerUid) return;
    setUploading(true);
    try {
      const url = await archiveManager.uploadMedia(
        ownerUid,
        file,
        "zines/owner_plates",
        { allowStorageFallback: false },
      );
      onChange([
        ...slides,
        {
          id: newSlideId(),
          kind: "image",
          title: titleDraft.trim() || file.name,
          imageUrl: url,
          altText: titleDraft.trim() || file.name,
        },
      ]);
      setTitleDraft("");
    } catch (error) {
      console.error("MIMI // Owner plate upload failed", error);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: "Image upload failed. Check your connection and try again.",
            type: "error",
          },
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  const removeSlide = (id: string) => {
    onChange(slides.filter((slide) => slide.id !== id));
  };

  const isTemplate = variant === "template";

  return (
    <div className="w-full max-w-3xl border border-[var(--mimi-hairline,#d4d4d4)] bg-white p-6 md:p-8 space-y-6">
      <div className="space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]">
          {isTemplate ? "Default carousel slides" : "Add your own"}
        </p>
        <p className="font-serif text-lg italic text-[var(--mimi-ink,#0a0a0a)]">
          {isTemplate
            ? "Slides that seed every new zine at generation."
            : "Author a carousel plate with your text or images."}
        </p>
        <p className="font-sans text-sm text-[var(--mimi-stone,#78716c)] leading-relaxed">
          {isTemplate
            ? "Set once in Tailor — each new issue starts with these slides. You can still edit them per zine in the reveal."
            : "Your slides appear as a plate in this issue — commentary alongside Mimi's reading."}
        </p>
      </div>

      {slides.length > 0 ? (
        <ul className="space-y-3">
          {slides.map((slide, index) => (
            <li
              key={slide.id}
              className="flex items-start justify-between gap-4 border border-[var(--mimi-hairline,#d4d4d4)] p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
                  Slide {index + 1} · {slide.kind}
                </p>
                {slide.title ? (
                  <p className="font-serif italic text-sm text-[var(--mimi-ink,#0a0a0a)]">
                    {slide.title}
                  </p>
                ) : null}
                {slide.kind === "text" ? (
                  <p className="font-sans text-sm text-[var(--mimi-stone,#78716c)] line-clamp-3 whitespace-pre-wrap">
                    {slide.body}
                  </p>
                ) : slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.altText || slide.title || "Owner slide"}
                    className="mt-2 max-h-24 object-contain border border-[var(--mimi-hairline,#d4d4d4)]"
                  />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeSlide(slide.id)}
                className="shrink-0 p-2 text-red-500 hover:text-red-600"
                aria-label={`Remove slide ${index + 1}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-serif italic text-sm text-[var(--mimi-stone,#78716c)]">
          {isTemplate
            ? "No default slides yet — add text or upload an image to carry into future issues."
            : "No owner slides yet — add text or upload an image below."}
        </p>
      )}

      <div className="space-y-3 border-t border-[var(--mimi-hairline,#d4d4d4)] pt-6">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          placeholder="Optional slide title"
          className="w-full border border-[var(--mimi-hairline,#d4d4d4)] px-3 py-2 font-mono text-xs text-[var(--mimi-ink,#0a0a0a)]"
        />
        <textarea
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          placeholder="Your text response…"
          rows={4}
          className="w-full border border-[var(--mimi-hairline,#d4d4d4)] px-3 py-2 font-serif text-sm text-[var(--mimi-ink,#0a0a0a)] resize-none"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addTextSlide}
            disabled={!textDraft.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--mimi-ink,#0a0a0a)] font-mono text-[9px] uppercase tracking-widest disabled:opacity-40"
          >
            <Type size={12} /> Add text slide
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!ownerUid || uploading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--mimi-hairline,#d4d4d4)] font-mono text-[9px] uppercase tracking-widest disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ImagePlus size={12} />
            )}
            Upload image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
              e.target.value = "";
            }}
          />
        </div>
        {!ownerUid ? (
          <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
            Sign in to upload images.
          </p>
        ) : null}
      </div>
    </div>
  );
};

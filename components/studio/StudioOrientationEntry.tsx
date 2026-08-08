import React, { useEffect, useRef, useState } from "react";
import type {
  MediaFile,
  ZineGenerationOptions,
  ZineMetadata,
  ZinePlateMediaMode,
} from "../../types";
import { useOptionalUser } from "../../contexts/UserContext";
import { fetchUserZines } from "../../services/firebaseUtils";
import { MimiWordmark } from "../public-face/MimiWordmark";
import { StartHereStrip } from "../studio-os/StartHereStrip";
import { StudioPlateMediaToolbar } from "./StudioPlateMediaToolbar";
import { StudioInspoCarousel } from "./StudioInspoCarousel";
import type { StudioInspoSlide } from "../../lib/studioInspoTypes";

const EMPTY_ZINE_OPTIONS: ZineGenerationOptions = {
  style: "balanced",
  theme: "organic",
  contentFocus: "balanced",
  goals: "",
};

const MAX_BOARD_REFERENCES = 8;

const SUGGESTED_NEXT: Array<{
  label: string;
  sentence: string;
  mode: string;
}> = [
  {
    label: "Darkroom",
    sentence: "Load a Pinterest board and read its aesthetic before you compose",
    mode: "darkroom",
  },
  {
    label: "Evidence",
    sentence: "Let Mimi read your references in Tailor",
    mode: "tailor",
  },
  {
    label: "Pocket",
    sentence: "Open saved fragments with provenance intact",
    mode: "pocket",
  },
  {
    label: "Stand",
    sentence: "Review issues already on the stand",
    mode: "stand",
  },
];

export type StudioOrientationEntryProps = {
  onRefine?: (
    text: string,
    media: MediaFile[],
    tone: string,
    opts: Record<string, unknown>,
  ) => void;
  isThinking?: boolean;
  initialValue?: string;
  initialMedia?: MediaFile[];
  zineOptions?: ZineGenerationOptions;
  setZineOptions?: (options: ZineGenerationOptions) => void;
  initialHighFidelity?: boolean;
  onNavigate?: (mode: string) => void;
  /** Navigate to an absolute in-app path (legacy / nested routes). */
  onNavigatePath?: (path: string) => void;
  onOpenGuide?: () => void;
};

/**
 * Primary /studio entry — calm orientation + multimodal intake.
 * Full compose console via ?console=1; archival desk at /studio/worktable-legacy.
 */
export const StudioOrientationEntry: React.FC<StudioOrientationEntryProps> = ({
  onRefine,
  isThinking = false,
  initialValue = "",
  initialMedia,
  zineOptions: zineOptionsProp,
  initialHighFidelity = false,
  onNavigate,
  onNavigatePath,
  onOpenGuide,
}) => {
  const userCtx = useOptionalUser();
  const profile = userCtx?.profile ?? null;
  const user = userCtx?.user ?? null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState(initialValue);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(initialMedia || []);
  const [recentZines, setRecentZines] = useState<ZineMetadata[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [plateMediaMode, setPlateMediaMode] =
    useState<ZinePlateMediaMode>("generated");
  const [boardUrl, setBoardUrl] = useState("");
  const [isFetchingBoard, setIsFetchingBoard] = useState(false);
  const [boardWarning, setBoardWarning] = useState<string | null>(null);
  const [selectedInspo, setSelectedInspo] = useState<StudioInspoSlide | null>(
    null,
  );

  const zineOptions = zineOptionsProp ?? EMPTY_ZINE_OPTIONS;

  useEffect(() => {
    if (initialValue) setInput(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (initialMedia?.length) setMediaFiles(initialMedia);
  }, [initialMedia]);

  useEffect(() => {
    let cancelled = false;
    const uid = user?.uid || profile?.uid;
    if (!uid) {
      setRecentZines([]);
      return;
    }
    setRecentLoading(true);
    void fetchUserZines(uid)
      .then((zines) => {
        if (!cancelled) setRecentZines(zines.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRecentZines([]);
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, profile?.uid]);

  const contextSummary =
    mediaFiles.length > 0
      ? `${mediaFiles.length} approved reference${mediaFiles.length === 1 ? "" : "s"} attached`
      : null;

  const canSubmit = input.trim().length > 0 || mediaFiles.length > 0;

  const handlePrimary = () => {
    if (!canSubmit || isThinking) return;
    const payload = input.trim() || "Compose from the attached references.";
    onRefine?.(payload, mediaFiles, "editorial", {
      deepThinking: false,
      isPublic: false,
      isLite: false,
      isHighFidelity: initialHighFidelity,
      useSearch: false,
      zineOptions: { ...zineOptions, plateMediaMode },
    });
  };

  const handlePublishRendition = (slide: StudioInspoSlide | null) => {
    if (isThinking) return;

    const payload =
      input.trim() ||
      (slide?.label
        ? `Publish my rendition of “${slide.label.slice(0, 80)}”.`
        : "Publish my rendition from this inspo.");

    let media = mediaFiles;
    if (
      slide &&
      slide.source !== "reference" &&
      !media.some((file) => (file.url || file.data) === slide.imageUrl)
    ) {
      media = [
        {
          type: "image",
          url: slide.imageUrl,
          data: slide.imageUrl,
          mimeType: "image/jpeg",
          name: slide.label.slice(0, 80) || "inspo-reference",
        },
        ...media,
      ];
    }

    onRefine?.(payload, media, "editorial", {
      deepThinking: false,
      isPublic: false,
      isLite: false,
      isHighFidelity: initialHighFidelity,
      useSearch: false,
      zineOptions: { ...zineOptions, plateMediaMode: "generated" },
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      const media: MediaFile = {
        type: file.type.startsWith("video/") ? "video" : "image",
        data,
        url: data,
        mimeType: file.type || "image/jpeg",
        name: file.name,
      };
      setMediaFiles((prev) => [media, ...prev]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFetchBoard = async () => {
    const url = boardUrl.trim();
    if (!url || isFetchingBoard) return;
    setIsFetchingBoard(true);
    setBoardWarning(null);
    try {
      const res = await fetch(`/api/pinterest?url=${encodeURIComponent(url)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (typeof data?.error === "string" && data.error) ||
            "Could not load that Pinterest board.",
        );
      }
      const pins = Array.isArray(data?.pins) ? data.pins : [];
      if (pins.length === 0) {
        throw new Error("No public thumbnails were found on that board URL.");
      }

      const imported: MediaFile[] = pins.slice(0, MAX_BOARD_REFERENCES).map(
        (pin: { src?: string; alt?: string; id?: string }, i: number) => ({
          type: "image" as const,
          url: String(pin.src || ""),
          data: String(pin.src || ""),
          mimeType: "image/jpeg",
          name: pin.alt?.trim() || `pinterest-${pin.id || i + 1}`,
        }),
      );

      setMediaFiles((prev) => {
        const merged = [...imported, ...prev];
        return merged.slice(0, MAX_BOARD_REFERENCES);
      });
      setBoardWarning(
        typeof data?.warning === "string" && data.warning ? data.warning : null,
      );
      if (!input.trim() && data?.title) {
        setInput(`Compose from the mood of “${String(data.title).slice(0, 120)}”.`);
      }
    } catch (error) {
      setBoardWarning(
        error instanceof Error ? error.message : "Board import failed.",
      );
    } finally {
      setIsFetchingBoard(false);
    }
  };

  return (
    <div
      data-studio-entry="orientation"
      className="relative flex h-full min-h-[100dvh] flex-col overflow-hidden bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(155,184,206,0.18), transparent 55%), linear-gradient(180deg, #fafafa 0%, #ffffff 42%, #f7f7f5 100%)",
        }}
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 md:px-8">
          <div className="mx-auto flex w-full max-w-xl items-baseline justify-between gap-4">
            <MimiWordmark as="h1" size="sm" />
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]">
              Studio
            </p>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-8 pt-6 md:px-8 md:pt-10">
          <p className="max-w-[22rem] font-serif text-[1.65rem] leading-[1.2] tracking-tight text-[var(--mimi-ink,#0a0a0a)] md:text-[2rem]">
            Start with a thought, image, or fragment.
          </p>
          <p className="mt-3 max-w-md font-mono text-[11px] leading-relaxed tracking-[0.02em] text-[var(--mimi-stone,#78716c)]">
            Mimi shapes work from what you bring — and from approved context
            only.
          </p>

          {!recentLoading && recentZines.length === 0 && onNavigate ? (
            <StartHereStrip
              className="mt-6"
              onNavigate={onNavigate}
              onOpenGuide={onOpenGuide}
            />
          ) : null}

          <section
            aria-label="Compose"
            className="mt-8 flex min-h-[14rem] flex-col border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-field,#ffffff)]/90"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write freely, or drop a reference beside your note…"
              rows={6}
              className="min-h-[10rem] w-full flex-1 resize-none bg-transparent px-4 pt-4 font-serif text-[18px] italic font-light leading-snug text-[var(--mimi-ink,#0a0a0a)] placeholder:text-[var(--mimi-stone,#78716c)] focus:outline-none"
              style={{ fontSize: "16px" }}
            />

            {mediaFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-3">
                {mediaFiles.map((m, i) => (
                  <div
                    key={`${m.name}-${i}`}
                    className="relative h-16 w-14 shrink-0 overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-worktable,#fafafa)]"
                  >
                    {m.type === "image" && (m.url || m.data) && (
                      <img
                        src={m.url || m.data}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${m.name || "reference"}`}
                      className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center bg-[var(--mimi-ink,#0a0a0a)] font-mono text-[10px] text-white"
                      onClick={() =>
                        setMediaFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-[var(--mimi-hairline,#d4d4d4)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-11 px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)] hover:text-[var(--mimi-ink,#0a0a0a)]"
                >
                  Attach reference
                </button>
                <StudioPlateMediaToolbar
                  value={plateMediaMode}
                  onChange={setPlateMediaMode}
                />
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]">
                Imagen default
              </span>
            </div>
          </section>

          <fieldset className="mt-4 border-0 p-0">
            <legend className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
              Import board
            </legend>
            <p className="mt-2 max-w-md font-serif text-[13px] italic leading-snug text-[var(--mimi-stone,#78716c)]">
              Paste a public Pinterest board URL to attach thumbnails as references
              — or open Darkroom for full board analysis.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={boardUrl}
                onChange={(e) => setBoardUrl(e.target.value)}
                placeholder="https://pinterest.com/…/board-name/"
                className="min-h-11 flex-1 border border-[var(--mimi-hairline,#d4d4d4)] bg-transparent px-3 font-mono text-[11px] text-[var(--mimi-ink,#0a0a0a)] placeholder:text-[var(--mimi-stone,#78716c)] focus:outline-none focus:border-[var(--mimi-ink,#0a0a0a)]"
              />
              <button
                type="button"
                onClick={() => void handleFetchBoard()}
                disabled={!boardUrl.trim() || isFetchingBoard}
                className="min-h-11 border border-[var(--mimi-ink,#0a0a0a)] px-4 font-mono text-[9px] uppercase tracking-[0.18em] disabled:opacity-40"
              >
                {isFetchingBoard ? "Loading…" : "Load board"}
              </button>
            </div>
            {boardWarning ? (
              <p
                role="status"
                className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--mimi-stone,#78716c)]"
              >
                {boardWarning}
              </p>
            ) : null}
          </fieldset>

          <StudioInspoCarousel
            query={input}
            references={mediaFiles}
            selectedId={selectedInspo?.id ?? null}
            onSelect={setSelectedInspo}
            onPublishRendition={handlePublishRendition}
            isPublishing={isThinking}
          />

          {contextSummary && (
            <p
              role="status"
              className="mt-4 border-l-2 border-[var(--mimi-cobalt,#9bb8ce)] pl-3 font-serif text-[15px] italic text-[var(--mimi-ink,#0a0a0a)]"
            >
              {contextSummary}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handlePrimary}
              disabled={!canSubmit || isThinking}
              className="inline-flex min-h-12 w-full items-center justify-center bg-[var(--mimi-ink,#0a0a0a)] px-5 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--mimi-field,#ffffff)] disabled:opacity-40 sm:w-auto"
            >
              {isThinking ? "Developing…" : "Begin with this"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigatePath) {
                  onNavigatePath("/studio");
                  return;
                }
                window.dispatchEvent(
                  new CustomEvent("mimi:route-request", {
                    detail: { path: "/studio" },
                  }),
                );
              }}
              className="inline-flex min-h-12 w-full items-center justify-center border border-[var(--mimi-ink,#0a0a0a)] px-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--mimi-ink,#0a0a0a)] sm:w-auto"
            >
              Open compose desk
            </button>
          </div>

          {/* Below the fold — recent work + suggested next */}
          <section
            aria-labelledby="studio-recent-heading"
            className="mt-16 border-t border-[var(--mimi-hairline,#d4d4d4)] pt-8"
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]">
              Continue
            </p>
            <h2
              id="studio-recent-heading"
              className="mt-2 font-serif text-xl tracking-tight"
            >
              Recent projects
            </h2>
            <ul className="mt-4 divide-y divide-[var(--mimi-hairline,#d4d4d4)]">
              {recentLoading && (
                <li className="py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]">
                  Loading…
                </li>
              )}
              {!recentLoading && recentZines.length === 0 && (
                <li className="py-3 font-serif text-[15px] italic text-[var(--mimi-stone,#78716c)]">
                  Nothing saved yet. Your first piece will land here.
                </li>
              )}
              {recentZines.map((zine) => (
                <li key={zine.id}>
                  <button
                    type="button"
                    onClick={() => onNavigatePath?.(`/zine/${zine.id}`)}
                    className="flex min-h-12 w-full items-baseline justify-between gap-3 py-3 text-left"
                  >
                    <span className="truncate font-serif text-[16px]">
                      {zine.title || "Untitled issue"}
                    </span>
                    <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--mimi-stone,#78716c)]">
                      Open
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="studio-next-heading"
            className="mt-10 border-t border-[var(--mimi-hairline,#d4d4d4)] pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]"
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]">
              Or
            </p>
            <h2
              id="studio-next-heading"
              className="mt-2 font-serif text-xl tracking-tight"
            >
              Suggested next
            </h2>
            <ul className="mt-4 space-y-3">
              {SUGGESTED_NEXT.map((item) => (
                <li key={item.mode}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.(item.mode)}
                    className="flex min-h-12 w-full flex-col items-start border border-[var(--mimi-hairline,#d4d4d4)] px-4 py-3 text-left hover:border-[var(--mimi-ink,#0a0a0a)]"
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
                      {item.label}
                    </span>
                    <span className="mt-1 font-serif text-[15px] leading-snug">
                      {item.sentence}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <a
                  href="/studio/worktable-legacy"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigatePath) {
                      onNavigatePath("/studio/worktable-legacy");
                      return;
                    }
                    window.dispatchEvent(
                      new CustomEvent("mimi:route-request", {
                        detail: { path: "/studio/worktable-legacy" },
                      }),
                    );
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-1 py-2 text-left font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)] underline decoration-dotted underline-offset-4 hover:text-[var(--mimi-ink,#0a0a0a)]"
                >
                  <span>Legacy worktable · experimental</span>
                  <span aria-hidden>→</span>
                </a>
              </li>
            </ul>
          </section>
        </main>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
};

export default StudioOrientationEntry;

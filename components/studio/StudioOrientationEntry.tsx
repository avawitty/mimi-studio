import React, { useEffect, useRef, useState } from "react";
import type { MediaFile, ZineGenerationOptions, ZineMetadata } from "../../types";
import type { PromptContract } from "../../lib/cardStateTypes";
import { useOptionalUser } from "../../contexts/UserContext";
import { fetchUserZines } from "../../services/firebaseUtils";
import {
  ArtifactDossier,
  InvocationComposer,
  InvocationPlate,
  ResponsiveCardField,
} from "../studio-os/card-states";
import { MimiWordmark } from "../public-face/MimiWordmark";
import "../studio-os/card-states/cardStates.css";

const EMPTY_ZINE_OPTIONS: ZineGenerationOptions = {
  style: "balanced",
  theme: "organic",
  contentFocus: "balanced",
  goals: "",
};

const STUDIO_PROMPT: PromptContract = {
  mode: "assignment",
  displayPrompt: "What are we making?",
  fieldPlaceholder: "Describe the artifact you want Mimi to compose…",
  submitLabel: "Issue Manifest",
};

const SUGGESTED_NEXT: Array<{
  label: string;
  sentence: string;
  mode: string;
}> = [
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
};

/**
 * Primary /studio entry — calm orientation + multimodal intake.
 * Not a wrapper around StudioWorktable; the archival desk lives only on
 * /studio/worktable-legacy during migration.
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
}) => {
  const userCtx = useOptionalUser();
  const profile = userCtx?.profile ?? null;
  const user = userCtx?.user ?? null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState(initialValue);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(initialMedia || []);
  const [recentZines, setRecentZines] = useState<ZineMetadata[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

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
      zineOptions: { ...zineOptions },
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

  return (
    <div
      data-studio-entry="orientation"
      className="relative flex h-full min-h-[100dvh] flex-col overflow-hidden bg-[var(--mimi-porcelain,#f8f7f5)] text-[var(--mimi-ink,#17181b)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(110,112,143,0.12), transparent 55%), linear-gradient(180deg, var(--mimi-cold-cream,#f2f0eb) 0%, var(--mimi-porcelain,#f8f7f5) 42%, #ffffff 100%)",
        }}
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 md:px-8">
          <div className="mx-auto flex w-full max-w-3xl items-baseline justify-between gap-4">
            <MimiWordmark as="h1" size="sm" />
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-quiet-ink,#666870)]">
              Studio
            </p>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-8 pt-4 md:px-8 md:pt-8">
          <InvocationPlate
            eyebrow="Compose"
            title={STUDIO_PROMPT.displayPrompt}
            description="Mimi shapes work from what you bring — and from approved context only."
            state={isThinking ? "loading" : "idle"}
            className="!w-full !max-w-none"
          >
            <InvocationComposer
              prompt={STUDIO_PROMPT}
              value={input}
              onChange={setInput}
              onSubmit={handlePrimary}
              isBusy={isThinking}
              canSubmit={canSubmit}
              helperText={contextSummary ?? undefined}
            >
              {mediaFiles.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {mediaFiles.map((m, i) => (
                    <div
                      key={`${m.name}-${i}`}
                      className="relative h-16 w-14 shrink-0 overflow-hidden border border-[var(--mimi-hairline)] bg-[var(--mimi-mist,#e8eaed)]"
                    >
                      {m.type === "image" && (m.url || m.data) ? (
                        <img
                          src={m.url || m.data}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Remove ${m.name || "reference"}`}
                        className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center bg-[var(--mimi-graphite,#1b1d21)] font-mono text-[10px] text-white"
                        onClick={() =>
                          setMediaFiles((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-11 px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-quiet-ink,#666870)] hover:text-[var(--mimi-ink,#17181b)]"
                >
                  Attach reference
                </button>
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--mimi-quiet-ink,#666870)]">
                  Text · image · note
                </span>
              </div>
            </InvocationComposer>
          </InvocationPlate>

          {/* Below the fold — recent work + suggested next */}
          <section
            aria-labelledby="studio-recent-heading"
            className="mt-16 border-t border-[var(--mimi-hairline)] pt-8"
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-quiet-ink,#666870)]">
              Continue
            </p>
            <h2
              id="studio-recent-heading"
              className="mt-2 font-serif text-xl tracking-tight"
            >
              Recent projects
            </h2>

            {recentLoading ? (
              <p className="mt-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--mimi-quiet-ink,#666870)]">
                Loading…
              </p>
            ) : null}

            {!recentLoading && recentZines.length === 0 ? (
              <p className="mt-4 py-3 font-serif text-[15px] italic text-[var(--mimi-quiet-ink,#666870)]">
                Nothing saved yet. Your first piece will land here.
              </p>
            ) : null}

            {recentZines.length > 0 ? (
              <ResponsiveCardField
                featured={recentZines.length > 1}
                aria-label="Recent projects"
                className="mt-4"
              >
                {recentZines.map((zine, index) => (
                  <ArtifactDossier
                    key={zine.id}
                    title={zine.title || "Untitled issue"}
                    type="Issue"
                    status={index === 0 ? "active" : "published"}
                    provenance={zine.createdAt ? "Saved in your archive" : undefined}
                    preview={
                      zine.coverImageUrl ? (
                        <img
                          src={zine.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-serif text-lg italic text-[var(--mimi-quiet-ink,#666870)]">
                          {zine.title?.slice(0, 1) || "?"}
                        </div>
                      )
                    }
                    onOpen={() => onNavigatePath?.(`/zine/${zine.id}`)}
                  />
                ))}
              </ResponsiveCardField>
            ) : null}
          </section>

          <section
            aria-labelledby="studio-next-heading"
            className="mt-10 border-t border-[var(--mimi-hairline)] pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]"
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-quiet-ink,#666870)]">
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
                    className="flex min-h-12 w-full flex-col items-start border border-[var(--mimi-hairline)] bg-[color-mix(in_srgb,var(--mimi-cold-cream,#f2f0eb)_60%,white)] px-4 py-3 text-left hover:border-[var(--mimi-graphite,#1b1d21)]"
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-quiet-ink,#666870)]">
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
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-1 py-2 text-left font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--mimi-quiet-ink,#666870)] underline decoration-dotted underline-offset-4 hover:text-[var(--mimi-ink,#17181b)]"
                >
                  <span>Legacy worktable (experimental)</span>
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

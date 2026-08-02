import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MediaFile, ZineGenerationOptions } from "../../types";
import { useOptionalUser } from "../../contexts/UserContext";
import { WorkSurface } from "./WorkSurface";
import { DossierTabs, type DossierFolder } from "./DossierTabs";
import {
  InstrumentBar,
  DEFAULT_INSTRUMENTS,
  type InstrumentId,
} from "./InstrumentBar";
import { AuraMeter, auraMoodToTone, type AuraMood } from "./AuraMeter";
import { TasteDrawer, type TasteDrawerTab } from "./TasteDrawer";
import { RandomIntake } from "./RandomIntake";
import { ChamberExplore } from "./ChamberExplore";
import { HubActionBar } from "./HubActionBar";

const PROMPT_WHISPERS = [
  "What is the defining texture or material that anchors your mood?",
  "The light fell across the room, reminding me of…",
  "Right now, the material anchoring me is…",
  "Recall a specific light, dynamic, or shadow that shifted your mood.",
  "Which sensory fragment are you actively trying to preserve?",
  "Lately, I keep returning to the idea of…",
];

const FOLDERS: DossierFolder[] = [
  { id: "studio", label: "DESK", name: "Worktable", mode: "studio" },
  { id: "oracle", label: "SCRY", name: "Oracle", mode: "oracle" },
  { id: "pocket", label: "FILE", name: "Pocket", mode: "pocket" },
  { id: "tailor", label: "CUT", name: "Tailor", mode: "tailor" },
  { id: "darkroom", label: "DEV", name: "Darkroom", mode: "darkroom" },
  { id: "stand", label: "ISSUE", name: "Stand", mode: "stand" },
];

const EMPTY_ZINE_OPTIONS: ZineGenerationOptions = {
  style: "balanced",
  theme: "organic",
  contentFocus: "balanced",
  goals: "",
};

export type StudioWorktableProps = {
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
  /** Escape hatch to the dense InputStudio console */
  onOpenConsole?: () => void;
  /** Navigate to another chamber */
  onNavigate?: (mode: string) => void;
};

/**
 * Studio Hub middle ground:
 * open Random Intake + optional prompt whisper,
 * chamber explore grid, unified Context · M · Generate bar,
 * parchment field (keeps instruments + console escape).
 */
export const StudioWorktable: React.FC<StudioWorktableProps> = ({
  onRefine,
  isThinking: isThinkingProp,
  initialValue = "",
  initialMedia,
  zineOptions: zineOptionsProp,
  setZineOptions: setZineOptionsProp,
  initialHighFidelity,
  onOpenConsole,
  onNavigate,
}) => {
  const userCtx = useOptionalUser();
  const profile = userCtx?.profile ?? null;

  const fileRef = useRef<HTMLInputElement>(null);

  const [whisperIndex, setWhisperIndex] = useState(0);
  const [whisperOpen, setWhisperOpen] = useState(true);
  const [input, setInput] = useState(initialValue);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(initialMedia || []);
  const [mood, setMood] = useState<AuraMood>("EDITORIAL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<TasteDrawerTab>("aura");
  const [tailorOn, setTailorOn] = useState(true);
  const [activeInstrument, setActiveInstrument] = useState<InstrumentId | null>(
    null,
  );
  const [useSearch, setUseSearch] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [localThinking, setLocalThinking] = useState(false);
  const [demoNote, setDemoNote] = useState<string | null>(null);
  const [localZineOptions, setLocalZineOptions] =
    useState<ZineGenerationOptions>(zineOptionsProp || EMPTY_ZINE_OPTIONS);

  const zineOptions = zineOptionsProp ?? localZineOptions;
  const setZineOptions = setZineOptionsProp ?? setLocalZineOptions;
  const isThinking = isThinkingProp ?? localThinking;

  const [activeTreatmentId, setActiveTreatmentId] = useState<string | null>(
    zineOptions.selectedTreatmentId || null,
  );

  useEffect(() => {
    if (initialValue) setInput(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (initialMedia?.length) setMediaFiles(initialMedia);
  }, [initialMedia]);

  useEffect(() => {
    if (zineOptionsProp) setLocalZineOptions(zineOptionsProp);
  }, [zineOptionsProp]);

  const treatments = useMemo(
    () =>
      (profile?.savedTreatments || []).map(
        (t: { id: string; treatmentName?: string; title?: string }) => ({
          id: t.id,
          name: t.treatmentName || t.title || "Untitled treatment",
        }),
      ),
    [profile?.savedTreatments],
  );

  // Spark lives on the hub bar — keep the strip for desk tools only
  const instruments = useMemo(
    () =>
      DEFAULT_INSTRUMENTS.filter((item) => item.id !== "spark").map((item) => {
        let active = item.id === activeInstrument;
        if (item.id === "globe") active = useSearch;
        if (item.id === "brain") active = deepThinking;
        return { ...item, active };
      }),
    [activeInstrument, useSearch, deepThinking],
  );

  const advanceWhisper = useCallback(() => {
    setWhisperIndex((i) => (i + 1) % PROMPT_WHISPERS.length);
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch {
      /* ignore */
    }
  }, []);

  const handleGenerate = useCallback(() => {
    const text = input.trim();
    if (!text && mediaFiles.length === 0) {
      setDrawerOpen(true);
      setDrawerTab("aura");
      return;
    }
    const tone = auraMoodToTone(mood);
    const payload =
      text ||
      (whisperOpen ? PROMPT_WHISPERS[whisperIndex] : "Open capture from the desk");
    const opts = {
      deepThinking,
      isPublic: false,
      isLite: false,
      bypassTailor: !tailorOn,
      isHighFidelity: !!initialHighFidelity,
      useSearch,
      zineOptions: {
        ...zineOptions,
        selectedTreatmentId:
          activeTreatmentId || zineOptions.selectedTreatmentId,
      },
    };

    if (onRefine) {
      onRefine(payload, mediaFiles, tone, opts);
      return;
    }

    setLocalThinking(true);
    setDemoNote(`Spark queued · ${tone.toLowerCase()} · ${payload.slice(0, 72)}`);
    window.setTimeout(() => {
      setLocalThinking(false);
    }, 900);
  }, [
    input,
    mediaFiles,
    mood,
    onRefine,
    whisperIndex,
    whisperOpen,
    deepThinking,
    tailorOn,
    initialHighFidelity,
    useSearch,
    zineOptions,
    activeTreatmentId,
  ]);

  const handleInstrument = useCallback(
    (id: InstrumentId) => {
      setActiveInstrument(id);
      switch (id) {
        case "attach":
          fileRef.current?.click();
          break;
        case "archive":
          onNavigate?.("pocket");
          break;
        case "voice":
          setDrawerOpen(true);
          setDrawerTab("context");
          break;
        case "spark":
          handleGenerate();
          break;
        case "brain":
          setDeepThinking((v) => !v);
          break;
        case "globe":
          setUseSearch((v) => !v);
          break;
        default: {
          const _exhaustive: never = id;
          void _exhaustive;
          break;
        }
      }
    },
    [handleGenerate, onNavigate],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      const media: MediaFile = {
        type: file.type.startsWith("video") ? "video" : "image",
        url: data,
        data,
        mimeType: file.type || "image/jpeg",
        name: file.name,
      };
      setMediaFiles((prev) => [media, ...prev]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFolder = (folder: DossierFolder) => {
    if (folder.mode && folder.mode !== "studio") {
      onNavigate?.(folder.mode);
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const contextSummary =
    mediaFiles.length > 0
      ? `${mediaFiles.length} media artifact${mediaFiles.length === 1 ? "" : "s"} on the desk`
      : "No approved context — Mimi will not invent sources";

  return (
    <WorkSurface className="h-full min-h-[100dvh]">
      <div className="flex flex-col h-full min-h-[100dvh] lg:flex-row lg:gap-4 lg:px-4 lg:pt-4 lg:pb-4">
        <DossierTabs
          folders={FOLDERS}
          activeId="studio"
          onSelect={handleFolder}
          orientation="vertical"
          className="w-36 shrink-0"
        />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <header className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-3 lg:px-2 lg:pt-0">
            <div>
              <h1 className="font-serif text-[22px] font-medium tracking-tight text-[var(--wt-ink,#1b1b19)]">
                Mimi
              </h1>
              <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--wt-ink-2,#6b6a66)] mt-0.5">
                Studio worktable · archival desk
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onOpenConsole && (
                <button
                  type="button"
                  onClick={onOpenConsole}
                  className="hidden sm:inline-flex min-h-10 px-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--wt-ink-2,#6b6a66)] border border-[var(--wt-line,#d8d3c6)] hover:text-[var(--wt-ink,#1b1b19)]"
                >
                  Console
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDrawerTab("treatments");
                  setDrawerOpen(true);
                }}
                className="lg:hidden min-h-12 min-w-12 border border-[var(--wt-line,#d8d3c6)] font-mono text-[14px] text-[var(--wt-ink,#1b1b19)]"
                aria-label="Open taste drawer"
              >
                ◫
              </button>
            </div>
          </header>

          <div className="shrink-0 px-4 lg:hidden mb-1">
            <InstrumentBar
              instruments={instruments}
              onSelect={handleInstrument}
              orientation="horizontal"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 lg:px-2 pt-3 space-y-5">
            <RandomIntake
              value={input}
              onChange={setInput}
              onSend={handleGenerate}
              sending={isThinking}
              whisper={whisperOpen ? PROMPT_WHISPERS[whisperIndex] : null}
              onWhisperNext={advanceWhisper}
              onWhisperDismiss={() => setWhisperOpen(false)}
            />

            {!whisperOpen && (
              <button
                type="button"
                onClick={() => setWhisperOpen(true)}
                className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--wt-ink-2,#6b6a66)] underline underline-offset-4 decoration-dotted"
              >
                Need a prompt whisper?
              </button>
            )}

            {demoNote && !onRefine && (
              <p
                role="status"
                className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--mimi-cobalt-deep,#6a8aa4)]"
              >
                {demoNote}
              </p>
            )}

            {mediaFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mediaFiles.map((m, i) => (
                  <div
                    key={`${m.name}-${i}`}
                    className="relative shrink-0 w-16 h-20 border border-[var(--wt-line,#d8d3c6)] bg-[var(--wt-paper-2,#f0ede6)] overflow-hidden"
                  >
                    {m.type === "image" && (m.url || m.data) && (
                      <img
                        src={m.url || m.data}
                        alt=""
                        className="w-full h-full object-cover grayscale"
                      />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${m.name || "media"}`}
                      className="absolute top-0 right-0 w-6 h-6 bg-[var(--wt-ink,#1b1b19)] text-[var(--wt-paper,#f6f3ec)] font-mono text-[10px]"
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

            <div className="hidden sm:block">
              <AuraMeter mood={mood} onChange={setMood} />
            </div>

            <ChamberExplore
              folders={FOLDERS}
              activeId="studio"
              onSelect={handleFolder}
              className="lg:hidden"
            />
          </div>

          <HubActionBar
            className="lg:hidden"
            contextSummary={contextSummary}
            onOpenContext={() => {
              setDrawerTab("context");
              setDrawerOpen(true);
            }}
            onGenerate={handleGenerate}
            generating={isThinking}
          />

          {/* Desktop keeps a quieter context + spark pair (no mobile hub chrome) */}
          <div className="hidden lg:flex items-center gap-3 px-2 pb-2">
            <button
              type="button"
              onClick={() => {
                setDrawerTab("context");
                setDrawerOpen(true);
              }}
              className="flex-1 border border-[var(--wt-line,#d8d3c6)] px-4 py-3 text-left min-h-12"
            >
              <span className="font-serif italic text-[15px] text-[var(--wt-ink,#1b1b19)]">
                {contextSummary}
              </span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isThinking}
              className="shrink-0 min-h-12 px-5 border border-[var(--wt-ink,#1b1b19)] bg-[var(--wt-ink,#1b1b19)] text-[var(--wt-paper,#f6f3ec)] font-mono text-[10px] uppercase tracking-[0.24em] disabled:opacity-50"
            >
              {isThinking ? "Developing…" : "Spark · Generate"}
            </button>
          </div>
        </div>

        <InstrumentBar
          instruments={instruments}
          onSelect={handleInstrument}
          orientation="vertical"
          className="shrink-0"
        />
      </div>

      <TasteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tab={drawerTab}
        onTabChange={setDrawerTab}
        mood={mood}
        onMoodChange={setMood}
        tailorOn={tailorOn}
        onTailorToggle={() => setTailorOn((v) => !v)}
        contextSummary={contextSummary}
        treatments={treatments}
        activeTreatmentId={activeTreatmentId}
        onSelectTreatment={(id) => {
          setActiveTreatmentId(id);
          setZineOptions({
            ...zineOptions,
            selectedTreatmentId: id || undefined,
          });
        }}
        onOpenConsole={onOpenConsole}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onFileChange}
      />
    </WorkSurface>
  );
};

export default StudioWorktable;

import React from "react";
import { StudioCoverOverlayPanel } from "./StudioCoverOverlay";
import type { StudioCoverOverlayLayer } from "./studioCoverTypes";

export type CoverPersonalizationTab = "border" | "text" | "image" | "index";

type StudioCoverPersonalizationProps = {
  tab: CoverPersonalizationTab;
  onTabChange: (tab: CoverPersonalizationTab) => void;
  coverBorder: "thin" | "double" | "none" | "dashed";
  onCoverBorderChange: (border: "thin" | "double" | "none" | "dashed") => void;
  coverAlign: "left" | "center" | "right";
  onCoverAlignChange: (align: "left" | "center" | "right") => void;
  grainDensity: number;
  onGrainDensityChange: (value: number) => void;
  coverOverlay: boolean;
  onCoverOverlayToggle: () => void;
  coverOverlayLayers: StudioCoverOverlayLayer[];
  onCoverOverlayLayersChange: (layers: StudioCoverOverlayLayer[]) => void;
  onOverlayLogoUpload: (file: File) => void | Promise<void>;
  onOpenTreatmentLibrary: () => void;
  onTreatmentPreset: (id: string) => void;
  coverIssueIndex: number;
  coverSystemCode: string;
  className?: string;
};

const TABS: Array<{ id: CoverPersonalizationTab; label: string }> = [
  { id: "border", label: "Border" },
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "index", label: "Index" },
];

export const StudioCoverPersonalization: React.FC<
  StudioCoverPersonalizationProps
> = ({
  tab,
  onTabChange,
  coverBorder,
  onCoverBorderChange,
  coverAlign,
  onCoverAlignChange,
  grainDensity,
  onGrainDensityChange,
  coverOverlay,
  onCoverOverlayToggle,
  coverOverlayLayers,
  onCoverOverlayLayersChange,
  onOverlayLogoUpload,
  onOpenTreatmentLibrary,
  onTreatmentPreset,
  coverIssueIndex,
  coverSystemCode,
  className = "",
}) => {
  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div
        className="studio-cover-tab-rail flex gap-1 rounded-full border studio-border studio-bg-surface/70 p-1"
        role="tablist"
        aria-label="Cover personalization"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex-1 min-h-10 rounded-full font-mono text-[7px] uppercase tracking-[0.18em] transition-all ${
              tab === item.id
                ? "bg-stone-950 text-stone-50 dark:bg-stone-100 dark:text-stone-950 shadow-sm"
                : "studio-text-muted hover:studio-text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-[88px] rounded-xl border studio-border studio-bg-surface/60 p-4">
        {tab === "border" && (
          <div>
            <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-2.5">
              Cover frame
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(["thin", "double", "dashed", "none"] as const).map((border) => (
                <button
                  key={border}
                  type="button"
                  onClick={() => onCoverBorderChange(border)}
                  className={`min-h-10 rounded-lg border font-mono text-[7px] uppercase tracking-wider transition-colors ${
                    coverBorder === border
                      ? "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 border-stone-950 dark:border-stone-100"
                      : "studio-border studio-text-muted hover:studio-text-ink"
                  }`}
                >
                  {border}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "text" && (
          <div>
            <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-2.5">
              Title alignment
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["left", "center", "right"] as const).map((alignment) => (
                <button
                  key={alignment}
                  type="button"
                  onClick={() => onCoverAlignChange(alignment)}
                  className={`min-h-10 rounded-lg border font-mono text-[7px] uppercase tracking-wider transition-colors ${
                    coverAlign === alignment
                      ? "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 border-stone-950 dark:border-stone-100"
                      : "studio-border studio-text-muted hover:studio-text-ink"
                  }`}
                >
                  {alignment}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "image" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-2">
                  Image treatment
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onTreatmentPreset("muted")}
                    title="Muted Chroma"
                    className="w-6 h-6 rounded-full bg-[#FAF9F6] border border-stone-700/40"
                  />
                  <button
                    type="button"
                    onClick={() => onTreatmentPreset("terry")}
                    title="Terry Flash"
                    className="w-6 h-6 rounded-full bg-[#C8B195] border border-stone-700/40"
                  />
                  <button
                    type="button"
                    onClick={onOpenTreatmentLibrary}
                    title="Open treatment library"
                    className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-400 via-emerald-400 to-indigo-500 border border-stone-700/40"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTreatmentLibrary}
                className="rounded-full border studio-border px-3 py-2 font-mono text-[7px] uppercase tracking-widest studio-text-ink"
              >
                Library
              </button>
            </div>
            <label className="block">
              <span className="flex justify-between font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-1.5">
                <span>Grain</span>
                <span>{grainDensity}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={grainDensity}
                onChange={(event) =>
                  onGrainDensityChange(Number(event.target.value))
                }
                className="w-full accent-stone-950 dark:accent-stone-100"
              />
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={coverOverlay}
              aria-label="Toggle cover overlay"
              onClick={onCoverOverlayToggle}
              className="flex w-full items-center justify-between gap-3 rounded-lg border studio-border px-3 py-2.5 font-mono text-[7px] uppercase tracking-[0.18em] studio-text-muted"
            >
              <span>Sticker overlay</span>
              <span
                aria-hidden
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                  coverOverlay
                    ? "bg-emerald-500 border-emerald-500"
                    : "studio-bg-panel studio-border"
                }`}
              >
                <span
                  className={`block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    coverOverlay ? "translate-x-[17px]" : "translate-x-[2px]"
                  }`}
                />
              </span>
            </button>
            {coverOverlay && (
              <StudioCoverOverlayPanel
                layers={coverOverlayLayers}
                onChange={onCoverOverlayLayersChange}
                onAddLogo={onOverlayLogoUpload}
              />
            )}
          </div>
        )}

        {tab === "index" && (
          <div className="space-y-3">
            <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted">
              Issue registry
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border studio-border px-3 py-2.5">
                <span className="block font-mono text-[6px] uppercase tracking-[0.2em] studio-text-muted">
                  Index
                </span>
                <span className="block font-serif italic text-lg studio-text-ink mt-1">
                  {String(coverIssueIndex).padStart(3, "0")}
                </span>
              </div>
              <div className="rounded-lg border studio-border px-3 py-2.5 min-w-0">
                <span className="block font-mono text-[6px] uppercase tracking-[0.2em] studio-text-muted">
                  System code
                </span>
                <span className="block font-mono text-[9px] studio-text-ink mt-1 truncate">
                  {coverSystemCode}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

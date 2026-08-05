import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Eye,
  Globe,
  Layers,
  Mic,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Pipette,
  Repeat2,
  Scissors,
} from "lucide-react";
import { StudioFootnoteEmblem, type StudioFootnoteLabel } from "./StudioFootnoteEmblem";

export type StudioInstrumentKey =
  | "attach"
  | "compose"
  | "tailor"
  | "cover"
  | "ground"
  | "treatment"
  | "continuum"
  | "pocket"
  | "anchors"
  | "more"
  | "mic";

export type StudioInstrumentItem = {
  key: StudioInstrumentKey;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
};

type StudioInstrumentRailProps = {
  items: StudioInstrumentItem[];
  onInstrumentClick?: (key: StudioInstrumentKey) => void;
  onFootnoteClick?: () => void;
  footnoteLabel?: StudioFootnoteLabel;
  footnoteInteractive?: boolean;
  className?: string;
};

export function buildDefaultStudioInstruments(handlers: {
  onAttach: () => void;
  onCompose: () => void;
  onTailor: () => void;
  onCover: () => void;
  onGround: () => void;
  onMic: () => void;
  onTreatment: () => void;
  onContinuum: () => void;
  onPocket: () => void;
  onAnchors: () => void;
  onMore: () => void;
  active?: Partial<Record<StudioInstrumentKey, boolean>>;
}): StudioInstrumentItem[] {
  const active = handlers.active ?? {};
  const icon = (Icon: LucideIcon) => <Icon size={16} strokeWidth={1.4} />;

  return [
    {
      key: "attach",
      label: "Attach media",
      icon: icon(Paperclip),
      active: active.attach,
      onClick: handlers.onAttach,
    },
    {
      key: "compose",
      label: "Compose",
      icon: icon(PenLine),
      active: active.compose,
      onClick: handlers.onCompose,
    },
    {
      key: "tailor",
      label: "Tailor override",
      icon: icon(Scissors),
      active: active.tailor,
      onClick: handlers.onTailor,
    },
    {
      key: "cover",
      label: "Cover",
      icon: icon(Eye),
      active: active.cover,
      onClick: handlers.onCover,
    },
    {
      key: "ground",
      label: "Web grounding",
      icon: icon(Globe),
      active: active.ground,
      onClick: handlers.onGround,
    },
    {
      key: "mic",
      label: "Voice memo",
      icon: icon(Mic),
      active: active.mic,
      onClick: handlers.onMic,
    },
    {
      key: "treatment",
      label: "Treatments",
      icon: icon(Pipette),
      active: active.treatment,
      onClick: handlers.onTreatment,
    },
    {
      key: "continuum",
      label: "Continuum",
      icon: icon(Repeat2),
      active: active.continuum,
      onClick: handlers.onContinuum,
    },
    {
      key: "pocket",
      label: "Pocket",
      icon: icon(Archive),
      active: active.pocket,
      onClick: handlers.onPocket,
    },
    {
      key: "anchors",
      label: "Anchors",
      icon: icon(Layers),
      active: active.anchors,
      onClick: handlers.onAnchors,
    },
    {
      key: "more",
      label: "More",
      icon: icon(MoreHorizontal),
      active: active.more,
      onClick: handlers.onMore,
    },
  ];
}

export const StudioInstrumentRail: React.FC<StudioInstrumentRailProps> = ({
  items,
  onInstrumentClick,
  onFootnoteClick,
  footnoteLabel = "Studio",
  footnoteInteractive = Boolean(onFootnoteClick),
  className = "",
}) => {
  return (
    <footer
      aria-label="Studio instruments"
      className={`studio-mobile-rail border-t studio-border studio-bg-panel ${className}`.trim()}
    >
      <div
        role="toolbar"
        aria-label="Studio tools"
        className="flex items-center justify-center gap-1 px-2 pt-1.5 pb-1 overflow-x-auto no-scrollbar"
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              item.onClick();
              onInstrumentClick?.(item.key);
            }}
            aria-label={item.label}
            aria-pressed={item.active || undefined}
            className={`studio-mobile-rail-item min-w-11 min-h-11 w-11 h-11 flex items-center justify-center transition-colors ${
              item.active ? "studio-text-ink" : "studio-text-muted"
            }`}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div className="border-t border-dotted studio-border px-4 pt-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] flex flex-col items-center">
        <StudioFootnoteEmblem
          label={footnoteLabel}
          onClick={onFootnoteClick}
          interactive={footnoteInteractive}
        />
      </div>
    </footer>
  );
};

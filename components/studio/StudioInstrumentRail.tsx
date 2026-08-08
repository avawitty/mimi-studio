import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Eye,
  Globe,
  Layers,
  LayoutGrid,
  Mic,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Pipette,
  Repeat2,
  Scissors,
  Sparkles,
} from "lucide-react";
import { StudioFootnoteEmblem, type StudioFootnoteLabel } from "./StudioFootnoteEmblem";
import {
  FloatingCylinderToolbar,
  type FloatingCylinderToolbarItem,
} from "../ui/FloatingCylinderToolbar";

export type StudioInstrumentKey =
  | "tools"
  | "attach"
  | "compose"
  | "tailor"
  | "cover"
  | "ground"
  | "treatment"
  | "continuum"
  | "pocket"
  | "telemetry"
  | "anchors"
  | "more"
  | "mic"
  | "spark"
  | "brain"
  | "globe";

export type StudioInstrumentItem = FloatingCylinderToolbarItem & {
  key: StudioInstrumentKey;
};

type StudioInstrumentRailProps = {
  items: StudioInstrumentItem[];
  footnoteLabel?: StudioFootnoteLabel;
  className?: string;
};

/** Primary floating strip — readable labels, scroll inside the pill. */
export function buildStudioFloatingInstruments(handlers: {
  onTools?: () => void;
  onAttach: () => void;
  onCompose: () => void;
  onCover: () => void;
  onShape?: () => void;
  onMic: () => void;
  onSpark?: () => void;
  onDeep?: () => void;
  onWeb?: () => void;
  onPocket: () => void;
  onMore: () => void;
  active?: Partial<Record<StudioInstrumentKey, boolean>>;
}): StudioInstrumentItem[] {
  const active = handlers.active ?? {};
  const icon = (Icon: LucideIcon) => <Icon size={15} strokeWidth={1.45} />;

  const toolsItem: StudioInstrumentItem[] = handlers.onTools
    ? [
        {
          key: "tools",
          label: "Tools",
          icon: icon(LayoutGrid),
          active: active.tools,
          onClick: handlers.onTools,
        },
      ]
    : [];

  const shapeItem: StudioInstrumentItem[] = handlers.onShape
    ? [
        {
          key: "tailor",
          label: "Shape",
          icon: icon(Scissors),
          active: active.tailor,
          onClick: handlers.onShape,
        },
      ]
    : [];

  const sparkItem: StudioInstrumentItem[] = handlers.onSpark
    ? [
        {
          key: "spark",
          label: "Spark",
          icon: icon(Sparkles),
          active: active.spark,
          onClick: handlers.onSpark,
        },
      ]
    : [];

  const deepItem: StudioInstrumentItem[] = handlers.onDeep
    ? [
        {
          key: "brain",
          label: "Deep",
          icon: icon(Activity),
          active: active.brain,
          onClick: handlers.onDeep,
        },
      ]
    : [];

  const webItem: StudioInstrumentItem[] = handlers.onWeb
    ? [
        {
          key: "globe",
          label: "Web",
          icon: icon(Globe),
          active: active.globe,
          onClick: handlers.onWeb,
        },
      ]
    : [];

  return [
    ...toolsItem,
    {
      key: "compose",
      label: "Compose",
      icon: icon(PenLine),
      active: active.compose,
      onClick: handlers.onCompose,
    },
    {
      key: "cover",
      label: "Cover",
      icon: icon(Eye),
      active: active.cover,
      onClick: handlers.onCover,
    },
    {
      key: "attach",
      label: "Attach",
      icon: icon(Paperclip),
      active: active.attach,
      onClick: handlers.onAttach,
    },
    {
      key: "mic",
      label: "Voice",
      icon: icon(Mic),
      active: active.mic,
      onClick: handlers.onMic,
    },
    ...shapeItem,
    ...sparkItem,
    ...deepItem,
    ...webItem,
    {
      key: "pocket",
      label: "Pocket",
      icon: icon(Archive),
      active: active.pocket,
      onClick: handlers.onPocket,
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

export function buildDefaultStudioInstruments(handlers: {
  onTools?: () => void;
  onAttach: () => void;
  onCompose: () => void;
  onTailor: () => void;
  onCover: () => void;
  onGround: () => void;
  onMic: () => void;
  onTreatment: () => void;
  onContinuum: () => void;
  onPocket: () => void;
  onTelemetry: () => void;
  onAnchors: () => void;
  onMore: () => void;
  active?: Partial<Record<StudioInstrumentKey, boolean>>;
}): StudioInstrumentItem[] {
  const active = handlers.active ?? {};
  const icon = (Icon: LucideIcon) => <Icon size={16} strokeWidth={1.4} />;

  const toolsItem: StudioInstrumentItem[] = handlers.onTools
    ? [
        {
          key: "tools",
          label: "Tools",
          icon: icon(LayoutGrid),
          active: active.tools,
          onClick: handlers.onTools,
        },
      ]
    : [];

  return [
    ...toolsItem,
    {
      key: "attach",
      label: "Attach",
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
      label: "Tailor",
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
      label: "Ground",
      icon: icon(Globe),
      active: active.ground,
      onClick: handlers.onGround,
    },
    {
      key: "mic",
      label: "Voice",
      icon: icon(Mic),
      active: active.mic,
      onClick: handlers.onMic,
    },
    {
      key: "treatment",
      label: "Treatment",
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
      key: "telemetry",
      label: "Telemetry",
      icon: icon(Activity),
      active: active.telemetry,
      onClick: handlers.onTelemetry,
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

/** One floating cylindrical toolbar — all studio tools scroll inside the pill. */
export const StudioInstrumentRail: React.FC<StudioInstrumentRailProps> = ({
  items,
  footnoteLabel = "Studio",
  className = "",
}) => {
  return (
    <FloatingCylinderToolbar
      variant="studio"
      ariaLabel="Studio instruments"
      items={items}
      className={className}
      trailing={
        <div className="px-2 py-1">
          <StudioFootnoteEmblem label={footnoteLabel} />
        </div>
      }
    />
  );
};

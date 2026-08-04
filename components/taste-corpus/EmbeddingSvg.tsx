import { useMemo } from "react";
import type { TasteCorpusExplorerItem } from "../../lib/taste-corpus/types";
import { EmbeddingHoverCard } from "./EmbeddingHoverCard";

const POINT_RADIUS = 5;
const HOVER_RADIUS = 7;

interface EmbeddingSvgProps {
  items: TasteCorpusExplorerItem[];
  width: number;
  height: number;
  dataToScreen: (x: number, y: number, width: number, height: number) => {
    sx: number;
    sy: number;
  };
  hoveredId: string | null;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  pointerEvents: boolean;
}

export function EmbeddingSvg({
  items,
  width,
  height,
  dataToScreen,
  hoveredId,
  activeId,
  onHover,
  onSelect,
  pointerEvents,
}: EmbeddingSvgProps) {
  const screenPoints = useMemo(
    () =>
      items.map((item) => ({
        item,
        ...dataToScreen(item.x, item.y, width, height),
      })),
    [dataToScreen, height, items, width],
  );

  const hovered = hoveredId
    ? screenPoints.find((p) => p.item.id === hoveredId)
    : null;

  return (
    <>
      <svg
        width={width}
        height={height}
        className="absolute inset-0 touch-none"
        aria-hidden="true"
      >
        <line
          x1={width / 2}
          y1={0}
          x2={width / 2}
          y2={height}
          className="stroke-mimi-hairline"
          strokeWidth={0.5}
          strokeDasharray="4 4"
          opacity={0.5}
        />
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          className="stroke-mimi-hairline"
          strokeWidth={0.5}
          strokeDasharray="4 4"
          opacity={0.5}
        />
        {screenPoints.map(({ item, sx, sy }) => {
          const isHovered = hoveredId === item.id;
          const isActive = activeId === item.id;
          const r = isHovered || isActive ? HOVER_RADIUS : POINT_RADIUS;
          return (
            <circle
              key={item.id}
              cx={sx}
              cy={sy}
              r={r}
              className={
                isActive
                  ? "fill-[var(--mimi-cobalt)]"
                  : isHovered
                    ? "fill-mimi-olive"
                    : "fill-mimi-stone"
              }
              style={{ pointerEvents: pointerEvents ? "auto" : "none", cursor: "pointer" }}
              onMouseEnter={() => onHover(item.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(item.id)}
            />
          );
        })}
      </svg>
      {hovered ? (
        <EmbeddingHoverCard
          item={hovered.item}
          x={hovered.sx}
          y={hovered.sy}
          containerWidth={width}
          containerHeight={height}
        />
      ) : null}
    </>
  );
}

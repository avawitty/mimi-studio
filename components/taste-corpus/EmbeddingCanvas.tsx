import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TasteCorpusExplorerItem } from "../../lib/taste-corpus/types";
import { EmbeddingHoverCard } from "./EmbeddingHoverCard";

const POINT_RADIUS = 4;
const HOVER_RADIUS = 6;
const HIT_RADIUS = 12;

interface EmbeddingCanvasProps {
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
  isPanning: boolean;
}

export function EmbeddingCanvas({
  items,
  width,
  height,
  dataToScreen,
  hoveredId,
  activeId,
  onHover,
  onSelect,
  isPanning,
}: EmbeddingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenPoints = useMemo(
    () =>
      items.map((item) => ({
        item,
        ...dataToScreen(item.x, item.y, width, height),
      })),
    [dataToScreen, height, items, width],
  );

  const findNearest = useCallback(
    (sx: number, sy: number) => {
      let best: (typeof screenPoints)[number] | null = null;
      let bestDist = HIT_RADIUS;
      for (const point of screenPoints) {
        const dx = point.sx - sx;
        const dy = point.sy - sy;
        const dist = Math.hypot(dx, dy);
        if (dist <= bestDist) {
          bestDist = dist;
          best = point;
        }
      }
      return best;
    },
    [screenPoints],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);

    const hairline = getComputedStyle(document.documentElement)
      .getPropertyValue("--mimi-hairline")
      .trim();
    const stone = getComputedStyle(document.documentElement)
      .getPropertyValue("--mimi-stone")
      .trim();
    const olive = getComputedStyle(document.documentElement)
      .getPropertyValue("--mimi-olive")
      .trim();
    const cobalt = getComputedStyle(document.documentElement)
      .getPropertyValue("--mimi-cobalt")
      .trim();

    ctx.save();
    ctx.strokeStyle = hairline || "currentColor";
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.restore();

    for (const { item, sx, sy } of screenPoints) {
      const isHovered = hoveredId === item.id;
      const isActive = activeId === item.id;
      const r = isHovered || isActive ? HOVER_RADIUS : POINT_RADIUS;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? cobalt || olive : isHovered ? olive : stone;
      ctx.fill();
    }
  }, [activeId, height, hoveredId, screenPoints, width]);

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const hit = findNearest(sx, sy);
    onHover(hit?.item.id ?? null);
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const hit = findNearest(sx, sy);
    if (hit) onSelect(hit.item.id);
  };

  const hovered = hoveredId
    ? screenPoints.find((p) => p.item.id === hoveredId)
    : null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        aria-hidden="true"
        onPointerMove={handlePointerMove}
        onMouseLeave={() => onHover(null)}
        onClick={handleClick}
      />
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

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { TasteCorpusExplorerItem } from "../../lib/taste-corpus/types";
import { useEmbeddingViewport } from "../../hooks/useEmbeddingViewport";
import { EmbeddingCanvas } from "./EmbeddingCanvas";
import { EmbeddingSvg } from "./EmbeddingSvg";

export const CANVAS_POINT_THRESHOLD = 1500;

interface EmbeddingViewportProps {
  items: TasteCorpusExplorerItem[];
}

export function EmbeddingViewport({ items }: EmbeddingViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    zoom,
    isPanning,
    dataToScreen,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    setZoom,
    resetView,
  } = useEmbeddingViewport();

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const useCanvas = items.length > CANVAS_POINT_THRESHOLD;

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      const item = items.find((entry) => entry.id === id);
      if (item?.href) {
        window.location.assign(item.href);
      }
    },
    [items],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      onWheel(event, rect);
    },
    [onWheel],
  );

  return (
    <div className="flex h-full min-h-[min(70vh,560px)] flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-mimi-hairline pb-2">
        <p className="font-sans text-[10px] uppercase tracking-widest text-mimi-stone">
          {items.length} specimens · {useCanvas ? "canvas" : "svg"} projection
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom(zoom * 1.15)}
            className="border border-mimi-hairline p-1.5 text-mimi-ink transition-colors hover:bg-mimi-worktable"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(zoom * 0.87)}
            className="border border-mimi-hairline p-1.5 text-mimi-ink transition-colors hover:bg-mimi-worktable"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="border border-mimi-hairline p-1.5 text-mimi-ink transition-colors hover:bg-mimi-worktable"
            aria-label="Reset view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden border border-mimi-hairline bg-mimi-field"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={handleWheel}
        role="application"
        aria-label="Taste corpus embedding map. Drag to pan, scroll to zoom."
      >
        {size.width > 0 && size.height > 0 ? (
          useCanvas ? (
            <EmbeddingCanvas
              items={items}
              width={size.width}
              height={size.height}
              dataToScreen={dataToScreen}
              hoveredId={hoveredId}
              activeId={activeId}
              onHover={setHoveredId}
              onSelect={handleSelect}
              isPanning={isPanning}
            />
          ) : (
            <EmbeddingSvg
              items={items}
              width={size.width}
              height={size.height}
              dataToScreen={dataToScreen}
              hoveredId={hoveredId}
              activeId={activeId}
              onHover={setHoveredId}
              onSelect={handleSelect}
              pointerEvents={!isPanning}
            />
          )
        ) : null}
      </div>
    </div>
  );
}

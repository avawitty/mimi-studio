import { useCallback, useEffect, useRef, useState } from "react";

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;
const DEFAULT_ZOOM = 1;

export interface UseEmbeddingViewportOptions {
  initialPan?: { x: number; y: number };
  initialZoom?: number;
}

export function useEmbeddingViewport(options: UseEmbeddingViewportOptions = {}) {
  const [pan, setPan] = useState({
    x: options.initialPan?.x ?? 0,
    y: options.initialPan?.y ?? 0,
  });
  const [zoom, setZoom] = useState(options.initialZoom ?? DEFAULT_ZOOM);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const clampZoom = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }, []);

  const dataToScreen = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.42 * zoom;
      return {
        sx: cx + x * scale + pan.x,
        sy: cy - y * scale + pan.y,
      };
    },
    [pan.x, pan.y, zoom],
  );

  const screenToData = useCallback(
    (sx: number, sy: number, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.42 * zoom;
      if (scale === 0) return { x: 0, y: 0 };
      return {
        x: (sx - pan.x - cx) / scale,
        y: -(sy - pan.y - cy) / scale,
      };
    },
    [pan.x, pan.y, zoom],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      setIsPanning(true);
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [pan.x, pan.y],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
    },
    [isPanning],
  );

  const onPointerUp = useCallback((event: React.PointerEvent) => {
    setIsPanning(false);
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const onWheel = useCallback(
    (event: React.WheelEvent, rect: DOMRect) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      const nextZoom = clampZoom(zoom * factor);
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const before = screenToData(mx, my, rect.width, rect.height);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const oldScale = Math.min(rect.width, rect.height) * 0.42 * zoom;
      const newScale = Math.min(rect.width, rect.height) * 0.42 * nextZoom;
      const sx = cx + before.x * oldScale + pan.x;
      const sy = cy - before.y * oldScale + pan.y;
      const newPanX = sx - (cx + before.x * newScale);
      const newPanY = sy - (cy - before.y * newScale);
      setZoom(nextZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [clampZoom, pan.x, pan.y, screenToData, zoom],
  );

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(DEFAULT_ZOOM);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "0" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        resetView();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetView]);

  return {
    pan,
    zoom,
    isPanning,
    setZoom: (value: number) => setZoom(clampZoom(value)),
    dataToScreen,
    screenToData,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    resetView,
  };
}

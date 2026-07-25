import type { StudioCoverOverlayLayer } from "../components/studio/studioCoverTypes";

/** Matches Studio cover preview aspect (~3:4). */
export const STUDIO_COVER_EXPORT_WIDTH = 800;
export const STUDIO_COVER_EXPORT_HEIGHT = 1067;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load cover image: ${url}`));
    img.src = url;
  });
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  opacity: number,
): void {
  const spikes = 5;
  const outer = radius;
  const inner = radius * 0.45;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#FAF9F6";
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<StudioCoverOverlayLayer, { kind: "text" }>,
  width: number,
  height: number,
): void {
  const x = (layer.x / 100) * width;
  const y = (layer.y / 100) * height;
  ctx.save();
  ctx.font = `italic ${layer.fontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = layer.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 4;
  ctx.fillText(layer.text, x, y);
  ctx.restore();
}

async function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<StudioCoverOverlayLayer, { kind: "image" }>,
  width: number,
  height: number,
): Promise<void> {
  const x = (layer.x / 100) * width;
  const y = (layer.y / 100) * height;
  const drawWidth = (layer.width / 100) * width;

  if (!layer.url) {
    drawStar(ctx, x, y, Math.max(12, drawWidth * 0.15), layer.opacity);
    return;
  }

  const overlay = await loadImage(layer.url);
  const drawHeight = overlay.height * (drawWidth / overlay.width);
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.drawImage(overlay, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

/** Composite overlay layers onto the base cover plate for export. */
export async function rasterizeStudioCover(
  coverImageUrl: string,
  layers: StudioCoverOverlayLayer[],
): Promise<string> {
  if (!coverImageUrl) {
    throw new Error("Cover image URL required for rasterization");
  }
  if (layers.length === 0) {
    return coverImageUrl;
  }

  const width = STUDIO_COVER_EXPORT_WIDTH;
  const height = STUDIO_COVER_EXPORT_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  const base = await loadImage(coverImageUrl);
  ctx.drawImage(base, 0, 0, width, height);

  for (const layer of layers) {
    if (layer.kind === "text") {
      drawTextLayer(ctx, layer, width, height);
    } else {
      await drawImageLayer(ctx, layer, width, height);
    }
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

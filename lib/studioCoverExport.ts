import type { MediaFile, ZineMetadata } from "../types";
import type { StudioCoverOverlayLayer } from "../components/studio/studioCoverTypes";
import { rasterizeStudioCover } from "./rasterizeStudioCover";

export function resolveStudioCoverUrl(media: MediaFile[]): string | undefined {
  const image = media.find((file) => file.type === "image");
  if (!image) return undefined;
  return image.url || image.data || undefined;
}

export function readStudioCoverOverlays(
  metadata: ZineMetadata,
): StudioCoverOverlayLayer[] | undefined {
  const overlays = (metadata.content as { meta?: { studioCoverOverlays?: StudioCoverOverlayLayer[] } })
    ?.meta?.studioCoverOverlays;
  return overlays?.length ? overlays : undefined;
}

export interface StudioCoverExportMeta {
  coverImageUrl?: string;
  studioCoverOverlays?: StudioCoverOverlayLayer[];
}

export function buildStudioCoverExportMeta(
  media: MediaFile[],
  overlayLayers: StudioCoverOverlayLayer[],
  overlayVisible: boolean,
): StudioCoverExportMeta {
  const coverImageUrl = resolveStudioCoverUrl(media);
  const studioCoverOverlays =
    overlayVisible && overlayLayers.length > 0 ? overlayLayers : undefined;
  return { coverImageUrl, studioCoverOverlays };
}

/** Bake overlay layers into a single cover JPEG data URL when overlays exist. */
export async function resolveExportCoverUrl(
  coverImageUrl: string | null | undefined,
  overlays?: StudioCoverOverlayLayer[],
): Promise<string | null | undefined> {
  if (!coverImageUrl) return coverImageUrl;
  if (!overlays?.length) return coverImageUrl;
  try {
    return await rasterizeStudioCover(coverImageUrl, overlays);
  } catch (error) {
    console.warn("MIMI // Cover overlay rasterization failed; using base plate.", error);
    return coverImageUrl;
  }
}

/** Resolve export cover from zine metadata (bakes overlays when present). */
export async function resolveZineExportCoverUrl(
  metadata: ZineMetadata,
): Promise<string | null | undefined> {
  const overlays = readStudioCoverOverlays(metadata);
  return resolveExportCoverUrl(metadata.coverImageUrl, overlays);
}

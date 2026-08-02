import type { ZinePageSpec } from "../../types";

export const MOBILE_PLATE_CONCURRENCY = 2;
export const DESKTOP_PLATE_CONCURRENCY = 3;
export const MAX_PLATE_JOBS = 24;

export function resolvePlateConcurrency(
  requested: number | undefined,
  isMobile = false,
): number {
  const fallback = isMobile
    ? MOBILE_PLATE_CONCURRENCY
    : DESKTOP_PLATE_CONCURRENCY;
  if (!Number.isFinite(requested)) return fallback;
  const maximum = isMobile
    ? MOBILE_PLATE_CONCURRENCY
    : DESKTOP_PLATE_CONCURRENCY;
  return Math.max(1, Math.min(maximum, Math.floor(requested!)));
}

export function fullFidelityPageIndexes(
  activeIndex: number,
  pageCount: number,
): Set<number> {
  const indexes = new Set<number>();
  if (pageCount <= 0) return indexes;
  const safeActive = Math.max(0, Math.min(pageCount - 1, activeIndex));
  for (
    let index = Math.max(0, safeActive - 1);
    index <= Math.min(pageCount - 1, safeActive + 1);
    index += 1
  ) {
    indexes.add(index);
  }
  return indexes;
}

export function editorAssetUrl(page: ZinePageSpec): string | undefined {
  return (
    page.assetVariants?.previewUrl ||
    page.image_url ||
    page.assetVariants?.thumbnailUrl ||
    page.assetVariants?.masterUrl ||
    page.originalMediaUrl
  );
}

export function exportAssetUrl(page: ZinePageSpec): string | undefined {
  return (
    page.assetVariants?.masterUrl ||
    page.image_url ||
    page.originalMediaUrl ||
    page.assetVariants?.previewUrl ||
    page.assetVariants?.thumbnailUrl
  );
}

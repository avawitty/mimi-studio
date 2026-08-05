import type { MediaFile } from "../types";
import type { UnsplashPhotoResult } from "./unsplashClient";
import type { StudioInspoSlide } from "./studioInspoTypes";

export function referenceSlidesFromMedia(media: MediaFile[]): StudioInspoSlide[] {
  return media
    .filter((file) => file.type === "image" && (file.url || file.data))
    .map((file, index) => ({
      id: `reference-${file.id || file.name || index}`,
      imageUrl: file.url || file.data,
      label: file.name?.trim() || `Reference ${index + 1}`,
      source: "reference" as const,
    }));
}

export async function fetchStockInspoSlides(
  query: string,
  limit = 6,
): Promise<StudioInspoSlide[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const response = await fetch(
    `/api/inspo/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
  );
  if (response.status === 404) return [];
  if (!response.ok) return [];

  const data = await response.json();
  const results: UnsplashPhotoResult[] = Array.isArray(data?.results)
    ? data.results
    : data?.imageUrl
      ? [data as UnsplashPhotoResult]
      : [];

  return results.map((photo, index) => ({
    id: `unsplash-${photo.sourceUrl || index}`,
    imageUrl: photo.imageUrl,
    label: photo.attribution || "Editorial stock",
    attribution: photo.attribution,
    source: "unsplash" as const,
  }));
}

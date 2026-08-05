import type { UnsplashPhotoResult } from "./unsplashClient.js";

export type { UnsplashPhotoResult };

export async function resolveZinePlateStock(
  prompt: string,
): Promise<UnsplashPhotoResult | null> {
  const query = encodeURIComponent(prompt.trim());
  if (!query) return null;

  const response = await fetch(`/api/inspo/search?q=${query}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (typeof data?.error === "string" && data.error) ||
        `Stock search failed (${response.status})`,
    );
  }
  return (await response.json()) as UnsplashPhotoResult;
}

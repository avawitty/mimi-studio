import type { UnsplashPhotoResult } from "./unsplashClient.js";

export type { UnsplashPhotoResult };

export async function resolveZinePlateStock(
  prompt: string,
  options?: { page?: number },
): Promise<UnsplashPhotoResult | null> {
  const query = encodeURIComponent(prompt.trim());
  if (!query) return null;

  const page = options?.page && options.page > 1 ? `&page=${options.page}` : "";
  const response = await fetch(`/api/inspo/search?q=${query}${page}`);
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

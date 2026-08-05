export interface UnsplashPhotoResult {
  imageUrl: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  provider: "unsplash";
  attribution: string;
}

export function getUnsplashAccessKey(): string | undefined {
  return process.env.UNSPLASH_ACCESS_KEY?.trim() || undefined;
}

/** Trim poetic prompts to a stock-search-friendly query. */
export function compileStockSearchQuery(prompt: string): string {
  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(/[^\w\s,.-]/g, " ")
    .trim();
  if (!cleaned) return "editorial photography";
  const words = cleaned.split(" ").filter(Boolean);
  return words.slice(0, 12).join(" ").slice(0, 120);
}

export async function searchUnsplashPhoto(
  query: string,
  accessKey = getUnsplashAccessKey(),
  options?: { page?: number },
): Promise<UnsplashPhotoResult | null> {
  if (!accessKey) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", compileStockSearchQuery(query));
  url.searchParams.set("per_page", "1");
  url.searchParams.set("page", String(Math.max(1, options?.page ?? 1)));
  url.searchParams.set("orientation", "portrait");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Unsplash returned ${response.status}`);
  }

  const data = await response.json();
  const photo = data?.results?.[0];
  if (!photo?.urls?.regular) return null;

  const photographer = String(photo.user?.name || "Unknown").trim();
  const photographerUrl = String(photo.user?.links?.html || "").trim();
  const sourceUrl = String(photo.links?.html || photo.urls.regular).trim();

  return {
    imageUrl: photo.urls.regular,
    photographer,
    photographerUrl,
    sourceUrl,
    provider: "unsplash",
    attribution: photographerUrl
      ? `Photo by ${photographer} on Unsplash`
      : `Photo by ${photographer} · Unsplash`,
  };
}

import type { ZinePageSpec } from "../types";
import { resolveZinePlateStock } from "./resolveZinePlateStock";

function stockSearchPrompt(page: ZinePageSpec): string {
  return (
    page.imagePrompt?.trim() ||
    page.headline?.trim() ||
    page.bodyCopy?.trim() ||
    "editorial photography"
  );
}

/** Fetch an alternate Unsplash plate for proof / draft swap (no full regen). */
export async function swapZinePlateStock(
  page: ZinePageSpec,
  swapIndex = 1,
): Promise<ZinePageSpec | null> {
  const stock = await resolveZinePlateStock(stockSearchPrompt(page), {
    page: Math.max(1, swapIndex + 1),
  });
  if (!stock) return null;

  return {
    ...page,
    image_url: stock.imageUrl,
    originalMediaUrl: stock.imageUrl,
    plateMediaOrigin: "unsplash",
    stockAttribution: stock.attribution,
    stockPhotographer: stock.photographer,
    stockSourceUrl: stock.sourceUrl,
    assetRevision: (page.assetRevision || 0) + 1,
  };
}

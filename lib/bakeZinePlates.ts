import type { MediaFile, ZineContent, ZinePlateMediaMode } from "../types";
import { generateZineImage } from "../services/geminiService";
import { archiveManager } from "../services/archiveManager";
import { shouldAutoDevelopPlates } from "./zineSpreadLayout";
import { resolvePlateConcurrency } from "./zine/zinePerformance";
import { resolveZinePlateStock } from "./resolveZinePlateStock";
import {
  normalizePlateMediaMode,
  shouldAiGeneratePlates,
  shouldResolveStockPlates,
} from "./zinePlateMediaMode";

export interface BakeZinePlatesOptions {
  content: ZineContent;
  profile: unknown;
  apiKey?: string;
  artifacts?: MediaFile[];
  treatmentId?: string;
  isLite?: boolean;
  isHighFidelity?: boolean;
  isQuickPreview?: boolean;
  /** Existing studio/cover plate — skip hero bake when set. */
  existingCoverUrl?: string | null;
  ownerUid?: string;
  /** Limit concurrent image jobs (defaults to 2 mobile / 3 desktop). */
  concurrency?: number;
  /** Allows the queue to apply the lower mobile concurrency budget. */
  isMobile?: boolean;
  /** Stock vs AI plate resolution for hi-fi bakes. */
  plateMediaMode?: ZinePlateMediaMode;
}

export interface BakeZinePlatesResult {
  content: ZineContent;
  coverUrl?: string;
  bakedPlateCount: number;
  bakedCover: boolean;
  failures: string[];
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/** Prevent unbounded provider cost from crafted oversized page arrays. */
export const MAX_BAKE_PLATES = 24;

async function persistImage(
  ownerUid: string | undefined,
  image: string,
  pathPrefix: string,
): Promise<string | null> {
  if (!image.startsWith("data:")) return image;
  if (!ownerUid) return null;
  try {
    return await archiveManager.uploadMedia(ownerUid, image, pathPrefix, {
      allowStorageFallback: false,
    });
  } catch (error) {
    console.warn("MIMI // bakeZinePlates: upload failed", error);
    return null;
  }
}

/**
 * Pre-develop cover + visual plates for hi-fi issues so reveal opens finished.
 * Soft-fails per plate — generation still succeeds if some images miss.
 */
export async function bakeZineVisualPlates(
  options: BakeZinePlatesOptions,
): Promise<BakeZinePlatesResult> {
  const {
    content,
    profile,
    apiKey,
    artifacts,
    treatmentId,
    isLite,
    existingCoverUrl,
    ownerUid,
    concurrency,
  } = options;

  const plateMediaMode = normalizePlateMediaMode(options.plateMediaMode);
  const useStock = shouldResolveStockPlates(plateMediaMode);
  const useAi = shouldAiGeneratePlates(plateMediaMode);

  if (
    !shouldAutoDevelopPlates({
      isHighFidelity: options.isHighFidelity,
      isLite,
      isQuickPreview: options.isQuickPreview,
    })
  ) {
    return {
      content,
      coverUrl: existingCoverUrl || undefined,
      bakedPlateCount: 0,
      bakedCover: false,
      failures: [],
    };
  }

  const next: ZineContent = {
    ...content,
    pages: (content.pages || []).map((page) => ({ ...page })),
  };
  const failures: string[] = [];
  let coverUrl = existingCoverUrl || undefined;
  let bakedCover = false;

  const heroPrompt =
    next.hero_image_prompt ||
    next.header_image_prompt ||
    next.headlines?.[0] ||
    next.title;

  const shouldBakeCover = !coverUrl && Boolean(heroPrompt);

  if (shouldBakeCover) {
    if (plateMediaMode === "references-only") {
      // Honest skip — no synthetic cover without a user reference.
    } else if (useStock) {
      try {
        const stock = await resolveZinePlateStock(heroPrompt);
        if (stock?.imageUrl) {
          coverUrl = stock.imageUrl;
          next.hero_image_url = stock.imageUrl;
          next.meta = {
            ...next.meta,
            heroStockAttribution: stock.attribution,
            heroStockSourceUrl: stock.sourceUrl,
          };
          bakedCover = true;
        } else {
          failures.push("cover: no stock photo matched (photography-first)");
        }
      } catch (error) {
        failures.push(
          `cover: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else if (useAi) {
      try {
        const raw = await generateZineImage(
          heroPrompt,
          "16:9",
          "2K",
          profile,
          Boolean(isLite),
          apiKey,
          artifacts,
          treatmentId,
        );
        coverUrl = (await persistImage(ownerUid, raw, "zines/hi-fi/hero")) || undefined;
        if (coverUrl) {
          next.hero_image_url = coverUrl;
          bakedCover = true;
        } else {
          failures.push("cover: storage upload failed (data URLs are not written to Firestore)");
        }
      } catch (error) {
        failures.push(`cover: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const pages = next.pages || [];
  if (pages.length > MAX_BAKE_PLATES) {
    failures.push(`plates: baking first ${MAX_BAKE_PLATES} of ${pages.length} pages`);
  }
  const bakeJobs = pages
    .slice(0, MAX_BAKE_PLATES)
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => !page.image_url && Boolean(page.imagePrompt));
  const isMobile =
    options.isMobile ??
    (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const poolConcurrency = resolvePlateConcurrency(concurrency, isMobile);
  await mapPool(bakeJobs, poolConcurrency, async ({ page, index }) => {
    if (page.image_url) return;
    const prompt = page.imagePrompt || next.visual_plates?.[index] || page.headline;
    if (!prompt) {
      failures.push(`plate ${index + 1}: missing prompt`);
      return;
    }
    if (plateMediaMode === "references-only") {
      return;
    }
    if (useStock) {
      try {
        const stock = await resolveZinePlateStock(prompt);
        if (!stock?.imageUrl) {
          failures.push(`plate ${index + 1}: no stock photo matched`);
          return;
        }
        pages[index] = {
          ...page,
          image_url: stock.imageUrl,
          originalMediaUrl: stock.imageUrl,
          plateMediaOrigin: "unsplash",
          stockAttribution: stock.attribution,
          stockPhotographer: stock.photographer,
          stockSourceUrl: stock.sourceUrl,
          altText: page.altText || page.headline,
        };
        return;
      } catch (error) {
        failures.push(
          `plate ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }
    }
    if (!useAi) return;
    try {
      const raw = await generateZineImage(
        prompt,
        "3:4",
        "2K",
        profile,
        Boolean(isLite),
        apiKey,
        artifacts,
        treatmentId,
      );
      const url = await persistImage(ownerUid, raw, `zines/hi-fi/page_${index}`);
      if (!url) {
        failures.push(`plate ${index + 1}: storage upload failed (data URLs are not written to Firestore)`);
        return;
      }
      pages[index] = {
        ...page,
        image_url: url,
        originalMediaUrl: page.originalMediaUrl || url,
        plateMediaOrigin: "generated",
      };
    } catch (error) {
      failures.push(`plate ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  next.pages = pages;
  const bakedPlateCount = pages.filter((p) => Boolean(p.image_url)).length;

  return { content: next, coverUrl, bakedPlateCount, bakedCover, failures };
}

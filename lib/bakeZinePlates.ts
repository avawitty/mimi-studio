import type { MediaFile, ZineContent } from "../types";
import { generateZineImage } from "../services/geminiService";
import { archiveManager } from "../services/archiveManager";
import { shouldAutoDevelopPlates } from "./zineSpreadLayout";

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
  /** Limit concurrent image jobs (default 2). */
  concurrency?: number;
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

async function persistImage(
  ownerUid: string | undefined,
  image: string,
  pathPrefix: string,
): Promise<string> {
  if (!ownerUid || !image.startsWith("data:")) return image;
  try {
    return await archiveManager.uploadMedia(ownerUid, image, pathPrefix);
  } catch (error) {
    console.warn("MIMI // bakeZinePlates: upload failed, keeping data URL", error);
    return image;
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
    concurrency = 2,
  } = options;

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

  if (!coverUrl && heroPrompt) {
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
      coverUrl = await persistImage(ownerUid, raw, "zines/hi-fi/hero");
      next.hero_image_url = coverUrl;
      bakedCover = true;
    } catch (error) {
      failures.push(`cover: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const pages = next.pages || [];
  const bakeJobs = pages.map((page, index) => ({ page, index }));
  await mapPool(bakeJobs, concurrency, async ({ page, index }) => {
    if (page.image_url) return;
    const prompt = page.imagePrompt || next.visual_plates?.[index] || page.headline;
    if (!prompt) {
      failures.push(`plate ${index + 1}: missing prompt`);
      return;
    }
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
      pages[index] = {
        ...page,
        image_url: url,
        originalMediaUrl: page.originalMediaUrl || url,
      };
    } catch (error) {
      failures.push(`plate ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  next.pages = pages;
  const bakedPlateCount = pages.filter((p) => Boolean(p.image_url)).length;

  return { content: next, coverUrl, bakedPlateCount, bakedCover, failures };
}

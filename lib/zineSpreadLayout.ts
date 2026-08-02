import type {
  EditorElement,
  ToneTag,
  ZineContent,
  ZineIssueMode,
  ZinePage,
  ZinePageSpec,
} from "../types";
import { editorAssetUrl } from "./zine/zinePerformance";

export type { ZineIssueMode } from "../types";

const HOUSE_SERIF = "Cormorant Garamond";

function stableToken(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function elementId(prefix: string, page: ZinePageSpec): string {
  const seed = [
    page.id || "",
    page.pageNumber,
    page.headline,
    page.bodyCopy,
    prefix,
  ].join(":");
  return `${prefix}_${stableToken(seed)}`;
}

/** True when a page carries a composed freeform layout. */
export function pageHasCustomLayout(page: ZinePageSpec | ZinePage | undefined | null): boolean {
  if (!page?.customLayout?.elements) return false;
  return page.customLayout.elements.length > 0;
}

/** Map a persisted page into the editor's ZinePage shape. */
export function toEditableZinePage(page: ZinePageSpec, fallbackImage?: string | null): ZinePage {
  const image = editorAssetUrl(page) || fallbackImage || undefined;
  return {
    ...page,
    image_url: page.image_url || image,
    originalMediaUrl: page.originalMediaUrl || image,
  };
}

/**
 * Seed absolute-layout elements from page copy/media when no customLayout exists.
 * Keeps house serif as the default display face (not Inter).
 */
export function buildDefaultSpreadElements(
  page: ZinePageSpec,
  options?: { fontFamily?: string; imageUrl?: string | null },
): EditorElement[] {
  const fontFamily = options?.fontFamily || HOUSE_SERIF;
  const imageUrl = options?.imageUrl || editorAssetUrl(page);
  const els: EditorElement[] = [];

  if (imageUrl) {
    els.push({
      id: elementId("img", page),
      type: "image",
      content: imageUrl,
      style: {
        top: 8,
        left: 8,
        width: 84,
        height: 52,
        zIndex: 0,
        opacity: 1,
        objectFit: "cover",
        filter: "none",
        rotation: 0,
      },
    });
  }

  if (page.headline) {
    els.push({
      id: elementId("headline", page),
      type: "text",
      content: page.headline,
      style: {
        top: imageUrl ? 64 : 18,
        left: 10,
        width: 80,
        zIndex: 10,
        fontSize: 2.4,
        fontFamily,
        color: "#0A0A0A",
        textAlign: "left",
        fontStyle: "italic",
        fontWeight: "700",
        opacity: 1,
        rotation: 0,
        lineHeight: 1.05,
      },
    });
  }

  if (page.bodyCopy) {
    els.push({
      id: elementId("body", page),
      type: "text",
      content: page.bodyCopy,
      style: {
        top: imageUrl ? 78 : 42,
        left: 10,
        width: 78,
        zIndex: 8,
        fontSize: 0.95,
        fontFamily,
        color: "#0A0A0A",
        textAlign: "left",
        fontStyle: "normal",
        fontWeight: "400",
        opacity: 0.85,
        rotation: 0,
        lineHeight: 1.45,
      },
    });
  }

  return els;
}

/** Resolve issue mode for plate grammar variants. */
export function resolveIssueMode(mode: string | undefined | null): ZineIssueMode {
  switch (mode) {
    case "research":
    case "seasonal":
    case "oracle":
    case "editorial":
      return mode;
    default:
      return "editorial";
  }
}

/** Layout class hints for default (non-custom) plate spreads by mode. */
export function plateGrammarClass(mode: ZineIssueMode, index: number): string {
  switch (mode) {
    case "research":
      return "zine-plate--research flex-col";
    case "seasonal":
      return index % 2 === 0
        ? "zine-plate--seasonal flex-col md:flex-row"
        : "zine-plate--seasonal flex-col md:flex-row-reverse";
    case "oracle":
      return "zine-plate--oracle flex-col md:flex-row";
    case "editorial":
      return index % 2 === 0
        ? "zine-plate--editorial flex-col md:flex-row"
        : "zine-plate--editorial flex-col md:flex-row-reverse";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Whether Visualizer should auto-develop plates for this issue tier. */
export function shouldAutoDevelopPlates(meta: {
  isHighFidelity?: boolean;
  isLite?: boolean;
  isQuickPreview?: boolean;
}): boolean {
  return Boolean(meta.isHighFidelity && !meta.isLite && !meta.isQuickPreview);
}

export function defaultEditorTone(tone: ToneTag | string | undefined): ToneTag {
  return (tone as ToneTag) || "editorial";
}

/** Reconstruct pages[] from pagesJson when list/fetch payloads omit them. */
export function hydrateZineContentPages<T extends { content?: ZineContent }>(zine: T): T {
  const content = zine.content;
  if (!content) return zine;
  if (content.pages?.length) return zine;
  if (!content.pagesJson) return zine;
  try {
    const pages = JSON.parse(content.pagesJson);
    if (!Array.isArray(pages)) return zine;
    return {
      ...zine,
      content: {
        ...content,
        pages,
      },
    };
  } catch {
    return zine;
  }
}

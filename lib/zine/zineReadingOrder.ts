import type { EditorElement, ZinePageSpec } from "../../types";

export interface ReadingOrderValidation {
  valid: boolean;
  duplicateIds: string[];
  missingElementIds: string[];
  omittedElementIds: string[];
}

function visualOrder(elements: EditorElement[]): EditorElement[] {
  return [...elements].sort((left, right) => {
    const topDelta = left.style.top - right.style.top;
    if (Math.abs(topDelta) > 0.5) return topDelta;
    const leftDelta = left.style.left - right.style.left;
    if (Math.abs(leftDelta) > 0.5) return leftDelta;
    const zDelta = (left.style.zIndex || 0) - (right.style.zIndex || 0);
    if (zDelta !== 0) return zDelta;
    return left.id.localeCompare(right.id);
  });
}

export function validateZineReadingOrder(
  page: ZinePageSpec,
): ReadingOrderValidation {
  const elements = page.customLayout?.elements || [];
  const readingOrder = page.customLayout?.readingOrder;
  if (!readingOrder) {
    return {
      valid: true,
      duplicateIds: [],
      missingElementIds: [],
      omittedElementIds: [],
    };
  }

  const elementIds = new Set(elements.map((element) => element.id));
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  const missingElementIds: string[] = [];

  readingOrder.forEach((id) => {
    if (seen.has(id)) duplicateIds.push(id);
    seen.add(id);
    if (!elementIds.has(id)) missingElementIds.push(id);
  });

  const omittedElementIds = elements
    .map((element) => element.id)
    .filter((id) => !seen.has(id));

  return {
    valid:
      duplicateIds.length === 0 &&
      missingElementIds.length === 0 &&
      omittedElementIds.length === 0,
    duplicateIds: [...new Set(duplicateIds)],
    missingElementIds: [...new Set(missingElementIds)],
    omittedElementIds,
  };
}

export function resolveZineReadingOrder(page: ZinePageSpec): string[] {
  const elements = page.customLayout?.elements || [];
  const elementIds = new Set(elements.map((element) => element.id));
  const requested = page.customLayout?.readingOrder || [];
  const seen = new Set<string>();
  const resolved: string[] = [];

  requested.forEach((id) => {
    if (!elementIds.has(id) || seen.has(id)) return;
    seen.add(id);
    resolved.push(id);
  });

  visualOrder(elements).forEach((element) => {
    if (seen.has(element.id)) return;
    seen.add(element.id);
    resolved.push(element.id);
  });

  return resolved;
}

export function elementsInReadingOrder(page: ZinePageSpec): EditorElement[] {
  const elements = page.customLayout?.elements || [];
  const byId = new Map(elements.map((element) => [element.id, element]));
  return resolveZineReadingOrder(page)
    .map((id) => byId.get(id))
    .filter((element): element is EditorElement => Boolean(element));
}

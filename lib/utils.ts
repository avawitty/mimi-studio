import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Coerce model/API output that may be string | string[] | unknown into a display string.
 * Arrays are joined; nullish becomes "".
 */
export function coerceToString(value: unknown, joinWith = ", "): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceToString(item, joinWith))
      .filter(Boolean)
      .join(joinWith);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** @deprecated Prefer coerceToString — kept as an alias for existing call sites. */
export const coerceToDisplayString = coerceToString;

/**
 * Coerce model/API list-like fields into string[].
 * Accepts string[], CSV/newline strings, scalars, or nested arrays.
 */
export function coerceToStringArray(
  value: unknown,
  splitOn: string | RegExp = /,\s*/,
): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => coerceToStringArray(item, splitOn))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Prefer newline splits when the model returned a bullet/line list.
    if (/\n/.test(trimmed) && splitOn.toString() === /,\s*/.toString()) {
      return trimmed
        .split(/\n+/)
        .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(Boolean);
    }
    return trimmed
      .split(splitOn)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  return [];
}

/** Alias for coerceToStringArray. */
export const asStringArray = coerceToStringArray;

/** Safe split for AI/API fields that may already be an array. */
export function safeSplit(
  value: unknown,
  separator: string | RegExp = /,\s*/,
): string[] {
  return coerceToStringArray(value, separator);
}

/** Split inferred anchors whether the model returned a CSV string or a string[]. */
export function splitInferredAnchors(value: unknown): string[] {
  return coerceToStringArray(value, /,\s*/);
}

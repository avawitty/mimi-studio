import { getCreatorFeedPath } from "../lib/publicBaseUrl";

/** Browser-safe absolute feed URL (uses current origin when available). */
export const resolveCreatorFeedUrl = (handle: string): string => {
  const path = getCreatorFeedPath(handle);
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `https://www.mimi.you${path}`;
};

export const resolveCreatorProfilePath = (handle: string): string => {
  const normalized = String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  return `/u/${encodeURIComponent(normalized)}`;
};

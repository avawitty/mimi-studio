/**
 * useUrlIngest — hook that isolates the URL-import concern in InputStudio.
 *
 * Responsibilities:
 *  • Append a dragged / pasted URL to the source-material field (handleUrlDrop).
 *  • Optionally fetch structured page metadata via the hardened ingest-client API
 *    (fetchUrlMeta) — ready for callers that want richer import (title, hero image, …).
 *
 * No state is owned here. All mutations flow through the callbacks supplied by the
 * parent so there is no risk of mismatched React state batching.
 */

import { useCallback } from "react";

// ---------------------------------------------------------------------------
// Shared metadata shape returned by /api/ingest-client
// ---------------------------------------------------------------------------

export interface UrlIngestMeta {
  url: string;
  title: string;
  description: string;
  heroImage: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseUrlIngestParams {
  /**
   * Called when a URL is dropped onto the workspace.
   * Typically appends the URL string to the source-material textarea value.
   */
  onUrlAppend: (url: string) => void;
}

export function useUrlIngest({ onUrlAppend }: UseUrlIngestParams) {
  /**
   * Append a URL string to the source-material input.
   * Used by drag-and-drop handlers in the outer container.
   */
  const handleUrlDrop = useCallback(
    (url: string) => {
      onUrlAppend(url);
    },
    [onUrlAppend],
  );

  /**
   * Fetch structured page metadata for the given URL via the ingest-client API.
   * The API enforces SSRF guards, content-type checks, and size limits.
   * Throws on non-OK responses with the server's error message.
   */
  const fetchUrlMeta = useCallback(async (url: string): Promise<UrlIngestMeta> => {
    const res = await fetch("/api/ingest-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data: unknown = await res.json();
    if (!res.ok) {
      const err = data as Record<string, unknown>;
      const msg =
        typeof err?.error === "string"
          ? err.error
          : typeof (err?.error as Record<string, unknown>)?.message === "string"
            ? String((err.error as Record<string, unknown>).message)
            : "URL ingest failed";
      throw new Error(msg);
    }
    return data as UrlIngestMeta;
  }, []);

  return { handleUrlDrop, fetchUrlMeta };
}

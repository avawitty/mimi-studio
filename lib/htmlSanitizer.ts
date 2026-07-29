import DOMPurify from "dompurify";

type HtmlSanitizerProfile = "html" | "svg";

export function sanitizeHtml(dirty: string, profile: HtmlSanitizerProfile = "html"): string {
  if (!dirty) return "";

  // This app is Vite + client-side React, but keep a safe guard for any
  // accidental server-side evaluation.
  if (typeof window === "undefined") return dirty;

  const config =
    profile === "svg"
      ? {
          USE_PROFILES: { svg: true },
        }
      : {
          USE_PROFILES: { html: true },
        };

  return DOMPurify.sanitize(dirty, config);
}


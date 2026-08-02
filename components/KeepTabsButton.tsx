import React, { useEffect, useState } from "react";
import { Check, Copy, FolderOpen } from "lucide-react";
import { resolveCreatorFeedUrl } from "../lib/creatorFeedClient";

type KeepTabsButtonProps = {
  handle: string;
  /** Compact mono dossier stamp vs fuller manila-file block */
  variant?: "stamp" | "panel";
  className?: string;
};

/**
 * "Keep Tabs" — subscribe-once RSS for a creator's public issues.
 * Manila-folder / evidence-file aesthetic; copies the feed URL.
 */
export const KeepTabsButton: React.FC<KeepTabsButtonProps> = ({
  handle,
  variant = "stamp",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const feedUrl = resolveCreatorFeedUrl(handle);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    const normalized = String(handle || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    if (!normalized || typeof document === "undefined") return;

    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-mimi-keep-tabs="1"]',
    );
    const link = existing || document.createElement("link");
    link.setAttribute("data-mimi-keep-tabs", "1");
    link.rel = "alternate";
    link.type = "application/rss+xml";
    link.title = `@${normalized} · Keep Tabs`;
    link.href = feedUrl;
    if (!existing) document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [handle, feedUrl]);

  const copyFeed = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: `Keep Tabs · feed copied for @${handle}`,
            type: "success",
          },
        }),
      );
    } catch {
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: "Could not copy feed URL. Select it manually.",
            type: "error",
          },
        }),
      );
    }
  };

  if (variant === "panel") {
    return (
      <div
        className={`border border-nous-border/35 bg-[#F7F3EA]/80 dark:bg-white/[0.03] p-4 text-left ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 border border-nous-border/40 bg-[#E8DFC8]/60 dark:bg-white/5 p-2">
            <FolderOpen size={14} className="text-nous-subtle" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-nous-subtle">
              Public record · ongoing
            </p>
            <h3 className="font-serif text-lg mt-1">Keep Tabs</h3>
            <p className="font-serif italic text-sm text-nous-subtle mt-1 leading-relaxed">
              New public issues appear in this file when @{handle} publishes.
            </p>
            <p className="font-mono text-[9px] text-nous-subtle mt-3 break-all select-all">
              {feedUrl}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyFeed()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-nous-border/50 font-mono text-[8px] uppercase tracking-widest hover:bg-nous-text hover:text-nous-base transition-colors"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Filed" : "Copy feed"}
              </button>
              <a
                href={feedUrl}
                type="application/rss+xml"
                className="inline-flex items-center px-3 py-1.5 border border-dashed border-nous-border/40 font-mono text-[8px] uppercase tracking-widest text-nous-subtle hover:text-nous-text transition-colors"
              >
                Open feed
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void copyFeed()}
      title={feedUrl}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-nous-border/40 font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle hover:text-nous-text hover:border-nous-text/30 transition-colors ${className}`}
    >
      <FolderOpen size={11} strokeWidth={1.5} />
      {copied ? "Tabs filed" : "Keep Tabs"}
    </button>
  );
};

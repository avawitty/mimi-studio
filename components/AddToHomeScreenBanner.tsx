// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Smartphone, X } from "lucide-react";

type Platform = "ios" | "android" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
  if (isStandalone) return null; // already installed
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export const AddToHomeScreenBanner: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("pwa-banner-dismissed") === "1";
    if (wasDismissed) {
      setDismissed(true);
      return;
    }
    setPlatform(detectPlatform());
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
  };

  if (dismissed || !platform || platform === "desktop") return null;

  return (
    <div className="w-full border border-nous-border bg-nous-base/40 p-4 font-sans text-[10px] text-nous-text relative">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-nous-subtle hover:text-nous-text transition-colors"
      >
        <X size={12} />
      </button>

      <div className="flex items-start gap-3 pr-4">
        <div className="shrink-0 mt-0.5">
          <Smartphone size={14} className="text-nous-subtle" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="uppercase tracking-widest font-mono text-[9px] text-nous-subtle">
            Add to Home Screen
          </span>
          {platform === "ios" && (
            <p className="leading-relaxed text-nous-text">
              Tap the{" "}
              <span className="inline-flex items-center gap-0.5 font-mono text-[9px] border border-nous-border px-1 py-0.5">
                Share
              </span>{" "}
              icon in Safari, then select{" "}
              <span className="font-mono text-[9px]">
                &ldquo;Add to Home Screen&rdquo;
              </span>{" "}
              to install Mimi as a full-screen app.
            </p>
          )}
          {platform === "android" && (
            <p className="leading-relaxed text-nous-text">
              Tap the{" "}
              <span className="inline-flex items-center gap-0.5 font-mono text-[9px] border border-nous-border px-1 py-0.5">
                &nbsp;&bull;&bull;&bull;&nbsp;
              </span>{" "}
              menu in Chrome, then choose{" "}
              <span className="font-mono text-[9px]">
                &ldquo;Add to Home screen&rdquo;
              </span>{" "}
              to install Mimi as a standalone app.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

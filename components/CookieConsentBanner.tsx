import React, { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import {
  hasCookieConsentChoice,
  setCookieConsent,
} from "../lib/cookieConsent";

export const CookieConsentBanner: React.FC<{ suppressed?: boolean }> = ({
  suppressed = false,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (suppressed) {
      setVisible(false);
      return;
    }
    setVisible(!hasCookieConsentChoice());
  }, [suppressed]);

  if (!visible) return null;

  const acceptAll = () => {
    setCookieConsent("all");
    setVisible(false);
  };

  const essentialOnly = () => {
    setCookieConsent("essential");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-[20000] p-4 md:p-6 pointer-events-none"
    >
      <div className="max-w-3xl mx-auto pointer-events-auto bg-[#fdfdfb] border border-black/15 shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-5 md:p-6 text-[#222]">
        <div className="flex gap-3 items-start mb-4">
          <Cookie size={18} className="shrink-0 mt-0.5 text-[#555]" />
          <div>
            <p className="font-serif italic text-lg text-black mb-1">
              Cookies & storage on mimi.you
            </p>
            <p className="font-sans text-sm text-[#444] leading-relaxed">
              We use essential cookies and local storage for sign-in (
              <code className="font-mono text-[11px]">__session</code>
              ), security, and saving your studio state. Optional analytics and
              affiliate measurement load only if you accept. Auth always works
              with essential-only.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <a
            href="/privacy#cookies"
            className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#555] px-4 py-2.5 border border-black/10 hover:border-black/30 transition-colors text-center"
          >
            Learn more
          </a>
          <button
            type="button"
            onClick={essentialOnly}
            className="font-mono text-[10px] uppercase tracking-widest font-bold text-black px-4 py-2.5 border border-black/20 hover:bg-black/5 transition-colors"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="font-mono text-[10px] uppercase tracking-widest font-bold text-white bg-black px-5 py-2.5 hover:bg-black/85 transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
};

/** Dev helper: reopen banner after clearing consent in localStorage. */
export function resetCookieConsentForTesting(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("mimi_cookie_consent");
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { mimiResetCookieConsent?: () => void }).mimiResetCookieConsent =
    resetCookieConsentForTesting;
}

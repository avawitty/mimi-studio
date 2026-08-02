import React from "react";
import { ArrowUpRight } from "lucide-react";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { canonicalYouOrigin } from "../lib/siteHost";

interface FishLandingPageProps {
  navigate: (path: string) => void;
}

/** Public landing when visiting mimi.fish/ with no plate. */
export const FishLandingPage: React.FC<FishLandingPageProps> = ({ navigate }) => (
  <div
    className="min-h-screen flex flex-col items-center justify-center px-6 text-[#0c1f24]"
    style={{
      background:
        "radial-gradient(ellipse at 20% 10%, #c8e4e8 0%, #e8f2f0 42%, #f4f7f5 100%)",
    }}
  >
    <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-[#2a6b74]/80 mb-6">
      mimi.fish
    </p>
    <h1 className="font-serif text-4xl md:text-5xl mb-4 text-center">Pass the plate</h1>
    <p className="font-serif italic text-lg text-[#3d5a5e] max-w-md text-center mb-8 leading-relaxed">
      Share links land here — public zine plates built for forwarding, not for the studio chrome.
      Identity stays on mimi.you.
    </p>
    <div className="flex flex-wrap gap-3 justify-center">
      <button
        type="button"
        onClick={() => navigate("/the-press")}
        className="px-6 py-3 border border-[#1a4a52]/35 text-[#0c1f24] font-mono text-[9px] uppercase tracking-widest bg-white/40 hover:bg-white/70 transition-colors"
      >
        Open The Press
      </button>
      <a
        href={canonicalYouOrigin()}
        className="px-6 py-3 border border-[#0c1f24]/15 font-mono text-[9px] uppercase tracking-widest inline-flex items-center gap-1 hover:bg-white/40 transition-colors"
      >
        mimi.you <ArrowUpRight size={12} />
      </a>
    </div>
    <p className="font-mono text-[8px] uppercase tracking-widest text-[#6a858a] mt-10 text-center">
      Plates · mimi.fish/s/:id
      <br />
      Shelves · mimi.fish/u/:handle
    </p>
    <CookieConsentBanner />
  </div>
);

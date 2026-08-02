import React from "react";
import { ArrowUpRight } from "lucide-react";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { canonicalYouOrigin } from "../lib/siteHost";

interface RipLandingPageProps {
  navigate: (path: string) => void;
}

/** Public landing when visiting mimi.rip/ with no handle. */
export const RipLandingPage: React.FC<RipLandingPageProps> = ({ navigate }) => (
  <div
    className="min-h-screen flex flex-col items-center justify-center px-6 text-stone-100"
    style={{
      background:
        "radial-gradient(ellipse at 30% 0%, #1a0f14 0%, #0a0a0c 50%, #050506 100%)",
    }}
  >
    <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-rose-300/70 mb-6">
      mimi.rip
    </p>
    <h1 className="font-serif text-4xl md:text-5xl mb-4 text-center">Inverse taste</h1>
    <p className="font-serif italic text-lg text-stone-400 max-w-md text-center mb-8 leading-relaxed">
      A dark mirror of the Taste Graph — refusals, blind spots, and controlled inversions.
      Not identity. Canonical presence stays on mimi.you.
    </p>
    <div className="flex flex-wrap gap-3 justify-center">
      <button
        type="button"
        onClick={() => navigate("/rip")}
        className="px-6 py-3 border border-rose-400/40 text-rose-100 font-mono text-[9px] uppercase tracking-widest"
      >
        Open Rip chamber
      </button>
      <a
        href={canonicalYouOrigin()}
        className="px-6 py-3 border border-white/20 font-mono text-[9px] uppercase tracking-widest inline-flex items-center gap-1 hover:bg-white/5"
      >
        mimi.you <ArrowUpRight size={12} />
      </a>
    </div>
    <p className="font-mono text-[8px] uppercase tracking-widest text-stone-600 mt-10">
      Public readings live at mimi.rip/u/:handle when published
    </p>
    <CookieConsentBanner />
  </div>
);

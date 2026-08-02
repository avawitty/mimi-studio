import React, { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { loadPublicProfileShowcase } from "../services/publicShowcaseService";
import type { PublicProfileShowcase } from "../services/publicShowcaseService";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { canonicalYouOrigin, getFishShareUrl } from "../lib/siteHost";

interface FishShelfPageProps {
  handle: string;
  navigate: (path: string) => void;
}

/** Attention shelf: a creator's public plates, linking to mimi.fish/s/:id. */
export const FishShelfPage: React.FC<FishShelfPageProps> = ({ handle, navigate }) => {
  const [data, setData] = useState<PublicProfileShowcase | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void loadPublicProfileShowcase(handle).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (data === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, #c8e4e8 0%, #e8f2f0 42%, #f4f7f5 100%)",
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#6a858a]">
          Loading shelf…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-[#0c1f24]"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, #c8e4e8 0%, #e8f2f0 42%, #f4f7f5 100%)",
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#2a6b74]/80 mb-4">
          mimi.fish
        </p>
        <h1 className="font-serif text-3xl mb-4">@{handle}</h1>
        <p className="text-sm text-[#3d5a5e] mb-8 text-center max-w-md">
          No public plates on this shelf yet. Canonical identity lives on mimi.you.
        </p>
        <a
          href={`${canonicalYouOrigin()}/u/${encodeURIComponent(handle)}`}
          className="font-mono text-[9px] uppercase tracking-widest px-6 py-3 border border-[#1a4a52]/35 inline-flex items-center gap-1"
        >
          Open mimi.you <ArrowUpRight size={12} />
        </a>
        <CookieConsentBanner />
      </div>
    );
  }

  const { profile, zines } = data;
  const publicHandle = profile.handle || handle;

  return (
    <div
      className="min-h-screen text-[#0c1f24]"
      style={{
        background:
          "radial-gradient(ellipse at 20% 10%, #c8e4e8 0%, #e8f2f0 42%, #f4f7f5 100%)",
      }}
    >
      <header className="px-6 py-12 md:py-16 border-b border-[#1a4a52]/12">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-[#2a6b74]/80 mb-3">
            mimi.fish · attention shelf
          </p>
          <h1 className="font-serif text-4xl md:text-5xl mb-3">@{publicHandle}</h1>
          <p className="font-serif italic text-lg text-[#3d5a5e] max-w-xl">
            Public plates ready to pass. Tap one to open the share surface.
          </p>
          <a
            href={`${canonicalYouOrigin()}/u/${encodeURIComponent(publicHandle)}`}
            className="inline-flex items-center gap-1 mt-6 font-mono text-[8px] uppercase tracking-widest text-[#2a6b74] hover:underline"
          >
            Full showcase on mimi.you <ArrowUpRight size={11} />
          </a>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12">
        {zines.length === 0 ? (
          <div className="border border-dashed border-[#1a4a52]/25 p-12 text-center bg-white/30">
            <p className="font-serif italic text-[#3d5a5e]">No public plates published yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zines.map((zine) => (
              <a
                key={zine.id}
                href={getFishShareUrl(zine.id)}
                className="text-left group border border-[#1a4a52]/18 hover:border-[#1a4a52]/40 transition-colors overflow-hidden bg-white/50 block"
              >
                <div className="aspect-[3/4] bg-[#d9ecee] overflow-hidden relative">
                  {zine.coverImageUrl ? (
                    <img
                      src={zine.coverImageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif italic text-[#3d5a5e] p-6 text-center">
                      {zine.title || "Untitled"}
                    </div>
                  )}
                  <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0c1f24] text-[#e8f2f0] p-1.5">
                    <ArrowUpRight size={12} />
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-serif text-lg leading-tight line-clamp-2">
                    {zine.title || "Untitled Manifestation"}
                  </p>
                  {zine.concept ? (
                    <p className="text-xs text-[#3d5a5e] mt-2 line-clamp-2">{zine.concept}</p>
                  ) : null}
                  <p className="font-mono text-[7px] uppercase tracking-widest text-[#6a858a] mt-3">
                    mimi.fish/s/{zine.id.slice(0, 8)}…
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-[#1a4a52]/12 px-6 py-8 text-center">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="font-mono text-[8px] uppercase tracking-[0.35em] text-[#6a858a] hover:text-[#0c1f24]"
        >
          mimi.fish
        </button>
      </footer>
      <CookieConsentBanner />
    </div>
  );
};

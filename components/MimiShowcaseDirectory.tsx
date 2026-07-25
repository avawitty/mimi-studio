import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ZineMetadata } from "../types";
import { fetchFeaturedPublicZines } from "../services/publicShowcaseService";
import { CookieConsentBanner } from "./CookieConsentBanner";

interface MimiShowcaseDirectoryProps {
  navigate: (path: string) => void;
}

export const MimiShowcaseDirectory: React.FC<MimiShowcaseDirectoryProps> = ({ navigate }) => {
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchFeaturedPublicZines(30).then((items) => {
      setZines(items);
      setLoading(false);
    });
  }, []);

  const creators = useMemo(() => {
    const map = new Map<string, { handle: string; count: number; cover?: string }>();
    for (const zine of zines) {
      const handle = (zine.userHandle || "creator").toLowerCase();
      const existing = map.get(handle);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(handle, {
          handle,
          count: 1,
          cover: zine.coverImageUrl,
        });
      }
    }
    return Array.from(map.values()).slice(0, 12);
  }, [zines]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0A0A0A] text-nous-text">
      <header className="border-b border-nous-border/20 px-6 py-14 md:py-20 max-w-6xl mx-auto">
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-nous-subtle mb-3">mimi.you</p>
        <h1 className="font-serif text-4xl md:text-6xl tracking-tight mb-4">Public Showcase</h1>
        <p className="text-sm text-nous-subtle max-w-2xl leading-relaxed">
          Featured editorial issues and creator cards — doll tokens and published zines only. Nothing
          private leaves the vault unless you publish it.
        </p>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12 border-b border-nous-border/15">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-6">
          Creators
        </h2>
        {creators.length === 0 && !loading ? (
          <p className="font-serif italic text-nous-subtle">No public creators indexed yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {creators.map((creator) => (
              <button
                key={creator.handle}
                type="button"
                onClick={() => navigate(`/u/${creator.handle}`)}
                className="text-left border border-nous-border/30 p-4 hover:border-nous-text/25 transition-colors"
              >
                <div className="aspect-square mb-3 bg-nous-base0/20 overflow-hidden">
                  {creator.cover ? (
                    <img src={creator.cover} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <p className="font-serif text-lg">@{creator.handle}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-1">
                  {creator.count} public issue{creator.count === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-6">
          Featured issues
        </h2>
        {loading ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Loading…</p>
        ) : zines.length === 0 ? (
          <p className="font-serif italic text-nous-subtle">No public zines yet. Be the first in Studio.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zines.map((zine) => (
              <button
                key={zine.id}
                type="button"
                onClick={() => navigate(`/zine/${zine.id}`)}
                className="text-left group border border-nous-border/30 overflow-hidden hover:border-nous-text/25"
              >
                <div className="aspect-[3/4] bg-nous-base0/15 relative overflow-hidden">
                  {zine.coverImageUrl ? (
                    <img
                      src={zine.coverImageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif italic text-nous-subtle p-6 text-center">
                      {zine.title || "Untitled"}
                    </div>
                  )}
                  <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-nous-text text-nous-base p-1.5">
                    <ArrowUpRight size={12} />
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-serif text-lg line-clamp-2">{zine.title || "Untitled"}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-2">
                    @{zine.userHandle || "creator"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="px-6 py-10 text-center border-t border-nous-border/15">
        <button
          type="button"
          onClick={() => navigate("/studio")}
          className="font-mono text-[9px] uppercase tracking-[0.35em] px-6 py-3 border border-nous-border/40"
        >
          Open Studio
        </button>
      </footer>
      <CookieConsentBanner />
    </div>
  );
};

import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ZineMetadata } from "../types";
import {
  fetchFeaturedPublicZines,
  loadPublicProfilesByHandles,
  type PublicProfileShowcase,
} from "../services/publicShowcaseService";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { MimiWordmark, PublicField, PublicProfileCardCompact } from "./public-face";

interface MimiShowcaseDirectoryProps {
  navigate: (path: string) => void;
}

export const MimiShowcaseDirectory: React.FC<MimiShowcaseDirectoryProps> = ({ navigate }) => {
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [profiles, setProfiles] = useState<Map<string, PublicProfileShowcase>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchFeaturedPublicZines(30)
      .then((items) => {
        if (!cancelled) {
          setZines(items);
          setLoadError(null);
        }
      })
      .catch((err: unknown) => {
        console.warn("MIMI // Showcase directory load failed:", err);
        if (!cancelled) {
          setZines([]);
          setLoadError("Could not load the public showcase. Try again shortly.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const creators = useMemo(() => {
    const map = new Map<string, { handle: string; count: number }>();
    for (const zine of zines) {
      const handle = (zine.userHandle || "creator").toLowerCase();
      const existing = map.get(handle);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(handle, { handle, count: 1 });
      }
    }
    return Array.from(map.values()).slice(0, 12);
  }, [zines]);

  useEffect(() => {
    if (creators.length === 0) {
      setProfiles(new Map());
      return;
    }
    let cancelled = false;
    void loadPublicProfilesByHandles(creators.map((creator) => creator.handle)).then((loaded) => {
      if (!cancelled) setProfiles(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [creators]);

  return (
    <PublicField bleed className="min-h-screen text-[var(--mimi-ink,#0a0a0a)]">
      <header className="border-b border-[var(--mimi-hairline,rgba(0,0,0,0.12))] px-6 py-14 md:py-20 max-w-6xl mx-auto">
        <MimiWordmark size="sm" className="mb-4" />
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-[var(--mimi-stone,#78716c)] mb-3">
          mimi.you
        </p>
        <h1 className="font-serif text-4xl md:text-6xl tracking-tight mb-4">Public Showcase</h1>
        <p className="text-sm text-[var(--mimi-stone,#78716c)] max-w-2xl leading-relaxed">
          Featured editorial issues and creator cards — doll tokens and published zines only. Nothing
          private leaves the vault unless you publish it.
        </p>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12 border-b border-[var(--mimi-hairline,rgba(0,0,0,0.12))]">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)] mb-6">
          Creators
        </h2>
        {loadError ? (
          <p className="font-serif italic text-[var(--mimi-stone,#78716c)]" role="alert">
            {loadError}
          </p>
        ) : creators.length === 0 && !loading ? (
          <p className="font-serif italic text-[var(--mimi-stone,#78716c)]">No public creators indexed yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creators.map((creator) => {
              const profileData = profiles.get(creator.handle);
              if (profileData) {
                return (
                  <PublicProfileCardCompact
                    key={creator.handle}
                    data={profileData}
                    issueCount={creator.count}
                    onSelect={() => navigate(`/u/${creator.handle}`)}
                  />
                );
              }

              return (
                <button
                  key={creator.handle}
                  type="button"
                  onClick={() => navigate(`/u/${creator.handle}`)}
                  className="text-left border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] p-4 hover:border-[var(--mimi-ink,#0a0a0a)]/25 transition-colors"
                >
                  <p className="font-serif text-lg">@{creator.handle}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)] mt-1">
                    {creator.count} public issue{creator.count === 1 ? "" : "s"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)] mb-6">
          Featured issues
        </h2>
        {loading ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
            Loading…
          </p>
        ) : loadError ? (
          <p className="font-serif italic text-[var(--mimi-stone,#78716c)]" role="alert">
            {loadError}
          </p>
        ) : zines.length === 0 ? (
          <p className="font-serif italic text-[var(--mimi-stone,#78716c)]">
            No public zines yet. Be the first in Studio.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zines.map((zine) => (
              <button
                key={zine.id}
                type="button"
                onClick={() => navigate(`/zine/${zine.id}`)}
                className="text-left group border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] overflow-hidden hover:border-[var(--mimi-ink,#0a0a0a)]/25"
              >
                <div className="aspect-[3/4] bg-[var(--mimi-stone,#78716c)]/10 relative overflow-hidden">
                  {zine.coverImageUrl ? (
                    <img
                      src={zine.coverImageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif italic text-[var(--mimi-stone,#78716c)] p-6 text-center">
                      {zine.title || "Untitled"}
                    </div>
                  )}
                  <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#ffffff)] p-1.5">
                    <ArrowUpRight size={12} />
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-serif text-lg line-clamp-2">{zine.title || "Untitled"}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)] mt-2">
                    @{zine.userHandle || "creator"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="px-6 py-10 text-center border-t border-[var(--mimi-hairline,rgba(0,0,0,0.12))]">
        <button
          type="button"
          onClick={() => navigate("/studio")}
          className="font-mono text-[9px] uppercase tracking-[0.35em] px-6 py-3 border border-[var(--mimi-hairline,rgba(0,0,0,0.12))]"
        >
          Open Studio
        </button>
      </footer>
      <CookieConsentBanner />
    </PublicField>
  );
};

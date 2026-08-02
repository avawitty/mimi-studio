import React, { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";
import type { PublicProfileShowcase } from "../services/publicShowcaseService";
import { loadPublicProfileShowcase } from "../services/publicShowcaseService";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { KeepTabsButton } from "./KeepTabsButton";

interface PublicShowcasePageProps {
  handle: string;
  navigate: (path: string) => void;
  isOwner?: boolean;
}

export const PublicShowcasePage: React.FC<PublicShowcasePageProps> = ({
  handle,
  navigate,
  isOwner,
}) => {
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] dark:bg-[#0A0A0A]">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-nous-subtle">Loading showcase…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] dark:bg-[#0A0A0A] px-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-nous-subtle mb-4">mimi.you</p>
        <h1 className="font-serif text-3xl text-nous-text mb-4">@{handle}</h1>
        <p className="text-sm text-nous-subtle mb-8 text-center max-w-md">
          This handle is not registered yet, or the creator has not published a public showcase.
        </p>
        <button
          type="button"
          onClick={() => navigate("/studio")}
          className="text-xs uppercase tracking-widest px-6 py-3 border border-nous-border/40"
        >
          Enter Mimi Studio
        </button>
        <CookieConsentBanner />
      </div>
    );
  }

  const { profile, showcase, zines } = data;
  const accent = showcase?.accentHex || "#8a8a7a";
  const publicHandle = profile.handle || handle;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0A0A0A] text-nous-text">
      <header
        className="border-b border-nous-border/20 px-6 py-12 md:py-16"
        style={{ borderBottomColor: `${accent}33` }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-nous-subtle mb-3">
              mimi.you · public showcase
            </p>
            <h1 className="font-serif text-4xl md:text-5xl mb-2">@{publicHandle}</h1>
            {showcase ? (
              <>
                <p className="font-serif italic text-lg text-nous-subtle max-w-xl">{showcase.philosophy}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mt-4">
                  {showcase.dollLabel}
                </p>
              </>
            ) : (
              <p className="text-sm text-nous-subtle max-w-lg">
                Editorial issues from this creator. Accept a likeness in Tailor to publish your doll token here.
              </p>
            )}
            <div className="mt-6">
              <KeepTabsButton handle={publicHandle} variant="stamp" />
            </div>
          </div>
          {showcase ? (
            <div
              className="shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-full border-2 flex flex-col items-center justify-center text-center p-4 shadow-[0_0_40px_rgba(0,0,0,0.06)]"
              style={{ borderColor: accent, backgroundColor: `${accent}18` }}
            >
              <Sparkles size={18} style={{ color: accent }} />
              <p className="font-mono text-[7px] uppercase tracking-widest mt-2 leading-tight">Active likeness</p>
            </div>
          ) : null}
        </div>
      </header>

      {showcase && (showcase.voiceAdjectives.length > 0 || showcase.motifCandidates.length > 0) ? (
        <section className="max-w-5xl mx-auto px-6 py-8 border-b border-nous-border/15">
          <div className="grid md:grid-cols-2 gap-8 text-sm">
            {showcase.voiceAdjectives.length > 0 ? (
              <div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">Voice</p>
                <p className="font-serif italic">{showcase.voiceAdjectives.join(" · ")}</p>
              </div>
            ) : null}
            {showcase.motifCandidates.length > 0 ? (
              <div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">Motifs</p>
                <p className="text-nous-subtle">{showcase.motifCandidates.join(" · ")}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-nous-subtle" />
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle">
              Featured issues
            </h2>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={() => navigate("/mimi-dolls")}
              className="font-mono text-[8px] uppercase tracking-widest border border-nous-border/40 px-3 py-1.5"
            >
              Manage doll
            </button>
          ) : null}
        </div>

        {zines.length === 0 ? (
          <div className="border border-dashed border-nous-border/35 p-12 text-center">
            <p className="font-serif italic text-nous-subtle">No public issues published yet.</p>
            {isOwner ? (
              <button
                type="button"
                onClick={() => navigate("/studio")}
                className="mt-6 font-mono text-[9px] uppercase tracking-widest px-5 py-2 border border-nous-border/50"
              >
                Create in Studio
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zines.map((zine) => (
              <button
                key={zine.id}
                type="button"
                onClick={() => navigate(`/zine/${zine.id}`)}
                className="text-left group border border-nous-border/30 hover:border-nous-text/25 transition-colors overflow-hidden bg-white/40 dark:bg-white/[0.02]"
              >
                <div className="aspect-[3/4] bg-nous-base0/20 overflow-hidden relative">
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
                  <p className="font-serif text-lg leading-tight line-clamp-2">
                    {zine.title || "Untitled Manifestation"}
                  </p>
                  {zine.concept ? (
                    <p className="text-xs text-nous-subtle mt-2 line-clamp-2">{zine.concept}</p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <KeepTabsButton handle={publicHandle} variant="panel" />
        {isOwner ? (
          <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-4">
            Publish an issue · it files here automatically
          </p>
        ) : null}
      </section>

      <footer className="border-t border-nous-border/15 px-6 py-8 text-center">
        <button
          type="button"
          onClick={() => navigate("/showcase")}
          className="font-mono text-[8px] uppercase tracking-[0.35em] text-nous-subtle hover:text-nous-text"
        >
          Browse all showcases on mimi.you
        </button>
      </footer>
      <CookieConsentBanner />
    </div>
  );
};

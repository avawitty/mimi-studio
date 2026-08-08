import React from "react";
import { ArrowUpRight, BookOpen, EyeOff, Sparkles } from "lucide-react";
import type { PublicProfileShowcase } from "../../services/publicShowcaseService";
import type { ZineMetadata } from "../../types";
import {
  buildPublicSignatureExcerpt,
  formatPublicLinkLabel,
  getPublicExternalLinks,
  hasPublishedRip,
  resolvePublicProfileIdentity,
} from "../../lib/publicProfileCard";
import { canonicalFishOrigin, canonicalRipOrigin } from "../../lib/siteHost";
import { KeepTabsButton } from "../KeepTabsButton";
import { ColumnRule } from "./ColumnRule";
import { MimiWordmark } from "./MimiWordmark";
import { PressMark } from "./PressMark";
import { PublicField } from "./PublicField";

export type PublicProfileCardProps = {
  data: PublicProfileShowcase;
  variant?: "full" | "compact";
  isOwner?: boolean;
  onNavigate: (path: string) => void;
  onZineSelect?: (zine: ZineMetadata) => void;
};

const PublicZineTile: React.FC<{
  zine: ZineMetadata;
  onSelect: () => void;
}> = ({ zine, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className="text-left group border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] hover:border-[var(--mimi-ink,#0a0a0a)]/25 transition-colors overflow-hidden bg-[var(--mimi-field,#ffffff)]/60"
  >
    <div className="aspect-[3/4] bg-[var(--mimi-stone,#78716c)]/10 overflow-hidden relative">
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
      <p className="font-serif text-lg leading-tight line-clamp-2 text-[var(--mimi-ink,#0a0a0a)]">
        {zine.title || "Untitled Manifestation"}
      </p>
      {zine.concept ? (
        <p className="text-xs text-[var(--mimi-stone,#78716c)] mt-2 line-clamp-2">{zine.concept}</p>
      ) : null}
    </div>
  </button>
);

/**
 * Canonical public creator card — identity, signature excerpt, optional rip teaser,
 * doll specimen, and published issues. Used on mimi.you /u/:handle.
 */
export const PublicProfileCard: React.FC<PublicProfileCardProps> = ({
  data,
  variant = "full",
  isOwner,
  onNavigate,
  onZineSelect,
}) => {
  const { profile, showcase, zines, publicRip } = data;
  const identity = resolvePublicProfileIdentity(profile, showcase);
  const signature = buildPublicSignatureExcerpt(profile, showcase);
  const ripPublished = hasPublishedRip(publicRip);
  const compact = variant === "compact";
  const publicHandle = identity.handle;
  const externalLinks = getPublicExternalLinks(profile);

  const handleZineSelect = (zine: ZineMetadata) => {
    if (onZineSelect) {
      onZineSelect(zine);
      return;
    }
    onNavigate(`/zine/${zine.id}`);
  };

  return (
    <PublicField bleed className="min-h-screen text-[var(--mimi-ink,#0a0a0a)]">
      <header
        className={`border-b border-[var(--mimi-hairline,rgba(0,0,0,0.12))] ${compact ? "px-5 py-8" : "px-6 py-12 md:py-16"}`}
        style={{ borderBottomColor: `${identity.accentHex}33` }}
      >
        <div className={`mx-auto flex flex-col gap-8 ${compact ? "max-w-3xl" : "max-w-5xl md:flex-row md:items-start md:justify-between"}`}>
          <div className="flex gap-5 md:gap-6 items-start">
            <div
              className="shrink-0 w-20 h-20 md:w-24 md:h-24 border overflow-hidden relative"
              style={{
                borderColor: identity.accentHex,
                backgroundColor: `${identity.accentHex}14`,
              }}
            >
              {identity.avatarUrl ? (
                <img
                  src={identity.avatarUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <Sparkles size={16} style={{ color: identity.accentHex }} />
                  <p className="font-mono text-[7px] uppercase tracking-widest mt-1 leading-tight text-[var(--mimi-stone,#78716c)]">
                    @{publicHandle.slice(0, 8)}
                  </p>
                </div>
              )}
              {identity.avatarIsDoll && identity.dollLabel ? (
                <p className="absolute bottom-0 inset-x-0 font-mono text-[7px] uppercase tracking-widest text-center py-1 bg-[var(--mimi-ink,#0a0a0a)]/55 text-[var(--mimi-field,#ffffff)]">
                  {identity.dollLabel}
                </p>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-2">
                <MimiWordmark size="sm" className="inline-block" />
                <PressMark label="Public profile" />
              </div>
              {identity.displayName ? (
                <p className="font-serif text-2xl md:text-3xl leading-tight">{identity.displayName}</p>
              ) : null}
              <h1 className="font-serif text-3xl md:text-4xl leading-none">@{publicHandle}</h1>
              {identity.bio ? (
                <p className="font-serif text-base md:text-lg text-[var(--mimi-stone,#78716c)] max-w-xl leading-relaxed">
                  {identity.bio}
                </p>
              ) : showcase?.philosophy && !signature ? (
                <p className="font-serif italic text-lg text-[var(--mimi-stone,#78716c)] max-w-xl">
                  {showcase.philosophy}
                </p>
              ) : null}
              <div className="pt-1">
                <KeepTabsButton handle={publicHandle} variant="stamp" />
              </div>
              {externalLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {externalLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[8px] uppercase tracking-widest border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] px-3 py-1.5 inline-flex items-center gap-1 hover:border-[var(--mimi-ink,#0a0a0a)]/25"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {formatPublicLinkLabel(link)} <ArrowUpRight size={10} />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {showcase && !identity.avatarIsDoll && !showcase.dollPortraitUrl ? (
            <div
              className="shrink-0 w-28 h-28 md:w-32 md:h-32 border-2 flex flex-col items-center justify-center text-center self-end"
              style={{ borderColor: identity.accentHex, backgroundColor: `${identity.accentHex}18` }}
            >
              <Sparkles size={18} style={{ color: identity.accentHex }} />
              <p className="font-mono text-[7px] uppercase tracking-widest mt-2 leading-tight px-2">
                {showcase.dollLabel}
              </p>
              <p className="font-mono text-[6px] uppercase tracking-widest mt-2 text-[var(--mimi-stone,#78716c)] px-2">
                Doll likeness pending
              </p>
            </div>
          ) : null}
        </div>
      </header>

      {signature ? (
        <section className={`mx-auto px-6 py-8 border-b border-[var(--mimi-hairline,rgba(0,0,0,0.12))] ${compact ? "max-w-3xl" : "max-w-5xl"}`}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-3">
            <p className="font-sans text-[9px] uppercase tracking-[0.32em] text-[var(--mimi-stone,#78716c)] font-semibold">
              Taste signature
            </p>
            {signature.fullPagePath ? (
              <button
                type="button"
                onClick={() => onNavigate(signature.fullPagePath!)}
                className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-[var(--mimi-ink,#0a0a0a)] hover:text-[var(--mimi-olive,#5A5A40)] inline-flex items-center gap-1.5"
              >
                Full plate <ArrowUpRight size={12} />
              </button>
            ) : null}
          </div>
          <div className="border border-[var(--mimi-ink,#0a0a0a)]/12 bg-[var(--mimi-field,#ffffff)] px-6 py-8 md:px-8">
            <h2 className="font-serif italic text-3xl md:text-4xl leading-tight max-w-[18ch]">
              {signature.title}
            </h2>
            {signature.subtitle ? (
              <p className="font-serif text-base text-[var(--mimi-stone,#78716c)] mt-2">{signature.subtitle}</p>
            ) : null}
            {signature.semanticLine ? (
              <p className="font-serif text-sm md:text-base text-[var(--mimi-stone,#78716c)] mt-4 max-w-2xl leading-relaxed">
                {signature.semanticLine}
              </p>
            ) : null}
            {signature.motifs.length > 0 ? (
              <p className="font-serif italic text-sm text-[var(--mimi-stone,#78716c)] mt-4">
                {signature.motifs.join(" · ")}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {ripPublished ? (
        <section className={`mx-auto px-6 py-8 border-b border-[var(--mimi-hairline,rgba(0,0,0,0.12))] ${compact ? "max-w-3xl" : "max-w-5xl"}`}>
          <div
            className="relative overflow-hidden border border-rose-900/30 px-6 py-7 md:px-8 text-stone-100"
            style={{
              background:
                "radial-gradient(ellipse at 12% 0%, #1a0f14 0%, #0a0a0c 50%, #050506 100%)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
              <div className="space-y-3 min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-rose-300/75 inline-flex items-center gap-2">
                  <EyeOff size={12} />
                  Inverse reading · mimi.rip
                </p>
                <h3 className="font-serif text-2xl md:text-3xl tracking-tight">{publicRip!.title}</h3>
                <p className="font-serif italic text-sm md:text-base text-stone-400 max-w-xl leading-relaxed">
                  {publicRip!.shadowThesis}
                </p>
                {publicRip!.antiMotifs.length > 0 ? (
                  <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                    {publicRip!.antiMotifs.slice(0, 4).join(" · ")}
                  </p>
                ) : null}
              </div>
              <a
                href={`${canonicalRipOrigin()}/u/${encodeURIComponent(publicHandle)}`}
                className="shrink-0 self-start font-mono text-[9px] uppercase tracking-widest px-4 py-2.5 border border-rose-400/35 text-rose-100 hover:bg-white/5 inline-flex items-center gap-1.5"
              >
                Read inverse <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {showcase && (showcase.voiceAdjectives.length > 0 || showcase.motifCandidates.length > 0) ? (
        <section className={`mx-auto px-6 py-8 border-b border-[var(--mimi-hairline,rgba(0,0,0,0.12))] ${compact ? "max-w-3xl" : "max-w-5xl"}`}>
          <div className="grid md:grid-cols-2 gap-8 text-sm">
            {showcase.voiceAdjectives.length > 0 ? (
              <div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)] mb-2">
                  Voice
                </p>
                <p className="font-serif italic">{showcase.voiceAdjectives.join(" · ")}</p>
              </div>
            ) : null}
            {showcase.motifCandidates.length > 0 ? (
              <div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)] mb-2">
                  Motifs
                </p>
                <p className="text-[var(--mimi-stone,#78716c)]">{showcase.motifCandidates.join(" · ")}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={`mx-auto px-6 py-12 ${compact ? "max-w-3xl" : "max-w-5xl"}`}>
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--mimi-stone,#78716c)]" />
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Public issues
            </h2>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={() => onNavigate("/mimi-dolls")}
              className="font-mono text-[8px] uppercase tracking-widest border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] px-3 py-1.5"
            >
              Manage doll
            </button>
          ) : null}
        </div>

        {zines.length === 0 ? (
          <div className="border border-dashed border-[var(--mimi-hairline,rgba(0,0,0,0.12))] p-12 text-center">
            <p className="font-serif italic text-[var(--mimi-stone,#78716c)]">No public issues published yet.</p>
            {isOwner ? (
              <button
                type="button"
                onClick={() => onNavigate("/studio")}
                className="mt-6 font-mono text-[9px] uppercase tracking-widest px-5 py-2 border border-[var(--mimi-hairline,rgba(0,0,0,0.12))]"
              >
                Create in Studio
              </button>
            ) : null}
          </div>
        ) : (
          <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {zines.map((zine) => (
              <PublicZineTile key={zine.id} zine={zine} onSelect={() => handleZineSelect(zine)} />
            ))}
          </div>
        )}
      </section>

      <section className={`mx-auto px-6 pb-8 ${compact ? "max-w-3xl" : "max-w-5xl"}`}>
        <div className="flex flex-wrap gap-3 mb-6">
          <a
            href={`${canonicalFishOrigin()}/u/${encodeURIComponent(publicHandle)}`}
            className="font-mono text-[8px] uppercase tracking-widest border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] px-3 py-2 inline-flex items-center gap-1 hover:border-[var(--mimi-ink,#0a0a0a)]/25"
          >
            mimi.fish shelf <ArrowUpRight size={11} />
          </a>
          {ripPublished ? (
            <a
              href={`${canonicalRipOrigin()}/u/${encodeURIComponent(publicHandle)}`}
              className="font-mono text-[8px] uppercase tracking-widest border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] px-3 py-2 inline-flex items-center gap-1 hover:border-[var(--mimi-ink,#0a0a0a)]/25"
            >
              mimi.rip inverse <ArrowUpRight size={11} />
            </a>
          ) : null}
        </div>
        <KeepTabsButton handle={publicHandle} variant="panel" />
        {isOwner ? (
          <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)] mt-4">
            Publish an issue · it files here automatically
          </p>
        ) : null}
      </section>

      {!compact ? (
        <>
          <ColumnRule className="max-w-5xl mx-auto px-6" />
          <footer className="px-6 py-8 text-center">
            <button
              type="button"
              onClick={() => onNavigate("/showcase")}
              className="font-mono text-[8px] uppercase tracking-[0.35em] text-[var(--mimi-stone,#78716c)] hover:text-[var(--mimi-ink,#0a0a0a)]"
            >
              Browse all showcases on mimi.you
            </button>
          </footer>
        </>
      ) : null}
    </PublicField>
  );
};

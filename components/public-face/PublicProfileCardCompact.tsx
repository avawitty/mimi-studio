import React from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { PublicProfileShowcase } from "../../services/publicShowcaseService";
import {
  buildPublicSignatureExcerpt,
  formatPublicLinkLabel,
  getPublicExternalLinks,
  resolvePublicProfileIdentity,
} from "../../lib/publicProfileCard";

export type PublicProfileCardCompactProps = {
  data: PublicProfileShowcase;
  issueCount?: number;
  onSelect: () => void;
};

/** Directory tile — doll avatar, handle, bio, issue count. */
export const PublicProfileCardCompact: React.FC<PublicProfileCardCompactProps> = ({
  data,
  issueCount,
  onSelect,
}) => {
  const { profile, showcase, zines } = data;
  const identity = resolvePublicProfileIdentity(profile, showcase);
  const signature = buildPublicSignatureExcerpt(profile, showcase);
  const externalLinks = getPublicExternalLinks(profile);
  const publishedCount = issueCount ?? zines.length;
  const teaser =
    identity.bio ||
    signature?.semanticLine ||
    showcase?.philosophy ||
    "Public creator on Mimi.";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left w-full border border-[var(--mimi-hairline,rgba(0,0,0,0.12))] p-4 hover:border-[var(--mimi-ink,#0a0a0a)]/25 transition-colors bg-[var(--mimi-field,#ffffff)]/70"
      style={{ borderColor: `${identity.accentHex}33` }}
    >
      <div className="flex gap-3 items-start">
        <div
          className="shrink-0 w-16 h-16 border overflow-hidden relative"
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
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={14} style={{ color: identity.accentHex }} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-tight truncate">
            {identity.displayName || `@${identity.handle}`}
          </p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
            @{identity.handle}
          </p>
          <p className="font-serif text-sm text-[var(--mimi-stone,#78716c)] mt-2 line-clamp-2 leading-relaxed">
            {teaser}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[7px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
          {publishedCount} public issue{publishedCount === 1 ? "" : "s"}
        </span>
        {externalLinks[0] ? (
          <span className="font-mono text-[7px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
            · {formatPublicLinkLabel(externalLinks[0])}
          </span>
        ) : null}
        <ArrowUpRight size={12} className="ml-auto text-[var(--mimi-stone,#78716c)]" />
      </div>
    </button>
  );
};

import type { ReactNode } from "react";
import type { MimiZineArtifact, ZinePageSpec } from "../../../types";

export interface ZineGrammarPageProps {
  artifact: MimiZineArtifact;
  page: ZinePageSpec;
  pageIndex: number;
  className?: string;
}

interface GrammarPageFrameProps {
  artifact: MimiZineArtifact;
  page: ZinePageSpec;
  children: ReactNode;
  className?: string;
  dark?: boolean;
  label?: string;
}

export function GrammarPageFrame({
  artifact,
  page,
  children,
  className = "",
  dark = false,
  label,
}: GrammarPageFrameProps) {
  const accessibleLabel =
    label ||
    `${page.sectionType || "zine"} page ${page.pageNumber}: ${page.headline || artifact.identity.title}`;

  return (
    <article
      className={`relative aspect-[4/5] w-full overflow-hidden border ${
        dark
          ? "border-white/15 bg-[#0b0b0a] text-white"
          : "border-[var(--mimi-hairline,#d4d4d4)] bg-white text-[var(--mimi-ink,#0a0a0a)]"
      } ${className}`}
      aria-label={accessibleLabel}
      data-zine-grammar={page.grammar}
      data-page-id={page.id}
    >
      {children}
    </article>
  );
}

export function GrammarPageNumber({
  page,
  dark = false,
}: {
  page: ZinePageSpec;
  dark?: boolean;
}) {
  return (
    <span
      className={`font-mono text-[8px] uppercase tracking-[0.28em] ${
        dark ? "text-white/50" : "text-[var(--mimi-stone,#78716c)]"
      }`}
    >
      {String(page.pageNumber).padStart(2, "0")}
    </span>
  );
}

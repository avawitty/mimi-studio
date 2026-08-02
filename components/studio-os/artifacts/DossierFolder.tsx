import React from "react";
import { RedMark } from "../RedMark";
import { Annotation } from "./Annotation";
import { IndexTab } from "./IndexTab";

export interface DossierFolderProps {
  kicker: string;
  title: string;
  metadata: string;
  tabLabel?: string;
  annotation?: string;
  showRedMark?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const DossierFolder: React.FC<DossierFolderProps> = ({
  kicker,
  title,
  metadata,
  tabLabel = "Active",
  annotation,
  showRedMark = false,
  children,
  className = "",
}) => (
  <article
    className={`relative border border-[var(--mimi-manila-edge,#c9ba86)] bg-[var(--mimi-manila-sheet,#f7f3e8)] px-5 pb-5 pt-7 shadow-[3px_4px_0_rgba(17,17,16,0.08)] ${className}`}
  >
    <IndexTab>{tabLabel}</IndexTab>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-pencil,#8a877f)]">
          {kicker}
        </p>
        <h2 className="mt-2 max-w-xl font-serif text-3xl font-medium leading-[0.98] text-[var(--mimi-ink,#111110)] md:text-4xl">
          {title}
        </h2>
      </div>
      {showRedMark ? <RedMark kind="tick" /> : null}
    </div>
    <p className="mt-4 font-mono text-[9px] leading-relaxed tracking-[0.08em] text-[var(--mimi-pencil,#8a877f)]">
      {metadata}
    </p>
    {annotation ? <Annotation className="mt-3">{annotation}</Annotation> : null}
    {children ? <div className="mt-5">{children}</div> : null}
  </article>
);

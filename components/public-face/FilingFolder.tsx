import React from "react";

type FilingFolderProps = {
  tab: string;
  title: string;
  meta?: string;
  photoSrc?: string | null;
  onOpen: () => void;
  figLabel?: string;
};

/**
 * Manila filing-cabinet row for the public archive index.
 * Folder body is a manila artifact on the white field — not a cream page wash.
 */
export const FilingFolder: React.FC<FilingFolderProps> = ({
  tab,
  title,
  meta,
  photoSrc,
  onOpen,
  figLabel,
}) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open dossier: ${title}`}
      className="atelier-folder atelier-shadow-paper mt-8 w-full text-left px-4 md:px-6 pt-7 pb-5"
    >
      <span className="atelier-folder-tab atelier-mono-label">{tab}</span>
      <div className="flex items-stretch gap-4 md:gap-6">
        <div className="relative shrink-0 w-20 h-20 md:w-24 md:h-24 bg-white border border-[var(--mimi-ink,#0a0a0a)]/15 overflow-hidden">
          <img
            src="/atelier/paper-clip.svg"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -top-3 -left-1 w-6 z-10 rotate-[-18deg]"
            draggable={false}
          />
          {photoSrc ? (
            <img src={photoSrc} alt="" className="h-full w-full object-cover grayscale" />
          ) : (
            <div className="h-full w-full flex items-center justify-center atelier-mono-label text-[var(--mimi-pencil,#8a877f)] px-2 text-center leading-tight">
              No cover
            </div>
          )}
        </div>
        <div className="min-w-0 flex flex-col justify-center gap-1.5 py-1">
          <h3 className="font-serif text-[22px] md:text-[28px] leading-tight text-[var(--mimi-ink,#0a0a0a)] truncate">
            {title}
          </h3>
          {meta && (
            <p className="atelier-mono-meta text-[var(--mimi-pencil,#8a877f)] truncate">{meta}</p>
          )}
          {figLabel && (
            <p className="atelier-mono-label text-[var(--mimi-pencil,#8a877f)] mt-1">{figLabel}</p>
          )}
        </div>
      </div>
    </button>
  );
};

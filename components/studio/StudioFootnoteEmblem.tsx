import React from "react";

export type StudioFootnoteLabel = "Studio" | "Zine";

type StudioFootnoteEmblemProps = {
  label?: StudioFootnoteLabel;
  onClick?: () => void;
  className?: string;
  /** When true, shows a subtle affordance that the emblem opens the dock. */
  interactive?: boolean;
};

export const StudioFootnoteEmblem: React.FC<StudioFootnoteEmblemProps> = ({
  label = "Studio",
  onClick,
  className = "",
  interactive = false,
}) => {
  const content = (
    <>
      <span className="font-serif italic text-[17px] studio-text-ink tracking-[0.01em]">
        Mimi
      </span>
      <span className="font-mono text-[7px] uppercase tracking-[0.32em] studio-text-muted mt-0.5 font-bold">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Open ${label.toLowerCase()} dock`}
        className={`flex flex-col items-center leading-none select-none transition-opacity hover:opacity-80 ${interactive ? "cursor-pointer" : ""} ${className}`.trim()}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col items-center leading-none select-none ${className}`.trim()}
    >
      {content}
    </div>
  );
};

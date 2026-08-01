import React from "react";

type PressMarkProps = {
  label?: string;
  className?: string;
};

/** Quiet olive press mark — folio / colophon accent only. */
export const PressMark: React.FC<PressMarkProps> = ({
  label = "FOLIO",
  className = "",
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="inline-block w-2 h-2 bg-[var(--mimi-olive,#5A5A40)]"
      />
      <span className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-olive,#5A5A40)] font-semibold">
        {label}
      </span>
    </div>
  );
};

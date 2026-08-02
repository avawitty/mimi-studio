import React from "react";

type PressMarkProps = {
  label?: string;
  className?: string;
  /** Olive default; cobalt for Signal Underarchive registry chrome */
  tone?: "olive" | "cobalt" | "gilt";
};

/** Quiet accent mark — issue / provenance / registry chrome only. */
export const PressMark: React.FC<PressMarkProps> = ({
  label = "ISSUE",
  className = "",
  tone = "olive",
}) => {
  const toneClass =
    tone === "cobalt"
      ? "bg-[var(--mimi-cobalt,#1B3A5C)] text-[var(--mimi-cobalt,#1B3A5C)]"
      : tone === "gilt"
        ? "bg-[var(--mimi-gilt,#A89B6E)] text-[var(--mimi-gilt,#A89B6E)]"
        : "bg-[var(--mimi-olive,#5A5A40)] text-[var(--mimi-olive,#5A5A40)]";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className={`inline-block w-2 h-2 ${toneClass.split(" ")[0]}`}
      />
      <span
        className={`font-sans text-[9px] uppercase tracking-[0.28em] font-semibold ${toneClass.split(" ")[1]}`}
      >
        {label}
      </span>
    </div>
  );
};

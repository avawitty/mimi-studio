import React from "react";

type RegistryCornersProps = {
  className?: string;
  /** Cobalt surveillance corners vs ink */
  tone?: "cobalt" | "ink";
};

/**
 * Quiet CCTV / closed-circuit crop brackets — Signal Underarchive nod.
 * Parent must be `position: relative`. Whisper on public plates; stronger on worktables.
 */
export const RegistryCorners: React.FC<RegistryCornersProps> = ({
  className = "",
  tone = "cobalt",
}) => {
  const color =
    tone === "cobalt"
      ? "border-[var(--mimi-cobalt,#5A7D9A)]"
      : "border-[var(--mimi-ink,#0a0a0a)]";

  const arm = `absolute w-3 h-3 ${color}`;

  return (
    <div
      aria-hidden
      data-accent="signal-underarchive"
      className={`pointer-events-none absolute inset-0 z-[2] ${className}`}
    >
      <span className={`${arm} top-2 left-2 border-t border-l`} />
      <span className={`${arm} top-2 right-2 border-t border-r`} />
      <span className={`${arm} bottom-2 left-2 border-b border-l`} />
      <span className={`${arm} bottom-2 right-2 border-b border-r`} />
    </div>
  );
};

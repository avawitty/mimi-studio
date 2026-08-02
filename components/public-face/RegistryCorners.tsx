import React from "react";

type RegistryCornersProps = {
  className?: string;
  /** Cobalt surveillance corners vs ink */
  tone?: "cobalt" | "ink";
};

/**
 * Soft light-cobalt corner brackets — art-deco feminine registry whisper.
 * Parent must be `position: relative`. Airy on public plates; stronger on worktables.
 */
export const RegistryCorners: React.FC<RegistryCornersProps> = ({
  className = "",
  tone = "cobalt",
}) => {
  const color =
    tone === "cobalt"
      ? "border-[var(--mimi-cobalt,#9BB8CE)]/45"
      : "border-[var(--mimi-ink,#0a0a0a)]/50";

  const arm = `absolute w-5 h-5 ${color}`;

  return (
    <div
      aria-hidden
      data-accent="signal-underarchive"
      className={`pointer-events-none absolute inset-0 z-[2] ${className}`}
    >
      <span className={`${arm} top-3 left-3 border-t border-l`} />
      <span className={`${arm} top-3 right-3 border-t border-r`} />
      <span className={`${arm} bottom-3 left-3 border-b border-l`} />
      <span className={`${arm} bottom-3 right-3 border-b border-r`} />
    </div>
  );
};

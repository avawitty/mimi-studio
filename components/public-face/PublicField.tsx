import React from "react";

type PublicFieldProps = {
  children: React.ReactNode;
  className?: string;
  /** Cool paper tooth; keep ≤12% opacity via CSS */
  grain?: boolean;
  /**
   * When true, parent `<main>` already paints `--mimi-field` — skip duplicate fill
   * so the surface reads as the page, not a card inside the shell.
   */
  bleed?: boolean;
};

/** White public surface shell — Front Page / Share / Signature / Stand. */
export const PublicField: React.FC<PublicFieldProps> = ({
  children,
  className = "",
  grain = true,
  bleed = false,
}) => {
  return (
    <div
      data-surface="public"
      className={`mimi-public-field relative text-[var(--mimi-ink,#0a0a0a)] ${
        bleed ? "" : "bg-[var(--mimi-field,#ffffff)]"
      } ${className}`}
    >
      {grain && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mimi-public-grain opacity-[0.08] mix-blend-multiply"
        />
      )}
      <div className="relative z-[1] min-h-full">{children}</div>
    </div>
  );
};

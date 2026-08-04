import React from "react";

type PublicFieldProps = {
  children: React.ReactNode;
  className?: string;
  /** Cool paper tooth; keep ≤12% opacity via CSS */
  grain?: boolean;
};

/** White public surface shell — Front Page / Share / Signature / Stand. */
export const PublicField: React.FC<PublicFieldProps> = ({
  children,
  className = "",
  grain = true,
}) => {
  return (
    <div
      data-surface="public"
      className={`mimi-public-field relative bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)] ${className}`}
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

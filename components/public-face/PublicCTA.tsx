import React from "react";

type PublicCTAProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
  className?: string;
  disabled?: boolean;
};

/** Black rectangle / ghost text CTA — no purple pills (PRD-07). */
export const PublicCTA: React.FC<PublicCTAProps> = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 min-h-11 px-5 font-sans text-[10px] uppercase tracking-[0.22em] font-semibold transition-colors rounded-none disabled:opacity-40";

  const styles =
    variant === "primary"
      ? "bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#ffffff)] hover:bg-[var(--mimi-stone,#78716c)]"
      : "bg-transparent text-[var(--mimi-ink,#0a0a0a)] border border-[var(--mimi-ink,#0a0a0a)] hover:bg-[var(--mimi-ink,#0a0a0a)] hover:text-[var(--mimi-field,#ffffff)]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
};

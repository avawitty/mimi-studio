import React from "react";

type MimiWordmarkProps = {
  className?: string;
  /** Visual size preset for common plates */
  size?: "sm" | "md" | "lg" | "hero";
  as?: "span" | "h1" | "p";
};

const SIZE_CLASS: Record<NonNullable<MimiWordmarkProps["size"]>, string> = {
  sm: "text-2xl md:text-3xl",
  md: "text-4xl md:text-5xl",
  lg: "text-5xl md:text-7xl",
  hero: "text-6xl md:text-8xl",
};

/**
 * Canonical product wordmark: title-case "Mimi" in Cormorant.
 * Never render all-caps MIMI on public/entry surfaces (PRD-01).
 */
export const MimiWordmark: React.FC<MimiWordmarkProps> = ({
  className = "",
  size = "md",
  as: Tag = "span",
}) => {
  return (
    <Tag
      className={`mimi-wordmark font-serif font-medium tracking-[-0.02em] leading-none text-[var(--mimi-ink,#0a0a0a)] ${SIZE_CLASS[size]} ${className}`}
    >
      Mimi
    </Tag>
  );
};

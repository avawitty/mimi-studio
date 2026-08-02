import React from "react";

export interface IndexTabProps {
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}

export const IndexTab: React.FC<IndexTabProps> = ({
  children,
  side = "right",
  className = "",
}) => (
  <span
    className={`absolute top-5 border border-[var(--mimi-manila-edge,#c9ba86)] bg-[var(--mimi-manila-tab,#e8dcb5)] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-manila-ink,#5c5334)] ${
      side === "right" ? "-right-3" : "-left-3"
    } ${className}`}
  >
    {children}
  </span>
);

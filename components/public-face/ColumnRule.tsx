import React from "react";

type ColumnRuleProps = {
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** Olive accent rule for folio / press marks */
  accent?: boolean;
};

export const ColumnRule: React.FC<ColumnRuleProps> = ({
  orientation = "horizontal",
  className = "",
  accent = false,
}) => {
  const color = accent
    ? "bg-[var(--mimi-olive,#5A5A40)]"
    : "bg-[var(--mimi-hairline,#d4d4d4)]";

  if (orientation === "vertical") {
    return (
      <div
        aria-hidden
        className={`w-px self-stretch shrink-0 ${color} ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`h-px w-full shrink-0 ${color} ${className}`}
    />
  );
};

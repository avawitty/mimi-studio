import React from "react";

export interface RedMarkProps {
  kind?: "tick" | "line" | "seal";
  label?: string;
  className?: string;
}

export const RedMark: React.FC<RedMarkProps> = ({
  kind = "tick",
  label,
  className = "",
}) => {
  const shape =
    kind === "line"
      ? "h-px w-10"
      : kind === "seal"
        ? "h-5 w-5 rounded-full border"
        : "h-4 w-px rotate-[18deg]";

  return (
    <span
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 border-[var(--mimi-red,#c33b32)] bg-[var(--mimi-red,#c33b32)] ${shape} ${className}`}
    />
  );
};

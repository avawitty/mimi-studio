import type { ReactNode } from "react";
import "./cardStates.css";

export type ResponsiveCardFieldProps = {
  children: ReactNode;
  featured?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Desktop artifact field (2–4 columns) collapsing to one substantial row on mobile.
 */
export function ResponsiveCardField({
  children,
  featured = false,
  className = "",
  "aria-label": ariaLabel,
}: ResponsiveCardFieldProps) {
  return (
    <div
      className={`mimi-card-field${featured ? " mimi-card-field--featured" : ""} ${className}`.trim()}
      role="list"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

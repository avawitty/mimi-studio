import type { ReactNode } from "react";
import "./cardStates.css";

export type ProvenanceTrayProps = {
  label?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Inspectable provenance lane for readings and artifacts.
 */
export function ProvenanceTray({
  label = "Provenance",
  children,
  className = "",
}: ProvenanceTrayProps) {
  return (
    <aside className={`mimi-provenance-tray ${className}`.trim()} aria-label={label}>
      <span className="mimi-provenance-tray__label">{label}</span>
      <div>{children}</div>
    </aside>
  );
}

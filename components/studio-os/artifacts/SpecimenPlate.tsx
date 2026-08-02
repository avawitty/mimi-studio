import React from "react";
import type { EpistemicStatus } from "../EpistemicLabel";
import { EpistemicLabel } from "../EpistemicLabel";

export interface SpecimenPlateProps {
  figure: string;
  caption: string;
  status?: EpistemicStatus;
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}

export const SpecimenPlate: React.FC<SpecimenPlateProps> = ({
  figure,
  caption,
  status,
  children,
  dark = false,
  className = "",
}) => (
  <figure
    className={`border p-4 ${
      dark
        ? "border-white/15 bg-[#111110] text-[#f4f1ea]"
        : "border-[var(--mimi-rule,#d8d4c9)] bg-[var(--mimi-bone,#f4f1ea)] text-[var(--mimi-ink,#111110)]"
    } ${className}`}
  >
    <div className="min-h-36">{children}</div>
    <figcaption className="mt-3 flex items-start justify-between gap-3 border-t border-current/15 pt-2">
      <span className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-65">
        fig. {figure} — {caption}
      </span>
      {status ? <EpistemicLabel status={status} /> : null}
    </figcaption>
  </figure>
);

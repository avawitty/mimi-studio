import React from "react";
import { MimiGlyph } from "./MimiGlyph";

export type StudioAnchor = "map" | "dossier" | "find";

export interface StudioNavigationProps {
  active?: StudioAnchor;
  onMap: () => void;
  onDossier: () => void;
  onFind: () => void;
}

export const StudioNavigation: React.FC<StudioNavigationProps> = ({
  active,
  onMap,
  onDossier,
  onFind,
}) => {
  const anchorClass = (anchor: StudioAnchor) =>
    `min-h-12 min-w-16 border-t px-3 font-mono text-[9px] uppercase tracking-[0.22em] ${
      active === anchor
        ? "border-[var(--mimi-periwinkle,#b9c4e0)] text-[var(--mimi-ink,#111110)]"
        : "border-transparent text-[var(--mimi-pencil,#8a877f)]"
    }`;

  return (
    <nav
      aria-label="Studio anchors"
      className="studio-os-navigation shrink-0 border-t border-[var(--mimi-rule,#d8d4c9)] bg-[var(--mimi-bone,#f4f1ea)] px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 items-center">
        <button type="button" onClick={onMap} className={anchorClass("map")}>
          Map
        </button>
        <button
          type="button"
          onClick={onDossier}
          aria-label="Return to active dossier"
          aria-current={active === "dossier" ? "page" : undefined}
          className="mx-auto flex min-h-12 min-w-12 items-center justify-center text-[var(--mimi-ink,#111110)]"
        >
          <MimiGlyph name="seal" decorative size={19} weight="regular" />
        </button>
        <button type="button" onClick={onFind} className={anchorClass("find")}>
          Find
        </button>
      </div>
    </nav>
  );
};

import React, { useMemo, useState } from "react";
import {
  CANON_MODULES,
  type CanonModule,
  type StudioPhase,
} from "../../lib/productCanon";
import { MimiGlyph } from "./MimiGlyph";

interface PurposeGroup {
  label: string;
  phases: StudioPhase[];
}

const PURPOSE_GROUPS: PurposeGroup[] = [
  { label: "Bring something in", phases: ["collect"] },
  { label: "Understand what it means", phases: ["understand"] },
  { label: "Shape your point of view", phases: ["shape", "approve"] },
  { label: "Make something", phases: ["compose"] },
  { label: "Release it", phases: ["publish"] },
  { label: "Keep it", phases: ["preserve"] },
];

export interface ChamberIndexProps {
  onNavigate: (mode: string) => void;
  modules?: CanonModule[];
  className?: string;
}

export const ChamberIndex: React.FC<ChamberIndexProps> = ({
  onNavigate,
  modules = CANON_MODULES,
  className = "",
}) => {
  const [expanded, setExpanded] = useState(false);
  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.priority - b.priority),
    [modules],
  );

  return (
    <section
      data-studio-index
      className={`relative border-t border-[var(--mimi-rule,#d8d4c9)] ${className}`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="studio-complete-chamber-index"
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left"
      >
        <span>
          <span className="block font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-pencil,#8a877f)]">
            Index tab
          </span>
          <span className="mt-1 block font-serif text-xl">All chambers</span>
        </span>
        <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)]">
          {expanded ? "Fold" : "Unfold"}
          <MimiGlyph name="index" decorative size={15} />
        </span>
      </button>

      {expanded ? (
        <div
          id="studio-complete-chamber-index"
          className="border-t border-[var(--mimi-rule,#d8d4c9)] pb-3 pt-5"
        >
          {PURPOSE_GROUPS.map((group) => {
            const groupModules = sortedModules.filter((module) =>
              group.phases.includes(module.phase),
            );
            if (groupModules.length === 0) return null;
            return (
              <section
                key={group.label}
                className="grid gap-2 border-b border-[var(--mimi-rule,#d8d4c9)] py-4 md:grid-cols-[12rem_1fr]"
              >
                <h3 className="font-serif text-xl">{group.label}</h3>
                <div className="grid gap-x-6 md:grid-cols-2">
                  {groupModules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() =>
                        onNavigate(module.canonicalRoute.replace(/^\//, ""))
                      }
                      className="flex min-h-11 items-center justify-between gap-3 border-t border-[var(--mimi-rule,#d8d4c9)] py-2 text-left"
                    >
                      <span className="font-mono text-[9px] tracking-[0.08em] text-[var(--mimi-ink,#111110)]">
                        {module.name}
                      </span>
                      {module.visibility === "registry" ? (
                        <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-[var(--mimi-pencil,#8a877f)]">
                          Registry
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

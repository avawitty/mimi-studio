import React from "react";

export type SpecimenCardState = "draft" | "sealed" | "open";

type SpecimenCardProps = {
  fig?: string;
  date?: string;
  state?: SpecimenCardState;
  selected?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * WT-003 — Index card: paper clip, fig. number, state stamp.
 */
export const SpecimenCard: React.FC<SpecimenCardProps> = ({
  fig = "01",
  date,
  state = "open",
  selected = false,
  onSelect,
  children,
  className = "",
}) => {
  const stamp =
    state === "sealed" ? "SEALED" : state === "draft" ? "DRAFT" : null;

  return (
    <article
      data-specimen="WT-003"
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={`relative border bg-[var(--wt-paper,var(--mimi-manila-sheet,#f7f3e8))] border-[var(--wt-line,var(--mimi-hairline,#d8d4c9))] px-4 pt-5 pb-4 transition-[transform,box-shadow] duration-200 motion-reduce:transition-none ${
        selected
          ? "-translate-y-0.5 shadow-[2px_4px_0_0_rgba(17,17,16,0.12)]"
          : "shadow-none"
      } ${onSelect ? "cursor-pointer" : ""} ${className}`.trim()}
    >
      {/* Paper clip */}
      <span
        aria-hidden
        className={`absolute -top-2 left-4 block h-5 w-2.5 rounded-[1px] border-2 border-[var(--wt-ink-2,#8a877f)] bg-transparent transition-transform duration-200 motion-reduce:transition-none ${
          selected ? "rotate-12" : "rotate-[-8deg]"
        }`}
      />

      <header className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--wt-ink-2,#8a877f)]">
          fig. {fig}
        </span>
        <div className="flex items-center gap-2">
          {date && (
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--wt-ink-2,#8a877f)]">
              {date}
            </span>
          )}
          {stamp && (
            <span
              className="font-mono text-[8px] uppercase tracking-[0.22em] px-1.5 py-0.5 border"
              style={{
                color: "var(--wt-seal, var(--mimi-seal, #c33b32))",
                borderColor: "var(--wt-seal, var(--mimi-seal, #c33b32))",
              }}
            >
              {stamp}
            </span>
          )}
        </div>
      </header>

      {children}
    </article>
  );
};

import React from "react";

export type InstrumentId =
  | "attach"
  | "archive"
  | "voice"
  | "spark"
  | "brain"
  | "globe";

export type Instrument = {
  id: InstrumentId;
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
};

type InstrumentBarProps = {
  instruments: Instrument[];
  onSelect: (id: InstrumentId) => void;
  /** Desktop: fixed right column. Mobile: horizontal strip. */
  orientation?: "auto" | "vertical" | "horizontal";
  className?: string;
};

const DEFAULT_INSTRUMENTS: Instrument[] = [
  { id: "attach", icon: "✎", label: "Attach" },
  { id: "archive", icon: "◫", label: "Archive" },
  { id: "voice", icon: "◐", label: "Voice" },
  { id: "spark", icon: "⚡", label: "Spark" },
  { id: "brain", icon: "✦", label: "Deep think" },
  { id: "globe", icon: "◯", label: "Web search" },
];

/**
 * WT-007 — Horizontal toolbar: attach / archive / voice / spark / brain / globe.
 */
export const InstrumentBar: React.FC<InstrumentBarProps> = ({
  instruments = DEFAULT_INSTRUMENTS,
  onSelect,
  orientation = "auto",
  className = "",
}) => {
  const vertical = orientation === "vertical";

  /* ─── Desktop: Fixed right toolbar — instruments on the desk ─ */
  if (vertical) {
    return (
      <div
        data-specimen="WT-007"
        role="toolbar"
        aria-label="Studio instruments"
        className={`hidden lg:flex flex-col items-center gap-1 py-3 px-2 border border-[var(--wt-line,#d8d3c6)] bg-[var(--wt-paper-2,#f0ede6)] sticky top-4 self-start ${className}`.trim()}
      >
        {instruments.map((item) => (
          <InstrumentButton key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div
      data-specimen="WT-007"
      role="toolbar"
      aria-label="Studio instruments"
      className={`flex lg:hidden items-stretch justify-between gap-0.5 px-2 py-1.5 border border-[var(--wt-line,#d8d3c6)] bg-[var(--wt-paper-2,#f0ede6)] ${className}`.trim()}
    >
      {instruments.map((item) => (
        <InstrumentButton key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
};

function InstrumentButton({
  item,
  onSelect,
}: {
  item: Instrument;
  onSelect: (id: InstrumentId) => void;
}) {
  return (
    <button
      type="button"
      disabled={item.disabled}
      aria-label={item.label}
      aria-pressed={!!item.active}
      title={item.label}
      onClick={() => onSelect(item.id)}
      className={`min-h-12 min-w-12 flex flex-col items-center justify-center gap-0.5 px-2 transition-colors duration-150 motion-reduce:transition-none disabled:opacity-40 ${
        item.active
          ? "bg-[var(--wt-ink,var(--mimi-ink-soft,#111110))] text-[var(--wt-paper,var(--mimi-manila-sheet,#f7f3e8))]"
          : "text-[var(--wt-ink,var(--mimi-ink-soft,#111110))] hover:bg-[var(--wt-paper,var(--mimi-manila-sheet,#f7f3e8))]"
      }`}
    >
      <span className="font-mono text-[14px] leading-none" aria-hidden>
        {item.icon}
      </span>
      <span className="font-mono text-[7px] uppercase tracking-[0.16em] leading-none">
        {item.label}
      </span>
    </button>
  );
}

export { DEFAULT_INSTRUMENTS };

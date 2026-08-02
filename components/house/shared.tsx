import type { ReactNode } from "react";

export function FloorHeader({
  index,
  name,
  phase,
  blurb,
}: {
  index: string;
  name: string;
  phase: string;
  blurb: string;
}) {
  return (
    <header className="mb-8 border-b border-[var(--house-line)] pb-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--house-stone)]">
          {index}
        </span>
        <h2 className="font-serif text-3xl md:text-4xl font-light tracking-tight text-[var(--house-ink)]">
          {name}
        </h2>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--house-olive)] mt-2">
        {phase}
      </p>
      <p className="text-[var(--house-stone)] mt-3 max-w-2xl leading-relaxed text-sm md:text-base">
        {blurb}
      </p>
    </header>
  );
}

export function MimiVoice({ children }: { children: ReactNode }) {
  return (
    <blockquote className="house-voice border-l-2 border-[var(--house-olive)] pl-4 mb-8 font-serif italic text-lg text-[var(--house-ink)]/85 leading-relaxed">
      {children}
    </blockquote>
  );
}

export function SysLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--house-stone)] ${className}`}
    >
      {children}
    </span>
  );
}

export function TagChip({ label, intensity }: { label: string; intensity: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border border-[var(--house-line)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--house-ink)]"
      title={`Intensity ${intensity.toFixed(2)}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-[var(--house-olive)]"
        style={{ opacity: 0.35 + intensity * 0.65 }}
      />
      {label}
    </span>
  );
}

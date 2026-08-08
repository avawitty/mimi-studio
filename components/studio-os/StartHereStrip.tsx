import React from "react";
import { ArrowRight, BookOpen, Check, PenLine } from "lucide-react";

export interface StartHereStripProps {
  onNavigate: (mode: string) => void;
  onOpenGuide?: () => void;
  className?: string;
}

const STEPS = [
  {
    id: "capture",
    label: "Capture",
    title: "Save a fragment in Scribe",
    mode: "scribe",
    icon: <PenLine size={14} strokeWidth={1.6} aria-hidden />,
  },
  {
    id: "approve",
    label: "Approve",
    title: "Approve Used Context in Studio",
    mode: "studio",
    icon: <Check size={14} strokeWidth={1.6} aria-hidden />,
  },
  {
    id: "compose",
    label: "Compose",
    title: "Generate and export from The Press",
    mode: "the-press",
    icon: <BookOpen size={14} strokeWidth={1.6} aria-hidden />,
  },
] as const;

/**
 * Compact orientation for first-time or unfiled users — three steps, no modal.
 */
export const StartHereStrip: React.FC<StartHereStripProps> = ({
  onNavigate,
  onOpenGuide,
  className = "",
}) => (
  <section
    aria-label="Start here"
    className={`border border-[var(--mimi-rule,#d8d4c9)] bg-[var(--mimi-field,#ffffff)]/80 px-4 py-4 ${className}`}
  >
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-pencil,#8a877f)]">
          Start here
        </p>
        <p className="mt-1 font-serif text-lg leading-tight">
          Capture → Approve → Compose
        </p>
      </div>
      {onOpenGuide ? (
        <button
          type="button"
          onClick={onOpenGuide}
          className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)] underline decoration-dotted underline-offset-4 hover:text-[var(--mimi-ink,#111110)]"
        >
          Full guide
        </button>
      ) : null}
    </div>

    <ol className="mt-4 grid gap-2 sm:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.id}>
          <button
            type="button"
            onClick={() => {
              onNavigate(step.mode);
              if (step.id === "approve") {
                window.setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("mimi:open_used_context"));
                }, 350);
              }
            }}
            className="flex min-h-14 w-full flex-col items-start gap-2 border border-[var(--mimi-rule,#d8d4c9)] px-3 py-2.5 text-left transition-colors hover:border-[var(--mimi-periwinkle,#b9c4e0)]"
          >
            <span className="flex w-full items-center justify-between gap-2 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-pencil,#8a877f)]">
              <span className="inline-flex items-center gap-1.5">
                {step.icon}
                {`0${index + 1} · ${step.label}`}
              </span>
              <ArrowRight size={10} aria-hidden />
            </span>
            <span className="font-sans text-[12px] leading-snug text-[var(--mimi-ink,#111110)]">
              {step.title}
            </span>
          </button>
        </li>
      ))}
    </ol>
  </section>
);

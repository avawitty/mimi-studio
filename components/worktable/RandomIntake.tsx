import React from "react";

type RandomIntakeProps = {
  value: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  /** Soft optional prompt whisper — not a blocking FIG card */
  whisper?: string | null;
  onWhisperNext?: () => void;
  onWhisperDismiss?: () => void;
  sending?: boolean;
  /** Invitation line — should match whisper when both are shown */
  placeholder?: string;
  className?: string;
};

/**
 * Open-capture intake (Hub improved direction) with an optional
 * prompt whisper so cycles stay available without owning the viewport.
 */
export const RandomIntake: React.FC<RandomIntakeProps> = ({
  value,
  onChange,
  onSend,
  whisper,
  onWhisperNext,
  onWhisperDismiss,
  sending = false,
  placeholder = "Write anything. A thought, image, mood, reference, fragment…",
  className = "",
}) => {
  return (
    <section
      data-specimen="WT-INTAKE"
      className={`border border-[var(--wt-line,#d8d3c6)] bg-[var(--wt-paper,#f6f3ec)] px-4 py-4 ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--wt-ink-2,#6b6a66)]">
          Random intake
        </p>
        {onSend && (
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--wt-ink,#1b1b19)] min-h-10 px-1 hover:opacity-70 disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send to Mimi →"}
          </button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none bg-transparent border-0 focus:outline-none font-serif italic font-light text-[18px] leading-snug text-[var(--wt-ink,#1b1b19)] placeholder:text-[var(--wt-ink-2,#6b6a66)] min-h-[5rem]"
        style={{ fontSize: "16px" }}
      />

      {whisper && (
        <div className="mt-3 pt-3 border-t border-dotted border-[var(--wt-line,#d8d3c6)] flex items-center justify-end gap-1">
          {onWhisperNext && (
            <button
              type="button"
              onClick={onWhisperNext}
              className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--wt-ink-2,#6b6a66)] min-h-10 px-1.5 hover:text-[var(--wt-ink,#1b1b19)]"
            >
              Next prompt →
            </button>
          )}
          {onWhisperDismiss && (
            <button
              type="button"
              onClick={onWhisperDismiss}
              aria-label="Hide prompt whisper"
              className="font-mono text-[10px] text-[var(--wt-ink-2,#6b6a66)] min-h-10 min-w-10 hover:text-[var(--wt-ink,#1b1b19)]"
            >
              ×
            </button>
          )}
        </div>
      )}
    </section>
  );
};

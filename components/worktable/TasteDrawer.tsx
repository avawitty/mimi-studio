import React, { useEffect } from "react";
import { AuraMeter, type AuraMood } from "./AuraMeter";

export type TasteDrawerTab = "treatments" | "aura" | "context";

type TasteDrawerProps = {
  open: boolean;
  onClose: () => void;
  tab: TasteDrawerTab;
  onTabChange: (tab: TasteDrawerTab) => void;
  mood: AuraMood;
  onMoodChange: (mood: AuraMood) => void;
  tailorOn: boolean;
  onTailorToggle: () => void;
  contextSummary?: string;
  treatments?: { id: string; name: string }[];
  activeTreatmentId?: string | null;
  onSelectTreatment?: (id: string | null) => void;
  onOpenConsole?: () => void;
  className?: string;
};

const TABS: { id: TasteDrawerTab; label: string }[] = [
  { id: "treatments", label: "Treatments" },
  { id: "aura", label: "Aura" },
  { id: "context", label: "Context" },
];

/**
 * WT-009 — Slide-up panel: treatments, aura, context tabs.
 */
export const TasteDrawer: React.FC<TasteDrawerProps> = ({
  open,
  onClose,
  tab,
  onTabChange,
  mood,
  onMoodChange,
  tailorOn,
  onTailorToggle,
  contextSummary = "No approved context — Mimi will not invent sources",
  treatments = [],
  activeTreatmentId = null,
  onSelectTreatment,
  onOpenConsole,
  className = "",
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-specimen="WT-009"
      className={`fixed inset-0 z-[80] flex flex-col justify-end ${className}`.trim()}
    >
      <button
        type="button"
        aria-label="Dismiss taste drawer"
        className="absolute inset-0 bg-[var(--wt-ink,#111110)]/25 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Taste drawer"
        className="relative z-[1] w-full max-h-[min(70dvh,520px)] border-t border-[var(--wt-line,#d8d4c9)] bg-[var(--wt-paper,var(--mimi-manila-sheet,#f7f3e8))] shadow-[0_-8px_24px_rgba(17,17,16,0.08)] flex flex-col motion-safe:animate-[wt-sheet-up_0.28s_ease-out]"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--wt-line,#d8d4c9)]">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="block w-8 h-0.5 bg-[var(--wt-ink-2,#8a877f)]"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] font-semibold text-[var(--wt-ink-2,#8a877f)]">
              Taste drawer
            </span>
          </div>
          <button
            type="button"
            onClick={onTailorToggle}
            className={`font-mono text-[9px] uppercase tracking-[0.2em] min-h-10 px-2 border ${
              tailorOn
                ? "border-[var(--mimi-cobalt,#9bb8ce)] text-[var(--mimi-cobalt-deep,#6a8aa4)]"
                : "border-[var(--wt-line,#d8d4c9)] text-[var(--wt-ink-2,#8a877f)]"
            }`}
          >
            {tailorOn ? "Tailor On" : "Tailor Off"}
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Taste sections"
          className="flex gap-1 px-4 py-2 border-b border-[var(--wt-line,#d8d4c9)]"
        >
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(t.id)}
                className={`min-h-10 px-3 font-mono text-[9px] uppercase tracking-[0.22em] ${
                  active
                    ? "text-[var(--wt-ink,#111110)] border-b-2 border-[var(--wt-seal,var(--mimi-seal,#c33b32))]"
                    : "text-[var(--wt-ink-2,#8a877f)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto px-4 py-4 flex-1 min-h-0">
          {tab === "treatments" && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onSelectTreatment?.(null)}
                className={`text-left min-h-12 px-3 py-2 border font-mono text-[10px] uppercase tracking-[0.18em] ${
                  !activeTreatmentId
                    ? "border-[var(--wt-ink,#111110)] bg-[var(--wt-ink,#111110)] text-[var(--wt-paper,#f7f3e8)]"
                    : "border-[var(--wt-line,#d8d4c9)] text-[var(--wt-ink-2,#8a877f)]"
                }`}
              >
                No treatment
              </button>
              {treatments.length === 0 && (
                <p className="font-serif italic text-[15px] text-[var(--wt-ink-2,#8a877f)]">
                  No sealed treatments on file. Open the full console to manage covers.
                </p>
              )}
              {treatments.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTreatment?.(t.id)}
                  className={`text-left min-h-12 px-3 py-2 border ${
                    activeTreatmentId === t.id
                      ? "border-[var(--wt-ink,#111110)]"
                      : "border-[var(--wt-line,#d8d4c9)]"
                  }`}
                >
                  <span className="font-serif text-[15px]">{t.name}</span>
                </button>
              ))}
              {onOpenConsole && (
                <button
                  type="button"
                  onClick={onOpenConsole}
                  className="mt-2 min-h-12 border border-[var(--wt-line,#d8d4c9)] font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--wt-ink-2,#8a877f)] hover:text-[var(--wt-ink,#111110)]"
                >
                  Open full console →
                </button>
              )}
            </div>
          )}

          {tab === "aura" && (
            <AuraMeter mood={mood} onChange={onMoodChange} />
          )}

          {tab === "context" && (
            <div className="border border-[var(--wt-line,#d8d4c9)] px-4 py-4">
              <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--wt-ink-2,#8a877f)]">
                Used context
              </span>
              <p className="mt-2 font-serif italic font-light text-[16px] leading-snug text-[var(--wt-ink,#111110)]">
                {contextSummary}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wt-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-specimen="WT-009"] [role="dialog"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

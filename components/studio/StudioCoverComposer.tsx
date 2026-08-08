import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";
import type { StudioCoverProvider } from "../../services/studioCoverService";

export type CoverProviderOption = {
  id: StudioCoverProvider;
  label: string;
  shortLabel: string;
  available: boolean;
};

export type StudioCoverComposerProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  provider: StudioCoverProvider;
  onProviderChange: (provider: StudioCoverProvider) => void;
  providerOptions: CoverProviderOption[];
  activeProvider: CoverProviderOption;
  hasLiveAi: boolean;
  isComposing: boolean;
  canCompose: boolean;
  error: string | null;
  onCompose: () => void;
  showSetupInfo: boolean;
  onToggleSetupInfo: () => void;
  onDismissSetupInfo: () => void;
  className?: string;
};

/**
 * Cover plate AI compose — prompt, provider chip, and primary Compose action.
 * Extracted from InputStudio for clearer hierarchy and reuse.
 */
export const StudioCoverComposer: React.FC<StudioCoverComposerProps> = ({
  prompt,
  onPromptChange,
  provider,
  onProviderChange,
  providerOptions,
  activeProvider,
  hasLiveAi,
  isComposing,
  canCompose,
  error,
  onCompose,
  showSetupInfo,
  onToggleSetupInfo,
  onDismissSetupInfo,
  className = "",
}) => {
  return (
    <section
      aria-label="Cover image composer"
      className={`space-y-3 ${className}`.trim()}
    >
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.24em] studio-text-muted">
            Cover plate
          </p>
          <h3 className="font-serif italic text-[15px] studio-text-ink mt-0.5">
            Generate or edit with AI
          </h3>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.18em] px-2 py-1 rounded-full border ${
            hasLiveAi
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasLiveAi ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
            aria-hidden
          />
          {hasLiveAi ? "Live" : "Preview"}
        </span>
      </div>

      <div className="studio-cover-compose-card rounded-xl border studio-border studio-bg-surface/80 backdrop-blur-sm shadow-[0_12px_40px_-20px_rgba(0,0,0,0.35)] overflow-hidden">
        <textarea
          id="studio-cover-compose-textarea"
          rows={3}
          placeholder="Describe the cover — light, material, mood, what to avoid…"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-[13px] leading-relaxed italic placeholder:studio-text-muted studio-text-ink px-4 pt-4 pb-2 resize-none min-h-[4.5rem] outline-none"
        />

        <div className="flex flex-col gap-2 border-t studio-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="studio-cover-provider">
              Cover image provider
            </label>
            <select
              id="studio-cover-provider"
              value={provider}
              onChange={(event) =>
                onProviderChange(event.target.value as StudioCoverProvider)
              }
              className="max-w-[11rem] rounded-full border studio-border bg-[var(--mimi-field,#ffffff)]/60 px-3 py-1.5 font-mono text-[7px] font-bold uppercase tracking-[0.16em] studio-text-ink outline-none focus:border-stone-400"
              title="Choose the image engine for this cover"
            >
              {providerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.available ? "" : " · offline"}
                </option>
              ))}
            </select>

            {!hasLiveAi ? (
              <button
                type="button"
                onClick={onToggleSetupInfo}
                className="font-mono text-[7px] uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400 underline decoration-dotted underline-offset-4"
              >
                {activeProvider.shortLabel} not connected
              </button>
            ) : (
              <span className="font-mono text-[7px] uppercase tracking-[0.14em] studio-text-muted truncate">
                {activeProvider.shortLabel}
              </span>
            )}
          </div>

          <button
            id="studio-cover-compose-button"
            type="button"
            disabled={isComposing || !canCompose}
            onClick={onCompose}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-stone-950 dark:bg-stone-100 px-5 py-2.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.2em] text-stone-100 dark:text-stone-950 transition-all hover:opacity-90 disabled:opacity-45 shrink-0"
          >
            {isComposing ? (
              <>
                <Loader2 size={12} className="animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={12} strokeWidth={1.6} aria-hidden />
                Compose cover
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="status"
          className="font-mono text-[8px] leading-relaxed text-amber-600 dark:text-amber-400 px-1"
        >
          {error}
        </p>
      )}

      <p className="font-mono text-[7px] uppercase tracking-[0.18em] studio-text-muted px-0.5">
        Upload a reference on the plate, then compose to generate or AI-edit
      </p>

      <AnimatePresence>
        {showSetupInfo && !hasLiveAi && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden rounded-lg border studio-border bg-stone-50/80 dark:bg-stone-900/40 p-4"
          >
            <h4 className="font-serif italic text-sm studio-text-ink mb-1">
              Connect a live image engine
            </h4>
            <p className="font-sans text-[11px] studio-text-muted leading-relaxed">
              Cover composer uses its own image provider, separate from Mimi&apos;s
              writing model. Add the selected provider credential to the server
              environment, then restart. Until then, preview mode keeps the layout
              workflow honest without claiming a real generation.
            </p>
            <button
              type="button"
              onClick={onDismissSetupInfo}
              className="mt-3 font-mono text-[7px] uppercase tracking-widest studio-text-muted hover:studio-text-ink underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

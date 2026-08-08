import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, Check, PenLine, X } from "lucide-react";

const STORAGE_KEY = "mimi_core_loop_onboarded";

type LoopStep = {
  id: "capture" | "approve" | "compose";
  label: string;
  title: string;
  body: string;
  cta: string;
  route: string;
  icon: React.ReactNode;
};

const STEPS: LoopStep[] = [
  {
    id: "capture",
    label: "01 · Capture",
    title: "Save a fragment in Scribe",
    body: "Paste a note, link, or decision. Mimi stores it as a memory atom — nothing becomes durable until you say so.",
    cta: "Open Scribe",
    route: "scribe",
    icon: <PenLine size={18} strokeWidth={1.6} />,
  },
  {
    id: "approve",
    label: "02 · Approve",
    title: "Approve Used Context in Studio",
    body: "Send atoms to Tailor or Studio, then approve what may shape the issue. Evidence and inference stay separate.",
    cta: "Open Studio Context",
    route: "studio",
    icon: <Check size={18} strokeWidth={1.6} />,
  },
  {
    id: "compose",
    label: "03 · Compose",
    title: "Generate, edit, and export",
    body: "Compose the issue with approved context, refine in The Edit, then export from The Press with provenance intact.",
    cta: "Start in Studio",
    route: "studio",
    icon: <BookOpen size={18} strokeWidth={1.6} />,
  },
];

function isOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

interface CoreLoopOnboardingProps {
  /** When true, wait before showing (e.g. elevator / auth still loading). */
  ready?: boolean;
  /** Extra delay after ready — lets users orient before the modal. */
  delayMs?: number;
}

/**
 * First-run guide for the north-star loop:
 * Capture → Approve Used Context → Compose / Export.
 */
export const CoreLoopOnboarding: React.FC<CoreLoopOnboardingProps> = ({
  ready = true,
  delayMs = 1500,
}) => {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!ready || isOnboarded()) return;
    const timer = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [ready, delayMs]);

  const dismiss = () => {
    markOnboarded();
    setOpen(false);
  };

  const goToStep = (step: LoopStep) => {
    markOnboarded();
    setOpen(false);
    window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: step.route }));
    if (step.id === "approve") {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("mimi:open_used_context"));
      }, 350);
    }
  };

  const step = STEPS[stepIndex];
  const isLast = stepIndex >= STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="Dismiss onboarding"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="core-loop-title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-lg bg-[#FAF8F5] dark:bg-[#12110F] text-stone-900 dark:text-[#FAF9F6] border border-stone-300 dark:border-stone-700 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-stone-500 font-bold">
                Core loop · first run
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              <div className="flex gap-2 mb-6">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStepIndex(i)}
                    className={`h-1 flex-1 transition-colors ${
                      i <= stepIndex
                        ? "bg-stone-900 dark:bg-[#FAF9F6]"
                        : "bg-stone-200 dark:bg-stone-800"
                    }`}
                    aria-label={`Go to ${s.label}`}
                  />
                ))}
              </div>

              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-stone-500 mb-2">
                {step.label}
              </p>
              <div className="flex items-start gap-3 mb-3">
                <span className="mt-0.5 w-9 h-9 shrink-0 border border-stone-300 dark:border-stone-700 flex items-center justify-center">
                  {step.icon}
                </span>
                <div>
                  <h2
                    id="core-loop-title"
                    className="font-serif text-2xl tracking-tight leading-tight"
                  >
                    {step.title}
                  </h2>
                  <p className="mt-2 font-sans text-[13px] text-stone-600 dark:text-stone-400 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={dismiss}
                className="order-2 sm:order-1 font-mono text-[9px] uppercase tracking-widest text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 py-2"
              >
                Skip for now
              </button>
              <div className="order-1 sm:order-2 flex gap-2">
                {!isLast && (
                  <button
                    type="button"
                    onClick={() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))}
                    className="font-mono text-[9px] uppercase tracking-widest px-3 py-2.5 border border-stone-300 dark:border-stone-700 hover:border-stone-500 transition-colors"
                  >
                    Next
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goToStep(step)}
                  className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest font-bold px-4 py-2.5 bg-stone-900 text-[#FAF8F5] dark:bg-[#FAF9F6] dark:text-stone-900 hover:opacity-90 transition-opacity"
                >
                  <span>{step.cta}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const CORE_LOOP_ONBOARDED_KEY = STORAGE_KEY;

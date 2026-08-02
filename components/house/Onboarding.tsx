import { useState } from "react";
import { ArrowRight, BookOpen, Layout, Scissors, Sparkles } from "lucide-react";
import { setState } from "./store";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to Mimi",
    body: "This is a private editorial studio. No feeds. No algorithms. Just your taste, distilled into numbered editions.",
  },
  {
    icon: Scissors,
    title: "The Four Floors",
    body: "Ingest what moves you. Curate by refusing what merely flatters. Compose plates. Publish issues. Ascension is sequential.",
  },
  {
    icon: Layout,
    title: "Absolute Negatives",
    body: "Taste is established in what you exclude. You must refuse at least one thing before Mimi can synthesize your reading.",
  },
  {
    icon: BookOpen,
    title: "Your Archive",
    body: "Everything lives in this browser. Export your issues as JSON. Build a zine that no one else could have made.",
  },
] as const;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const Icon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--house-field)]/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-[var(--house-line)] bg-[var(--house-field)] p-8 md:p-12 house-floor-enter">
        <div className="w-12 h-12 border border-[var(--house-line)] flex items-center justify-center mb-8">
          <Icon size={20} className="text-[var(--house-ink)]" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--house-stone)] mb-3">
          Onboarding — {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        </p>
        <h2 className="font-serif text-3xl md:text-4xl font-light text-[var(--house-ink)]">
          {STEPS[step].title}
        </h2>
        <p className="text-[var(--house-stone)] leading-relaxed mt-4">{STEPS[step].body}</p>

        <div className="flex items-center justify-between mt-10">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 ${i === step ? "bg-[var(--house-ink)]" : "bg-[var(--house-line)]"}`}
              />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 bg-[var(--house-ink)] text-[var(--house-field)] font-mono text-[11px] uppercase tracking-[0.18em] px-6 py-3 hover:opacity-85 transition-opacity"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setState({ onboardingComplete: true }, "complete-onboarding")}
              className="bg-[var(--house-olive)] text-[var(--house-field)] font-mono text-[11px] uppercase tracking-[0.18em] px-6 py-3 hover:opacity-90 transition-opacity"
            >
              Enter the house
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

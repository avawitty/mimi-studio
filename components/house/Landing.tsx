const FLOORS = [
  {
    fl: "1F",
    name: "Ingest",
    phase: "Phase I — Synthesizing Aesthetic",
    copy: "Everything you consume is a confession. Feed the intake your links, fragments, and images — Mimi filters the memetic debris for latent architectural intent.",
  },
  {
    fl: "2F",
    name: "Curate",
    phase: "Phase II — Absolute Negatives",
    copy: "Visual over-saturation blunts discernment. Taste is established in what you exclude. Keep what survives scrutiny; refuse what merely flatters.",
  },
  {
    fl: "3F",
    name: "Plate",
    phase: "Phase III — Composition",
    copy: "A plate is one page of your position, composed with intent and drawn from your own palette. No stock imagery. No borrowed taste.",
  },
  {
    fl: "4F",
    name: "Penthouse",
    phase: "Phase IV — Publication",
    copy: "The top floor. Bind your plates into a numbered edition, stamp it with the house seal, and put the position on record.",
  },
] as const;

const TIERS = ["Seed", "Helix Link", "Harmonic", "Singularity", "Fully Actualized DNA"] as const;

export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="house-landing">
      <section className="min-h-[85vh] flex flex-col justify-between border-b border-[var(--house-line)] pb-12">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--house-stone)]">
            Private editorial studio
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--house-olive)]">
            System Ascension
          </p>
        </div>

        <div className="py-16 md:py-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--house-stone)] mb-4">
            Est. for taste, identity & image-making
          </p>
          <h1 className="font-serif text-[clamp(4.5rem,18vw,9rem)] font-light leading-[0.85] tracking-tight">
            Mimi
          </h1>
          <p className="font-serif italic text-2xl md:text-3xl text-[var(--house-stone)] mt-6 max-w-xl">
            Who are you when no one is watching?
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--house-stone)] mt-8">
            Ground floor — scroll to ascend
          </p>
        </div>

        <blockquote className="max-w-2xl border-l-2 border-[var(--house-olive)] pl-5 font-serif italic text-xl text-[var(--house-ink)]/85">
          Visual over-saturation blunts discernment. Taste is established in the absolute negatives —
          what you exclude.
        </blockquote>
      </section>

      <section className="py-16 border-b border-[var(--house-line)]">
        <SysEyebrow>The house · 1F → 4F</SysEyebrow>
        <div className="grid gap-8 md:grid-cols-2 mt-8">
          {FLOORS.map((f) => (
            <article key={f.fl} className="border-t border-[var(--house-line)] pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--house-olive)]">
                {f.fl}
              </p>
              <h2 className="font-serif text-3xl font-light mt-2">{f.name}</h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--house-stone)] mt-2">
                {f.phase}
              </p>
              <p className="text-[var(--house-stone)] mt-3 leading-relaxed text-sm">{f.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-16 border-b border-[var(--house-line)]">
        <SysEyebrow>Aesthetic tiers — the ascension index</SysEyebrow>
        <ol className="mt-6 space-y-3">
          {TIERS.map((t, i) => (
            <li key={t} className="flex items-baseline gap-4 font-serif text-xl">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--house-stone)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </section>

      <section className="py-20 text-center">
        <SysEyebrow>The elevator is waiting</SysEyebrow>
        <h2 className="font-serif text-4xl md:text-5xl font-light mt-4">Begin your ascension.</h2>
        <p className="font-serif italic text-[var(--house-stone)] mt-3">
          The algorithm will not miss you.
        </p>
        <button
          type="button"
          onClick={onEnter}
          className="mt-8 bg-[var(--house-ink)] text-[var(--house-field)] font-mono text-[11px] uppercase tracking-[0.2em] px-8 py-4 hover:opacity-85 transition-opacity"
        >
          Enter the house →
        </button>
      </section>
    </div>
  );
}

function SysEyebrow({ children }: { children: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--house-stone)]">
      {children}
    </p>
  );
}

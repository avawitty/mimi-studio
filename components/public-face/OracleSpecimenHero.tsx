import React, { useState } from "react";
import { motion } from "motion/react";

type OracleSpecimenHeroProps = {
  onAsk: (question: string) => void;
  reading?: string | null;
  loading?: boolean;
};

/**
 * Dark specimen entry for Oracle — X-ray botanical + typewriter readout.
 * Oracle stays denser below; this is the quiet ask plate (PRD-01 exempts Oracle).
 */
export const OracleSpecimenHero: React.FC<OracleSpecimenHeroProps> = ({
  onAsk,
  reading,
  loading = false,
}) => {
  const [question, setQuestion] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    onAsk(q);
  };

  return (
    <section className="atelier-oracle-scope relative -mx-0 px-6 py-14 md:py-20 min-h-[min(72dvh,720px)] flex flex-col items-center justify-center text-center overflow-hidden">
      <motion.figure
        className="relative mb-10 select-none"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.img
          src="/atelier/xray-flower.webp"
          alt="X-ray botanical specimen"
          className="mx-auto w-[min(280px,70vw)] opacity-90"
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          draggable={false}
        />
      </motion.figure>

      <p className="atelier-mono-label text-[var(--mimi-artifact-bone,#f4f1ea)]/55">
        Specimen — radiant nº 09, exposed 40 kv
      </p>

      <h1 className="mt-6 font-serif italic text-[34px] md:text-[40px] leading-[1.1] tracking-[-0.01em] text-[var(--mimi-artifact-bone,#f4f1ea)]">
        ask, and keep still.
      </h1>

      <form onSubmit={submit} className="mt-10 w-full max-w-md">
        <label className="atelier-mono-label block text-[var(--mimi-artifact-bone,#f4f1ea)]/55 mb-2">
          Type your question
        </label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-[var(--mimi-artifact-bone,#f4f1ea)]/35 px-0 py-2 text-center font-serif italic text-lg text-[var(--mimi-artifact-bone,#f4f1ea)] placeholder:text-[var(--mimi-artifact-bone,#f4f1ea)]/30 focus:outline-none focus:border-[var(--mimi-periwinkle,#b9c4e0)]"
          placeholder="…"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="mt-6 atelier-mono-label text-[var(--mimi-artifact-bone,#f4f1ea)]/80 hover:text-[var(--mimi-periwinkle,#b9c4e0)] disabled:opacity-30 transition-colors"
        >
          Submit to the chamber
        </button>
      </form>

      <div className="mt-12 min-h-[3rem] max-w-xl px-2">
        {loading ? (
          <p className="atelier-mono-label animate-pulse text-[var(--mimi-artifact-bone,#f4f1ea)]/45">
            Reading…
          </p>
        ) : reading ? (
          <p className="font-serif italic text-lg md:text-xl leading-relaxed text-[var(--mimi-artifact-bone,#f4f1ea)]/90">
            “{reading}”
          </p>
        ) : (
          <p className="atelier-mono-label text-[var(--mimi-artifact-bone,#f4f1ea)]/40">
            The oracle does not keep records — only flowers.
          </p>
        )}
      </div>

      <p className="atelier-cursive mt-10 text-[var(--mimi-artifact-bone,#f4f1ea)]/50">
        handle with care
      </p>
    </section>
  );
};

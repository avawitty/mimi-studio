import React from "react";
import type { CentralTendencyProfile } from "../../schemas/collectiveIntelligenceContracts";

/**
 * Observatory instrument — iris / aperture plate (dim ink, not costume AI).
 * Pupil openness reflects summation density from the lead profile when present.
 */
export const ObservatoryEyePlate: React.FC<{
  leadProfile?: CentralTendencyProfile | null;
  loading?: boolean;
  live?: boolean;
  variant?: "field" | "void";
}> = ({ leadProfile, loading = false, live = false, variant = "void" }) => {
  const insufficient =
    !leadProfile || leadProfile.summation.interpretation === "insufficient_evidence";
  const openness = insufficient
    ? 0.35
    : Math.min(0.92, Math.max(0.4, leadProfile.summation.combinedIndex * 0.85));
  const meanShare = insufficient ? 0.33 : Math.min(1, leadProfile.mean);
  const medianShare = insufficient ? 0.33 : Math.min(1, leadProfile.median);
  const modeShare = insufficient ? 0.33 : leadProfile.mode.share;

  const shellBg =
    variant === "void"
      ? "bg-[#050506] border-white/10"
      : "bg-[var(--mimi-field)] border-[var(--mimi-hairline)]";
  const titleClass =
    variant === "void" ? "text-stone-100" : "text-[var(--mimi-ink)]";
  const subtleClass = variant === "void" ? "text-stone-500" : "text-[var(--mimi-stone)]";
  const footerBg =
    variant === "void"
      ? "border-white/10 bg-[#0a0a0c]/90"
      : "border-[var(--mimi-hairline)] bg-[color-mix(in_srgb,var(--mimi-field)_92%,transparent)]";

  return (
    <div
      className={`relative w-full aspect-[4/3] max-h-[min(52vh,420px)] overflow-hidden border ${shellBg}`}
      aria-hidden={loading}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, var(--mimi-stone) 0%, transparent 62%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative rounded-full border border-[var(--mimi-hairline)]"
          style={{
            width: "min(72%, 280px)",
            height: "min(72%, 280px)",
            background:
              "radial-gradient(circle at 50% 50%, var(--mimi-ink) 0%, var(--mimi-field) 78%)",
          }}
        >
          {/* Mean ring */}
          <div
            className="absolute inset-[12%] rounded-full border border-[var(--mimi-olive)]/30"
            style={{ opacity: 0.35 + meanShare * 0.55 }}
          />
          {/* Median ring */}
          <div
            className="absolute inset-[22%] rounded-full border border-[var(--mimi-cobalt)]/25"
            style={{ opacity: 0.35 + medianShare * 0.55 }}
          />
          {/* Mode ring */}
          <div
            className="absolute inset-[32%] rounded-full border border-[var(--mimi-stone)]/50"
            style={{ opacity: 0.35 + modeShare * 0.55 }}
          />
          {/* Pupil / aperture */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--mimi-ink)] transition-all duration-700 ease-out motion-reduce:transition-none"
            style={{
              width: `${openness * 38}%`,
              height: `${openness * 38}%`,
              boxShadow: "0 0 48px color-mix(in srgb, var(--mimi-olive) 18%, transparent)",
            }}
          />
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 px-5 py-4 border-t ${footerBg}`}>
        <p className={`font-mono text-[8px] uppercase tracking-[0.32em] ${subtleClass}`}>
          {loading ? "Focusing collective lens…" : live ? "Live consented window" : "Instrument plate"}
        </p>
        <h1 className={`font-display font-serif italic text-3xl md:text-4xl tracking-tight mt-1 ${titleClass}`}>
          The Observatory
        </h1>
        {!loading && leadProfile && !insufficient ? (
          <p className={`font-sans text-[11px] mt-2 max-w-xl leading-relaxed ${subtleClass}`}>
            Modal motif: <span className={titleClass}>{leadProfile.mode.label}</span>
            · {leadProfile.summation.interpretation.replace(/_/g, " ")}
          </p>
        ) : null}
      </div>
    </div>
  );
};

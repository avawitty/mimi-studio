import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchUserZines } from "../../services/firebaseUtils";
import type { ZineMetadata } from "../../types";
import { OBSERVATORY_COPY } from "../../lib/observatoryChamberContract";
import { mayContributeToMeanMedianMode } from "../../services/collective/consent";

export const ObservatoryContributionPanel: React.FC<{
  navigate?: (path: string) => void;
  corpusContributing?: number;
  corpusScanned?: number;
  variant?: "field" | "void";
}> = ({ navigate, corpusContributing = 0, corpusScanned = 0, variant = "void" }) => {
  const { user } = useUser();
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid || user.uid === "ghost") {
      setZines([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchUserZines(user.uid)
      .then((rows) => {
        if (!cancelled) setZines(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const summary = useMemo(() => {
    const publicZines = zines.filter((z) => z.isPublic);
    const contributing = publicZines.filter((z) =>
      mayContributeToMeanMedianMode({
        disclosedAt: z.disclosedAt,
        disclosureVersion: z.disclosureVersion,
        contributeToMeanMedianMode: z.contributeToMeanMedianMode,
        mmmContributionStatus: z.mmmContributionStatus,
      }),
    );
    const publicOnly = publicZines.filter(
      (z) =>
        !mayContributeToMeanMedianMode({
          disclosedAt: z.disclosedAt,
          disclosureVersion: z.disclosureVersion,
          contributeToMeanMedianMode: z.contributeToMeanMedianMode,
          mmmContributionStatus: z.mmmContributionStatus,
        }),
    );
    const withdrawn = publicZines.filter((z) => z.mmmContributionStatus === "withdrawn");
    return {
      contributing,
      publicOnly,
      withdrawn,
      privateCount: zines.filter((z) => !z.isPublic).length,
    };
  }, [zines]);

  const go = (path: string) => {
    if (navigate) {
      navigate(path);
      return;
    }
    window.location.assign(path);
  };

  const shell =
    variant === "void"
      ? "border-white/15 bg-[#0a0a0c]/80"
      : "border-[var(--mimi-hairline)] bg-[color-mix(in_srgb,var(--mimi-field)_96%,var(--mimi-ink))]";
  const subtle = variant === "void" ? "text-stone-500" : "text-[var(--mimi-stone)]";
  const text = variant === "void" ? "text-stone-100" : "text-[var(--mimi-ink)]";
  const primaryBtn =
    variant === "void"
      ? "border-stone-100 bg-stone-100 text-[#050506]"
      : "border-[var(--mimi-ink)] bg-[var(--mimi-ink)] text-[var(--mimi-field)]";
  const secondaryBtn =
    variant === "void"
      ? "border-white/20 text-stone-400 hover:text-stone-100 hover:border-white/40"
      : "border-[var(--mimi-hairline)] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)] hover:border-[var(--mimi-ink)]/40";

  return (
    <section
      className={`border px-4 py-4 space-y-3 ${shell}`}
      aria-labelledby="observatory-contribution-heading"
    >
      <div className="space-y-1">
        <h2
          id="observatory-contribution-heading"
          className={`font-mono text-[8px] uppercase tracking-[0.28em] ${subtle}`}
        >
          Collective contribution
        </h2>
        <p className={`font-sans text-[12px] leading-relaxed ${text}`}>
          Opt in when you stage work on The Proscenium. Only anonymized structure — themes, motifs,
          form — may enter Mean Median Mode. Private studio, Tailor, and personal Scry stay excluded.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Corpus (live)" value={corpusContributing} hint={`${corpusScanned} public scanned`} variant={variant} />
        <Stat
          label="Your contributing"
          value={loading ? "—" : summary.contributing.length}
          hint="opted in"
          variant={variant}
        />
        <Stat
          label="Your public only"
          value={loading ? "—" : summary.publicOnly.length}
          hint="no collective"
          variant={variant}
        />
        <Stat
          label="Withdrawn"
          value={loading ? "—" : summary.withdrawn.length}
          hint="live window"
          variant={variant}
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => go("/proscenium")}
          className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest hover:opacity-90 ${primaryBtn}`}
        >
          Stage on Proscenium
        </button>
        <button
          type="button"
          onClick={() => go("/pocket")}
          className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest ${secondaryBtn}`}
        >
          Manage publications
        </button>
        <button
          type="button"
          onClick={() => go("/residue")}
          className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest ${secondaryBtn}`}
        >
          Run residue pass
        </button>
      </div>

      {corpusContributing === 0 && !loading ? (
        <p role="status" className={`font-sans text-[11px] leading-relaxed ${subtle}`}>
          {OBSERVATORY_COPY.emptyBanner}
        </p>
      ) : null}
    </section>
  );
};

const Stat: React.FC<{
  label: string;
  value: number | string;
  hint: string;
  variant?: "field" | "void";
}> = ({ label, value, hint, variant = "void" }) => {
  const subtle = variant === "void" ? "text-stone-500" : "text-[var(--mimi-stone)]";
  const text = variant === "void" ? "text-stone-100" : "text-[var(--mimi-ink)]";
  return (
  <div className="space-y-0.5">
    <p className={`font-mono text-[7px] uppercase tracking-[0.22em] ${subtle}`}>
      {label}
    </p>
    <p className={`font-serif text-2xl tabular-nums ${text}`}>{value}</p>
    <p className={`font-sans text-[10px] ${subtle}`}>{hint}</p>
  </div>
  );
};

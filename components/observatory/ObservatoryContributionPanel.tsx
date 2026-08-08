import React, { useCallback, useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { fetchUserZines } from "../../services/firebaseUtils";
import { db } from "../../services/firebaseInit";
import type { ZineMetadata } from "../../types";
import { OBSERVATORY_COPY } from "../../lib/observatoryChamberContract";
import {
  mayContributeToMeanMedianMode,
  unpublishFieldsForZine,
  withdrawMmmContributionFields,
} from "../../services/collective/consent";
import { useFeedback } from "../../hooks/useFeedback";

export const ObservatoryContributionPanel: React.FC<{
  navigate?: (path: string) => void;
  corpusContributing?: number;
  corpusScanned?: number;
  variant?: "field" | "void";
  onContributionChange?: () => void;
}> = ({
  navigate,
  corpusContributing = 0,
  corpusScanned = 0,
  variant = "void",
  onContributionChange,
}) => {
  const { user } = useUser();
  const feedback = useFeedback();
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadZines = useCallback(async () => {
    if (!user?.uid || user.uid === "ghost") {
      setZines([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchUserZines(user.uid, true);
      setZines(rows);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void reloadZines();
  }, [reloadZines]);

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
        z.isPublic &&
        !mayContributeToMeanMedianMode({
          disclosedAt: z.disclosedAt,
          disclosureVersion: z.disclosureVersion,
          contributeToMeanMedianMode: z.contributeToMeanMedianMode,
          mmmContributionStatus: z.mmmContributionStatus,
        }),
    );
    const withdrawn = zines.filter((z) => z.mmmContributionStatus === "withdrawn");
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

  const mirrorSovereign = async (
    zine: ZineMetadata,
    patch: Record<string, unknown>,
  ): Promise<boolean> => {
    try {
      const { mirrorZineToSovereign } = await import("../../services/sovereignClient");
      return await mirrorZineToSovereign({ ...zine, ...patch } as ZineMetadata);
    } catch (mirrorErr) {
      console.warn("MIMI // Sovereign contribution mirror failed", mirrorErr);
      return false;
    }
  };

  const handleWithdrawCollective = async (zine: ZineMetadata) => {
    if (!user || user.uid !== zine.userId || busyId) return;
    setBusyId(zine.id);
    setError(null);
    try {
      const patch = withdrawMmmContributionFields();
      await updateDoc(doc(db, "zines", zine.id), patch);
      const mirrored = await mirrorSovereign(zine, patch);
      if (!mirrored) {
        throw new Error("Sovereign archive did not confirm withdrawal.");
      }
      feedback.trigger("artifact.saved");
      window.dispatchEvent(new CustomEvent("mimi:artifact_finalized"));
      await reloadZines();
      onContributionChange?.();
    } catch (err) {
      console.error("MIMI // withdraw collective failed", err);
      setError("Could not withdraw from collective readout.");
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpublish = async (zine: ZineMetadata) => {
    if (!user || user.uid !== zine.userId || busyId) return;
    setBusyId(zine.id);
    setError(null);
    try {
      const patch = unpublishFieldsForZine();
      await updateDoc(doc(db, "zines", zine.id), patch);
      const mirrored = await mirrorSovereign(zine, patch);
      if (!mirrored) {
        throw new Error("Sovereign archive did not confirm unpublish.");
      }
      feedback.trigger("artifact.saved");
      window.dispatchEvent(new CustomEvent("mimi:artifact_finalized"));
      await reloadZines();
      onContributionChange?.();
    } catch (err) {
      console.error("MIMI // unpublish failed", err);
      setError("Could not unpublish this artifact.");
    } finally {
      setBusyId(null);
    }
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
  const rowBorder = variant === "void" ? "border-white/10" : "border-[var(--mimi-hairline)]";

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
          form — may enter Mean Median Mode. Withdraw here without opening Pocket.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Corpus (live)"
          value={corpusContributing}
          hint={`${corpusScanned} public scanned`}
          variant={variant}
        />
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

      {summary.contributing.length > 0 ? (
        <div className="space-y-2">
          <p className={`font-mono text-[8px] uppercase tracking-[0.22em] ${subtle}`}>
            Your contributing artifacts
          </p>
          <ul className="space-y-2">
            {summary.contributing.slice(0, 6).map((zine) => (
              <li
                key={zine.id}
                className={`flex flex-wrap items-center justify-between gap-2 border px-3 py-2 ${rowBorder}`}
              >
                <span className={`font-serif text-sm truncate max-w-[min(100%,14rem)] ${text}`}>
                  {zine.title || "Untitled issue"}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === zine.id}
                    onClick={() => void handleWithdrawCollective(zine)}
                    className={`px-2 py-1 border font-mono text-[7px] uppercase tracking-widest disabled:opacity-50 ${secondaryBtn}`}
                  >
                    {busyId === zine.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Withdraw collective"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === zine.id}
                    onClick={() => void handleUnpublish(zine)}
                    className={`px-2 py-1 border font-mono text-[7px] uppercase tracking-widest disabled:opacity-50 ${secondaryBtn}`}
                  >
                    Unpublish
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
          onClick={() => go("/residue")}
          className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest ${secondaryBtn}`}
        >
          Run residue pass
        </button>
      </div>

      {error ? (
        <p role="alert" className="font-sans text-[11px] text-red-400">{error}</p>
      ) : null}

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
      <p className={`font-mono text-[7px] uppercase tracking-[0.22em] ${subtle}`}>{label}</p>
      <p className={`font-serif text-2xl tabular-nums ${text}`}>{value}</p>
      <p className={`font-sans text-[10px] ${subtle}`}>{hint}</p>
    </div>
  );
};

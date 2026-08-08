import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import { useUser } from "../../contexts/UserContext";
import { useStudioDollSelection } from "../../hooks/useStudioDollSelection";
import {
  generateRipReading,
  listRipReadings,
  updateRipReading,
  buildPublicRipSnapshot,
} from "../../services/ripService";
import {
  listRipInsights,
  removeRipInsight,
  saveRipInsight,
  RIP_INSIGHTS_CHANGED,
} from "../../services/ripInsightService";
import type { Doll, RipReading, RipSavableInsight } from "../../types";
import { RipReadingView } from "../RipReadingView";
import { canonicalRipOrigin, getSiteSkin } from "../../lib/siteHost";

interface RipChamberProps {
  navigate: (path: string) => void;
}

export const RipChamber: React.FC<RipChamberProps> = ({ navigate }) => {
  const { user, profile, updateProfile } = useUser();
  const {
    dolls,
    activeDoll,
    activeDollId,
    setActiveDollId,
    loading: dollsLoading,
  } = useStudioDollSelection(user?.uid);
  const [reading, setReading] = useState<RipReading | null>(null);
  const [insights, setInsights] = useState<RipSavableInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readingDollStale =
    Boolean(reading?.sourceDollId && activeDollId && reading.sourceDollId !== activeDollId);

  const handle =
    profile?.handle ||
    user?.email?.split("@")[0]?.replace(/\s+/g, "-").toLowerCase() ||
    user?.uid?.slice(0, 8) ||
    "me";

  const derive = useCallback(async () => {
    if (!user?.uid || user.uid === "ghost") return;
    setLoading(true);
    setError(null);
    try {
      const doll: Doll | null = activeDoll ?? dolls[0] ?? null;
      if (doll && doll.id !== activeDollId) {
        setActiveDollId(doll.id);
      }
      const next = await generateRipReading({
        userId: user.uid,
        projectId: doll?.projectId,
        tasteGraphId: doll?.tasteGraphId,
        dossier: profile?.evidenceDossier || null,
        likeness: profile?.likenessManifest || null,
        doll,
        tailorDraft: profile?.tailorDraft || null,
      });
      setReading(next);
    } catch (e) {
      console.error("MIMI // Rip derive failed:", e);
      setError(e instanceof Error ? e.message : "Failed to derive rip");
    } finally {
      setLoading(false);
    }
  }, [
    user?.uid,
    activeDoll,
    activeDollId,
    dolls,
    setActiveDollId,
    profile?.evidenceDossier,
    profile?.likenessManifest,
    profile?.tailorDraft,
  ]);

  const refreshInsights = useCallback(async () => {
    if (!user?.uid || user.uid === "ghost") return;
    const rows = await listRipInsights(user.uid);
    setInsights(rows);
  }, [user?.uid]);

  useEffect(() => {
    void refreshInsights();
    const onChanged = (): void => {
      void refreshInsights();
    };
    window.addEventListener(RIP_INSIGHTS_CHANGED, onChanged);
    return () => window.removeEventListener(RIP_INSIGHTS_CHANGED, onChanged);
  }, [refreshInsights]);

  const handleSaveInsight = async (input: {
    kind: RipSavableInsight["kind"];
    label: string;
    value: string;
    inverseFunction?: RipSavableInsight["inverseFunction"];
  }) => {
    if (!user?.uid || !reading) return;
    await saveRipInsight(user.uid, {
      ...input,
      ripReadingId: reading.id,
      intent: input.kind === "experiment" ? "experiment_prompt" : "shadow_reference",
    });
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: { message: "Rip insight saved", type: "success" },
      }),
    );
  };

  const handleRemoveInsight = async (insightId: string) => {
    if (!user?.uid) return;
    await removeRipInsight(user.uid, insightId);
  };

  useEffect(() => {
    if (!user?.uid || user.uid === "ghost" || dollsLoading) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const existing = await listRipReadings(user.uid);
        if (cancelled) return;
        if (existing[0]) {
          setReading(existing[0]);
          return;
        }
        if (dolls.length === 0) {
          return;
        }
        const doll = activeDoll ?? dolls[0] ?? null;
        if (!doll) return;
        const next = await generateRipReading({
          userId: user.uid,
          projectId: doll.projectId,
          tasteGraphId: doll.tasteGraphId,
          dossier: profile?.evidenceDossier || null,
          likeness: profile?.likenessManifest || null,
          doll,
          tailorDraft: profile?.tailorDraft || null,
        });
        if (!cancelled) setReading(next);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load rip");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once per signed-in user + doll list ready; regenerate via explicit action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, dollsLoading, dolls.length]);

  const handleTogglePublish = async () => {
    if (!user?.uid || !reading || !updateProfile) return;
    setPublishing(true);
    try {
      const makingPublic = reading.visibility !== "public";
      if (makingPublic) {
        const snap = buildPublicRipSnapshot(handle, reading);
        await updateRipReading(user.uid, reading.id, { visibility: "public" });
        await updateProfile({ ...profile!, publicRip: snap });
        setReading({ ...reading, visibility: "public" });
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: { message: "Rip published to mimi.rip", type: "success" },
          }),
        );
      } else {
        await updateRipReading(user.uid, reading.id, { visibility: "private" });
        await updateProfile({ ...profile!, publicRip: null });
        setReading({ ...reading, visibility: "private" });
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: { message: "Rip unpublished (private again)", type: "success" },
          }),
        );
      }
    } catch (e) {
      console.error("MIMI // Rip publish failed:", e);
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const openPublicRip = () => {
    const skin = getSiteSkin();
    if (skin === "rip") {
      navigate(`/u/${handle}`);
      return;
    }
    // Same-host QA path + production domain hint
    window.open(`${canonicalRipOrigin()}/u/${handle}`, "_blank", "noopener,noreferrer");
  };

  const voidBtn =
    "px-3 py-1.5 border border-white/15 text-stone-300 font-mono text-[8px] tracking-widest hover:bg-white/5";

  return (
    <ChamberShell
      moduleId="mimi-rip"
      hideHeader
      hideHandoff
      tone="void"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {dolls.length > 0 ? (
            <label className="flex items-center gap-2">
              <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500">
                Shell
              </span>
              <select
                value={activeDollId ?? dolls[0]?.id ?? ""}
                onChange={(e) => setActiveDollId(e.target.value || null)}
                className="border border-white/15 bg-[#050506] text-stone-200 font-mono text-[8px] px-2 py-1.5 max-w-[180px]"
              >
                {dolls.map((doll) => (
                  <option key={doll.id} value={doll.id}>
                    {doll.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/mimi-dolls")}
            className={voidBtn}
          >
            Dolls
          </button>
          <button
            type="button"
            onClick={() => navigate("/tailor")}
            className={`${voidBtn} uppercase`}
          >
            Tailor
          </button>
          {reading?.visibility === "public" ? (
            <button
              type="button"
              onClick={openPublicRip}
              className="px-3 py-1.5 border border-rose-400/40 text-rose-200 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1"
            >
              Public rip <ExternalLink size={10} />
            </button>
          ) : null}
        </div>
      }
    >
      {!user?.uid ? (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4 h-full bg-[#050506]">
          <Sparkles className="text-stone-500" size={24} />
          <p className="font-serif italic text-xl text-stone-100">
            Sign in to derive your inverse taste reading.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("mimi:open_gateway"))}
            className="font-mono text-[9px] tracking-widest px-6 py-3 bg-stone-100 text-[#050506]"
          >
            Enter Mimi
          </button>
        </div>
      ) : loading && !reading ? (
        <div className="flex items-center justify-center h-full bg-[#050506]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Deriving rip from Taste Graph…
          </p>
        </div>
      ) : error && !reading ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 bg-[#050506]">
          <p className="font-mono text-[10px] text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void derive()}
            className={`${voidBtn} uppercase`}
          >
            Retry
          </button>
        </div>
      ) : dolls.length === 0 && !dollsLoading ? (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center bg-[#050506] max-w-lg mx-auto">
          <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-stone-500">
            Identity loop
          </p>
          <p className="font-serif italic text-lg text-stone-200 leading-relaxed">
            Rip reads refusals and blind spots from your Taste Graph — start with Tailor, project a
            doll shell, then return here.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <button
              type="button"
              onClick={() => navigate("/tailor")}
              className={`${voidBtn} uppercase`}
            >
              Tailor
            </button>
            <ArrowRight size={14} className="text-stone-600 hidden sm:block" />
            <button
              type="button"
              onClick={() => navigate("/mimi-dolls")}
              className={`${voidBtn} uppercase`}
            >
              Mimi Dolls
            </button>
          </div>
        </div>
      ) : reading ? (
        <div className="h-full overflow-y-auto">
          {readingDollStale ? (
            <div className="mx-4 mt-4 border border-amber-500/30 bg-amber-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="font-mono text-[8px] uppercase tracking-widest text-amber-200/90">
                Active shell changed — regenerate to refresh this inverse reading.
              </p>
              <button
                type="button"
                onClick={() => void derive()}
                className={`${voidBtn} uppercase self-start`}
              >
                Regenerate
              </button>
            </div>
          ) : null}
          <RipReadingView
            reading={reading}
            handle={handle}
            isOwner
            embedded
            regenerating={loading}
            publishing={publishing}
            onRegenerate={() => void derive()}
            onTogglePublish={() => void handleTogglePublish()}
            onSaveInsight={(input) => void handleSaveInsight(input)}
            onRemoveInsight={(id) => void handleRemoveInsight(id)}
            savedInsights={insights.map((i) => ({
              id: i.id,
              kind: i.kind,
              value: i.value,
            }))}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-[#050506]">
          <p className="font-serif italic text-lg text-stone-200 max-w-md">
            {activeDoll
              ? `Derive an inverse reading from ${activeDoll.name} — refusals, blind spots, and shadow motifs.`
              : "Accept a Tailor likeness or generate a Doll first — rip reads your refusals and blind spots."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void derive()}
              className={`${voidBtn} uppercase`}
            >
              Derive reading
            </button>
            <button
              type="button"
              onClick={() => navigate("/mimi-dolls")}
              className={`${voidBtn} uppercase`}
            >
              Open Dolls
            </button>
          </div>
        </div>
      )}
    </ChamberShell>
  );
};

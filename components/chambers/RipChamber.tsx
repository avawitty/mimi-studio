import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import { useUser } from "../../contexts/UserContext";
import { listDolls } from "../../services/tailorService";
import {
  generateRipReading,
  listRipReadings,
  updateRipReading,
  buildPublicRipSnapshot,
} from "../../services/ripService";
import type { Doll, RipReading } from "../../types";
import { RipReadingView } from "../RipReadingView";
import { canonicalRipOrigin, getSiteSkin } from "../../lib/siteHost";

interface RipChamberProps {
  navigate: (path: string) => void;
}

export const RipChamber: React.FC<RipChamberProps> = ({ navigate }) => {
  const { user, profile, updateProfile } = useUser();
  const [reading, setReading] = useState<RipReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const dolls = await listDolls(user.uid);
      const doll: Doll | null = dolls[0] || null;
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
  }, [user?.uid, profile?.evidenceDossier, profile?.likenessManifest, profile?.tailorDraft]);

  useEffect(() => {
    if (!user?.uid || user.uid === "ghost") return;
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
        // Auto-derive once when no reading exists
        const dolls = await listDolls(user.uid);
        if (cancelled) return;
        const next = await generateRipReading({
          userId: user.uid,
          projectId: dolls[0]?.projectId,
          tasteGraphId: dolls[0]?.tasteGraphId,
          dossier: profile?.evidenceDossier || null,
          likeness: profile?.likenessManifest || null,
          doll: dolls[0] || null,
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
    // Intentionally once per signed-in user; regenerate via explicit action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

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
        <div className="flex items-center gap-2">
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
      ) : reading ? (
        <div className="h-full overflow-y-auto">
          <RipReadingView
            reading={reading}
            handle={handle}
            isOwner
            embedded
            regenerating={loading}
            publishing={publishing}
            onRegenerate={() => void derive()}
            onTogglePublish={() => void handleTogglePublish()}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-[#050506]">
          <p className="font-serif italic text-lg text-stone-200 max-w-md">
            Accept a Tailor likeness or generate a Doll first — rip reads your refusals and blind spots.
          </p>
          <button
            type="button"
            onClick={() => void derive()}
            className={`${voidBtn} uppercase`}
          >
            Derive anyway
          </button>
        </div>
      )}
    </ChamberShell>
  );
};

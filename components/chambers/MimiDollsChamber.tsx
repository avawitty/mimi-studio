import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Sparkles, Wand2, Compass } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import { MimiYouHub } from "../tailor/MimiYouHub";
import { useUser } from "../../contexts/UserContext";
import { ProceduralDollStudio } from "./ProceduralDollStudio";
import type { Doll } from "../../types";
import { listDolls, updateDoll } from "../../services/tailorService";
import {
  type ProceduralDollAesthetic,
  readStoredActiveDollId,
  writeStoredActiveDollId,
} from "../../services/dollEngine";

interface MimiDollsChamberProps {
  navigate: (path: string) => void;
}

export const MimiDollsChamber: React.FC<MimiDollsChamberProps> = ({ navigate }) => {
  const { user, profile } = useUser();
  const [chamberView, setChamberView] = useState<"dresser" | "hub">("dresser");
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [boundDollId, setBoundDollId] = useState<string | null>(() => readStoredActiveDollId());
  const handle =
    profile?.handle ||
    user?.email?.split("@")[0]?.replace(/\s+/g, "-").toLowerCase() ||
    user?.uid?.slice(0, 8) ||
    "me";

  useEffect(() => {
    if (!user?.uid) {
      setDolls([]);
      return;
    }
    void listDolls(user.uid).then((list) => {
      setDolls(list);
      if (!boundDollId && list[0]) {
        setBoundDollId(list[0].id);
      } else if (boundDollId && !list.some((d) => d.id === boundDollId) && list[0]) {
        setBoundDollId(list[0].id);
      }
    });
  }, [user?.uid, boundDollId]);

  const boundDoll = dolls.find((d) => d.id === boundDollId) ?? null;

  const handleSelectDoll = (dollId: string) => {
    setBoundDollId(dollId);
    writeStoredActiveDollId(dollId);
  };

  const handleAestheticCommit = useCallback(
    async (aesthetic: ProceduralDollAesthetic) => {
      if (!user?.uid || !boundDoll) return;
      await updateDoll(user.uid, boundDoll.id, { proceduralAesthetic: aesthetic });
      setDolls((prev) =>
        prev.map((d) =>
          d.id === boundDoll.id
            ? { ...d, proceduralAesthetic: aesthetic, updatedAt: Date.now() }
            : d,
        ),
      );
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: `Procedural aesthetic saved on ${boundDoll.name}`,
            type: "success",
          },
        }),
      );
    },
    [user?.uid, boundDoll],
  );

  const openPublicProfile = () => {
    navigate(`/u/${handle}`);
  };

  return (
    <ChamberShell
      moduleId="mimi-dolls"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChamberView(chamberView === "dresser" ? "hub" : "dresser")}
            className="px-3 py-1.5 border border-purple-500 bg-purple-500/10 font-mono text-[8px] uppercase tracking-widest text-purple-300 hover:bg-purple-500/20 flex items-center gap-1.5"
          >
            {chamberView === "dresser" ? (
              <>
                <Compass size={11} /> Universe Hub
              </>
            ) : (
              <>
                <Wand2 size={11} /> 3D Dresser Studio
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/tailor")}
            className="px-3 py-1.5 border border-nous-border font-mono text-[8px] uppercase tracking-widest hover:bg-nous-base0/30"
          >
            Tailor Genome
          </button>
          <button
            type="button"
            onClick={openPublicProfile}
            className="px-3 py-1.5 border border-nous-border font-mono text-[8px] uppercase tracking-widest flex items-center gap-1 hover:bg-nous-base0/30"
          >
            Public Card <ExternalLink size={10} />
          </button>
        </div>
      }
    >
      {chamberView === "dresser" ? (
        <div className="flex flex-col gap-3 h-full min-h-0">
          <div className="flex flex-wrap items-center gap-3 px-1">
            <label className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
              Bound Doll
            </label>
            {user?.uid && dolls.length > 0 ? (
              <select
                value={boundDollId ?? ""}
                onChange={(e) => handleSelectDoll(e.target.value)}
                className="border border-nous-border bg-transparent font-mono text-[10px] px-2 py-1.5 max-w-[240px]"
              >
                {dolls.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-[9px] text-nous-subtle">
                {user?.uid
                  ? "No dolls yet — generate one from Tailor outputs."
                  : "Sign in to bind a Taste Graph doll."}
              </span>
            )}
            {boundDoll && (
              <span className="font-mono text-[8px] uppercase tracking-widest text-purple-300/80 truncate max-w-[280px]">
                {boundDoll.palette.slice(0, 3).join(" · ") || "palette pending"}
              </span>
            )}
          </div>
          <ProceduralDollStudio
            boundDoll={boundDoll}
            onAestheticCommit={user?.uid && boundDoll ? handleAestheticCommit : undefined}
            headerLabel={boundDoll?.name}
          />
        </div>
      ) : !user?.uid ? (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
          <Sparkles className="text-nous-subtle" size={24} />
          <p className="font-serif italic text-xl text-nous-text">Sign in to manage your editorial doll.</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("mimi:open_gateway"))}
            className="font-mono text-[9px] uppercase tracking-widest px-6 py-3 bg-nous-text text-nous-base"
          >
            Enter Mimi
          </button>
        </div>
      ) : (
        <MimiYouHub userId={user.uid} handle={handle} navigate={navigate} />
      )}
    </ChamberShell>
  );
};

import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Sparkles, Wand2, Compass, ArrowRight } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import { MimiYouHub } from "../tailor/MimiYouHub";
import { DollProfileScreen } from "../tailor/DollProfileScreen";
import { DollPortraitStage } from "../tailor/DollPortraitStage";
import { useUser } from "../../contexts/UserContext";
import { ProceduralDollStudio } from "./ProceduralDollStudio";
import { DollOnboardingFlow } from "../tailor/DollOnboardingFlow";
import type { Doll } from "../../types";
import { listDolls, updateDoll } from "../../services/tailorService";
import {
  MIMI_SHELL_STAPLE_VERSION,
  OMNI_LOOP_CULT,
  type ProceduralDollAesthetic,
  readStoredActiveDollId,
  resolveIdentityViewUrl,
  writeStoredActiveDollId,
} from "../../services/dollEngine";
import {
  isMimiYouTab,
  mimiYouTabPath,
  type MimiYouTab,
} from "../../lib/mimiYouRoutes";

interface MimiDollsChamberProps {
  navigate: (path: string) => void;
  /** Second path segment under /mimi-dolls/… — drives shell/hub/shader + hub tabs. */
  pathSegment?: string | null;
}

type ChamberView = "shell" | "shader" | "hub";

function viewFromSegment(segment: string | null | undefined): {
  view: ChamberView;
  hubTab: MimiYouTab;
} {
  if (!segment || segment === "shell") {
    return { view: "shell", hubTab: "overview" };
  }
  if (segment === "shader") {
    return { view: "shader", hubTab: "overview" };
  }
  if (segment === "universe" || isMimiYouTab(segment) || segment === "hub") {
    const hubTab: MimiYouTab =
      segment === "universe" || segment === "hub"
        ? "overview"
        : isMimiYouTab(segment)
          ? segment
          : "overview";
    return { view: "hub", hubTab };
  }
  return { view: "shell", hubTab: "overview" };
}

export const MimiDollsChamber: React.FC<MimiDollsChamberProps> = ({
  navigate,
  pathSegment = null,
}) => {
  const { user, profile } = useUser();
  const routed = viewFromSegment(pathSegment);
  const chamberView = routed.view;
  const hubTab = routed.hubTab;
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [boundDollId, setBoundDollId] = useState<string | null>(() => readStoredActiveDollId());
  const [openProfile, setOpenProfile] = useState(false);
  const [loadingDolls, setLoadingDolls] = useState(false);

  const setChamberView = (view: ChamberView) => {
    if (view === "shell") navigate("/mimi-dolls");
    else if (view === "shader") navigate("/mimi-dolls/shader");
    else navigate(mimiYouTabPath("overview"));
  };
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
    setLoadingDolls(true);
    void listDolls(user.uid)
      .then((list) => {
        setDolls(list);
        if (!boundDollId && list[0]) {
          setBoundDollId(list[0].id);
          writeStoredActiveDollId(list[0].id);
        } else if (boundDollId && !list.some((d) => d.id === boundDollId) && list[0]) {
          setBoundDollId(list[0].id);
          writeStoredActiveDollId(list[0].id);
        }
      })
      .finally(() => setLoadingDolls(false));
  }, [user?.uid, boundDollId]);

  const boundDoll = dolls.find((d) => d.id === boundDollId) ?? null;
  const shellUrl = boundDoll ? resolveIdentityViewUrl(boundDoll, "portrait") : null;

  const handleSelectDoll = (dollId: string) => {
    setBoundDollId(dollId);
    writeStoredActiveDollId(dollId);
    setOpenProfile(false);
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

  if (openProfile && boundDoll) {
    return (
      <DollProfileScreen
        doll={boundDoll}
        onBack={() => {
          setOpenProfile(false);
          if (user?.uid) {
            void listDolls(user.uid).then(setDolls);
          }
        }}
        onContinue={() => {
          setOpenProfile(false);
          if (user?.uid) {
            void listDolls(user.uid).then(setDolls);
          }
        }}
      />
    );
  }

  return (
    <ChamberShell
      moduleId="mimi-dolls"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setChamberView("shell")}
            className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest flex items-center gap-1.5 ${
              chamberView === "shell"
                ? "border-[var(--mimi-ink,#0a0a0a)] bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#fdfbf7)]"
                : "border-nous-border hover:bg-nous-base0/30"
            }`}
          >
            <Sparkles size={11} /> Shell
          </button>
          <button
            type="button"
            onClick={() => setChamberView("hub")}
            className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest flex items-center gap-1.5 ${
              chamberView === "hub"
                ? "border-[var(--mimi-ink,#0a0a0a)] bg-[var(--mimi-ink,#0a0a0a)] text-[var(--mimi-field,#fdfbf7)]"
                : "border-nous-border hover:bg-nous-base0/30"
            }`}
          >
            <Compass size={11} /> Universe
          </button>
          <button
            type="button"
            onClick={() => setChamberView("shader")}
            className={`px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest flex items-center gap-1.5 ${
              chamberView === "shader"
                ? "border-nous-border bg-nous-base0/40"
                : "border-nous-border/50 text-nous-subtle hover:bg-nous-base0/20"
            }`}
          >
            <Wand2 size={11} /> Shader lab
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
      {chamberView === "shell" ? (
        <div className="h-full min-h-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 flex flex-col gap-6">
            <header className="space-y-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-nous-subtle">
                {OMNI_LOOP_CULT.name} · {MIMI_SHELL_STAPLE_VERSION}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-nous-text">Ball-jointed resin cult shell</h2>
              <p className="font-serif italic text-nous-subtle max-w-xl">
                {OMNI_LOOP_CULT.thesis}. Same ball-jointed resin BJD species — taste dresses the shell.
              </p>
            </header>

            {!user?.uid ? (
              <div className="border border-dashed border-nous-border/40 p-10 text-center space-y-4">
                <p className="font-serif italic text-lg text-nous-text">Sign in to project your shell.</p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("mimi:open_gateway"))}
                  className="font-mono text-[9px] uppercase tracking-widest px-6 py-3 bg-nous-text text-nous-base"
                >
                  Enter Mimi
                </button>
              </div>
            ) : loadingDolls ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">Loading shells…</p>
            ) : dolls.length === 0 ? (
              <DollOnboardingFlow
                userId={user.uid}
                onComplete={(doll) => {
                  setDolls([doll]);
                  setBoundDollId(doll.id);
                  writeStoredActiveDollId(doll.id);
                }}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                    Active shell
                  </label>
                  <select
                    value={boundDollId ?? ""}
                    onChange={(e) => handleSelectDoll(e.target.value)}
                    className="border border-nous-border bg-transparent font-mono text-[10px] px-2 py-1.5 max-w-[260px]"
                  >
                    {dolls.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {resolveIdentityViewUrl(d, "portrait") ? "" : " · projecting…"}
                      </option>
                    ))}
                  </select>
                </div>

                {boundDoll ? (
                  <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 items-start">
                    <div className="relative aspect-[3/4] max-h-[70vh] border border-nous-border/30 overflow-hidden bg-stone-950">
                      {shellUrl ? (
                        <img
                          src={shellUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover object-[center_18%]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <DollPortraitStage doll={boundDoll} className="absolute inset-0 w-full h-full" />
                      )}
                      {!shellUrl ? (
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="font-mono text-[8px] uppercase tracking-widest text-amber-200/90">
                            No plate yet — open conditioning to run shell projection
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-serif text-2xl text-nous-text mb-1">{boundDoll.name}</h3>
                        <p className="text-sm text-nous-subtle leading-relaxed">
                          {boundDoll.description || boundDoll.creativePhilosophy || "Taste Graph projection."}
                        </p>
                      </div>
                      <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                        {boundDoll.palette.slice(0, 4).join(" · ") || "palette pending"}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenProfile(true)}
                          className="px-5 py-3 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-widest"
                        >
                          {shellUrl ? "Open conditioning" : "Run shell projection"}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(mimiYouTabPath("time-travel"))}
                          className="px-5 py-3 border border-nous-border font-mono text-[9px] uppercase tracking-widest"
                        >
                          Time travel
                        </button>
                        <button
                          type="button"
                          onClick={() => setChamberView("shader")}
                          className="px-5 py-3 border border-nous-border font-mono text-[9px] uppercase tracking-widest text-nous-subtle"
                        >
                          Shader lab
                        </button>
                      </div>
                      <p className="font-mono text-[7px] uppercase tracking-widest text-nous-subtle/80">
                        Shader lab is a separate realtime playground — not the Imagen shell.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : chamberView === "shader" ? (
        <div className="flex flex-col gap-3 h-full min-h-0">
          <div className="flex flex-wrap items-center gap-3 px-1">
            <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
              Shader lab · optional · not the shell plate
            </p>
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
                  ? "No dolls yet — generate one from Tailor, then return."
                  : "Sign in to bind a Taste Graph doll."}
              </span>
            )}
            <button
              type="button"
              onClick={() => setChamberView("shell")}
              className="ml-auto font-mono text-[8px] uppercase tracking-widest border border-nous-border px-3 py-1.5"
            >
              Back to shell
            </button>
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
        <MimiYouHub
          userId={user.uid}
          handle={handle}
          navigate={navigate}
          activeTab={hubTab}
        />
      )}
    </ChamberShell>
  );
};

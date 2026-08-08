import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "../contexts/UserContext";
import { fetchUserZines } from "../services/firebaseUtils";
import { generateSignature, patchSignatureFromEvidence } from "../services/signatureService";
import { AestheticSignature } from "../types";
import { SignatureImageGenerator } from "./SignatureImageGenerator";
import { Share2, Download, Fingerprint, Activity, Layers, Sparkles } from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import * as htmlToImage from "html-to-image";
import { SignaturePlate } from "./signature/SignaturePlate";
import { SignatureApproveBar, SignatureReading } from "./signature/SignatureReading";
import { PublicField, PublicCTA } from "./public-face";
import { PressReveal } from "./motion/PressReveal";
import {
  getApprovedUsedContext,
  subscribeUsedContext,
} from "../services/usedContextService";
import { useTasteModel } from "../hooks/useTasteModel";
import { recordAndRecompile } from "../services/tasteModelService";
import { useFeedback } from "../hooks/useFeedback";
import {
  computeSignatureFingerprint,
  fingerprintKey,
  shouldPatchSignatureOnly,
} from "../lib/signature/signatureFingerprint";

const SignatureSkeleton = () => (
  <PublicField bleed className="w-full min-h-full font-serif pb-20 md:pb-28">
    <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-16 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-nous-border pb-8">
        <div>
          <div className="h-16 w-64 bg-stone-200 mb-4" />
          <div className="h-4 w-48 bg-stone-200" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-32 bg-stone-200" />
          <div className="h-10 w-32 bg-stone-200" />
        </div>
      </div>
      <div className="grid md:grid-cols-12 gap-8 mt-12">
        <div className="md:col-span-5">
          <div className="bg-nous-base border border-nous-border p-8 h-[400px]" />
        </div>
        <div className="md:col-span-7">
          <div className="bg-stone-200 w-full h-[400px]" />
        </div>
      </div>
    </div>
  </PublicField>
);

export const SignatureView: React.FC = () => {
  const { user, profile, updateProfile, activePersona } = useUser();
  const feedback = useFeedback();
  const [signature, setSignature] = useState<AestheticSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const dnaCardRef = useRef<HTMLDivElement>(null);
  const lastFingerprintRef = useRef<string | null>(null);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPatchRef = useRef(true);

  const { activeSnapshot } = useTasteModel({
    userId: user?.uid ?? "",
    autoLoad: Boolean(user?.uid),
  });

  const approvedContext = getApprovedUsedContext(undefined, user?.uid || profile?.uid);

  const buildGenerationContext = useCallback(
    async (prior?: AestheticSignature | null) => {
      if (!user) return null;
      const zines = await fetchUserZines(user.uid, true);
      return {
        zines,
        tailorDraft: activePersona?.tailorDraft || profile?.tailorDraft || null,
        approvedUsedContext: getApprovedUsedContext(undefined, user.uid),
        tasteSnapshot: activeSnapshot,
        priorSignature: prior ?? profile?.tasteProfile?.aestheticSignature ?? null,
      };
    },
    [user, activePersona, profile, activeSnapshot],
  );

  const persistSignature = useCallback(
    async (sig: AestheticSignature) => {
      setSignature(sig);
      if (!profile) return;
      await updateProfile({
        ...profile,
        tasteProfile: {
          ...profile.tasteProfile!,
          aestheticSignature: sig,
        },
      });
    },
    [profile, updateProfile],
  );

  const runGeneration = useCallback(
    async (prior?: AestheticSignature | null) => {
      if (!user) return;
      setBusy(true);
      try {
        const ctx = await buildGenerationContext(prior);
        if (!ctx) return;
        if (ctx.zines.length === 0 && !ctx.approvedUsedContext?.length) {
          window.dispatchEvent(
            new CustomEvent("mimi:toast", {
              detail: {
                message: "Add a zine or approve Used Context first.",
                type: "info",
              },
            }),
          );
          return;
        }
        const sig = await generateSignature(ctx);
        lastFingerprintRef.current = fingerprintKey(computeSignatureFingerprint(ctx));
        await persistSignature(sig);
      } catch (error) {
        console.error("MIMI // SignatureView: Error generating signature:", error);
      } finally {
        setBusy(false);
      }
    },
    [user, buildGenerationContext, persistSignature],
  );

  useEffect(() => {
    const init = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (profile?.tasteProfile?.aestheticSignature) {
        const cached = profile.tasteProfile.aestheticSignature;
        setSignature(cached);
        lastFingerprintRef.current = cached.contextFingerprint ?? null;
        setLoading(false);
        return;
      }

      try {
        const ctx = await buildGenerationContext();
        if (ctx && (ctx.zines.length > 0 || (ctx.approvedUsedContext?.length ?? 0) > 0)) {
          const sig = await generateSignature(ctx);
          lastFingerprintRef.current = fingerprintKey(computeSignatureFingerprint(ctx));
          await persistSignature(sig);
        }
      } catch (error) {
        console.error("MIMI // SignatureView: Error generating signature:", error);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [user, profile?.tasteProfile?.aestheticSignature, buildGenerationContext, persistSignature]);

  useEffect(() => {
    if (!user || !signature) return;

    const scheduleEvidencePatch = () => {
      if (skipNextPatchRef.current || busy || loading) return;
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
      patchTimerRef.current = setTimeout(() => {
        void (async () => {
          const ctx = await buildGenerationContext(signature);
          if (!ctx) return;
          const nextFp = fingerprintKey(computeSignatureFingerprint(ctx));
          const prevFp = lastFingerprintRef.current;
          if (!prevFp || prevFp === nextFp) return;

          const prev = JSON.parse(prevFp) as ReturnType<typeof computeSignatureFingerprint>;
          const next = computeSignatureFingerprint(ctx);
          if (!shouldPatchSignatureOnly(prev, next)) return;

          const prevIds = new Set(prev.approvedAtomIds);
          const nextIds = new Set(next.approvedAtomIds);
          const removedAtomIds = prev.approvedAtomIds.filter((id) => !nextIds.has(id));
          const addedApproved = (ctx.approvedUsedContext ?? []).filter(
            (e) => e.approved && !prevIds.has(e.atomId),
          );

          setBusy(true);
          try {
            const patched = await patchSignatureFromEvidence(signature, ctx, {
              addedApproved,
              removedAtomIds,
            });
            lastFingerprintRef.current = nextFp;
            await persistSignature(patched);
            window.dispatchEvent(
              new CustomEvent("mimi:toast", {
                detail: {
                  message: "Reading updated from new evidence",
                  type: "info",
                },
              }),
            );
          } catch (error) {
            console.error("MIMI // SignatureView: evidence patch failed:", error);
          } finally {
            setBusy(false);
          }
        })();
      }, 700);
    };

    const unsubscribe = subscribeUsedContext(scheduleEvidencePatch);
    return () => {
      unsubscribe();
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    };
  }, [user, signature, busy, loading, buildGenerationContext, persistSignature]);

  useEffect(() => {
    if (!loading && signature) {
      skipNextPatchRef.current = false;
      if (!lastFingerprintRef.current && signature.contextFingerprint) {
        lastFingerprintRef.current = signature.contextFingerprint;
      }
    }
  }, [loading, signature]);

  const handleExport = async (format: "plate" | "story" = "plate") => {
    if (!dnaCardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(dnaCardRef.current, {
        quality: 1,
        pixelRatio: 2,
        fontEmbedCSS: "",
      });

      if (format === "plate") {
        const link = document.createElement("a");
        link.download = "mimi-signature-plate.png";
        link.href = dataUrl;
        link.click();
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load signature plate"));
        img.src = dataUrl;
      });
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(10,10,10,0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const x = (W / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      const maxW = W * 0.86;
      const maxH = H * 0.55;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (W - dw) / 2;
      const dy = H * 0.22;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.fillStyle = "#0A0A0A";
      ctx.font = 'italic 42px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = "center";
      ctx.fillText("Mimi", W / 2, dy - 48);
      ctx.font = '11px "Geist Variable", sans-serif';
      ctx.fillStyle = "#78716c";
      const handleLabel = profile?.handle ? `@${profile.handle}` : "Signature";
      ctx.fillText(handleLabel, W / 2, dy + dh + 56);
      const storyUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "mimi-signature-story.png";
      link.href = storyUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export signature", err);
    }
  };

  const handleCopyShareLink = async () => {
    const handle = profile?.handle;
    const url = handle
      ? `${window.location.origin}/u/${handle}/signature`
      : `${window.location.origin}/signature`;
    try {
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(
        new CustomEvent("mimi:toast", {
          detail: { message: "Share link copied", type: "success" },
        }),
      );
    } catch {
      window.prompt("Copy share link", url);
    }
  };

  const handleHandoff = (mode: string) => {
    window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: mode }));
  };

  const handleApprove = async () => {
    if (!user || !signature || !profile) return;
    setBusy(true);
    try {
      const approved: AestheticSignature = {
        ...signature,
        status: "approved",
        approvedAt: Date.now(),
        contextFingerprint:
          signature.contextFingerprint ?? lastFingerprintRef.current ?? undefined,
      };
      await persistSignature(approved);
      try {
        await recordAndRecompile({
          userId: user.uid,
          action: "mark_signature",
          targetType: "artifact",
          targetId: `signature-v${approved.version ?? 1}`,
          surface: "signature",
          polarity: 1,
          strength: 1,
          explicit: true,
        });
      } catch (err) {
        console.warn("MIMI // mark_signature taste event skipped:", err);
      }
      feedback.trigger("proposal.approved");
      window.dispatchEvent(
        new CustomEvent("mimi:toast", {
          detail: { message: "Signature approved", type: "success" },
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRepair = () => {
    handleHandoff("tailor");
  };

  if (loading) return <SignatureSkeleton />;

  if (!signature) {
    return (
      <PublicField
        bleed
        className="w-full min-h-full flex flex-col items-center justify-center p-12 text-center font-serif"
      >
        <Fingerprint size={48} className="text-[var(--mimi-stone)] mb-6" />
        <h2 className="font-serif italic text-3xl text-[var(--mimi-ink)] mb-2">
          No Signature Found
        </h2>
        <p className="text-[var(--mimi-stone)] max-w-md mb-6">
          Your archive is empty. Create artifacts in Studio or approve Used Context, then
          compose your aesthetic reading.
        </p>
        <PublicCTA onClick={() => void runGeneration()} disabled={busy}>
          Compose signature
        </PublicCTA>
      </PublicField>
    );
  }

  return (
    <PublicField bleed className="w-full min-h-full font-serif selection:bg-black/5 pb-16 md:pb-24">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12 md:space-y-16">
        <PressReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--mimi-hairline)] pb-8">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-7xl font-light italic tracking-tight text-[var(--mimi-ink)]">
                Signature
              </h1>
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[var(--mimi-stone)]">
                Taste reading · collectible plate
              </p>
              {activePersona?.tailorDraft ? (
                <p className="font-sans text-[10px] uppercase tracking-widest text-[var(--mimi-stone)] mt-2 flex items-center gap-1">
                  <Sparkles size={10} /> Influenced by active Tailor directives
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <PublicCTA variant="ghost" onClick={() => void runGeneration(signature)} disabled={busy}>
                Re-sync
              </PublicCTA>
              <PublicCTA variant="ghost" onClick={() => handleExport("plate")}>
                <Download size={14} /> Plate PNG
              </PublicCTA>
              <PublicCTA onClick={() => handleExport("story")}>
                <Share2 size={14} /> Story 9:16
              </PublicCTA>
              <button
                type="button"
                onClick={() => void handleCopyShareLink()}
                className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)]"
              >
                Link
              </button>
            </div>
          </div>
        </PressReveal>

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-5 relative group">
            <SignaturePlate
              ref={dnaCardRef}
              signature={signature}
              handle={profile?.handle}
              approvedAtomCount={approvedContext.length}
            />
          </div>
          <div className="md:col-span-7">
            <SignatureImageGenerator signature={signature} />
          </div>
        </div>

        <SignatureApproveBar
          status={signature.status}
          onApprove={() => void handleApprove()}
          onRepair={handleRepair}
          busy={busy}
        />

        <SignatureReading signature={signature} onHandoff={handleHandoff} />

        <details className="border-t border-[var(--mimi-hairline)] pt-6 group">
          <summary className="cursor-pointer list-none font-sans text-[10px] uppercase tracking-[0.28em] text-[var(--mimi-stone)] hover:text-[var(--mimi-ink)]">
            Analytics & motif evolution
          </summary>
          <div className="grid md:grid-cols-2 gap-8 pt-8">
            <div className="space-y-6 min-h-[300px]">
              <div className="flex items-center gap-3">
                <Activity className="text-[var(--mimi-olive)]" size={20} />
                <h3 className="text-2xl italic">Creative Cycles</h3>
              </div>
              <p className="font-sans text-[10px] uppercase tracking-widest text-[var(--mimi-stone)] mb-6">
                Output volume & mood patterns
              </p>
              <div className="h-[300px] w-full border border-[var(--mimi-hairline)] p-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart
                    data={signature.creativeCycles}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--mimi-olive)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--mimi-olive)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="period"
                      stroke="#78716c"
                      tick={{ fill: "#a8a29e", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#78716c"
                      tick={{ fill: "#a8a29e", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1917",
                        border: "1px solid #292524",
                        borderRadius: "0px",
                      }}
                      itemStyle={{
                        color: "var(--mimi-olive)",
                        fontFamily: "monospace",
                        fontSize: "12px",
                      }}
                      labelStyle={{
                        color: "#a8a29e",
                        fontFamily: "serif",
                        fontStyle: "italic",
                        marginBottom: "4px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="outputCount"
                      stroke="var(--mimi-olive)"
                      fillOpacity={1}
                      fill="url(#colorOutput)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6 min-h-[300px]">
              <div className="flex items-center gap-3">
                <Layers className="text-[var(--mimi-stone)]" size={20} />
                <h3 className="text-2xl italic">Motif Frequency</h3>
              </div>
              <p className="font-sans text-[10px] uppercase tracking-widest text-[var(--mimi-stone)] mb-6">
                Evolution of recurring visual elements
              </p>
              <div className="h-[300px] w-full border border-[var(--mimi-hairline)] p-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      type="number"
                      dataKey="date"
                      domain={["auto", "auto"]}
                      tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                      stroke="#78716c"
                      tick={{ fill: "#a8a29e", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="motif"
                      stroke="#78716c"
                      tick={{ fill: "#a8a29e", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <ZAxis type="number" dataKey="frequency" range={[20, 200]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        backgroundColor: "#1c1917",
                        border: "1px solid #292524",
                        borderRadius: "0px",
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === "frequency") return [value, "Frequency"];
                        return [];
                      }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Scatter
                      name="Motifs"
                      data={signature.motifEvolution}
                      fill="var(--mimi-olive)"
                      opacity={0.6}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <h3 className="text-2xl italic mb-6">Motif Relationships</h3>
              <div className="border border-[var(--mimi-hairline)] p-8 flex flex-wrap justify-center items-center gap-x-8 gap-y-6">
                {signature.motifs.map((m, i) => (
                  <div key={m} className="flex items-center gap-8">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--mimi-stone)]">
                      {m}
                    </span>
                    {i < signature.motifs.length - 1 ? (
                      <div className="w-8 h-px bg-[var(--mimi-hairline)]" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>
    </PublicField>
  );
};

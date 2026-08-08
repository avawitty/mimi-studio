/**
 * Residue Engine chamber — Phase 8 UI (main #124) + Phase 9 Apify toggle.
 * Offline-first cultural / emotional runs with optional token-gated acquisition.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Play, Radar } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import {
  RESIDUE_CHAMBER_COPY,
  RESIDUE_ENGINE_TABS,
  RESIDUE_HANDOFF_TARGETS,
  RESIDUE_RESULT_TAB_LABELS,
  RESIDUE_RESULT_TABS,
  type ResidueEngineTab,
  type ResidueResultTab,
} from "../../lib/residueChamberContract";
import { auth } from "../../services/firebase";
import {
  adaptResidueToMeanMedianMode,
  buildResidueProductOutputBundle,
  runCulturalResidue,
  runEmotionalResidue,
  type CulturalResidueResult,
  type EmotionalResidueResult,
  type MeanMedianModeResult,
  type SourceReference,
} from "../../services/residue";
import { ResidueSafetyBanner } from "../residue/ResidueSafetyBanner";
import {
  ResidueCulturalSynthesis,
  ResidueEmotionalSynthesis,
  ResidueEvidencePanel,
  ResidueMmmPanel,
  ResidueProductsPanel,
  type ResidueProductBundleView,
} from "../residue/ResiduePanels";

interface ResidueChamberProps {
  navigate?: (path: string) => void;
}

interface SessionRun {
  runId: string;
  mode: ResidueEngineTab;
  label: string;
  createdAt: string;
  usedLlm: boolean;
  usedApify: boolean;
  cultural?: CulturalResidueResult;
  emotional?: EmotionalResidueResult;
  mmm: {
    interpretive: MeanMedianModeResult;
    literal?: MeanMedianModeResult;
  };
  products: ResidueProductBundleView;
}

const tabBtn = (active: boolean) =>
  `px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.2em] border transition-colors ${
    active
      ? "bg-nous-text text-nous-base border-nous-text"
      : "bg-white text-nous-subtle border-nous-border hover:text-nous-text"
  }`;

export const ResidueChamber: React.FC<ResidueChamberProps> = ({ navigate }) => {
  const [engineTab, setEngineTab] = useState<ResidueEngineTab>("cultural");
  const [resultTab, setResultTab] = useState<ResidueResultTab>("synthesis");
  const [query, setQuery] = useState("indie sleaze");
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SessionRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [useApify, setUseApify] = useState(false);
  const [apifyAvailable, setApifyAvailable] = useState(false);
  const [apifyNotice, setApifyNotice] = useState<string | null>(null);
  const [apifyActorId, setApifyActorId] = useState<string | null>(null);

  const activeRun = useMemo(
    () => history.find((r) => r.runId === activeRunId) ?? history[0] ?? null,
    [history, activeRunId],
  );

  const showEmotionalSafety =
    engineTab === "emotional" || activeRun?.mode === "emotional";

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("q");
    if (param?.trim()) {
      setQuery(param.trim());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/residue-acquire");
        if (!res.ok) return;
        const data = (await res.json()) as {
          available?: boolean;
          notice?: string;
          actorId?: string;
        };
        if (cancelled) return;
        setApifyAvailable(Boolean(data.available));
        setApifyNotice(data.notice || null);
        setApifyActorId(data.actorId || null);
      } catch {
        if (!cancelled) {
          setApifyAvailable(false);
          setApifyNotice("Could not reach Residue Apify status endpoint.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const go = useCallback(
    (view: string) => {
      if (navigate) {
        navigate(`/${view}`);
        return;
      }
      window.dispatchEvent(
        new CustomEvent("mimi:change_view", { detail: view }),
      );
    },
    [navigate],
  );

  const runAnalysis = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter a query or experience first.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const noteList = notes
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

      let apifySources: SourceReference[] | undefined;
      if (useApify) {
        apifySources = await fetchApifySourcesForResidue({
          mode: engineTab,
          inquiry:
            engineTab === "cultural" ? trimmed : "[redacted-emotional-input]",
        });
      }

      if (engineTab === "cultural") {
        const { result, usedLlm } = await runCulturalResidue(
          {
            query: trimmed,
            userNotes: noteList.length ? noteList : undefined,
            retention: "temporary",
            consentToStore: false,
          },
          {
            llm: { offline: true },
            sources: apifySources,
          },
        );
        const mmm = adaptResidueToMeanMedianMode(result, {
          includeLiteralCompanion: true,
        });
        const products = buildResidueProductOutputBundle(result);
        const session: SessionRun = {
          runId: result.metadata.runId,
          mode: "cultural",
          label: result.query,
          createdAt: result.metadata.createdAt,
          usedLlm,
          usedApify: Boolean(apifySources?.length),
          cultural: result,
          mmm,
          products,
        };
        setHistory((prev) => [session, ...prev].slice(0, 12));
        setActiveRunId(session.runId);
        setResultTab("synthesis");
      } else {
        const { result, usedLlm } = await runEmotionalResidue(
          {
            experience: trimmed,
            userNotes: noteList.length ? noteList : undefined,
            retention: "temporary",
            consentToStore: false,
          },
          {
            llm: { offline: true },
            sources: apifySources,
          },
        );
        const mmm = adaptResidueToMeanMedianMode(result, {
          includeLiteralCompanion: true,
        });
        const products = buildResidueProductOutputBundle(result);
        const session: SessionRun = {
          runId: result.metadata.runId,
          mode: "emotional",
          label: result.normalizedExperience.slice(0, 72),
          createdAt: result.metadata.createdAt,
          usedLlm,
          usedApify: Boolean(apifySources?.length),
          emotional: result,
          mmm,
          products,
        };
        setHistory((prev) => [session, ...prev].slice(0, 12));
        setActiveRunId(session.runId);
        setResultTab("synthesis");
      }
    } catch (e) {
      console.error("MIMI // Residue run failed:", e);
      setError(e instanceof Error ? e.message : "Residue run failed");
    } finally {
      setRunning(false);
    }
  }, [engineTab, notes, query, useApify]);

  const resultBody = (() => {
    if (!activeRun) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 px-6">
          <Radar className="text-nous-subtle" size={22} aria-hidden />
          <p className="font-serif italic text-lg text-nous-text max-w-md leading-relaxed">
            Run a cultural or emotional pass to open synthesis, evidence, M/M/M,
            and product proposals.
          </p>
        </div>
      );
    }

    switch (resultTab) {
      case "synthesis":
        return activeRun.mode === "cultural" && activeRun.cultural ? (
          <ResidueCulturalSynthesis result={activeRun.cultural} />
        ) : activeRun.emotional ? (
          <ResidueEmotionalSynthesis result={activeRun.emotional} />
        ) : null;
      case "evidence": {
        const result = activeRun.cultural ?? activeRun.emotional;
        if (!result) return null;
        return (
          <ResidueEvidencePanel
            evidence={result.evidence}
            sources={result.sources}
          />
        );
      }
      case "mmm":
        return (
          <ResidueMmmPanel
            interpretive={activeRun.mmm.interpretive}
            literal={activeRun.mmm.literal}
          />
        );
      case "products":
        return <ResidueProductsPanel bundle={activeRun.products} />;
      case "history":
        return (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="font-sans text-[12px] text-nous-subtle">
                No session runs yet.
              </p>
            ) : (
              history.map((run) => (
                <button
                  key={run.runId}
                  type="button"
                  onClick={() => {
                    setActiveRunId(run.runId);
                    setEngineTab(run.mode);
                    setResultTab("synthesis");
                  }}
                  className={`w-full text-left border px-4 py-3 transition-colors ${
                    run.runId === activeRun.runId
                      ? "border-nous-text bg-white"
                      : "border-nous-border bg-white/70 hover:border-nous-text/40"
                  }`}
                >
                  <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-nous-subtle">
                    {run.mode} · {new Date(run.createdAt).toLocaleString()} ·{" "}
                    {run.usedLlm ? "gateway" : "offline"}
                    {run.usedApify ? " · apify" : ""}
                  </p>
                  <p className="font-serif text-[15px] text-nous-text mt-1">
                    {run.label}
                  </p>
                </button>
              ))
            )}
          </div>
        );
      default: {
        const _exhaustive: never = resultTab;
        return _exhaustive;
      }
    }
  })();

  return (
    <ChamberShell
      moduleId="residue"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {RESIDUE_HANDOFF_TARGETS.map((target) => (
            <button
              key={target.view}
              type="button"
              onClick={() => go(target.view)}
              className="px-3 py-1.5 border border-nous-border text-nous-subtle font-mono text-[8px] uppercase tracking-widest hover:text-nous-text hover:border-nous-text/40"
            >
              {target.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-nous-base">
        <div className="max-w-5xl mx-auto px-5 md:px-10 py-8 space-y-8">
          <div className="space-y-3 max-w-2xl">
            <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
              {RESIDUE_CHAMBER_COPY.thesis}
            </p>
            <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
              {RESIDUE_CHAMBER_COPY.temporaryNote}
            </p>
          </div>

          {showEmotionalSafety ? <ResidueSafetyBanner compact /> : null}

          <section className="border border-nous-border bg-white px-5 py-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {RESIDUE_ENGINE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEngineTab(tab)}
                  className={tabBtn(engineTab === tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <p className="font-sans text-[12px] text-nous-subtle leading-relaxed">
              {engineTab === "cultural"
                ? RESIDUE_CHAMBER_COPY.culturalHint
                : RESIDUE_CHAMBER_COPY.emotionalHint}
            </p>

            <label className="block space-y-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle">
                {engineTab === "cultural" ? "Query" : "Experience"}
              </span>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={engineTab === "emotional" ? 4 : 2}
                className="w-full border border-nous-border bg-nous-base px-4 py-3 font-serif text-[15px] text-nous-text outline-none focus:border-nous-text resize-y min-h-[3.5rem]"
                placeholder={
                  engineTab === "cultural"
                    ? "e.g. indie sleaze, coastal granddaughter…"
                    : "Describe the experience in your words…"
                }
              />
            </label>

            <label className="block space-y-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle">
                Optional notes (one per line)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-nous-border bg-nous-base px-4 py-3 font-sans text-[12px] text-nous-text outline-none focus:border-nous-text resize-y"
                placeholder="Paste short source notes or observations…"
              />
            </label>

            <label className="flex items-start gap-3 border border-nous-border px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={useApify}
                disabled={!apifyAvailable}
                onChange={(e) => setUseApify(e.target.checked)}
              />
              <span className="space-y-1">
                <span className="block font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle">
                  Acquire via Apify {apifyAvailable ? "(live)" : "(unavailable)"}
                </span>
                <span className="block font-sans text-[11px] text-nous-subtle leading-relaxed">
                  {apifyAvailable
                    ? `Signed-in live scrape via ${apifyActorId || "configured Actor"}. Emotional mode sends a redacted inquiry only.`
                    : apifyNotice ||
                      "Set APIFY_TOKEN on the server to enable. Offline notes still work."}
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void runAnalysis()}
                disabled={running}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-[0.22em] disabled:opacity-50"
              >
                {running ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} />
                )}
                {running
                  ? "Running…"
                  : useApify
                    ? "Run pass (+ Apify)"
                    : "Run offline pass"}
              </button>
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-nous-subtle">
                Offline-first · Apify optional · gateway enrichment optional
              </span>
            </div>

            {error ? (
              <p className="font-mono text-[10px] text-rose-700">{error}</p>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {RESIDUE_RESULT_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setResultTab(tab)}
                  className={tabBtn(resultTab === tab)}
                >
                  {RESIDUE_RESULT_TAB_LABELS[tab]}
                  {tab === "history" && history.length > 0
                    ? ` (${history.length})`
                    : ""}
                </button>
              ))}
            </div>

            {activeRun && resultTab !== "history" ? (
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-nous-subtle">
                Active · {activeRun.mode} · {activeRun.runId} ·{" "}
                {activeRun.usedLlm ? "gateway" : "offline heuristics"}
                {activeRun.usedApify ? " · apify sources" : ""}
              </p>
            ) : null}

            <div className="min-h-[12rem]">{resultBody}</div>
          </section>
        </div>
      </div>
    </ChamberShell>
  );
};

async function fetchApifySourcesForResidue(input: {
  mode: ResidueEngineTab;
  inquiry: string;
}): Promise<SourceReference[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await auth.currentUser?.getIdToken();
  if (token) headers["x-user-token"] = `Bearer ${token}`;

  const res = await fetch("/api/residue-acquire", {
    method: "POST",
    headers,
    body: JSON.stringify({
      inquiry: input.inquiry,
      mode: input.mode,
      maxItems: 5,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.error?.message ||
      (res.status === 401
        ? "Sign in required for Apify acquisition."
        : "Apify acquisition failed.");
    throw new Error(message);
  }
  if (data?.status === "disabled") {
    throw new Error(data?.warnings?.[0] || "Apify acquisition disabled.");
  }
  const refs = Array.isArray(data?.sourceReferences) ? data.sourceReferences : [];
  if (!refs.length) {
    throw new Error(data?.warnings?.[0] || "Apify returned no sources.");
  }
  return refs as SourceReference[];
}

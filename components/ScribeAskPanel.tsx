import React, { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Save,
  Sparkles,
  Database,
  HelpCircle,
  Trash2,
  Check,
  Compass,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUser } from "../contexts/UserContext";
import {
  retrieveScribeContext,
  askScribeExplainable,
  approveScribeInference,
  saveScribeDecision,
  type ScribeAnswer,
  type ScribeContextItem,
} from "../services/scribeService";
import { listTailorProjects } from "../services/tailorService";
import type { TailorProject } from "../types";

const SUGGESTED_PROMPTS: { label: string; hint: string; query: string; icon: React.ReactNode }[] = [
  {
    label: "Trace a pattern",
    hint: "Surface recurring motifs across your saved work",
    query:
      "What visual motifs and themes keep recurring across my saved context, and what do they say about my taste?",
    icon: <Compass size={14} />,
  },
  {
    label: "Challenge the direction",
    hint: "Pressure-test the choice you're leaning toward",
    query:
      "Challenge the creative direction I'm currently taking. Where might it be too safe, derivative, or inconsistent with my past decisions?",
    icon: <AlertCircle size={14} />,
  },
  {
    label: "Create an artifact",
    hint: "Turn your memory into something usable",
    query: "Using my saved context, draft a short creative brief I could hand to a collaborator.",
    icon: <Sparkles size={14} />,
  },
];

type AnswerSection = "evidence" | "inferences" | "maneuvers" | "sources";

function shouldRetainIdempotencyKey(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const terminal =
    typeof error === "object" &&
    error !== null &&
    "terminal" in error &&
    (error as { terminal?: unknown }).terminal === true;
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : Number.NaN;
  if (terminal || code === "IDEMPOTENCY_KEY_REUSED") return false;
  if (!Number.isFinite(status) || status >= 500) return true;
  return status === 409;
}

export const ScribeAskPanel: React.FC = () => {
  const { user, pocket } = useUser();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<TailorProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [isRetrieving, setIsRetrieving] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [approvedInferenceIds, setApprovedInferenceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const operationKeysRef = useRef(new Map<string, string>());
  const approvalKeysRef = useRef(new Map<string, string>());
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [retrievedContext, setRetrievedContext] = useState<ScribeContextItem[]>([]);
  const [answer, setAnswer] = useState<ScribeAnswer | null>(null);
  const [openSections, setOpenSections] = useState<Record<AnswerSection, boolean>>({
    evidence: true,
    inferences: true,
    maneuvers: true,
    sources: false,
  });

  useEffect(() => {
    if (!user?.uid) return;
    listTailorProjects(user.uid)
      .then((list) => {
        setProjects(list);
        const params = new URLSearchParams(window.location.search);
        const urlProj = params.get("project");
        if (urlProj && list.some((p) => p.id === urlProj)) {
          setSelectedProjectId(urlProj);
        } else if (list.length > 0) {
          setSelectedProjectId(list[0].id);
        }
      })
      .catch((err) => console.error("MIMI // Failed to load tailor projects for scoper:", err));
  }, [user?.uid]);

  const triggerNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const toggleSection = (section: AnswerSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRetrieveAndAsk = async () => {
    if (!user?.uid || !query.trim()) return;

    setIsRetrieving(true);
    setAnswer(null);
    setApprovedInferenceIds(new Set());
    setOpenSections({ evidence: true, inferences: true, maneuvers: true, sources: false });
    let fingerprint: string | null = null;
    try {
      const context = await retrieveScribeContext(
        user.uid,
        query.trim(),
        pocket as any,
        selectedProjectId || undefined,
      );
      setRetrievedContext(context);

      setIsAsking(true);
      setIsRetrieving(false);
      fingerprint = JSON.stringify({
        query: query.trim(),
        projectId: selectedProjectId || null,
        context: context.map((item) => [item.id, item.excerpt]),
      });
      const idempotencyKey =
        operationKeysRef.current.get(fingerprint) || crypto.randomUUID();
      operationKeysRef.current.set(fingerprint, idempotencyKey);
      const res = await askScribeExplainable(
        user.uid,
        query.trim(),
        context,
        selectedProjectId || undefined,
        idempotencyKey,
      );
      operationKeysRef.current.delete(fingerprint);
      setAnswer(res);
    } catch (err) {
      if (fingerprint && !shouldRetainIdempotencyKey(err)) {
        operationKeysRef.current.delete(fingerprint);
      }
      console.error("MIMI // Scribe Explainable Ask failed:", err);
      triggerNotification(
        err instanceof Error
          ? err.message
          : "Scribe could not produce a reliable proposal. Your input is preserved.",
        "error",
      );
    } finally {
      setIsRetrieving(false);
      setIsAsking(false);
    }
  };

  const handleRegenerateWithRemainingContext = async (remaining: ScribeContextItem[]) => {
    if (!user?.uid || !query.trim()) return;
    setIsAsking(true);
    setApprovedInferenceIds(new Set());
    let fingerprint: string | null = null;
    try {
      fingerprint = JSON.stringify({
        query: query.trim(),
        projectId: selectedProjectId || null,
        context: remaining.map((item) => [item.id, item.excerpt]),
      });
      const idempotencyKey =
        operationKeysRef.current.get(fingerprint) || crypto.randomUUID();
      operationKeysRef.current.set(fingerprint, idempotencyKey);
      const res = await askScribeExplainable(
        user.uid,
        query.trim(),
        remaining,
        selectedProjectId || undefined,
        idempotencyKey,
      );
      operationKeysRef.current.delete(fingerprint);
      setAnswer(res);
      triggerNotification("Answer recalculated using remaining context.");
    } catch (err) {
      if (fingerprint && !shouldRetainIdempotencyKey(err)) {
        operationKeysRef.current.delete(fingerprint);
      }
      console.error("MIMI // Scribe Recalculation failed:", err);
      triggerNotification(
        err instanceof Error
          ? err.message
          : "Scribe could not recalculate this proposal. Your input is preserved.",
        "error",
      );
    } finally {
      setIsAsking(false);
    }
  };

  const handleRemoveContextItem = (id: string) => {
    const updated = retrievedContext.filter((item) => item.id !== id);
    setRetrievedContext(updated);
    if (answer) {
      setAnswer({
        ...answer,
        usedContext: updated,
      });
    }
    handleRegenerateWithRemainingContext(updated);
  };

  const handleApproveInference = async (
    inferenceId: string,
    statement: string,
    proposalId?: string,
  ) => {
    if (!user?.uid) return;
    const approvalTarget = proposalId || inferenceId;
    setIsSaving((prev) => ({ ...prev, [inferenceId]: true }));
    try {
      const approvalKey =
        approvalKeysRef.current.get(approvalTarget) ||
        crypto.randomUUID();
      approvalKeysRef.current.set(approvalTarget, approvalKey);
      await approveScribeInference(
        user.uid,
        selectedProjectId || "global",
        statement,
        proposalId,
        approvalKey,
      );
      approvalKeysRef.current.delete(approvalTarget);
      setApprovedInferenceIds((previous) => {
        const next = new Set(previous);
        next.add(inferenceId);
        return next;
      });
      triggerNotification("Inference validated & stored as Memory Atom.");
    } catch (err) {
      if (!shouldRetainIdempotencyKey(err)) {
        approvalKeysRef.current.delete(approvalTarget);
      }
      console.error("MIMI // Approve inference failed:", err);
      triggerNotification(
        err instanceof Error ? err.message : "Failed to save memory atom.",
        "error",
      );
    } finally {
      setIsSaving((prev) => ({ ...prev, [inferenceId]: false }));
    }
  };

  const handleSaveDecision = async (
    recId: string,
    action: string,
    rationale: string,
    proposalId?: string,
  ) => {
    if (!user?.uid) return;
    const approvalTarget = proposalId || recId;
    setIsSaving((prev) => ({ ...prev, [recId]: true }));
    try {
      const approvalKey =
        approvalKeysRef.current.get(approvalTarget) ||
        crypto.randomUUID();
      approvalKeysRef.current.set(approvalTarget, approvalKey);
      await saveScribeDecision(
        user.uid,
        selectedProjectId || "global",
        "Scribe Recommendation",
        action,
        rationale,
        proposalId,
        approvalKey,
      );
      approvalKeysRef.current.delete(approvalTarget);
      setApprovedInferenceIds((previous) => {
        const next = new Set(previous);
        next.add(recId);
        return next;
      });
      triggerNotification("Recommendation approved as decision memory with provenance.");
    } catch (err) {
      if (!shouldRetainIdempotencyKey(err)) {
        approvalKeysRef.current.delete(approvalTarget);
      }
      console.error("MIMI // Save strategic decision failed:", err);
      triggerNotification(
        err instanceof Error ? err.message : "Failed to save strategic decision.",
        "error",
      );
    } finally {
      setIsSaving((prev) => ({ ...prev, [recId]: false }));
    }
  };

  const busy = isRetrieving || isAsking;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#FAF9F5] dark:bg-[#0D0C0A] text-[#292524] dark:text-[#E7E5E4] transition-colors duration-300">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 border flex items-center gap-2 font-sans text-xs uppercase tracking-widest shadow-md ${
              notification.type === "error"
                ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
                : "bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200"
            }`}
          >
            {notification.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-4">
          {/* Scope — desktop also shows panel title; mobile relies on chamber chrome */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 dark:border-stone-800 pb-4 gap-3">
            <div className="hidden md:block">
              <h2 className="font-serif italic text-2xl md:text-3xl font-normal tracking-tight text-stone-900 dark:text-stone-100">
                Ask memory
              </h2>
              <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500 mt-1">
                Explainable retrieval across your reservoir
              </p>
            </div>

            <div className="flex flex-col items-stretch md:items-end gap-1 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 dark:text-stone-400 shrink-0">
                  Scope
                </span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 md:flex-none border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2 min-h-[44px] md:min-h-0 md:py-1.5 font-mono text-[10px] text-stone-800 dark:text-stone-200 outline-none"
                >
                  <option value="">All of your memory</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      Project: {proj.title}
                    </option>
                  ))}
                </select>
              </div>
              <span className="font-mono text-[8px] tracking-wide text-stone-400 dark:text-stone-600">
                {selectedProjectId
                  ? "Prioritizes this project plus approved global taste memory."
                  : "Answers draw from your whole taste + project history."}
              </span>
            </div>
          </div>

          {/* Desktop composer (mobile uses sticky footer) */}
          <div className="hidden md:block space-y-4">
            <div className="relative border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 focus-within:border-stone-900 dark:focus-within:border-stone-100 transition-colors p-4">
              <span className="absolute top-2.5 right-3 font-mono text-[8px] uppercase tracking-widest text-stone-500 flex items-center gap-1">
                <HelpCircle size={10} /> Ask the Scribe
              </span>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                placeholder="e.g. What visual motifs keep recurring across my saved work?"
                className="w-full bg-transparent font-serif text-sm leading-relaxed outline-none resize-none pt-2 text-stone-900 dark:text-stone-100 placeholder:text-stone-500"
              />
            </div>
            <button
              type="button"
              disabled={!query.trim() || busy || !user?.uid}
              onClick={handleRetrieveAndAsk}
              className="px-6 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-mono text-[9px] uppercase tracking-[0.2em] font-black transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {isRetrieving ? "Querying Reservoir..." : "Synthesizing..."}
                </>
              ) : (
                <>
                  <Sparkles size={12} /> Consult Scribe
                </>
              )}
            </button>
            <p className="font-mono text-[8px] text-stone-400">
              Up to 3 credits reserved · charged only after a valid proposal is persisted
            </p>
          </div>

          {!answer && !busy && (
            <div className="space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Sparkles size={11} className="text-stone-400" /> Try one of these
              </p>
              <div className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-3">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setQuery(p.query)}
                    className="group text-left border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 hover:border-stone-900 dark:hover:border-stone-100 transition-colors px-4 py-3 md:p-4 flex flex-col gap-1 min-h-[44px]"
                  >
                    <span className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                      {p.icon}
                      <span className="font-serif italic text-sm">{p.label}</span>
                    </span>
                    <span className="font-sans text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      {p.hint}
                    </span>
                  </button>
                ))}
              </div>
              <p className="font-sans text-xs leading-relaxed text-stone-500 border-t border-stone-100 dark:border-stone-900 pt-3 md:pt-4">
                The Scribe shows the evidence it found, then reasons from it — so you can see why it
                answers the way it does.
              </p>
            </div>
          )}

          <AnimatePresence>
            {(busy || answer) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="space-y-4 md:space-y-8"
              >
                {busy && (
                  <div className="border border-stone-200 dark:border-stone-800 p-6 md:p-8 text-center space-y-3 bg-stone-50/50 dark:bg-stone-900/10">
                    <Loader2 size={22} className="animate-spin mx-auto text-stone-400" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      {isRetrieving
                        ? "Aligning retrieval authority vectors..."
                        : "Structuring evidence & inferences..."}
                    </p>
                  </div>
                )}

                {answer && !busy && (
                  <div className="space-y-3 md:space-y-6">
                    {answer.execution && (
                      <div className="border border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-600 dark:text-stone-300">
                          Proposed · Gateway verified · Awaiting your approval
                        </span>
                        <span className="font-mono text-[8px] text-stone-500 dark:text-stone-400">
                          {answer.execution.credits.charged} charged ·{" "}
                          {answer.execution.credits.released} released ·{" "}
                          {answer.execution.credits.remaining} remaining
                        </span>
                      </div>
                    )}
                    {/* Layer I */}
                    <section className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
                      <button
                        type="button"
                        onClick={() => toggleSection("evidence")}
                        className="w-full flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 text-left min-h-[44px]"
                        aria-expanded={openSections.evidence}
                      >
                        <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold flex items-center gap-1.5">
                          <Database size={11} className="text-stone-400" /> Evidence
                        </h4>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-[#a8b79f] bg-[#a8b79f]/10 px-2 py-0.5 hidden sm:inline">
                            Verifiable
                          </span>
                          <ChevronDown
                            size={14}
                            className={`text-stone-400 transition-transform ${openSections.evidence ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>
                      {openSections.evidence && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-4 border-t border-stone-100 dark:border-stone-900">
                          {answer.evidence.map((ev) => (
                            <div key={ev.id} className="pt-4 space-y-2">
                              <p className="font-serif text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                                {ev.statement}
                              </p>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="font-mono text-[8px] text-stone-400">Ref: {ev.id}</span>
                                {ev.contextIds.map((ctxId) => {
                                  const ctx = retrievedContext.find((c) => c.id === ctxId);
                                  return (
                                    <span
                                      key={ctxId}
                                      className="font-mono text-[8px] uppercase tracking-widest bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-500 px-2 py-0.5"
                                      title={ctx ? `Source excerpt: ${ctx.excerpt}` : undefined}
                                    >
                                      {ctx
                                        ? `${ctx.kind.replace("_", " ")}: ${ctx.title}`
                                        : `Source: ${ctxId}`}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {answer.evidence.length === 0 && (
                            <p className="text-xs font-serif italic text-stone-400 py-2">
                              No direct evidence nodes extracted.
                            </p>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Layer II */}
                    <section className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
                      <button
                        type="button"
                        onClick={() => toggleSection("inferences")}
                        className="w-full flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 text-left min-h-[44px]"
                        aria-expanded={openSections.inferences}
                      >
                        <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold flex items-center gap-1.5">
                          <Compass size={11} className="text-stone-400" /> Inferences
                        </h4>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 hidden sm:inline">
                            Confirm
                          </span>
                          <ChevronDown
                            size={14}
                            className={`text-stone-400 transition-transform ${openSections.inferences ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>
                      {openSections.inferences && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-4 border-t border-stone-100 dark:border-stone-900 pt-4">
                          {answer.inferences.map((inf) => (
                            <div
                              key={inf.id}
                              className="border border-stone-100 dark:border-stone-900 p-4 bg-stone-50/50 dark:bg-stone-900/20 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
                                  {inf.id}
                                </span>
                                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
                                  {inf.confidence}%
                                </span>
                              </div>
                              <div className="w-full h-1 bg-stone-200 dark:bg-stone-800">
                                <div
                                  className="h-full bg-stone-900 dark:bg-stone-100"
                                  style={{ width: `${inf.confidence}%` }}
                                />
                              </div>
                              <p className="font-serif italic text-sm leading-relaxed text-stone-800 dark:text-stone-100">
                                &ldquo;{inf.statement}&rdquo;
                              </p>
                              <button
                                type="button"
                                disabled={
                                  isSaving[inf.id] ||
                                  approvedInferenceIds.has(inf.id) ||
                                  !inf.proposalId
                                }
                                onClick={() =>
                                  handleApproveInference(
                                    inf.id,
                                    inf.statement,
                                    inf.proposalId,
                                  )
                                }
                                className="w-full md:w-auto font-mono text-[8px] uppercase tracking-widest px-3 py-2.5 min-h-[44px] md:min-h-0 md:py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 flex items-center justify-center gap-1"
                              >
                                {isSaving[inf.id] ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Check size={10} />
                                )}
                                {approvedInferenceIds.has(inf.id)
                                  ? "Approved as Memory"
                                  : inf.proposalId
                                    ? "Approve as Memory"
                                    : "Proposal unavailable"}
                              </button>
                            </div>
                          ))}
                          {answer.inferences.length === 0 && (
                            <p className="text-xs font-serif italic text-stone-400 py-2">
                              No pattern inferences synthesized.
                            </p>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Layer III */}
                    <section className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
                      <button
                        type="button"
                        onClick={() => toggleSection("maneuvers")}
                        className="w-full flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 text-left min-h-[44px]"
                        aria-expanded={openSections.maneuvers}
                      >
                        <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold">
                          Maneuvers
                        </h4>
                        <ChevronDown
                          size={14}
                          className={`text-stone-400 transition-transform ${openSections.maneuvers ? "rotate-180" : ""}`}
                        />
                      </button>
                      {openSections.maneuvers && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-5 border-t border-stone-100 dark:border-stone-900 pt-4">
                          {answer.recommendations.map((rec) => (
                            <div
                              key={rec.id}
                              className="space-y-2 border-l-2 border-stone-300 dark:border-stone-700 pl-4 py-1"
                            >
                              <p className="font-sans text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                                {rec.action}
                              </p>
                              <p className="font-serif text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                                {rec.rationale}
                              </p>
                              <button
                                type="button"
                                disabled={
                                  isSaving[rec.id] ||
                                  approvedInferenceIds.has(rec.id) ||
                                  !rec.proposalId
                                }
                                onClick={() =>
                                  handleSaveDecision(
                                    rec.id,
                                    rec.action,
                                    rec.rationale,
                                    rec.proposalId,
                                  )
                                }
                                className="w-full md:w-auto font-mono text-[8px] uppercase tracking-widest bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 py-2.5 min-h-[44px] md:min-h-0 md:py-1.5 flex items-center justify-center gap-1"
                              >
                                {isSaving[rec.id] ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Save size={10} />
                                )}
                                {approvedInferenceIds.has(rec.id)
                                  ? "Decision Approved"
                                  : rec.proposalId
                                    ? "Approve Decision"
                                    : "Proposal unavailable"}
                              </button>
                            </div>
                          ))}
                          {answer.recommendations.length === 0 && (
                            <p className="text-xs font-serif italic text-stone-400 py-2">
                              No recommendations synthesized.
                            </p>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Sources */}
                    <section className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
                      <button
                        type="button"
                        onClick={() => toggleSection("sources")}
                        className="w-full flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 text-left min-h-[44px]"
                        aria-expanded={openSections.sources}
                      >
                        <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-800 dark:text-stone-200 font-bold">
                          Sources ({retrievedContext.length})
                        </h4>
                        <ChevronDown
                          size={14}
                          className={`text-stone-400 transition-transform ${openSections.sources ? "rotate-180" : ""}`}
                        />
                      </button>
                      {openSections.sources && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-3 border-t border-stone-100 dark:border-stone-900 pt-4 max-h-[360px] overflow-y-auto">
                          {retrievedContext.map((item) => (
                            <div
                              key={item.id}
                              className="border border-stone-100 dark:border-stone-900 p-3 bg-stone-50/50 dark:bg-stone-900/10 space-y-2 relative"
                            >
                              <button
                                type="button"
                                onClick={() => handleRemoveContextItem(item.id)}
                                className="absolute top-2 right-2 text-stone-400 hover:text-red-500 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Remove source and regenerate"
                                aria-label="Remove source"
                              >
                                <Trash2 size={14} />
                              </button>
                              <div className="flex items-center justify-between pr-10">
                                <span className="font-mono text-[8px] uppercase tracking-wider bg-stone-200/50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5">
                                  {item.kind.replace("_", " ")}
                                </span>
                                <span className="font-mono text-[8px] text-stone-400">
                                  Rel: {Math.round(item.relevance * 100)}%
                                </span>
                              </div>
                              <h5 className="font-serif text-xs font-bold leading-snug text-stone-900 dark:text-stone-100">
                                {item.title}
                              </h5>
                              <p className="font-serif text-[10px] text-stone-500 dark:text-stone-400 leading-normal line-clamp-3">
                                {item.excerpt}
                              </p>
                            </div>
                          ))}
                          {retrievedContext.length === 0 && (
                            <p className="text-xs font-serif italic text-stone-400 py-4 text-center">
                              No context loaded.
                            </p>
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile sticky composer */}
      <div className="md:hidden shrink-0 border-t border-stone-200 dark:border-stone-800 bg-[#FAF9F5]/95 dark:bg-[#0D0C0A]/95 backdrop-blur-sm px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={2}
          placeholder="Ask your memory…"
          className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 font-serif text-sm leading-relaxed outline-none resize-none text-stone-900 dark:text-stone-100 placeholder:text-stone-500"
        />
        <button
          type="button"
          disabled={!query.trim() || busy || !user?.uid}
          onClick={handleRetrieveAndAsk}
          className="w-full min-h-[44px] px-4 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-mono text-[9px] uppercase tracking-[0.2em] font-black disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              {isRetrieving ? "Querying…" : "Synthesizing…"}
            </>
          ) : (
            <>
              <Sparkles size={12} /> Consult Scribe
            </>
          )}
        </button>
        <p className="font-mono text-[8px] text-center text-stone-400">
          Up to 3 credits · charged after a valid proposal
        </p>
      </div>
    </div>
  );
};

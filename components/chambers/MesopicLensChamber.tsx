import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  Loader2,
  Moon,
  Sparkles,
  Globe,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import { useUser } from "../../contexts/UserContext";
import {
  MESOPIC_LENS_COPY,
  MESOPIC_LENS_HANDOFF_TARGETS,
  MESOPIC_LENS_MODULE_ID,
} from "../../lib/mesopicLensChamberContract";
import { CuriosityChips } from "../curiosity/CuriosityChips";
import { CuriosityPatternPanel } from "../curiosity/CuriosityPatternPanel";
import type { CuriosityPromptId } from "../../services/tailorEvidenceIntake";
import {
  runMesopicLensReading,
  type MesopicLensRun,
} from "../../services/mesopicLensService";
import { listCuriosityRecords } from "../../services/curiosityStore";
import { compileCelestialReadout } from "../../lib/celestial/compileCelestialReadout";
import type { CelestialCalibrationDraft } from "../../schemas/celestialCalibrationContracts";

const TWILIGHT_PRESETS = [
  "What creative direction am I missing in this season?",
  "Why do I keep returning to the same visual motifs?",
  "How should I dress for the mood I'm actually in?",
  "What patterns keep repeating in my work?",
];

export const MesopicLensChamber: React.FC<{
  navigate?: (path: string) => void;
}> = ({ navigate }) => {
  const { profile, user } = useUser();
  const [question, setQuestion] = useState("");
  const [curiosityIds, setCuriosityIds] = useState<CuriosityPromptId[]>([]);
  const [customCuriosity, setCustomCuriosity] = useState("");
  const [run, setRun] = useState<MesopicLensRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);
  const [recordCount, setRecordCount] = useState(0);

  const celestialDraft: CelestialCalibrationDraft | null =
    profile?.tailorDraft?.celestialCalibration ?? null;
  const readout = useMemo(
    () => compileCelestialReadout(celestialDraft),
    [celestialDraft],
  );

  useEffect(() => {
    void listCuriosityRecords({ userId: user?.uid, limit: 50 }).then((r) =>
      setRecordCount(r.length),
    );
  }, [user?.uid, run?.id]);

  const toggleCuriosity = useCallback((id: CuriosityPromptId) => {
    setCuriosityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleAsk = useCallback(async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setRun(null);
    try {
      const next = await runMesopicLensReading({
        question: q,
        profile,
        curiosityIds,
        customCuriosity,
        userId: user?.uid,
      });
      setRun(next);
    } catch (err) {
      console.error("MIMI // Mesopic Lens failed", err);
    } finally {
      setLoading(false);
    }
  }, [question, loading, profile, curiosityIds, customCuriosity, user?.uid]);

  return (
    <ChamberShell
      moduleId={MESOPIC_LENS_MODULE_ID}
      tone="void"
      actions={
        <button
          type="button"
          onClick={() => setShowPatterns((o) => !o)}
          className="font-mono text-[9px] uppercase tracking-[0.18em] text-mimi-cobalt flex items-center gap-1.5 min-h-[44px] px-2"
          aria-expanded={showPatterns}
        >
          <BarChart3 size={12} />
          Patterns ({recordCount})
        </button>
      }
    >
      <div
        className="mesopic-lens-chamber relative min-h-[70vh] overflow-hidden"
        data-testid="mesopic-lens-chamber"
      >
        {/* Twilight gradient field */}
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background: `linear-gradient(
              165deg,
              color-mix(in srgb, var(--mimi-cobalt-deep) 35%, transparent) 0%,
              color-mix(in srgb, var(--mimi-olive) 18%, #0a0a0c) 42%,
              #0a0a0c 100%
            )`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, var(--mimi-cobalt) 0%, transparent 45%),
              radial-gradient(circle at 80% 70%, var(--mimi-olive) 0%, transparent 40%)`,
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 md:py-12 space-y-8">
          <header className="space-y-3 text-center md:text-left">
            <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-mimi-cobalt">
              {MESOPIC_LENS_COPY.subtitle}
            </p>
            <h1 className="font-display font-serif text-3xl md:text-4xl italic text-[var(--mimi-bone)] tracking-tight">
              Mesopic Lens
            </h1>
            <p className="font-sans text-sm text-mimi-stone leading-relaxed max-w-xl">
              {MESOPIC_LENS_COPY.thesis}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-mimi-stone/80">
              {MESOPIC_LENS_COPY.mesopicNote}
            </p>
          </header>

          {readout.enabled ? (
            <p
              role="status"
              className="border border-mimi-cobalt/30 bg-mimi-cobalt-haze px-4 py-3 font-sans text-[12px] text-[var(--mimi-bone)] leading-relaxed flex items-start gap-2"
            >
              <Moon size={14} className="shrink-0 mt-0.5 text-mimi-cobalt" />
              <span>
                Celestial calibration active — {readout.timingPhrase}
              </span>
            </p>
          ) : (
            <p className="font-sans text-[11px] text-mimi-stone leading-relaxed border border-white/10 px-4 py-3">
              {MESOPIC_LENS_COPY.celestialHint}{" "}
              {navigate ? (
                <button
                  type="button"
                  onClick={() => navigate("/celestial-calibration")}
                  className="underline underline-offset-2 text-mimi-cobalt"
                >
                  Open Celestial Calibration
                </button>
              ) : null}
            </p>
          )}

          <CuriosityChips
            variant="twilight"
            selected={curiosityIds}
            customText={customCuriosity}
            onToggle={toggleCuriosity}
            onCustomChange={setCustomCuriosity}
          />

          <div className="space-y-3">
            <label
              htmlFor="mesopic-question"
              className="font-mono text-[9px] uppercase tracking-[0.24em] text-mimi-cobalt block"
            >
              Your question
            </label>
            <div className="relative">
              <textarea
                id="mesopic-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleAsk();
                  }
                }}
                placeholder={MESOPIC_LENS_COPY.emptyQuestion}
                rows={3}
                data-testid="mesopic-question"
                className="w-full bg-black/40 border border-white/15 px-4 py-3 font-serif italic text-lg text-[var(--mimi-bone)] placeholder:text-white/25 focus:outline-none focus:border-mimi-cobalt resize-none"
              />
              <button
                type="button"
                onClick={() => void handleAsk()}
                disabled={loading || !question.trim()}
                aria-label="Receive twilight reading"
                className="absolute right-3 bottom-3 w-11 h-11 flex items-center justify-center border border-mimi-cobalt/50 text-mimi-cobalt disabled:opacity-35 hover:bg-mimi-cobalt/10 transition-colors"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TWILIGHT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuestion(preset)}
                  className="font-serif italic text-[11px] border border-white/10 px-2 py-1 text-mimi-stone hover:border-mimi-cobalt/40 hover:text-[var(--mimi-bone)] transition-colors text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center space-y-3"
              >
                <Sparkles
                  size={24}
                  className="mx-auto text-mimi-cobalt animate-pulse"
                />
                <p className="font-serif italic text-mimi-cobalt">
                  Adjusting to mesopic light…
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-mimi-stone">
                  Web grounding · profile · celestial
                </p>
              </motion.div>
            ) : run?.reading ? (
              <motion.article
                key={run.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-mimi-cobalt/25 bg-black/50 p-6 space-y-4"
                data-testid="mesopic-reading"
              >
                <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-mimi-cobalt flex items-center gap-2">
                  <Eye size={11} /> Twilight reading
                  {run.reading.via === "gateway" ? (
                    <span className="text-mimi-stone">· Gateway</span>
                  ) : (
                    <span className="text-mimi-stone">· Fallback</span>
                  )}
                </p>
                <p className="font-serif text-lg md:text-xl italic text-[var(--mimi-bone)] leading-relaxed">
                  {run.reading.text}
                </p>
                {run.reading.webSignals.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-mimi-stone flex items-center gap-1.5">
                      <Globe size={10} /> Web signals ({run.reading.webSignals.length})
                    </p>
                    <ul className="space-y-1.5">
                      {run.reading.webSignals.slice(0, 4).map((hit) => (
                        <li key={hit.id || hit.title} className="text-[11px]">
                          {hit.url ? (
                            <a
                              href={hit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-mimi-cobalt hover:underline underline-offset-2"
                            >
                              {hit.title}
                            </a>
                          ) : (
                            <span className="text-mimi-stone">{hit.title}</span>
                          )}
                          {hit.snippet ? (
                            <span className="text-mimi-stone block mt-0.5 line-clamp-2">
                              {hit.snippet}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="font-sans text-[11px] text-mimi-stone">
                    {MESOPIC_LENS_COPY.webGroundingNote}
                  </p>
                )}
                <p className="font-mono text-[8px] text-mimi-stone/70">
                  {MESOPIC_LENS_COPY.curiosityNote}
                </p>
              </motion.article>
            ) : run?.failure ? (
              <motion.p
                key="error"
                role="alert"
                className="font-sans text-sm text-red-300/90 border border-red-500/20 px-4 py-3"
              >
                {run.failure}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showPatterns ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <CuriosityPatternPanel userId={user?.uid} variant="twilight" />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <nav className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
            {MESOPIC_LENS_HANDOFF_TARGETS.map((target) => (
              <button
                key={target.view}
                type="button"
                onClick={() => navigate?.(`/${target.view}`)}
                className="font-mono text-[9px] uppercase tracking-widest text-mimi-stone hover:text-mimi-cobalt flex items-center gap-1 min-h-[44px] px-2"
              >
                {target.label}
                <ChevronRight size={10} />
              </button>
            ))}
          </nav>

          <p className="font-sans text-[10px] text-mimi-stone/60 leading-relaxed">
            {MESOPIC_LENS_COPY.observatoryDisambiguation}
          </p>
        </div>
      </div>
    </ChamberShell>
  );
};

import { useEffect, useState } from "react";
import { Clock, Redo2, Undo2 } from "lucide-react";
import Onboarding from "./Onboarding";
import IssueViewer from "./IssueViewer";
import Landing from "./Landing";
import IngestFloor from "./floors/IngestFloor";
import CurateFloor from "./floors/CurateFloor";
import PlateFloor from "./floors/PlateFloor";
import PenthouseFloor from "./floors/PenthouseFloor";
import TimelineFloor from "./floors/TimelineFloor";
import { SysLabel } from "./shared";
import { redo, setState, undo, useHistory, useMimi } from "./store";
import type { FloorId } from "./types";
import { useHouseKeyboard } from "./useKeyboard";

const TIERS = [
  "Aesthetic Tier 01 // Seed",
  "Aesthetic Tier 02 // Helix Link",
  "Aesthetic Tier 03 // Harmonic",
  "Aesthetic Tier 04 // Singularity",
  "Aesthetic Tier 05 // Fully Actualized DNA",
] as const;

/** Elevator order: penthouse at top (desktop rail). */
const FLOORS: { id: FloorId; name: string; label: string }[] = [
  { id: 4, name: "Penthouse", label: "4F" },
  { id: 3, name: "Plate", label: "3F" },
  { id: 2, name: "Curate", label: "2F" },
  { id: 1, name: "Ingest", label: "1F" },
];

export default function HouseStudio({
  issueId,
  onNavigateIssue,
  onClearIssue,
}: {
  issueId?: string | null;
  onNavigateIssue?: (id: string) => void;
  onClearIssue?: () => void;
}) {
  const s = useMimi();
  const history = useHistory();
  useHouseKeyboard();
  const [entered, setEntered] = useState(s.onboardingComplete || s.debris.length > 0);
  const [floor, setFloor] = useState<FloorId>(1);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("house-night-doc", s.night);
    return () => {
      document.documentElement.classList.remove("house-night-doc");
    };
  }, [s.night]);

  const unlocked: Record<FloorId, boolean> = {
    1: true,
    2: s.debris.length >= 1,
    3: s.reading !== null,
    4: s.plates.length >= 1,
  };

  const ascension =
    (s.debris.length >= 1 ? 25 : 0) +
    (s.reading ? 25 : 0) +
    (s.plates.length >= 1 ? 25 : 0) +
    (s.issues.length >= 1 ? 25 : 0);

  const tier = TIERS[Math.min(s.issues.length, TIERS.length - 1)];

  if (issueId) {
    return (
      <div className={`house-root ${s.night ? "house-night" : ""}`}>
        <IssueViewer id={issueId} onBack={() => onClearIssue?.()} />
      </div>
    );
  }

  if (!entered) {
    return (
      <div className={`house-root ${s.night ? "house-night" : ""}`}>
        <Landing onEnter={() => setEntered(true)} />
      </div>
    );
  }

  return (
    <div className={`house-root ${s.night ? "house-night" : ""}`}>
      {!s.onboardingComplete ? <Onboarding /> : null}

      <header className="border-b border-[var(--house-line)]">
        <div className="flex items-center justify-between gap-4 py-4 px-1">
          <div className="flex items-baseline gap-4">
            <button
              type="button"
              onClick={() => {
                setFloor(1);
                setShowTimeline(false);
              }}
              className="font-serif text-3xl font-medium tracking-tight hover:opacity-70 transition-opacity"
            >
              Mimi
            </button>
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--house-stone)]">
              // antidote for brain rot
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <SysLabel className="hidden md:block">{tier}</SysLabel>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => undo()}
                disabled={!history.canUndo}
                className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[var(--house-line)] px-2 py-1.5 hover:bg-[var(--house-ink)] hover:text-[var(--house-field)] transition-colors disabled:opacity-30"
                title="Undo (⌘Z)"
                aria-label="Undo"
              >
                <Undo2 size={12} />
              </button>
              <button
                type="button"
                onClick={() => redo()}
                disabled={!history.canRedo}
                className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[var(--house-line)] px-2 py-1.5 hover:bg-[var(--house-ink)] hover:text-[var(--house-field)] transition-colors disabled:opacity-30"
                title="Redo (⌘⇧Z)"
                aria-label="Redo"
              >
                <Redo2 size={12} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className={`font-mono text-[10px] uppercase tracking-[0.18em] border border-[var(--house-line)] px-3 py-1.5 transition-colors flex items-center gap-1 ${
                showTimeline
                  ? "bg-[var(--house-ink)] text-[var(--house-field)]"
                  : "hover:bg-[var(--house-ink)] hover:text-[var(--house-field)]"
              }`}
              title="Archive"
            >
              <Clock size={12} /> {showTimeline ? "Close" : "Archive"}
            </button>
            <button
              type="button"
              onClick={() => setState({ night: !s.night }, "toggle-night")}
              className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[var(--house-line)] px-3 py-1.5 hover:bg-[var(--house-ink)] hover:text-[var(--house-field)] transition-colors"
            >
              {s.night ? "Studio Light" : "Studio Night"}
            </button>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[88px_1fr] gap-6 lg:gap-10">
        <nav className="lg:sticky lg:top-0 lg:self-start lg:min-h-[70vh] flex lg:flex-col items-stretch justify-start lg:justify-center gap-2 py-4 lg:py-6 border-b lg:border-b-0 lg:border-r border-[var(--house-line)] lg:pr-6 overflow-x-auto">
          <SysLabel className="hidden lg:block mb-6 house-vertical-rl h-24">
            Ascension
          </SysLabel>
          {FLOORS.map((f) => {
            const locked = !unlocked[f.id];
            const isActive = floor === f.id && !showTimeline;
            return (
              <button
                key={f.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  setFloor(f.id);
                  setShowTimeline(false);
                }}
                className={`shrink-0 w-full lg:w-16 px-2 py-3 text-center border transition-all ${
                  isActive
                    ? "border-[var(--house-ink)] bg-[var(--house-ink)] text-[var(--house-field)]"
                    : locked
                      ? "border-[var(--house-line)] text-[var(--house-stone)] opacity-40 cursor-not-allowed"
                      : "border-[var(--house-line)] text-[var(--house-stone)] hover:border-[var(--house-ink)]"
                }`}
              >
                <span className="block font-mono text-[10px] tracking-[0.18em]">{f.label}</span>
                <span className="block font-serif text-sm mt-0.5">{f.name}</span>
                {locked ? (
                  <span className="block font-mono text-[9px] mt-1">locked</span>
                ) : null}
              </button>
            );
          })}
          <div className="hidden lg:flex flex-col items-center mt-6 gap-2">
            <div className="w-px h-28 bg-[var(--house-line)] relative">
              <div
                className="absolute bottom-0 left-0 w-px bg-[var(--house-ink)] transition-all duration-700"
                style={{ height: `${ascension}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tracking-[0.18em]">{ascension}%</span>
          </div>
        </nav>

        <main className="py-6 lg:py-12 min-h-[70vh] px-1">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <SysLabel>System ascension</SysLabel>
            <span className="font-mono text-xs">{ascension}%</span>
          </div>

          {showTimeline ? (
            <TimelineFloor />
          ) : (
            <>
              {floor === 1 ? <IngestFloor /> : null}
              {floor === 2 ? <CurateFloor /> : null}
              {floor === 3 ? <PlateFloor /> : null}
              {floor === 4 ? (
                <PenthouseFloor onOpenIssue={(id) => onNavigateIssue?.(id)} />
              ) : null}
            </>
          )}

          <footer className="mt-20 pt-6 border-t border-[var(--house-line)] flex items-center justify-between flex-wrap gap-3">
            <SysLabel>Mimi Studio — local edition</SysLabel>
            <SysLabel>Your archive lives in this browser only</SysLabel>
          </footer>
        </main>
      </div>
    </div>
  );
}

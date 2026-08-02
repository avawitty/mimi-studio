import { useState } from "react";
import { Moon, Redo2, Sun, Undo2 } from "lucide-react";
import Onboarding from "./Onboarding";
import IssueViewer from "./IssueViewer";
import Landing from "./Landing";
import IngestFloor from "./floors/IngestFloor";
import CurateFloor from "./floors/CurateFloor";
import PlateFloor from "./floors/PlateFloor";
import PenthouseFloor from "./floors/PenthouseFloor";
import TimelineFloor from "./floors/TimelineFloor";
import { redo, setState, undo, useHistory, useMimi } from "./store";
import { useHouseKeyboard } from "./useKeyboard";

type FloorId = "ingest" | "curate" | "plate" | "penthouse" | "timeline";

const FLOORS: { id: FloorId; label: string; index: string }[] = [
  { id: "ingest", label: "Ingest", index: "1F" },
  { id: "curate", label: "Curate", index: "2F" },
  { id: "plate", label: "Plate", index: "3F" },
  { id: "penthouse", label: "Penthouse", index: "4F" },
  { id: "timeline", label: "Evolution", index: "ARC" },
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
  const [floor, setFloor] = useState<FloorId>("ingest");

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

      <header className="sticky top-0 z-20 border-b border-[var(--house-line)] bg-[var(--house-field)]/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-2xl tracking-tight">Mimi</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--house-stone)]">
              The House
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => undo()}
              disabled={!history.canUndo}
              className="p-2 border border-transparent hover:border-[var(--house-line)] disabled:opacity-30"
              aria-label="Undo"
              title="Undo ⌘Z"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => redo()}
              disabled={!history.canRedo}
              className="p-2 border border-transparent hover:border-[var(--house-line)] disabled:opacity-30"
              aria-label="Redo"
              title="Redo ⌘⇧Z"
            >
              <Redo2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setState({ night: !s.night }, "toggle-night")}
              className="p-2 border border-transparent hover:border-[var(--house-line)]"
              aria-label={s.night ? "Day mode" : "Night mode"}
              title="Toggle night ⌘⇧L"
            >
              {s.night ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        <nav className="flex gap-px overflow-x-auto border-t border-[var(--house-line)]">
          {FLOORS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFloor(f.id)}
              className={`shrink-0 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                floor === f.id
                  ? "bg-[var(--house-ink)] text-[var(--house-field)]"
                  : "text-[var(--house-stone)] hover:bg-[var(--house-worktable)]"
              }`}
            >
              <span className="text-[var(--house-olive)] mr-2 opacity-80">{f.index}</span>
              {f.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="py-8 px-1 md:px-2">
        {floor === "ingest" ? <IngestFloor /> : null}
        {floor === "curate" ? <CurateFloor /> : null}
        {floor === "plate" ? <PlateFloor /> : null}
        {floor === "penthouse" ? (
          <PenthouseFloor onOpenIssue={(id) => onNavigateIssue?.(id)} />
        ) : null}
        {floor === "timeline" ? <TimelineFloor /> : null}
      </main>
    </div>
  );
}

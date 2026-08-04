import React, { useState } from "react";
import { X, Download, StickyNote } from "lucide-react";
import { useResearchInstrumentationEnabled } from "../contexts/ResearchInstrumentationContext";
import { useResearchInstrumentation } from "../hooks/useResearchInstrumentation";

const DISMISS_KEY = "mimi_research_note_dismissed";

export const ResearchNoteWidget: React.FC = () => {
  const enabled = useResearchInstrumentationEnabled();
  const { addNote, downloadExport, events } = useResearchInstrumentation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!enabled || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const submitNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    addNote(trimmed);
    setNote("");
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div
      className="fixed bottom-4 left-4 z-[15000] w-[min(100vw-2rem,320px)] pointer-events-auto"
      data-research-id="research-note-widget"
    >
      <div className="border border-mimi-hairline bg-mimi-field/95 backdrop-blur-md shadow-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-mimi-ink">
            <StickyNote size={14} className="text-mimi-olive shrink-0" />
            <div>
              <p className="font-serif text-sm text-mimi-ink">Research note</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-mimi-stone">
                {events.length} events captured
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-mimi-stone hover:text-mimi-ink transition-colors p-1"
            aria-label="Dismiss research note widget"
          >
            <X size={14} />
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observer note for this session…"
          rows={3}
          className="w-full resize-none border border-mimi-hairline bg-white/60 px-3 py-2 text-sm text-mimi-ink placeholder:text-mimi-stone focus:outline-none focus:border-mimi-olive"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={submitNote}
            disabled={!note.trim()}
            className="flex-1 font-mono text-[9px] uppercase tracking-widest border border-mimi-olive text-mimi-olive px-3 py-2 hover:bg-mimi-olive hover:text-mimi-field transition-colors disabled:opacity-40"
          >
            {submitted ? "Saved" : "Save note"}
          </button>
          <button
            type="button"
            onClick={downloadExport}
            className="font-mono text-[9px] uppercase tracking-widest border border-mimi-hairline text-mimi-stone px-3 py-2 hover:text-mimi-ink hover:border-mimi-ink transition-colors flex items-center gap-1.5"
            title="Download raw JSON export"
          >
            <Download size={12} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

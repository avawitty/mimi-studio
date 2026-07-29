import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, Highlighter, Link2, MessageSquare, Network, Sparkles } from "lucide-react";
import {
  ArchiveChamberShell,
  ArchiveContextPanel,
  type ArchiveWorkflowStep,
} from "./ArchiveChamberShell";
import { ResearchMemory } from "../ResearchMemory";
import { ScribeAskPanel } from "../ScribeAskPanel";
import { ScribeThreadsPanel } from "../scribe/ScribeThreadsPanel";
import { useUser } from "../../contexts/UserContext";
import {
  createAtomFromScribeSignal,
  saveMemoryAtom,
  suggestTitleForAtom,
  mirrorAtomToPocket,
} from "../../services/memoryService";
import type { ScribeSignalType } from "../../types";

type ScribeTab = "ask" | "capture" | "atoms" | "retrieve" | "threads";

const SCRIBE_TABS: { id: ScribeTab; label: string; icon: React.ReactNode; note: string }[] = [
  { id: "retrieve", label: "Retrieve", icon: <BookOpen size={14} />, note: "Search and reuse context" },
  { id: "threads", label: "Threads", icon: <Network size={14} />, note: "Spatial memory thread map" },
  { id: "capture", label: "Capture", icon: <Highlighter size={14} />, note: "Paste dialogue, links, decisions" },
  { id: "atoms", label: "Atomize", icon: <Brain size={14} />, note: "Structured memory atoms" },
  { id: "ask", label: "Ask", icon: <MessageSquare size={14} />, note: "Query your memory reservoir" },
];

const TAB_WORKFLOW: Record<ScribeTab, ArchiveWorkflowStep> = {
  ask: "read",
  capture: "collect",
  atoms: "approve",
  retrieve: "read",
  threads: "read",
};

const parseInitialTab = (): ScribeTab => {
  if (typeof window === "undefined") return "ask";
  const param = new URLSearchParams(window.location.search).get("tab");
  if (param === "threads" || param === "ask" || param === "capture" || param === "atoms" || param === "retrieve") {
    return param;
  }
  return "ask";
};

export const ScribeChamber: React.FC<{ initialTab?: ScribeTab }> = ({ initialTab }) => {
  const { user } = useUser();
  const [tab, setTab] = useState<ScribeTab>(initialTab ?? parseInitialTab());
  const [pasteContent, setPasteContent] = useState("");
  const [pasteSource, setPasteSource] = useState("Dialogue Paste");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
    else setTab(parseInitialTab());
  }, [initialTab]);

  const activeTab = SCRIBE_TABS.find((item) => item.id === tab);

  const contextDrawer = useMemo(
    () => (
      <ArchiveContextPanel
        title={activeTab?.label ?? "Scribe"}
        subtitle={activeTab?.note}
      >
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What this means
          </p>
          <p className="font-serif italic text-sm leading-relaxed archive-text-ink">
            {tab === "capture"
              ? "Raw fragments enter the semantic reservoir. Mimi parses signal type and stores traceable memory atoms."
              : tab === "atoms"
                ? "Review structured atoms before they propagate to Pocket or Studio as Used Context."
                : tab === "retrieve"
                  ? "Pull saved atoms into active work — send to Studio or The Edit without losing provenance."
                  : tab === "threads"
                    ? "Memory atoms orbit as semantic threads — shared tags and projects form visible links."
                    : "Ask across your memory reservoir with grounded retrieval."}
          </p>
        </div>
        <div className="space-y-3 pt-2 border-t archive-border">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What to do next
          </p>
          <ul className="font-sans text-[10px] archive-text-muted space-y-2 list-none">
            {tab === "capture" && (
              <>
                <li>Paste conversation or link material into Raw input.</li>
                <li>Save Memory Atom — review in Atomize tab.</li>
              </>
            )}
            {tab === "atoms" && (
              <>
                <li>Approve or edit atoms before reuse.</li>
                <li>Mirror approved atoms to Pocket for registry access.</li>
              </>
            )}
            {tab === "retrieve" && (
              <>
                <li>Search atoms and send to Studio as Used Context.</li>
              </>
            )}
            {tab === "threads" && (
              <>
                <li>Orbit nodes to inspect atoms linked by project or tag.</li>
                <li>Route selected threads to Studio or The Edit.</li>
              </>
            )}
            {tab === "ask" && (
              <>
                <li>Query memory with a focused question.</li>
                <li>Capture useful answers back into atoms.</li>
              </>
            )}
          </ul>
        </div>
      </ArchiveContextPanel>
    ),
    [activeTab?.label, activeTab?.note, tab],
  );

  const handleCapturePaste = async () => {
    if (!user?.uid || !pasteContent.trim()) return;
    setIsSaving(true);
    try {
      let signalType: ScribeSignalType = "dialogue_paste";
      switch (pasteSource) {
        case "AI Conversation Log":
          signalType = "conversation_log";
          break;
        case "Link Drop":
          signalType = "link_drop";
          break;
        case "Highlighted Selection":
          signalType = "highlight_selection";
          break;
        case "Dialogue Paste":
          signalType = "dialogue_paste";
          break;
        default:
          signalType = "manual";
          break;
      }

      const title = await suggestTitleForAtom(pasteContent);
      const atom = createAtomFromScribeSignal({
        content: pasteContent,
        signalType,
        source: pasteSource,
        title,
      });
      await saveMemoryAtom(user.uid, atom);
      await mirrorAtomToPocket(user.uid, atom);
      setPasteContent("");
      setTab("atoms");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ArchiveChamberShell
      moduleId="scribe"
      activeWorkflowStep={TAB_WORKFLOW[tab]}
      workflowSteps={["collect", "read", "approve", "save"]}
      contextDrawer={contextDrawer}
      contextDrawerOpen
      spine={
        <>
          {SCRIBE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => setTab(item.id)}
              className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
                tab === item.id ? "is-active border-white/20" : ""
              }`}
            >
              {item.icon}
            </button>
          ))}
        </>
      }
      canvas={
        <div className="flex flex-col h-full min-h-0">
          {/* Mobile-only tab strip — spine is hidden on small screens */}
          <nav
            aria-label="Scribe tabs"
            className="md:hidden shrink-0 flex items-center gap-1 overflow-x-auto px-3 py-2 border-b archive-border scrollbar-none"
          >
            {SCRIBE_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[8px] uppercase tracking-[0.15em] transition-colors ${
                  tab === item.id
                    ? "archive-workflow-active border-archive-ink"
                    : "archive-workflow-idle border-transparent"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {tab === "ask" && <ScribeAskPanel />}

          {tab === "capture" && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl">
              <p className="font-mono text-[9px] uppercase tracking-widest archive-text-muted mb-4">
                Capture → Parse → Save
              </p>
              <label className="block space-y-2 mb-4">
                <span className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                  Source
                </span>
                <select
                  value={pasteSource}
                  onChange={(e) => setPasteSource(e.target.value)}
                  className="w-full border archive-border bg-archive-surface px-3 py-2 font-mono text-[10px]"
                >
                  <option>Dialogue Paste</option>
                  <option>AI Conversation Log</option>
                  <option>Link Drop</option>
                  <option>Highlighted Selection</option>
                </select>
              </label>
              <label className="block space-y-2 mb-4">
                <span className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                  Raw input
                </span>
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  rows={12}
                  placeholder="Paste conversation fragments, open questions, or decisions..."
                  className="w-full border archive-border bg-white dark:bg-stone-950 px-4 py-3 font-serif text-sm leading-relaxed resize-y min-h-[200px]"
                />
              </label>
              <p className="font-sans text-[10px] archive-text-muted mb-4 flex items-start gap-2">
                <Link2 size={12} className="shrink-0 mt-0.5" />
                Highlight text anywhere in Mimi to capture selections as atoms via the global Scribe
                listener.
              </p>
              <button
                type="button"
                disabled={!pasteContent.trim() || isSaving || !user?.uid}
                onClick={handleCapturePaste}
                className="px-6 py-3 bg-archive-ink text-archive-cream font-mono text-[9px] uppercase tracking-widest font-black disabled:opacity-40"
              >
                {isSaving ? "Atomizing..." : "Save Memory Atom"}
              </button>
            </div>
          )}

          {tab === "atoms" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ResearchMemory mode="manage" embedded />
            </div>
          )}

          {tab === "threads" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScribeThreadsPanel />
            </div>
          )}

          {tab === "retrieve" && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ResearchMemory mode="retrieve" embedded />
              </div>
              <div className="shrink-0 border-t archive-border px-6 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3 bg-archive-surface/30">
                <p className="font-sans text-[10px] archive-text-muted">
                  Retrieve is home — search atoms, send to Studio or The Edit.
                </p>
                <button
                  type="button"
                  onClick={() => setTab("ask")}
                  className="font-mono text-[8px] uppercase tracking-widest archive-text-muted hover:archive-text-ink flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  Ask memory
                </button>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

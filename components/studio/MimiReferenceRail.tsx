import React from "react";
import {
  Aperture,
  Archive,
  BookMarked,
  BookOpen,
  Eye,
  FolderOpen,
  LayoutGrid,
  Newspaper,
  Radar,
  Scissors,
  Shield,
  Sparkles,
  Store,
  User,
  Users,
} from "lucide-react";

type RailItem = {
  label: string;
  mode: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

const RAIL_GROUPS: Array<{ label: string; items: RailItem[] }> = [
  {
    label: "Creation",
    items: [
      { label: "Studio", mode: "studio", icon: LayoutGrid },
      { label: "Projects", mode: "moodboard", icon: FolderOpen },
      { label: "Stand", mode: "editorial-home", icon: Store },
      { label: "Scry", mode: "scry", icon: Radar },
    ],
  },
  {
    label: "Archive",
    items: [
      { label: "Archive", mode: "archival", icon: Archive },
      { label: "Mesopic", mode: "the-lens", icon: Eye },
      { label: "Darkroom", mode: "darkroom", icon: Aperture },
    ],
  },
  {
    label: "Alchemy",
    items: [
      { label: "Tailor", mode: "tailor", icon: Scissors },
      { label: "The Ward", mode: "ward", icon: Shield },
      { label: "Profile", mode: "profile", icon: User },
    ],
  },
  {
    label: "Discover",
    items: [
      { label: "Proscenium", mode: "proscenium", icon: Users },
      { label: "Press", mode: "the-press", icon: Newspaper },
      { label: "Codex", mode: "codex", icon: BookMarked },
    ],
  },
];

const canonicalMode = (mode: string) => {
  if (mode === "editorial-home") return "editorial-home";
  return mode;
};

export const MimiReferenceRail: React.FC<{
  currentView: string;
  onNavigate: (mode: string) => void;
  onOpenDirectory: () => void;
  oracleState?: string;
  isGenerating?: boolean;
}> = ({
  currentView,
  onNavigate,
  onOpenDirectory,
  oracleState = "ready",
  isGenerating = false,
}) => {
  const oracleLabel =
    oracleState === "saturated"
      ? "Oracle: Warm"
      : oracleState === "offline"
        ? "Oracle: Offline"
        : "Oracle: Ready";

  return (
    <aside
      aria-label="Mimi chambers"
      className="group/mimi-rail hidden md:flex h-full w-[88px] hover:w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#121212] text-white shadow-2xl transition-[width] duration-500 ease-out relative z-[2000]"
    >
      <div className="relative flex h-[112px] shrink-0 items-center border-b border-white/10 px-6">
        <button
          type="button"
          onClick={onOpenDirectory}
          className="flex min-w-[240px] items-center gap-5 text-left"
          aria-label="Open all Mimi rooms"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 text-[#d7b56d]">
            <BookOpen size={16} strokeWidth={1.25} />
          </span>
          <span className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover/mimi-rail:opacity-100">
            <span className="block font-serif text-[31px] italic leading-none tracking-tight">
              Mimi.
            </span>
            <span className="mt-2 block font-mono text-[7px] uppercase tracking-[0.34em] text-stone-500">
              Sovereign Registry
            </span>
          </span>
        </button>
      </div>

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex w-[88px] items-center justify-center opacity-100 transition-opacity duration-200 group-hover/mimi-rail:opacity-0"
        >
          <span
            className="font-serif text-[24px] italic tracking-[0.18em] text-stone-600"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Mimi Zine
          </span>
        </div>

        <div className="min-w-[288px] opacity-0 transition-opacity duration-200 group-hover/mimi-rail:opacity-100">
          {RAIL_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-6 font-mono text-[7px] uppercase tracking-[0.32em] text-stone-600">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    canonicalMode(currentView) === canonicalMode(item.mode);

                  return (
                    <button
                      type="button"
                      key={`${group.label}-${item.mode}`}
                      disabled={isGenerating}
                      onClick={() => onNavigate(item.mode)}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-[42px] w-full items-center gap-5 px-6 text-left transition-colors ${
                        active
                          ? "bg-white/[0.07] text-white"
                          : "text-stone-500 hover:bg-white/[0.04] hover:text-stone-200"
                      } ${isGenerating ? "cursor-wait opacity-50" : ""}`}
                    >
                      <Icon size={15} strokeWidth={1.25} />
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em]">
                        {item.label}
                      </span>
                      {active ? (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenDirectory}
        className="flex h-[68px] min-w-[288px] shrink-0 items-center gap-5 border-t border-white/10 px-6 text-left text-stone-500 transition-colors hover:text-white"
      >
        <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
          <span className="absolute h-2 w-2 rounded-full bg-emerald-400/30" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.22em]">
          {oracleLabel}
        </span>
        <Sparkles size={12} strokeWidth={1.25} className="ml-auto text-[#d7b56d]" />
      </button>

      {[16, 38, 61, 84].map((top) => (
        <span
          key={top}
          aria-hidden="true"
          className="pointer-events-none absolute -right-[7px] z-10 h-3.5 w-3.5 rounded-full border border-stone-700 bg-[#050505] shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
          style={{ top: `${top}%` }}
        />
      ))}
    </aside>
  );
};

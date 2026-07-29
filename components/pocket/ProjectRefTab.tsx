import React from "react";

interface ProjectRefTabProps {
  onClick: () => void;
  label?: string;
  active?: boolean;
}

/** Cream edge tab — opens project references / insert drawer (organized), not the messy stash. */
export const ProjectRefTab: React.FC<ProjectRefTabProps> = ({
  onClick,
  label = "Project Ref",
  active = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    className={`hidden md:flex absolute right-0 top-[38%] z-40 w-6 h-32 border-l border-y border-black rounded-l-md flex-col items-center justify-center cursor-pointer shadow-lg hover:-translate-x-0.5 transition-transform select-none group ${
      active ? "bg-black text-[#f3f1ea]" : "bg-[#f3f1ea] text-black"
    }`}
  >
    <span
      style={{ writingMode: "vertical-rl" }}
      className="rotate-180 font-mono text-[7px] tracking-[0.25em] uppercase group-hover:opacity-80 transition-colors font-bold"
    >
      {label}
    </span>
    <div className="w-full flex justify-center mt-2" aria-hidden>
      <div
        className={`w-px h-4 border-l border-dashed ${active ? "border-[#f3f1ea]/50" : "border-stone-400"}`}
      />
    </div>
  </button>
);

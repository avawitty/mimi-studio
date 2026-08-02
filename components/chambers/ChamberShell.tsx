import React from "react";
import { CANON_MODULES, type CanonModule } from "../../lib/productCanon";
import { ChamberHandoff } from "../ChamberHandoff";

interface ChamberShellProps {
  moduleId: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Skip the light chamber masthead when the child plate owns branding (e.g. Rip). */
  hideHeader?: boolean;
  /** Full-bleed dark void — no light shell chrome around the plate. */
  tone?: "default" | "void";
  /** Hide bottom ChamberHandoff strip when the plate is self-contained. */
  hideHandoff?: boolean;
}

export const getCanonModule = (moduleId: string): CanonModule | undefined =>
  CANON_MODULES.find((m) => m.id === moduleId);

export const ChamberShell: React.FC<ChamberShellProps> = ({
  moduleId,
  children,
  actions,
  hideHeader = false,
  tone = "default",
  hideHandoff = false,
}) => {
  const module = getCanonModule(moduleId);

  if (!module) {
    return <div className="p-8 text-nous-subtle font-mono text-xs">Unknown chamber: {moduleId}</div>;
  }

  const isVoid = tone === "void";

  return (
    <div
      className={`flex flex-col h-full min-h-0 justify-between ${
        isVoid ? "bg-[#050506] text-stone-100" : ""
      }`}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {!hideHeader ? (
          <header
            className={`shrink-0 border-b px-6 py-4 md:px-8 ${
              isVoid
                ? "border-white/10 bg-[#0a0a0c]/90"
                : "border-nous-border bg-nous-base/80"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <p
                  className={`font-mono text-[8px] uppercase tracking-[0.35em] font-black ${
                    isVoid ? "text-stone-500" : "text-nous-subtle"
                  }`}
                >
                  {module.engine}
                </p>
                <h1
                  className={`font-serif italic text-2xl md:text-3xl tracking-tight ${
                    isVoid ? "text-stone-100" : "text-nous-text"
                  }`}
                >
                  {module.name}
                </h1>
                <p
                  className={`font-sans text-[10px] mt-1 max-w-2xl leading-relaxed ${
                    isVoid ? "text-stone-500" : "text-nous-subtle"
                  }`}
                >
                  {module.userFlow}
                </p>
              </div>
              {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
            </div>
          </header>
        ) : actions ? (
          <div
            className={`shrink-0 flex flex-wrap items-center justify-end gap-2 px-4 py-2.5 border-b ${
              isVoid ? "border-white/10 bg-[#050506]" : "border-nous-border bg-nous-base/60"
            }`}
          >
            {actions}
          </div>
        ) : null}
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </div>
      {!hideHandoff ? <ChamberHandoff moduleId={moduleId} /> : null}
    </div>
  );
};

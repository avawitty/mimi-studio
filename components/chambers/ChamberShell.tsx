import React from "react";
import { CANON_MODULES, type CanonModule } from "../../lib/productCanon";
import { ChamberHandoff } from "../ChamberHandoff";

interface ChamberShellProps {
  moduleId: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const getCanonModule = (moduleId: string): CanonModule | undefined =>
  CANON_MODULES.find((m) => m.id === moduleId);

export const ChamberShell: React.FC<ChamberShellProps> = ({ moduleId, children, actions }) => {
  const module = getCanonModule(moduleId);

  if (!module) {
    return <div className="p-8 text-nous-subtle font-mono text-xs">Unknown chamber: {moduleId}</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 justify-between">
      <div className="flex-1 min-h-0 flex flex-col">
        <header className="shrink-0 border-b border-nous-border bg-nous-base/80 px-6 py-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.35em] text-nous-subtle font-black">
                {module.engine}
              </p>
              <h1 className="font-serif italic text-2xl md:text-3xl text-nous-text tracking-tight">
                {module.name}
              </h1>
              <p className="font-sans text-[10px] text-nous-subtle mt-1 max-w-2xl leading-relaxed">
                {module.userFlow}
              </p>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </div>
      <ChamberHandoff moduleId={moduleId} />
    </div>
  );
};

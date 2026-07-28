import React, { useState } from "react";
import { ChevronRight, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { getCanonModule } from "./ChamberShell";
import { ChamberHandoff } from "../ChamberHandoff";

export type ArchiveWorkflowStep = "collect" | "read" | "approve" | "apply" | "save";

const WORKFLOW_LABELS: Record<ArchiveWorkflowStep, string> = {
  collect: "Collect",
  read: "Read",
  approve: "Approve",
  apply: "Apply",
  save: "Save",
};

const DEFAULT_WORKFLOW: ArchiveWorkflowStep[] = ["collect", "read", "approve", "apply", "save"];

export interface ArchiveChamberShellProps {
  moduleId: string;
  spine?: React.ReactNode;
  contextSidebar?: React.ReactNode;
  canvas: React.ReactNode;
  contextDrawer?: React.ReactNode;
  contextDrawerOpen?: boolean;
  onContextDrawerToggle?: () => void;
  contextDrawerTitle?: string;
  workflowSteps?: ArchiveWorkflowStep[];
  activeWorkflowStep?: ArchiveWorkflowStep;
  actions?: React.ReactNode;
  headerNote?: string;
  compactHeader?: boolean;
}

export const ArchiveContextPanel: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => (
  <div className="flex flex-col h-full min-h-0">
    <div className="shrink-0 border-b archive-border px-5 py-4">
      <p className="font-mono text-[8px] uppercase tracking-[0.35em] archive-text-muted font-black">
        Context plate
      </p>
      <h3 className="font-serif italic text-lg archive-text-ink mt-1">{title}</h3>
      {subtitle ? (
        <p className="font-sans text-[10px] archive-text-muted mt-1 leading-relaxed">{subtitle}</p>
      ) : null}
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
    {footer ? (
      <div className="shrink-0 border-t archive-border px-5 py-4">{footer}</div>
    ) : null}
  </div>
);

export const ArchiveChamberShell: React.FC<ArchiveChamberShellProps> = ({
  moduleId,
  spine,
  contextSidebar,
  canvas,
  contextDrawer,
  contextDrawerOpen: controlledDrawerOpen,
  onContextDrawerToggle,
  contextDrawerTitle = "Context",
  workflowSteps = DEFAULT_WORKFLOW,
  activeWorkflowStep = "read",
  actions,
  headerNote,
  compactHeader = false,
}) => {
  const module = getCanonModule(moduleId);
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const drawerOpen = onContextDrawerToggle ? (controlledDrawerOpen ?? internalDrawerOpen) : internalDrawerOpen;
  const toggleDrawer =
    onContextDrawerToggle ??
    (() => {
      setInternalDrawerOpen((open) => !open);
    });

  if (!module) {
    return (
      <div className="p-8 archive-text-muted font-mono text-xs">Unknown chamber: {moduleId}</div>
    );
  }

  const activeIndex = workflowSteps.indexOf(activeWorkflowStep);

  return (
    <div className="archive-chamber flex flex-col h-full min-h-0">
      <header className={`archive-chrome shrink-0 border-b archive-border px-4 md:px-8 ${compactHeader ? 'py-2' : 'py-3 md:py-4'}`}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div className="min-w-0">
            {!compactHeader ? (
              <p className="font-mono text-[8px] uppercase tracking-[0.35em] archive-text-muted font-black">
                {module.engine}
              </p>
            ) : null}
            <h1 className={`font-serif italic archive-text-ink tracking-tight ${compactHeader ? 'text-lg' : 'text-xl md:text-2xl'}`}>
              {module.name}
            </h1>
            {!compactHeader ? (
              <p className="font-sans text-[10px] archive-text-muted mt-1 max-w-2xl leading-relaxed">
                {headerNote ?? module.userFlow}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {contextDrawer ? (
              <button
                type="button"
                onClick={toggleDrawer}
                title={drawerOpen ? "Hide context drawer" : "Show context drawer"}
                className="archive-icon-btn w-9 h-9 border archive-border flex items-center justify-center"
              >
                {drawerOpen ? (
                  <PanelRightClose size={15} strokeWidth={1.25} />
                ) : (
                  <PanelRightOpen size={15} strokeWidth={1.25} />
                )}
              </button>
            ) : null}
            {actions}
          </div>
        </div>

        {!compactHeader ? (
        <nav
          aria-label="Workflow"
          className="mt-4 flex flex-wrap items-center gap-1 md:gap-2"
        >
          {workflowSteps.map((step, index) => {
            const isActive = step === activeWorkflowStep;
            const isPast = activeIndex >= 0 && index < activeIndex;
            return (
              <React.Fragment key={step}>
                {index > 0 ? (
                  <ChevronRight
                    size={12}
                    className="archive-text-muted opacity-40 hidden sm:block shrink-0"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={`font-mono text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 border transition-colors ${
                    isActive
                      ? "archive-workflow-active border-archive-ink"
                      : isPast
                        ? "archive-workflow-past border-transparent"
                        : "archive-workflow-idle border-transparent"
                  }`}
                >
                  {WORKFLOW_LABELS[step]}
                </span>
              </React.Fragment>
            );
          })}
        </nav>
        ) : null}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {spine ? (
          <aside className="archive-spine shrink-0 w-14 md:w-16 border-r archive-border hidden md:flex flex-col items-center py-4 gap-2 overflow-y-auto">
            {spine}
          </aside>
        ) : null}

        {contextSidebar ? (
          <aside className="archive-context-sidebar shrink-0 w-44 md:w-52 border-r archive-border overflow-y-auto hidden md:block">
            {contextSidebar}
          </aside>
        ) : null}

        <main className="archive-canvas flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {canvas}
          </div>
          <ChamberHandoff moduleId={moduleId} />
        </main>

        {contextDrawer && drawerOpen ? (
          <>
            {/* Mobile: dim backdrop, tap to dismiss */}
            <button
              type="button"
              aria-label="Close context drawer"
              onClick={toggleDrawer}
              className="md:hidden fixed inset-0 z-[80] bg-black/40"
            />
            <aside
              className="archive-drawer overflow-hidden flex flex-col archive-border
                fixed inset-x-0 bottom-0 top-14 z-[90] border-t shadow-2xl
                md:static md:inset-auto md:top-auto md:z-auto md:shadow-none md:shrink-0 md:w-80 md:border-t-0 md:border-l"
              aria-label={contextDrawerTitle}
            >
              {/* Mobile-only close affordance */}
              <div className="md:hidden flex items-center justify-between px-4 py-3 border-b archive-border shrink-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] archive-text-muted font-black">
                  {contextDrawerTitle}
                </span>
                <button
                  type="button"
                  onClick={toggleDrawer}
                  aria-label="Close"
                  className="archive-icon-btn w-8 h-8 border archive-border flex items-center justify-center"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                {contextDrawer}
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
};

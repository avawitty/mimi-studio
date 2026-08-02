import React, { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { getCanonModule } from "./ChamberShell";
import { ChamberHandoff } from "../ChamberHandoff";
import { ProjectRefTab } from "../pocket/ProjectRefTab";
import { POCKET_STASH_OPEN_EVENT } from "../pocket/MessyPocketStash";

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
  /** On narrow screens, hide chamber title (app chrome already names the mode) and keep guide control only. */
  mobileGuideOnly?: boolean;
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

function useIsNarrow(query = "(max-width: 767px)") {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);
  return narrow;
}

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
  mobileGuideOnly = false,
}) => {
  const module = getCanonModule(moduleId);
  const isNarrow = useIsNarrow();
  const isControlled = typeof onContextDrawerToggle === "function";
  const preferOpenOnDesktop = controlledDrawerOpen === true;

  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);

  // Uncontrolled: open context rail on desktop when callers pass contextDrawerOpen,
  // keep mobile closed so the canvas is the first paint.
  useEffect(() => {
    if (isControlled) return;
    setInternalDrawerOpen(!isNarrow && preferOpenOnDesktop);
  }, [isControlled, isNarrow, preferOpenOnDesktop]);

  const drawerOpen = isControlled
    ? Boolean(controlledDrawerOpen)
    : internalDrawerOpen;

  const toggleDrawer =
    onContextDrawerToggle ??
    (() => {
      setInternalDrawerOpen((open) => !open);
    });

  // Mobile always uses compact chrome; desktop honors compactHeader prop.
  const useCompactChrome = compactHeader || isNarrow;

  if (!module) {
    return (
      <div className="p-8 archive-text-muted font-mono text-xs">Unknown chamber: {moduleId}</div>
    );
  }

  const activeIndex = workflowSteps.indexOf(activeWorkflowStep);
  // Short chamber name on mobile (drop alias after slash)
  const displayName = isNarrow ? module.name.split(" / ")[0] : module.name;
  const showMobileGuideOnly = isNarrow && mobileGuideOnly && Boolean(contextDrawer);

  const guideToggleButton = contextDrawer ? (
    <button
      type="button"
      onClick={toggleDrawer}
      title={drawerOpen ? "Hide guide" : "Show guide"}
      aria-label={drawerOpen ? "Hide guide" : "Show guide"}
      aria-expanded={drawerOpen}
      className="archive-icon-btn w-9 h-9 border archive-border flex items-center justify-center"
    >
      {drawerOpen ? (
        <PanelRightClose size={15} strokeWidth={1.25} />
      ) : (
        <PanelRightOpen size={15} strokeWidth={1.25} />
      )}
    </button>
  ) : null;

  return (
    <div className="archive-chamber binder-portfolio relative flex flex-col h-full min-h-0">
      {/* Desktop / non-guide-only header. Mobile guide-only chambers hide this entirely. */}
      <header
        className={`archive-chrome shrink-0 border-b archive-border px-4 md:px-8 ${
          useCompactChrome ? "py-2" : "py-3 md:py-4"
        } ${showMobileGuideOnly ? "hidden md:block" : ""}`}
      >
        <div className="flex items-end justify-between gap-2 md:gap-4">
          <div className="min-w-0">
            {!useCompactChrome ? (
              <p className="font-mono text-[8px] uppercase tracking-[0.35em] archive-text-muted font-black hidden md:block">
                {module.engine}
              </p>
            ) : null}
            <h1
              className={`font-serif italic archive-text-ink tracking-tight ${
                useCompactChrome ? "text-lg leading-none" : "text-2xl md:text-[2rem] leading-none"
              }`}
            >
              {displayName}
            </h1>
            {!useCompactChrome ? (
              <p className="font-sans text-[10px] archive-text-muted mt-2 max-w-xl leading-relaxed hidden md:block">
                {headerNote ?? module.userFlow}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {guideToggleButton}
            {actions}
          </div>
        </div>

        {!useCompactChrome ? (
          <nav
            aria-label="Workflow"
            className="mt-3 md:mt-4 hidden md:flex flex-wrap items-end gap-0 border-b border-archive-ink/80"
          >
            {workflowSteps.map((step, index) => {
              const isActive = step === activeWorkflowStep;
              const isPast = activeIndex >= 0 && index < activeIndex;
              return (
                <span
                  key={step}
                  className={`font-mono text-[8px] uppercase tracking-[0.16em] px-2.5 md:px-3 py-2 border transition-colors -mb-px ${
                    isActive
                      ? "border-black bg-white text-black"
                      : isPast
                        ? "border-transparent text-black/65"
                        : "border-transparent text-stone-500"
                  }`}
                >
                  {WORKFLOW_LABELS[step]}
                </span>
              );
            })}
            <span className="ml-auto hidden sm:inline font-mono text-[7px] uppercase tracking-[0.2em] archive-text-muted pb-2">
              Folio · Binder
            </span>
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
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] archive-text-muted px-3 pt-4 pb-2">
              Chamber modes
            </p>
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
            <button
              type="button"
              aria-label="Close context drawer"
              onClick={toggleDrawer}
              className="md:hidden fixed inset-0 z-[80] bg-black/40"
            />
            <aside
              className="archive-drawer overflow-hidden flex flex-col archive-border
                fixed inset-x-0 bottom-0 z-[90] border-t shadow-2xl max-h-[min(72vh,560px)]
                md:static md:inset-auto md:top-auto md:z-auto md:shadow-none md:shrink-0 md:w-80 md:max-h-none md:border-t-0 md:border-l md:h-full"
              aria-label={contextDrawerTitle}
            >
              <div className="md:hidden flex items-center justify-between px-4 py-3 border-b archive-border shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span aria-hidden className="block w-8 h-0.5 bg-stone-400 shrink-0" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] archive-text-muted font-black truncate">
                    {contextDrawerTitle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleDrawer}
                  aria-label="Close"
                  className="archive-icon-btn w-8 h-8 border archive-border flex items-center justify-center"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
                {contextDrawer}
              </div>
            </aside>
          </>
        ) : null}
      </div>

      <ProjectRefTab
        active={drawerOpen}
        onClick={() => {
          if (contextDrawer) toggleDrawer();
          else window.dispatchEvent(new CustomEvent(POCKET_STASH_OPEN_EVENT));
        }}
      />
    </div>
  );
};

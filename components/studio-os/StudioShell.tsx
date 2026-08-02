import React from "react";
import type {
  StudioFamily,
  StudioPhase,
} from "../../lib/productCanon";
import { StudioHeader } from "./StudioHeader";
import {
  StudioNavigation,
  type StudioAnchor,
} from "./StudioNavigation";

export interface StudioShellProps {
  family: StudioFamily;
  phase: StudioPhase;
  title?: string;
  activeAnchor?: StudioAnchor;
  onNavigate: (mode: string) => void;
  onOpenFind: () => void;
  /** Global NavigationDrawer opener — Map chrome must not fork menu ownership. */
  onOpenMenu?: () => void;
  children: React.ReactNode;
}

/**
 * Map-only orientation frame. Do not wrap Studio Hub / Worktable or other
 * chambers — StudioChrome remains the product chrome owner elsewhere.
 */
export const StudioShell: React.FC<StudioShellProps> = ({
  family,
  phase,
  title,
  activeAnchor = "map",
  onNavigate,
  onOpenFind,
  onOpenMenu,
  children,
}) => (
  <div
    data-studio-os
    data-studio-family={family}
    className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--mimi-bone,#f4f1ea)] text-[var(--mimi-ink,#111110)]"
  >
    <StudioHeader phase={phase} title={title} onOpenMenu={onOpenMenu} />
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    <StudioNavigation
      active={activeAnchor}
      onMap={() => onNavigate("chamber-map")}
      onDossier={() => onNavigate("studio")}
      onFind={onOpenFind}
    />
  </div>
);

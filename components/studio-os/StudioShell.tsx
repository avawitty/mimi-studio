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
  children: React.ReactNode;
}

export const StudioShell: React.FC<StudioShellProps> = ({
  family,
  phase,
  title,
  activeAnchor = "map",
  onNavigate,
  onOpenFind,
  children,
}) => (
  <div
    data-studio-os
    data-studio-family={family}
    className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--mimi-bone,#f4f1ea)] text-[var(--mimi-ink,#111110)]"
  >
    <StudioHeader phase={phase} title={title} />
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    <StudioNavigation
      active={activeAnchor}
      onMap={() => onNavigate("chamber-map")}
      onDossier={() => onNavigate("studio")}
      onFind={onOpenFind}
    />
  </div>
);

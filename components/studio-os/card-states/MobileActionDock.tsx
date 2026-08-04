import type { ReactNode } from "react";
import "./cardStates.css";

export type MobileActionDockProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Sticky mobile action region — respects safe areas above Studio OS anchors.
 */
export function MobileActionDock({ children, className = "" }: MobileActionDockProps) {
  return (
    <div className={`mimi-mobile-action-dock ${className}`.trim()} role="toolbar">
      {children}
    </div>
  );
}

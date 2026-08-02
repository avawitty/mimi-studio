import React from "react";
import type { ChamberFamily } from "../../lib/design-system";
import { cssVar } from "../../lib/design-system";

export interface SurveillanceOverlayProps {
  family: ChamberFamily;
  /** Quiet / public plates — overlay stays off */
  quiet?: boolean;
  /** Void dark plates (Rip, Scry) — keep clear of editorial media */
  voidPlate?: boolean;
  /** Intensify cobalt signal language (Oracle / reflect) */
  signalDense?: boolean;
  className?: string;
}

/**
 * Chamber-aware atmosphere layer — Signal Underarchive nod.
 * pointer-events-none; never competes with public-face plates.
 */
export const SurveillanceOverlay: React.FC<SurveillanceOverlayProps> = ({
  family,
  quiet = false,
  voidPlate = false,
  signalDense = false,
  className = "",
}) => {
  if (quiet || voidPlate) return null;

  const opacity = signalDense ? 0.07 : 0.04;

  if (family === "reflect" || signalDense) {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none z-0 mix-blend-overlay ${className}`}
        style={{
          opacity,
          backgroundImage: [
            `radial-gradient(ellipse 80% 50% at 10% 0%, ${cssVar("cobalt", "#9BB8CE")}33 0%, transparent 55%)`,
            `radial-gradient(circle at 90% 80%, ${cssVar("cobaltDeep", "#6A8AA4")}22 0%, transparent 40%)`,
            `repeating-linear-gradient(0deg, transparent, transparent 3px, ${cssVar("cobalt", "#9BB8CE")}0a 3px, transparent 4px)`,
          ].join(", "),
        }}
      />
    );
  }

  if (family === "refine") {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none z-0 mix-blend-overlay ${className}`}
        style={{
          opacity: 0.03,
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 11px,
            ${cssVar("hairline", "#D4D4D4")}55 11px,
            ${cssVar("hairline", "#D4D4D4")}55 12px
          )`,
        }}
      />
    );
  }

  if (family === "signature") {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none z-0 mix-blend-multiply dark:mix-blend-overlay ${className}`}
        style={{
          opacity: 0.035,
          backgroundImage: [
            `linear-gradient(135deg, ${cssVar("manilaSheet", "#F7F3E8")}00 40%, ${cssVar("manilaTab", "#E8DCB5")}44 100%)`,
            `radial-gradient(circle at 100% 0%, ${cssVar("cobalt", "#9BB8CE")}28 0%, transparent 28%)`,
          ].join(", "),
        }}
      />
    );
  }

  if (family === "create") {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none z-0 ${className}`}
        style={{
          opacity: 0.025,
          backgroundImage: `radial-gradient(circle at 50% 0%, ${cssVar("stone", "#78716C")}22 0%, transparent 45%)`,
        }}
      />
    );
  }

  if (family === "observe") {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none z-0 mix-blend-overlay ${className}`}
        style={{
          opacity: 0.04,
          backgroundImage: `radial-gradient(ellipse at 50% 100%, ${cssVar("cobaltMist", "#9BB8CE")}33 0%, transparent 50%)`,
        }}
      />
    );
  }

  return null;
};

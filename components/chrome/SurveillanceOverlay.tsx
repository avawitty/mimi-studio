import React from "react";
import type { ChamberFamily, FaceKind } from "../../lib/chamberChrome";

type SurveillanceOverlayProps = {
  chamber: ChamberFamily;
  face?: FaceKind;
  /** When true, skip entirely (e.g. CRT mode already paints grain) */
  disabled?: boolean;
};

/**
 * Chamber-aware psychic-oracle-spy atmosphere.
 * Pointer-events none; Signal Underarchive nod — scan whisper + registry corners,
 * never a cobalt hero wash on public plates.
 */
export const SurveillanceOverlay: React.FC<SurveillanceOverlayProps> = ({
  chamber,
  face = "worktable",
  disabled = false,
}) => {
  if (disabled) return null;

  const isDark = face === "public-dark" || face === "void";
  const isPublic = face === "public" || face === "public-dark";

  // Public light plates: only the faintest cool grain — brand stays editorial archive.
  if (face === "public") {
    return (
      <div
        aria-hidden
        data-overlay="surveillance"
        data-chamber={chamber}
        data-face={face}
        className="mimi-surveillance mimi-surveillance--public pointer-events-none absolute inset-0 z-0"
      />
    );
  }

  const intensity =
    chamber === "intelligence" || face === "void"
      ? "high"
      : chamber === "publishing" || isDark
        ? "mid"
        : chamber === "identity" ||
            chamber === "library" ||
            chamber === "services"
          ? "low"
          : "whisper";

  return (
    <div
      aria-hidden
      data-overlay="surveillance"
      data-chamber={chamber}
      data-face={face}
      data-intensity={intensity}
      className={`mimi-surveillance mimi-surveillance--${intensity} pointer-events-none absolute inset-0 z-0 ${
        isDark ? "mimi-surveillance--dark" : ""
      } ${isPublic ? "mimi-surveillance--public-dark" : ""}`}
    >
      <span className="mimi-surveillance__scan" />
      <span className="mimi-surveillance__mist" />
      {(intensity === "high" || intensity === "mid") && (
        <span className="mimi-surveillance__corners" data-accent="signal-underarchive">
          <span className="mimi-surveillance__corner mimi-surveillance__corner--tl" />
          <span className="mimi-surveillance__corner mimi-surveillance__corner--tr" />
          <span className="mimi-surveillance__corner mimi-surveillance__corner--bl" />
          <span className="mimi-surveillance__corner mimi-surveillance__corner--br" />
        </span>
      )}
    </div>
  );
};

import type { ReactNode } from "react";
import type { MimiCardState } from "../../../lib/cardStateTypes";
import { MimiStateFrame } from "./MimiStateFrame";
import "./cardStates.css";

export type ReadingPlateProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  signal?: ReactNode;
  interpretation: ReactNode;
  evidence?: ReactNode;
  coverage?: ReactNode;
  suggestedAction?: ReactNode;
  state?: MimiCardState;
  className?: string;
};

/**
 * Reading scene — signal → interpretation → evidence → coverage → action.
 */
export function ReadingPlate({
  eyebrow,
  title,
  signal,
  interpretation,
  evidence,
  coverage,
  suggestedAction,
  state = "idle",
  className = "",
}: ReadingPlateProps) {
  return (
    <MimiStateFrame
      kind="reading"
      state={state}
      eyebrow={eyebrow}
      title={title}
      className={`mimi-reading-plate ${className}`.trim()}
      footer={suggestedAction}
    >
      {signal ? <div className="mimi-reading-plate__signal">{signal}</div> : null}
      <div className="mimi-reading-plate__interpretation">{interpretation}</div>
      {evidence ? <div className="mimi-reading-plate__evidence">{evidence}</div> : null}
      {coverage ? <div className="mimi-reading-plate__coverage">{coverage}</div> : null}
    </MimiStateFrame>
  );
}

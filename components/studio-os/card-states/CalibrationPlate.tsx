import type { ReactNode } from "react";
import type { MimiCardState } from "../../../lib/cardStateTypes";
import { MimiStateFrame } from "./MimiStateFrame";
import "./cardStates.css";

export type CalibrationPlateProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  preview?: ReactNode;
  controls: ReactNode;
  primaryAction?: ReactNode;
  state?: MimiCardState;
  className?: string;
};

/**
 * Calibration scene — one signal or preference group with visible effect.
 */
export function CalibrationPlate({
  eyebrow,
  title,
  description,
  preview,
  controls,
  primaryAction,
  state = "idle",
  className = "",
}: CalibrationPlateProps) {
  return (
    <MimiStateFrame
      kind="calibration"
      state={state}
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={`mimi-calibration-plate ${className}`.trim()}
      footer={primaryAction}
    >
      <div className="mimi-calibration-plate__layout">
        <div className="mimi-calibration-plate__controls">{controls}</div>
        {preview ? (
          <div className="mimi-calibration-plate__preview">{preview}</div>
        ) : null}
      </div>
    </MimiStateFrame>
  );
}

import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type CaptureShellProps = Omit<FamilyShellFrameProps, "family">;

export const CaptureShell: React.FC<CaptureShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="capture"
    className={`studio-os-capture ${props.className ?? ""}`}
  />
);

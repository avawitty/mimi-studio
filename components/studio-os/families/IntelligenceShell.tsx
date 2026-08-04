import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type IntelligenceShellProps = Omit<
  FamilyShellFrameProps,
  "family"
>;

export const IntelligenceShell: React.FC<IntelligenceShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="intelligence"
    className={`studio-os-intelligence ${props.className ?? ""}`}
  />
);

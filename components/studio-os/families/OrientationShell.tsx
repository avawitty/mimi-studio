import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type OrientationShellProps = Omit<
  FamilyShellFrameProps,
  "family"
>;

export const OrientationShell: React.FC<OrientationShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="orientation"
    className={`studio-os-orientation ${props.className ?? ""}`}
  />
);

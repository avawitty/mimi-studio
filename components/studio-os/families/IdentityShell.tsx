import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type IdentityShellProps = Omit<FamilyShellFrameProps, "family">;

export const IdentityShell: React.FC<IdentityShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="identity"
    className={`studio-os-identity ${props.className ?? ""}`}
  />
);

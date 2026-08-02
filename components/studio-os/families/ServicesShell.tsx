import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type ServicesShellProps = Omit<FamilyShellFrameProps, "family">;

export const ServicesShell: React.FC<ServicesShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="services"
    className={`studio-os-services ${props.className ?? ""}`}
  />
);

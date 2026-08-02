import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type ProductionShellProps = Omit<FamilyShellFrameProps, "family">;

export const ProductionShell: React.FC<ProductionShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="production"
    className={`studio-os-production ${props.className ?? ""}`}
  />
);

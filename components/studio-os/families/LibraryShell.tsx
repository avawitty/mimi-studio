import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type LibraryShellProps = Omit<FamilyShellFrameProps, "family">;

export const LibraryShell: React.FC<LibraryShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="library"
    className={`studio-os-library ${props.className ?? ""}`}
  />
);

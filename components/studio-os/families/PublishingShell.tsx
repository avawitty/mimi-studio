import React from "react";
import {
  FamilyShellFrame,
  type FamilyShellFrameProps,
} from "./FamilyShellFrame";

export type PublishingShellProps = Omit<
  FamilyShellFrameProps,
  "family"
>;

export const PublishingShell: React.FC<PublishingShellProps> = (props) => (
  <FamilyShellFrame
    {...props}
    family="publishing"
    className={`studio-os-publishing ${props.className ?? ""}`}
  />
);

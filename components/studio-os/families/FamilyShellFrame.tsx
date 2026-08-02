import React from "react";
import type { StudioFamily } from "../../../lib/productCanon";
import type { VisualPacket } from "../manifests/visualPackets";

export interface FamilyShellFrameProps {
  family: StudioFamily;
  packet?: VisualPacket | null;
  children: React.ReactNode;
  className?: string;
}

export const FamilyShellFrame: React.FC<FamilyShellFrameProps> = ({
  family,
  packet,
  children,
  className = "",
}) => (
  <section
    data-studio-family={family}
    data-physical-metaphor={packet?.physicalMetaphor}
    data-motion={packet?.motion}
    className={`relative mx-auto w-full max-w-6xl px-4 pb-24 pt-5 md:px-8 md:pt-8 ${className}`}
  >
    {children}
  </section>
);

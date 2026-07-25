import React from "react";
import { ChamberShell } from "./ChamberShell";
import { SolitarianCaseStudy } from "../SolitarianCaseStudy";

interface PrivateStudioChamberProps {
  onClose?: () => void;
}

export const PrivateStudioChamber: React.FC<PrivateStudioChamberProps> = ({ onClose }) => (
  <ChamberShell moduleId="private-studio">
    <SolitarianCaseStudy onClose={onClose || (() => undefined)} />
  </ChamberShell>
);

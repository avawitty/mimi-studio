import {
  CANON_MODULES,
  type CanonModule,
} from "../../../lib/productCanon";
import {
  getVisualPacket,
  type VisualPacket,
} from "./visualPackets";

export interface ChamberManifest {
  id: CanonModule["id"];
  mode: string;
  name: string;
  family: CanonModule["family"];
  phase: CanonModule["phase"];
  visibility: CanonModule["visibility"];
  atmosphere: CanonModule["atmosphere"];
  primaryAction: CanonModule["primaryAction"];
  suggestedNext?: CanonModule["suggestedNext"];
  visualPacket: VisualPacket | null;
}

export const CHAMBER_MANIFESTS: ChamberManifest[] = CANON_MODULES.map(
  (module) => ({
    id: module.id,
    mode: module.implementedMode ?? module.id,
    name: module.name,
    family: module.family,
    phase: module.phase,
    visibility: module.visibility,
    atmosphere: module.atmosphere,
    primaryAction: module.primaryAction,
    suggestedNext: module.suggestedNext,
    visualPacket: getVisualPacket(module.visualPacket),
  }),
);

export function getChamberManifest(mode: string): ChamberManifest | null {
  return (
    CHAMBER_MANIFESTS.find(
      (manifest) =>
        manifest.mode === mode &&
        CANON_MODULES.find((module) => module.id === manifest.id)?.status ===
          "live",
    ) ??
    CHAMBER_MANIFESTS.find(
      (manifest) => manifest.mode === mode || manifest.id === mode,
    ) ??
    null
  );
}

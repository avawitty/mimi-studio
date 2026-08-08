import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import {
  CANON_MODULES,
  type CanonModule,
  type CanonVisibility,
  type ChamberAtmosphere,
  type StudioFamily,
  type StudioPhase,
  type VisualPacketId,
} from "./productCanon";
import {
  isDarkPlateMode,
  isPublicFaceMode,
} from "./design-system";

/**
 * Chamber-aware route registry.
 *
 * Navigation still uses the History API in App.tsx (`useAppRouter` +
 * `canonicalizeMimiRoute`). This module is the typed catalog of lazy surfaces
 * and shell metadata — not a react-router Routes tree.
 */

export interface LazyRouteEntry {
  /** Canonical view mode / path segment */
  mode: string;
  label: string;
  family: StudioFamily;
  phase: StudioPhase;
  visibility: CanonVisibility;
  atmosphere: ChamberAtmosphere[];
  primaryAction: CanonModule["primaryAction"];
  suggestedNext?: CanonModule["suggestedNext"];
  visualPacket?: VisualPacketId;
  isPublicFace: boolean;
  isDarkPlate: boolean;
  /** Optional lazy loader — when omitted, App.tsx still owns the mount */
  loader?: () => Promise<{ default: ComponentType<any> }>;
  lazy?: LazyExoticComponent<ComponentType<any>>;
  canon?: CanonModule;
}

function entryFromCanon(module: CanonModule): LazyRouteEntry {
  const mode = module.implementedMode || module.id;
  return {
    mode,
    label: module.name,
    family: module.family,
    phase: module.phase,
    visibility: module.visibility,
    atmosphere: module.atmosphere,
    primaryAction: module.primaryAction,
    suggestedNext: module.suggestedNext,
    visualPacket: module.visualPacket,
    isPublicFace:
      module.atmosphere.includes("public-face") || isPublicFaceMode(mode),
    isDarkPlate:
      module.atmosphere.includes("dark-plate") || isDarkPlateMode(mode),
    canon: module,
  };
}

/** All canon modules as route metadata (shell / map / skeleton consumers). */
export const CANON_ROUTE_ENTRIES: LazyRouteEntry[] = CANON_MODULES.map(
  entryFromCanon,
);

export const ROUTE_ENTRY_BY_MODE: Record<string, LazyRouteEntry> =
  CANON_ROUTE_ENTRIES.reduce<Record<string, LazyRouteEntry>>((acc, entry) => {
    if (
      acc[entry.mode]?.canon?.status === "live" &&
      entry.canon?.status !== "live"
    ) {
      return acc;
    }
    acc[entry.mode] = entry;
    return acc;
  }, {});

/**
 * Named lazy loaders for high-traffic chambers.
 * App.tsx may still declare its own lazy() imports; these are shared entry points
 * for progressive extraction and Suspense boundaries.
 */
export const LAZY_CHAMBERS = {
  /** Primary /studio entry — calm orientation intake */
  studio: lazy(
    () => import("../components/studio/StudioOrientationEntry"),
  ),
  /** Alternate calm orientation intake */
  "studio-orientation": lazy(
    () => import("../components/studio/StudioOrientationEntry"),
  ),
  /** Experimental archival desk — not the primary /studio entry */
  "studio-worktable-legacy": lazy(
    () => import("../components/worktable/StudioWorktable"),
  ),
  stand: lazy(() =>
    import("../components/TheStand").then((m) => ({ default: m.TheStand })),
  ),
  signature: lazy(() =>
    import("../components/SignatureView").then((m) => ({
      default: m.SignatureView,
    })),
  ),
  "editorial-home": lazy(() =>
    import("../components/EditorialFrontPage").then((m) => ({
      default: m.EditorialFrontPage,
    })),
  ),
  "mimi-rip": lazy(() =>
    import("../components/chambers/RipChamber").then((m) => ({
      default: m.RipChamber,
    })),
  ),
  oracle: lazy(() =>
    import("../components/TheOracle").then((m) => ({ default: m.TheOracle })),
  ),
  residue: lazy(() =>
    import("../components/chambers/ResidueChamber").then((m) => ({
      default: m.ResidueChamber,
    })),
  ),
  observatory: lazy(() =>
    import("../components/chambers/ObservatoryChamber").then((m) => ({
      default: m.ObservatoryChamber,
    })),
  ),
  forecast: lazy(() =>
    import("../components/TheForecast").then((m) => ({
      default: m.TheForecast,
    })),
  ),
  scribe: lazy(() =>
    import("../components/chambers/ScribeChamber").then((m) => ({
      default: m.ScribeChamber,
    })),
  ),
  "chamber-map": lazy(() =>
    import("../components/chambers/ChamberMapView").then((m) => ({
      default: m.ChamberMapView,
    })),
  ),
} as const;

export type LazyChamberKey = keyof typeof LAZY_CHAMBERS;

export function getRouteEntry(mode: string): LazyRouteEntry | null {
  return ROUTE_ENTRY_BY_MODE[mode] ?? null;
}

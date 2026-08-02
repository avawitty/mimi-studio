import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { CANON_MODULES, type CanonModule } from "./productCanon";
import {
  type ChamberFamily,
  chamberFamilyForMode,
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
  family: ChamberFamily;
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
    family: chamberFamilyForMode(mode),
    isPublicFace: isPublicFaceMode(mode),
    isDarkPlate: isDarkPlateMode(mode),
    canon: module,
  };
}

/** All canon modules as route metadata (shell / map / skeleton consumers). */
export const CANON_ROUTE_ENTRIES: LazyRouteEntry[] = CANON_MODULES.map(
  entryFromCanon,
);

export const ROUTE_ENTRY_BY_MODE: Record<string, LazyRouteEntry> =
  CANON_ROUTE_ENTRIES.reduce<Record<string, LazyRouteEntry>>((acc, entry) => {
    acc[entry.mode] = entry;
    return acc;
  }, {});

/**
 * Named lazy loaders for high-traffic chambers.
 * App.tsx may still declare its own lazy() imports; these are shared entry points
 * for progressive extraction and Suspense boundaries.
 */
export const LAZY_CHAMBERS = {
  studio: lazy(() =>
    import("../components/worktable/StudioWorktable").then((m) => ({
      default: m.StudioWorktable,
    })),
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

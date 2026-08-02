/**
 * Milestone 1 guardrail: every CanonModule route must resolve to a known implemented mode
 * with a registered chamber component file.
 * Run: npm run validate:canon
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANON_INFRASTRUCTURE,
  CANON_MODULES,
  CANON_ROUTE_ALIASES,
  canonicalizeMimiRoute,
} from "../lib/productCanon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const IMPLEMENTED_MODES = new Set([
  "studio",
  "scribe",
  "tailor",
  "signature",
  "taste-graph",
  "the-edit",
  "the-press",
  "pocket",
  "stand",
  "moodboard",
  "intel-hub",
  "geo_engine",
  "darkroom",
  "wardrobe",
  "thimble",
  "sanctuary",
  "ward",
  "private-studio",
  "mimi-dolls",
  "mimi-rip",
  "chamber-map",
  "atelier",
  "house",
  "proscenium",
  "residue",
  "observatory",
  "mean-median-mode",
  "forecast",
  "celestial-calibration",
  "scry",
]);

/** Primary chamber component paths (Milestone 1 registry) */
const CHAMBER_COMPONENT_FILES: Record<string, string> = {
  ScribeChamber: "components/chambers/ScribeChamber.tsx",
  MimiDollsChamber: "components/chambers/MimiDollsChamber.tsx",
  RipChamber: "components/chambers/RipChamber.tsx",
  MoodBoardChamber: "components/chambers/MoodBoardChamber.tsx",
  PrivateStudioChamber: "components/chambers/PrivateStudioChamber.tsx",
  TheEditChamber: "components/chambers/TheEditChamber.tsx",
  ThePressChamber: "components/chambers/ThePressChamber.tsx",
  AtelierChamber: "components/chambers/AtelierChamber.tsx",
  HouseChamber: "components/chambers/HouseChamber.tsx",
  ResidueChamber: "components/chambers/ResidueChamber.tsx",
  ObservatoryChamber: "components/chambers/ObservatoryChamber.tsx",
  TheForecast: "components/TheForecast.tsx",
  CelestialCalibrationChamber: "components/chambers/CelestialCalibrationChamber.tsx",
  ScryView: "components/ScryView.tsx",
  SignatureView: "components/SignatureView.tsx",
  TailorHub: "components/tailor/TailorHub.tsx",
  TasteGraph: "components/TasteGraph.tsx",
  Pocket: "components/Pocket.tsx",
  TheStand: "components/TheStand.tsx",
  IntelHub: "components/IntelHub.tsx",
  TheGEOEngine: "components/TheGEOEngine.tsx",
  DarkroomView: "components/DarkroomView.tsx",
  WardrobeView: "components/WardrobeView.tsx",
  ThimbleDashboard: "components/ThimbleDashboard.tsx",
  SanctuaryView: "components/SanctuaryView.tsx",
  TheWard: "components/TheWard.tsx",
  ExportChamber: "components/ExportChamber.tsx",
  ChamberMapView: "components/chambers/ChamberMapView.tsx",
  ProsceniumView: "components/ProsceniumView.tsx",
  StudioOrientationEntry: "components/studio/StudioOrientationEntry.tsx",
  StudioWorktable: "components/worktable/StudioWorktable.tsx",
  InputStudio: "components/InputStudio.tsx",
};

const failures: string[] = [];

for (const module of CANON_MODULES) {
  const segment = module.canonicalRoute.replace(/^\//, "");
  const resolved = canonicalizeMimiRoute(segment);

  if (!module.implementedMode) {
    failures.push(`${module.id}: missing implementedMode`);
    continue;
  }

  if (resolved !== module.implementedMode) {
    failures.push(
      `${module.id}: canonical route /${segment} resolves to "${resolved}", expected "${module.implementedMode}"`,
    );
  }

  if (!IMPLEMENTED_MODES.has(module.implementedMode)) {
    failures.push(`${module.id}: implementedMode "${module.implementedMode}" not in App.tsx inventory`);
  }

  if (module.status === "missing") {
    failures.push(`${module.id}: status is missing`);
  }

  if (!module.userFlow?.trim()) {
    failures.push(`${module.id}: missing userFlow`);
  }

  const componentName = module.component?.split(/[\s/]/)[0];
  if (componentName && CHAMBER_COMPONENT_FILES[componentName]) {
    const filePath = path.join(root, CHAMBER_COMPONENT_FILES[componentName]);
    if (!fs.existsSync(filePath)) {
      failures.push(`${module.id}: component file missing at ${CHAMBER_COMPONENT_FILES[componentName]}`);
    }
  }
}

for (const [alias, target] of Object.entries(CANON_ROUTE_ALIASES)) {
  if (alias.startsWith("/")) continue;
  const resolved = canonicalizeMimiRoute(alias);
  if (resolved !== target) {
    failures.push(`alias "${alias}" resolves to "${resolved}", expected "${target}"`);
  }
}

const liveCount = CANON_MODULES.filter((m) => m.status === "live").length;
const aliasedCount = CANON_MODULES.filter((m) => m.status === "aliased").length;
const missingCount = CANON_MODULES.filter((m) => m.status === "missing").length;
const stubCount = CANON_MODULES.filter((m) => m.status === "stub").length;
const infraLive = CANON_INFRASTRUCTURE.filter((i) => i.status === "live").length;
const infraHardening = CANON_INFRASTRUCTURE.filter((i) => i.status === "hardening").length;
const infraProposed = CANON_INFRASTRUCTURE.filter((i) => i.status === "proposed").length;

if (failures.length > 0) {
  console.error("Canon route validation failed:\n");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

console.log(
  `Canon route validation passed (${CANON_MODULES.length} modules, ${Object.keys(CANON_ROUTE_ALIASES).length} aliases).`,
);
console.log(
  `  live: ${liveCount} · aliased: ${aliasedCount} · stub: ${stubCount} · missing: ${missingCount}`,
);
console.log(
  `  substrates: ${CANON_INFRASTRUCTURE.length} (live: ${infraLive} · hardening: ${infraHardening} · proposed: ${infraProposed})`,
);

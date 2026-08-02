/**
 * Offline verify for Forecast chamber contract + canon wiring.
 * Run: npx tsx scripts/verifyForecastChamber.ts
 */
import assert from "node:assert/strict";
import {
  FORECAST_CHAMBER_MODE,
  FORECAST_CHAMBER_MODULE_ID,
  FORECAST_CHAMBER_ROUTE,
  FORECAST_COPY,
  FORECAST_HANDOFF_TARGETS,
} from "../lib/forecastChamberContract";
import { CANON_MODULES, canonicalizeMimiRoute } from "../lib/productCanon";
import { MENU_STRUCTURE } from "../components/navigationConfig";

const mod = CANON_MODULES.find((m) => m.id === FORECAST_CHAMBER_MODULE_ID);
assert.ok(mod, "forecast module missing from CANON_MODULES");
assert.equal(mod.status, "live");
assert.equal(mod.canonicalRoute, FORECAST_CHAMBER_ROUTE);
assert.equal(mod.implementedMode, FORECAST_CHAMBER_MODE);
assert.equal(canonicalizeMimiRoute("forecast"), "forecast");
assert.equal(canonicalizeMimiRoute("the-forecast"), "forecast");
assert.equal(canonicalizeMimiRoute("aesthetic-meteorology"), "forecast");

const menuItem = MENU_STRUCTURE.flatMap((s) => s.items).find((i) => i.mode === "forecast");
assert.ok(menuItem, "Forecast missing from MENU_STRUCTURE");
assert.match(menuItem.label, /Forecast/i);

assert.ok(FORECAST_HANDOFF_TARGETS.some((t) => t.view === "observatory"));
assert.ok(FORECAST_COPY.driftUncalibrated.length > 0);
assert.ok(FORECAST_COPY.contentLiveBanner.length > 0);
assert.ok(FORECAST_COPY.contentUnavailableBanner.length > 0);
assert.ok(!/Math\.random/.test(FORECAST_COPY.thesis));
assert.ok(
  !/simulated until a live gateway/i.test(FORECAST_COPY.contentLiveBanner),
  "content banner should describe live path, not deferred simulation",
);

console.log("verifyForecastChamber: ok");

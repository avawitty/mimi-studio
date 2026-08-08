/**
 * Offline verify for Forecast chamber contract + canon wiring.
 * Run: npx tsx scripts/verifyForecastChamber.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORECAST_CHAMBER_MODE,
  FORECAST_CHAMBER_MODULE_ID,
  FORECAST_CHAMBER_ROUTE,
  FORECAST_COPY,
  FORECAST_HANDOFF_TARGETS,
} from "../lib/forecastChamberContract";
import { CANON_MODULES, canonicalizeMimiRoute } from "../lib/productCanon";
import { MENU_STRUCTURE } from "../components/navigationConfig";
import {
  buildForecastReport,
  loadApprovedFeedEntries,
  loadMeanMedianModeReport,
} from "../services/collective";
import { forecastReportSchema } from "../schemas/collectiveIntelligenceContracts";

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
assert.ok(FORECAST_COPY.cultureObserved.length > 0);
assert.ok(FORECAST_COPY.intakePersonalTitle.length > 0);
assert.ok(FORECAST_COPY.intakeBrandTitle.length > 0);
assert.ok(/Apify/i.test(FORECAST_COPY.contentLiveBanner));
assert.ok(!/Math\.random/.test(FORECAST_COPY.thesis));
assert.ok(
  !/simulated until a live gateway/i.test(FORECAST_COPY.contentLiveBanner),
  "content banner should describe live path, not deferred simulation",
);

const observed = loadMeanMedianModeReport("demonstration");
const report = buildForecastReport({
  observed,
  external: null,
  feedEntryCount: loadApprovedFeedEntries().length,
});
forecastReportSchema.parse(report);
assert.equal(report.observed.length, observed.profiles.length);
assert.ok(report.trajectories.length > 0, "observed profiles yield trajectories");
assert.ok(!report.trajectories.some((t) => /Math\.random/.test(t.hypothesis)));

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const forecastUi = fs.readFileSync(path.join(root, "components/TheForecast.tsx"), "utf8");
assert.ok(forecastUi.includes("buildForecastReport"), "Forecast UI composes ForecastReport");
assert.ok(forecastUi.includes("ForecastObservedPanel"), "Forecast culture uses observed panel");
assert.ok(forecastUi.includes("ForecastIntakePanel"), "Forecast UI includes intake panel");
assert.ok(forecastUi.includes("queryContext"), "Forecast UI passes personalized query context");
assert.ok(!forecastUi.includes("Math.random"), "Forecast UI has no random drift costume");
assert.match(
  forecastUi,
  /if \(contentForecast \|\| !user \|\| needsIntake\)/,
  "culture vector must skip live synthesis for anonymous users or pending intake",
);

console.log("verifyForecastChamber: ok");

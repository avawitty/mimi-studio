/**
 * Offline verify for Celestial Calibration (Phases 1–4).
 * Run: npm run verify:celestial
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CELESTIAL_CHAMBER_MODULE_ID,
  CELESTIAL_CHAMBER_ROUTE,
  CELESTIAL_CHAMBER_MODE,
  CELESTIAL_CHAMBER_COPY,
} from "../lib/celestialChamberContract";
import {
  approximateSunEclipticLongitudeDeg,
  computeTropicalSunSign,
  julianDayUtc,
  signFromEclipticLongitude,
  ZODIAC_SIGN_ORDER,
} from "../lib/celestial/sunSign";
import { seasonFromEclipticLongitude } from "../lib/celestial/seasonalAlignment";
import {
  celestialReadoutForOracle,
  celestialTimingForGeneration,
  compileCelestialReadout,
} from "../lib/celestial/compileCelestialReadout";
import { zonedCivilToUtc } from "../lib/celestial/timezone";
import { computeAscendantLongitudeDeg } from "../lib/celestial/risingHouses";
import { computeNatalChartSlice } from "../lib/celestial/ephemeris";
import { CANON_MODULES, canonicalizeMimiRoute } from "../lib/productCanon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

let failures = 0;

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function testJulianAndLongitude() {
  const lonJ2000 = approximateSunEclipticLongitudeDeg(2451545.0);
  assert(lonJ2000 >= 0 && lonJ2000 < 360, "longitude in range at J2000");

  const jdEquinox = julianDayUtc(2024, 3, 20, 12, 0, 0);
  const lonEq = approximateSunEclipticLongitudeDeg(jdEquinox);
  assert(lonEq < 5 || lonEq > 355, `2024-03-20 near 0° Aries (got ${lonEq.toFixed(3)})`);
  assert(seasonFromEclipticLongitude(lonEq) === "spring" || lonEq > 355, "equinox season spring or prior winter edge");
}

function testKnownSunSigns() {
  const cases: Array<{ date: string; expect: (typeof ZODIAC_SIGN_ORDER)[number] }> = [
    { date: "1990-04-10", expect: "aries" },
    { date: "1990-05-01", expect: "taurus" },
    { date: "1990-06-01", expect: "gemini" },
    { date: "1990-07-04", expect: "cancer" },
    { date: "1990-08-01", expect: "leo" },
    { date: "1990-09-01", expect: "virgo" },
    { date: "1990-10-01", expect: "libra" },
    { date: "1990-11-01", expect: "scorpio" },
    { date: "1990-12-01", expect: "sagittarius" },
    { date: "1991-01-10", expect: "capricorn" },
    { date: "1991-02-01", expect: "aquarius" },
    { date: "1991-03-01", expect: "pisces" },
  ];
  for (const c of cases) {
    const result = computeTropicalSunSign({ birthDate: c.date });
    assert(result, `computes for ${c.date}`);
    assert(result!.sign === c.expect, `${c.date} → ${c.expect} (got ${result!.sign})`);
  }
}

function testSignFromLongitude() {
  assert(signFromEclipticLongitude(0).sign === "aries", "0° aries");
  assert(signFromEclipticLongitude(29.9).sign === "aries", "29.9° aries");
  assert(signFromEclipticLongitude(30).sign === "taurus", "30° taurus");
  assert(signFromEclipticLongitude(359).sign === "pisces", "359° pisces");
}

function testCuspFlag() {
  const near = signFromEclipticLongitude(0.5);
  assert(near.sign === "aries" && near.degreesIntoSign < 1, "near ingress degrees");
  const computed = computeTropicalSunSign({ birthDate: "2024-03-20", birthTime: "12:00" });
  assert(computed, "equinox date computes");
  assert(
    computed!.onCusp || computed!.degreesIntoSign < 2,
    "equinox flagged cusp or early Aries",
  );
}

function testTimezoneConversion() {
  // 1990-06-01 12:00 America/New_York (EDT, UTC-4) → 16:00 UTC
  const utc = zonedCivilToUtc({
    year: 1990,
    month: 6,
    day: 1,
    hour: 12,
    minute: 0,
    timeZone: "America/New_York",
  });
  assert(utc, "zoned conversion returns date");
  assert(utc!.getUTCHours() === 16, `NY noon → 16 UTC (got ${utc!.getUTCHours()})`);
  assert(utc!.getUTCDate() === 1, "same civil day");
}

function testEphemerisAndRising() {
  // NYC 1990-06-01 12:00 EDT = 16:00 UTC
  const utc = new Date(Date.UTC(1990, 5, 1, 16, 0, 0));
  const chart = computeNatalChartSlice({
    utcDate: utc,
    latitude: 40.7128,
    longitude: -74.006,
    hasBirthTime: true,
  });
  assert(chart.bodies.length >= 10, "ten classical bodies");
  const sun = chart.bodies.find((b) => b.body === "sun");
  assert(sun?.sign === "gemini", `ephemeris sun gemini (got ${sun?.sign})`);
  const moon = chart.bodies.find((b) => b.body === "moon");
  assert(moon, "moon present");
  assert(chart.aspects.length >= 1, "at least one major aspect");
  assert(chart.rising, "rising computed with coords + time");
  assert(chart.houses?.length === 12, "twelve whole-sign houses");
  assert(
    chart.houses![0].sign === chart.rising!.sign,
    "house 1 matches rising sign",
  );

  const ascLon = computeAscendantLongitudeDeg({
    utcDate: utc,
    latitude: 40.7128,
    longitude: -74.006,
  });
  assert(ascLon >= 0 && ascLon < 360, "ascendant longitude in range");

  const noRising = computeNatalChartSlice({
    utcDate: utc,
    hasBirthTime: false,
  });
  assert(noRising.rising === null, "no rising without time/coords");
}

function testReadoutAndGeneration() {
  const inactive = compileCelestialReadout({ enabled: false });
  assert(inactive.timingPhrase.toLowerCase().includes("inactive"), "inactive copy");
  assert(celestialTimingForGeneration({ enabled: false }) === null, "no gen string when off");

  const preview = compileCelestialReadout({
    enabled: false,
    birthDate: "1990-06-01",
  });
  assert(preview.sun?.sign === "gemini", "preview derives while disabled");
  assert(
    preview.timingPhrase.includes("Gemini") &&
      preview.timingPhrase.toLowerCase().includes("not used in generation"),
    "preview phrase shows derived Sun without claiming generation use",
  );

  const active = compileCelestialReadout({
    enabled: true,
    birthDate: "1990-06-01",
    astrologicalLineage: "Maternal chart stories",
  });
  assert(active.sun?.sign === "gemini", "readout gemini");
  assert(active.sun?.method === "ephemeris_sun", "ephemeris sun method");
  assert(active.enabled, "enabled");
  assert(active.chart?.bodies.length, "chart bodies on date-only");
  assert(active.unsupported.some((u) => u.toLowerCase().includes("rising")), "lists rising unsupported without place");
  assert(
    active.scopeNotice.toLowerCase().includes("symbolic") ||
      active.scopeNotice.toLowerCase().includes("self-expressive"),
    "symbolic scope notice",
  );

  const withPlace = compileCelestialReadout({
    enabled: true,
    birthDate: "1990-06-01",
    birthTime: "12:00",
    birthTimezone: "America/New_York",
    birthLatitude: 40.7128,
    birthLongitude: -74.006,
    geocodeStatus: "resolved",
  });
  assert(withPlace.chart?.rising, "rising when place+time resolve");
  assert(
    !withPlace.unsupported.some((u) => u.toLowerCase().includes("rising / ascendant")),
    "rising removed from unsupported when present",
  );
  assert(withPlace.timingPhrase.includes("Rising"), "timing phrase mentions rising");

  const gen = celestialTimingForGeneration({
    enabled: true,
    birthDate: "1990-06-01",
    astrologicalLineage: "Maternal chart stories",
  });
  assert(gen && gen.includes("Gemini"), `gen string mentions Gemini (got ${gen})`);
  assert(gen!.includes("Maternal"), "gen string includes lineage");

  const locked = compileCelestialReadout({
    enabled: true,
    birthDate: "1990-06-01",
    zodiac: "leo",
    zodiacLocked: true,
  });
  assert(locked.sun?.sign === "leo", "manual lock wins");
  assert(locked.sun?.method === "manual_override", "manual method");

  const oracleDisabled = celestialReadoutForOracle({
    enabled: false,
    birthDate: "1990-06-01",
  });
  assert(oracleDisabled.enabled === false, "oracle disabled when toggle off");
  assert(oracleDisabled.sun === null, "oracle omits sun when disabled");
  assert(
    (oracleDisabled.bodies as unknown[]).length === 0,
    "oracle omits bodies when disabled",
  );

  const oracle = celestialReadoutForOracle({
    enabled: true,
    birthDate: "1990-06-01",
    birthTime: "12:00",
    birthTimezone: "America/New_York",
    birthLatitude: 40.7128,
    birthLongitude: -74.006,
  });
  assert(oracle.sun && (oracle.sun as { sign: string }).sign === "gemini", "oracle payload sun");
  assert(Array.isArray(oracle.bodies), "oracle payload bodies");
  assert(oracle.rising, "oracle payload rising");
}

function testCanonAndFiles() {
  assert(
    canonicalizeMimiRoute("celestial-calibration") === "celestial-calibration",
    "canonical route",
  );
  assert(canonicalizeMimiRoute("celestial") === "celestial-calibration", "celestial alias");
  assert(canonicalizeMimiRoute("natal") === "celestial-calibration", "natal alias");
  assert(canonicalizeMimiRoute("zodiac") === "celestial-calibration", "zodiac alias");
  assert(canonicalizeMimiRoute("observatory") === "observatory", "observatory untouched");

  const mod = CANON_MODULES.find((m) => m.id === CELESTIAL_CHAMBER_MODULE_ID);
  assert(mod, "canon module present");
  assert(mod!.canonicalRoute === CELESTIAL_CHAMBER_ROUTE, "route path");
  assert(mod!.implementedMode === CELESTIAL_CHAMBER_MODE, "mode");
  assert(mod!.component === "CelestialCalibrationChamber", "component name");
  assert(!mod!.aliases.includes("Observatory"), "does not alias Observatory");
  assert(
    CELESTIAL_CHAMBER_COPY.observatoryDisambiguation.toLowerCase().includes("observatory"),
    "copy disambiguates observatory",
  );

  const requiredFiles = [
    "schemas/celestialCalibrationContracts.ts",
    "lib/celestial/sunSign.ts",
    "lib/celestial/seasonalAlignment.ts",
    "lib/celestial/compileCelestialReadout.ts",
    "lib/celestial/timezone.ts",
    "lib/celestial/resolveBirthInstant.ts",
    "lib/celestial/astronomyEngine.ts",
    "lib/celestial/ephemeris.ts",
    "lib/celestial/aspects.ts",
    "lib/celestial/risingHouses.ts",
    "lib/celestial/geocodePlace.ts",
    "lib/celestial/bodyLabels.ts",
    "api/celestial/geocode.ts",
    "lib/celestialChamberContract.ts",
    "components/chambers/CelestialCalibrationChamber.tsx",
    "docs/celestial-calibration-chamber-spec.md",
    "docs/celestial-calibration-phase1-status.md",
  ];
  for (const rel of requiredFiles) {
    assert(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
  }

  const zineGen = fs.readFileSync(path.join(root, "services/zineGenerator.ts"), "utf8");
  assert(
    zineGen.includes("celestialTimingForGeneration") ||
      zineGen.includes("celestialCalibration"),
    "zineGenerator wires celestial context",
  );

  const gemini = fs.readFileSync(path.join(root, "services/geminiService.ts"), "utf8");
  assert(
    gemini.includes("celestialReadoutForOracle"),
    "Oracle Latent Space Translation consumes structured readout",
  );

  const server = fs.readFileSync(path.join(root, "server.ts"), "utf8");
  assert(
    server.includes("/api/celestial/geocode"),
    "dev server mounts celestial geocode",
  );

  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert(pkg.dependencies?.["astronomy-engine"], "astronomy-engine dependency");
  assert(pkg.dependencies?.["tz-lookup"], "tz-lookup dependency");
}

function main() {
  testJulianAndLongitude();
  testKnownSunSigns();
  testSignFromLongitude();
  testCuspFlag();
  testTimezoneConversion();
  testEphemerisAndRising();
  testReadoutAndGeneration();
  testCanonAndFiles();
  if (failures > 0) {
    console.error(`verify:celestial FAIL (${failures})`);
    process.exit(1);
  }
  console.log("verify:celestial PASS");
}

main();

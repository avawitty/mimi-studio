/**
 * Offline verify for Celestial Calibration Phase 1.
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
  celestialTimingForGeneration,
  compileCelestialReadout,
} from "../lib/celestial/compileCelestialReadout";
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
  // J2000.0 epoch ≈ JD 2451545.0 — mean sun near Capricorn / early Aquarius depending on formula
  const lonJ2000 = approximateSunEclipticLongitudeDeg(2451545.0);
  assert(lonJ2000 >= 0 && lonJ2000 < 360, "longitude in range at J2000");

  // 2024-03-20 noon UTC — near vernal equinox (Sun ~0° Aries)
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
  // Construct via longitude path: degreesIntoSign near 0 or 30
  const near = signFromEclipticLongitude(0.5);
  assert(near.sign === "aries" && near.degreesIntoSign < 1, "near ingress degrees");
  const computed = computeTropicalSunSign({ birthDate: "2024-03-20", birthTime: "12:00" });
  assert(computed, "equinox date computes");
  // Equinox day should often be on cusp or very early Aries
  assert(
    computed!.onCusp || computed!.degreesIntoSign < 2,
    "equinox flagged cusp or early Aries",
  );
}

function testReadoutAndGeneration() {
  const inactive = compileCelestialReadout({ enabled: false });
  assert(inactive.timingPhrase.includes("inactive"), "inactive copy");
  assert(celestialTimingForGeneration({ enabled: false }) === null, "no gen string when off");

  const active = compileCelestialReadout({
    enabled: true,
    birthDate: "1990-06-01",
    astrologicalLineage: "Maternal chart stories",
  });
  assert(active.sun?.sign === "gemini", "readout gemini");
  assert(active.enabled, "enabled");
  assert(active.unsupported.length >= 3, "lists unsupported");
  assert(
    active.scopeNotice.toLowerCase().includes("symbolic") ||
      active.scopeNotice.toLowerCase().includes("self-expressive"),
    "symbolic scope notice",
  );

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
}

function main() {
  testJulianAndLongitude();
  testKnownSunSigns();
  testSignFromLongitude();
  testCuspFlag();
  testReadoutAndGeneration();
  testCanonAndFiles();
  if (failures > 0) {
    console.error(`verify:celestial FAIL (${failures})`);
    process.exit(1);
  }
  console.log("verify:celestial PASS");
}

main();

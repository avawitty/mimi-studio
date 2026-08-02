/**
 * Ascendant + Whole Sign houses from UTC instant + geographic coordinates.
 * Uses astronomy-engine SiderealTime + true obliquity of date.
 */

import type {
  NatalBodyPosition,
  NatalHouseCusp,
  ZodiacSignId,
} from "../../schemas/celestialCalibrationContracts";
import { Astronomy } from "./astronomyEngine";
import { signFromEclipticLongitude, ZODIAC_SIGN_ORDER } from "./sunSign";

/**
 * Ecliptic longitude of the Ascendant (tropical).
 * RAMC from GAST + geographic longitude; formula after Meeus / standard ASC.
 */
export function computeAscendantLongitudeDeg(input: {
  utcDate: Date;
  latitude: number;
  longitude: number;
}): number {
  const time = Astronomy.MakeTime(input.utcDate);
  const gastHours = Astronomy.SiderealTime(time);
  let lstHours = gastHours + input.longitude / 15;
  lstHours = ((lstHours % 24) + 24) % 24;
  const ramc = lstHours * 15; // degrees

  const obliquity = Astronomy.e_tilt(time).tobl; // true obliquity, degrees
  const latRad = (input.latitude * Math.PI) / 180;
  const ramcRad = (ramc * Math.PI) / 180;
  const epsRad = (obliquity * Math.PI) / 180;

  const y = Math.cos(ramcRad);
  const x = -(Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
  let asc = (Math.atan2(y, x) * 180) / Math.PI;
  asc = ((asc % 360) + 360) % 360;
  return asc;
}

export function computeRisingAndWholeSignHouses(input: {
  utcDate: Date;
  latitude: number;
  longitude: number;
}): {
  rising: NatalBodyPosition;
  houses: NatalHouseCusp[];
  houseSystemNote: string;
} {
  const lon = computeAscendantLongitudeDeg(input);
  const { sign, degreesIntoSign } = signFromEclipticLongitude(lon);
  const rising: NatalBodyPosition = {
    body: "ascendant",
    eclipticLongitudeDeg: Math.round(lon * 1000) / 1000,
    sign,
    degreesIntoSign: Math.round(degreesIntoSign * 1000) / 1000,
  };

  const risingIndex = ZODIAC_SIGN_ORDER.indexOf(sign);
  const houses: NatalHouseCusp[] = Array.from({ length: 12 }, (_, i) => {
    const houseSign = ZODIAC_SIGN_ORDER[(risingIndex + i) % 12] as ZodiacSignId;
    return {
      house: (i + 1) as NatalHouseCusp["house"],
      sign: houseSign,
      cuspLongitudeDeg: ((risingIndex + i) % 12) * 30,
    };
  });

  return {
    rising,
    houses,
    houseSystemNote:
      "Whole Sign houses from computed Ascendant. Placidus and other quadrant systems are not offered yet.",
  };
}

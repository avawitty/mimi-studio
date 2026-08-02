/**
 * Resolve a civil birth date/time (+ optional IANA zone) into a UTC Date.
 */

import type { CelestialCalibrationDraft } from "../../schemas/celestialCalibrationContracts";
import { parseBirthDateParts, parseBirthTimeParts } from "./sunSign";
import { isValidIanaTimeZone, zonedCivilToUtc } from "./timezone";

export type BirthInstantResolution = {
  utcDate: Date;
  hasBirthTime: boolean;
  timezone: string | null;
  assumedUtc: boolean;
  note: string;
};

export function resolveBirthInstant(
  draft: Pick<
    CelestialCalibrationDraft,
    "birthDate" | "birthTime" | "birthTimezone"
  > | null | undefined,
): BirthInstantResolution | null {
  const birthDate = draft?.birthDate?.trim();
  if (!birthDate) return null;
  const parts = parseBirthDateParts(birthDate);
  if (!parts) return null;

  const time = parseBirthTimeParts(draft?.birthTime);
  const tz = draft?.birthTimezone?.trim() || "";
  const hasZone = Boolean(tz && isValidIanaTimeZone(tz));

  if (hasZone) {
    const utcDate = zonedCivilToUtc({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: time.hour,
      minute: time.minute,
      second: time.second,
      timeZone: tz,
    });
    if (!utcDate) return null;
    return {
      utcDate,
      hasBirthTime: time.specified,
      timezone: tz,
      assumedUtc: false,
      note: time.specified
        ? `Civil clock interpreted in ${tz}.`
        : `No birth time — noon local in ${tz}.`,
    };
  }

  // Legacy Phase 1 path: treat civil clock as UTC.
  const utcDate = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      time.hour,
      time.minute,
      time.second,
    ),
  );
  return {
    utcDate,
    hasBirthTime: time.specified,
    timezone: null,
    assumedUtc: true,
    note: time.specified
      ? "Birth time applied as UTC (resolve a birth place for local timezone)."
      : "No birth time — computed at 12:00 UTC; cusp days may flip with local time.",
  };
}

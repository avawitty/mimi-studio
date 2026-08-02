/**
 * Convert civil birth clock + IANA timezone → UTC Date.
 * Uses Intl only (no luxon). Iterates once around DST edges.
 */

export function getTimeZoneOffsetMs(timeZone: string, instant: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(instant)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function zonedCivilToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  timeZone: string;
}): Date | null {
  if (!isValidIanaTimeZone(input.timeZone)) return null;
  const second = input.second ?? 0;
  // Start assuming the civil clock is UTC, then subtract the zone offset.
  let utcMs = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    second,
  );
  for (let i = 0; i < 4; i++) {
    const offset = getTimeZoneOffsetMs(input.timeZone, new Date(utcMs));
    const next =
      Date.UTC(
        input.year,
        input.month - 1,
        input.day,
        input.hour,
        input.minute,
        second,
      ) - offset;
    if (next === utcMs) break;
    utcMs = next;
  }
  return new Date(utcMs);
}

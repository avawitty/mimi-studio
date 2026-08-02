/**
 * Server-side place resolution: Nominatim geocode + tz-lookup IANA zone.
 */

import tzlookup from "tz-lookup";
import type { PlaceResolution } from "../../schemas/celestialCalibrationContracts";
import { isValidIanaTimeZone } from "./timezone";

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    country_code?: string;
  };
};

export async function geocodeBirthPlace(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlaceResolution> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    const err = new Error("Enter a city or place name to resolve.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  if (trimmed.length > 200) {
    const err = new Error("Place query is too long.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const response = await fetchImpl(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "MimiStudioCelestialCalibration/1.0 (https://mimi.studio)",
    },
  });

  if (!response.ok) {
    const err = new Error(`Geocode upstream failed (${response.status}).`);
    (err as Error & { status?: number }).status = 502;
    throw err;
  }

  const results = (await response.json()) as NominatimResult[];
  const hit = Array.isArray(results) ? results[0] : null;
  if (!hit?.lat || !hit?.lon) {
    const err = new Error("No place matched that query.");
    (err as Error & { status?: number; code?: string }).status = 404;
    (err as Error & { code?: string }).code = "PLACE_NOT_FOUND";
    throw err;
  }

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const err = new Error("Geocode returned invalid coordinates.");
    (err as Error & { status?: number }).status = 502;
    throw err;
  }

  let timezone: string;
  try {
    timezone = tzlookup(latitude, longitude);
  } catch {
    const err = new Error("Could not resolve timezone for those coordinates.");
    (err as Error & { status?: number }).status = 422;
    throw err;
  }
  if (!timezone || !isValidIanaTimeZone(timezone)) {
    const err = new Error("Resolved timezone is not a valid IANA zone.");
    (err as Error & { status?: number }).status = 422;
    throw err;
  }

  return {
    query: trimmed,
    label: hit.display_name || trimmed,
    latitude,
    longitude,
    timezone,
    countryCode: hit.address?.country_code?.toUpperCase(),
  };
}

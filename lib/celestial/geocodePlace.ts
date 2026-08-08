/**
 * Server-side place resolution: Nominatim geocode + tz-lookup IANA zone.
 */

import tzlookup from "tz-lookup";
import type {
  PlaceResolution,
  PlaceSuggestion,
} from "../../schemas/celestialCalibrationContracts";
import { isValidIanaTimeZone } from "./timezone";

const NOMINATIM_USER_AGENT =
  "MimiStudioCelestialCalibration/1.0 (https://mimi.studio)";

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    country_code?: string;
  };
};

function resolveTimezoneForCoords(latitude: number, longitude: number): string {
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
  return timezone;
}

async function fetchNominatimResults(
  trimmed: string,
  limit: number,
  fetchImpl: typeof fetch,
): Promise<NominatimResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");

  const response = await fetchImpl(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": NOMINATIM_USER_AGENT,
    },
  });

  if (!response.ok) {
    const err = new Error(`Geocode upstream failed (${response.status}).`);
    (err as Error & { status?: number }).status = 502;
    throw err;
  }

  const results = (await response.json()) as NominatimResult[];
  return Array.isArray(results) ? results : [];
}

function nominatimHitToSuggestion(
  hit: NominatimResult,
  query: string,
): PlaceSuggestion | null {
  if (!hit.lat || !hit.lon) return null;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    query,
    label: hit.display_name || query,
    latitude,
    longitude,
    countryCode: hit.address?.country_code?.toUpperCase(),
  };
}

export async function searchBirthPlaces(
  query: string,
  fetchImpl: typeof fetch = fetch,
  limit = 5,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }
  if (trimmed.length > 200) {
    const err = new Error("Place query is too long.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const hits = await fetchNominatimResults(trimmed, limit, fetchImpl);
  const suggestions: PlaceSuggestion[] = [];
  for (const hit of hits) {
    const suggestion = nominatimHitToSuggestion(hit, trimmed);
    if (suggestion) suggestions.push(suggestion);
  }
  return suggestions;
}

export function completePlaceResolution(
  suggestion: PlaceSuggestion,
): PlaceResolution {
  const timezone = resolveTimezoneForCoords(
    suggestion.latitude,
    suggestion.longitude,
  );
  return {
    query: suggestion.query,
    label: suggestion.label,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    timezone,
    countryCode: suggestion.countryCode,
  };
}

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

  const hits = await fetchNominatimResults(trimmed, 1, fetchImpl);
  const suggestion = nominatimHitToSuggestion(hits[0], trimmed);
  if (!suggestion) {
    const err = new Error("No place matched that query.");
    (err as Error & { status?: number; code?: string }).status = 404;
    (err as Error & { code?: string }).code = "PLACE_NOT_FOUND";
    throw err;
  }

  return completePlaceResolution(suggestion);
}

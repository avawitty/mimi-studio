import type { ForecastIntakeScope } from "../lib/forecastIntake";
import type { ForecastSnapshot } from "../lib/forecast/serverComposeForecast";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { auth } = await import("./firebaseInit");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers["x-user-token"] = `Bearer ${token}`;
  } catch {
    // unsigned sessions cannot compose server forecast
  }
  return headers;
}

export type ForecastComposeResponse = {
  snapshot: ForecastSnapshot;
  persisted: boolean;
};

/** Server-compose forecast, persist to userPreferences.forecastSnapshot, return residue artifact. */
export async function composeForecastOnServer(
  scope: ForecastIntakeScope,
  refreshEvidence = false,
): Promise<ForecastComposeResponse | null> {
  const headers = await authHeaders();
  const res = await fetch("/api/forecast", {
    method: "POST",
    headers,
    body: JSON.stringify({ scope, refreshEvidence }),
  });
  if (!res.ok) {
    console.warn("MIMI // POST /api/forecast failed:", res.status);
    return null;
  }
  return (await res.json()) as ForecastComposeResponse;
}

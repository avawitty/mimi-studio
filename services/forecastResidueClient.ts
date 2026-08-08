import { db } from "./firebaseInit";
import {
  residueForecastArtifactSchema,
  type ResidueForecastArtifact,
} from "./residue/adapters/forecastAdapter";
import { listResidueArtifacts } from "./residue/storage/residueStore";

/** Load the most recent Residue forecast artifact for a signed-in user. */
export async function loadLatestResidueForecastArtifact(
  uid: string,
): Promise<ResidueForecastArtifact | null> {
  if (!uid || uid === "ghost" || uid.startsWith("local_")) return null;

  try {
    const rows = await listResidueArtifacts(db, uid, { kind: "forecast", limit: 1 });
    const payload = rows[0]?.payload;
    if (!payload) return null;
    return residueForecastArtifactSchema.parse(payload);
  } catch (err) {
    console.warn("MIMI // loadLatestResidueForecastArtifact failed:", err);
    return null;
  }
}

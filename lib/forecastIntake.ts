/**
 * Forecast intake — lightweight personal or brand calibration before vectors run.
 * Persists on UserProfile.forecastIntake; drives personalized You.com / Apify queries.
 */

import type { UserProfile } from "../types";

export type ForecastIntakeScope = "personal" | "brand";

export type ForecastPersonalIntake = {
  displayLabel?: string;
  season: UserProfile["currentSeason"];
  keywords: string[];
  vibe?: string;
};

export type ForecastBrandIntake = {
  brandName: string;
  vibe: string;
  keywords: string[];
  positioning?: string;
};

export type ForecastIntakeSnapshot = {
  scope: ForecastIntakeScope;
  completedAt: number;
  personal?: ForecastPersonalIntake;
  brand?: ForecastBrandIntake;
};

export type ForecastQueryContext = {
  scope: ForecastIntakeScope;
  intake: ForecastIntakeSnapshot | null | undefined;
  profile: Pick<
    UserProfile,
    "currentSeason" | "aestheticDNA" | "geoProfile" | "tasteVector" | "displayName" | "handle"
  > | null;
};

const SEASON_PHRASES: Record<UserProfile["currentSeason"], string> = {
  rotting: "deconstructive composting aesthetics",
  blooming: "generative rapid synthesis",
  frozen: "archival preservation stagnation",
  burning: "high-entropy radical reinvention",
};

function uniqueTerms(terms: string[], limit = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

export function hasPersonalCalibration(
  profile: UserProfile | null | undefined,
  intake?: ForecastIntakeSnapshot | null,
): boolean {
  if (!profile) return false;
  if (intake?.personal) return true;
  if (profile.aestheticDNA?.dnaStatement) return true;
  if (profile.geoProfile?.retrievalIdentity?.semanticClusters?.length) return true;
  if (profile.tasteVector && Object.keys(profile.tasteVector).length > 0) return true;
  return false;
}

export function hasBrandCalibration(intake?: ForecastIntakeSnapshot | null): boolean {
  return Boolean(intake?.brand?.brandName?.trim() && intake.brand.vibe?.trim());
}

export function isForecastScopeReady(
  scope: ForecastIntakeScope,
  profile: UserProfile | null | undefined,
  intake?: ForecastIntakeSnapshot | null,
): boolean {
  if (scope === "brand") return hasBrandCalibration(intake);
  return hasPersonalCalibration(profile, intake);
}

/** Build a search query for You.com / Apify rag-web-browser evidence. */
export function buildForecastSearchQuery(ctx: ForecastQueryContext): string {
  const year = new Date().getFullYear();
  const tail = `content formats editorial culture trends aesthetic communities ${year}`;

  if (ctx.scope === "brand") {
    const brand = ctx.intake?.brand;
    if (brand) {
      const terms = uniqueTerms([
        brand.brandName,
        brand.vibe,
        brand.positioning || "",
        ...brand.keywords,
      ]);
      return `${terms.join(" ")} brand positioning visual identity ${tail}`.trim();
    }
    return `emerging brand aesthetic editorial positioning slow web ${tail}`;
  }

  const personal = ctx.intake?.personal;
  const dna = ctx.profile?.aestheticDNA;
  const geo = ctx.profile?.geoProfile;
  const season = personal?.season || ctx.profile?.currentSeason || "rotting";

  const terms = uniqueTerms([
    personal?.displayLabel || ctx.profile?.displayName || ctx.profile?.handle || "",
    personal?.vibe || dna?.dnaStatement || "",
    ...(personal?.keywords || []),
    ...(dna?.archetypes || []),
    ...(geo?.retrievalIdentity?.semanticClusters || []),
    geo?.semanticSignature?.stylisticLanguage || "",
    SEASON_PHRASES[season],
    ...Object.keys(ctx.profile?.tasteVector || {}),
  ]);

  if (terms.length === 0) {
    return `emerging content formats editorial archives slow web aesthetic communities ${year}`;
  }

  return `${terms.join(" ")} ${tail}`.trim();
}

export function mergeIntakeSnapshot(
  existing: ForecastIntakeSnapshot | null | undefined,
  scope: ForecastIntakeScope,
  payload: ForecastPersonalIntake | ForecastBrandIntake,
): ForecastIntakeSnapshot {
  const base: ForecastIntakeSnapshot = {
    scope,
    completedAt: Date.now(),
    personal: existing?.personal,
    brand: existing?.brand,
  };
  if (scope === "personal") {
    base.personal = payload as ForecastPersonalIntake;
  } else {
    base.brand = payload as ForecastBrandIntake;
  }
  return base;
}

export function intakeSummaryLabel(
  scope: ForecastIntakeScope,
  intake: ForecastIntakeSnapshot | null | undefined,
): string | null {
  if (!intake) return null;
  if (scope === "brand" && intake.brand) {
    return intake.brand.brandName;
  }
  if (scope === "personal" && intake.personal) {
    return intake.personal.displayLabel || null;
  }
  return null;
}

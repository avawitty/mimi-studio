import React, { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Moon, RefreshCw } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import { useUser } from "../../contexts/UserContext";
import {
  CELESTIAL_CHAMBER_COPY,
  CELESTIAL_CHAMBER_MODULE_ID,
  CELESTIAL_HANDOFF_TARGETS,
} from "../../lib/celestialChamberContract";
import { compileCelestialReadout } from "../../lib/celestial/compileCelestialReadout";
import { CELESTIAL_BODY_LABELS } from "../../lib/celestial/bodyLabels";
import { formatAspect } from "../../lib/celestial/aspects";
import {
  ZODIAC_SIGN_LABELS,
  ZODIAC_SIGN_ORDER,
} from "../../lib/celestial/sunSign";
import { ASTRONOMICAL_SEASON_LABELS } from "../../lib/celestial/seasonalAlignment";
import type { CelestialCalibrationDraft } from "../../schemas/celestialCalibrationContracts";
import type { ZodiacSign } from "../../types";

const emptyDraft = (): CelestialCalibrationDraft => ({
  enabled: false,
  zodiac: undefined,
  birthDate: "",
  birthTime: "",
  birthLocation: "",
  birthTimezone: "",
  birthLatitude: undefined,
  birthLongitude: undefined,
  geocodeLabel: "",
  geocodeStatus: "unset",
  astrologicalLineage: "",
  seasonalAlignment: "",
  zodiacLocked: false,
});

function draftFromProfile(profile: {
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  zodiacSign?: ZodiacSign;
  tailorDraft?: { celestialCalibration?: CelestialCalibrationDraft };
}): CelestialCalibrationDraft {
  const fromTailor = profile.tailorDraft?.celestialCalibration;
  return {
    ...emptyDraft(),
    ...(fromTailor || {}),
    birthDate: fromTailor?.birthDate || profile.birthDate || "",
    birthTime: fromTailor?.birthTime || profile.birthTime || "",
    birthLocation: fromTailor?.birthLocation || profile.birthLocation || "",
    zodiac: fromTailor?.zodiac || profile.zodiacSign,
  };
}

export const CelestialCalibrationChamber: React.FC<{
  navigate?: (path: string) => void;
}> = ({ navigate }) => {
  const { profile, updateProfile } = useUser();
  const [draft, setDraft] = useState<CelestialCalibrationDraft>(() =>
    profile ? draftFromProfile(profile) : emptyDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileUid = profile?.uid;
  const tailorStamp = profile?.tailorDraft?.lastTailored;
  useEffect(() => {
    if (!profileUid || !profile) return;
    setDraft(draftFromProfile(profile));
    // Only re-hydrate after identity change or a successful Tailor save — not every render.
  }, [profileUid, tailorStamp]);

  const readout = useMemo(() => compileCelestialReadout(draft), [draft]);

  const patch = (partial: Partial<CelestialCalibrationDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSavedFlash(false);
  };

  const applyDerivedSun = () => {
    if (!readout.sun || readout.sun.method === "manual_override") return;
    patch({
      zodiac: readout.sun.sign,
      zodiacLocked: false,
      seasonalAlignment:
        draft.seasonalAlignment?.trim() || readout.seasonalAlignment,
    });
  };

  const resolvePlace = async () => {
    const query = draft.birthLocation?.trim();
    if (!query) {
      setError("Enter a birth location before resolving place.");
      return;
    }
    setResolvingPlace(true);
    setError(null);
    try {
      const res = await fetch("/api/celestial/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to resolve place.");
      }
      patch({
        birthLocation: query,
        geocodeLabel: data.label,
        birthLatitude: data.latitude,
        birthLongitude: data.longitude,
        birthTimezone: data.timezone,
        geocodeStatus: "resolved",
      });
    } catch (e) {
      patch({ geocodeStatus: "failed" });
      setError(e instanceof Error ? e.message : "Failed to resolve place.");
    } finally {
      setResolvingPlace(false);
    }
  };

  const handleSave = async () => {
    if (!profile) {
      setError("Sign in or finish boot before saving calibration.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const derivedSign =
        draft.zodiacLocked && draft.zodiac
          ? draft.zodiac
          : readout.sun?.sign || draft.zodiac;
      const nextCalibration: CelestialCalibrationDraft = {
        ...draft,
        zodiac: derivedSign,
        seasonalAlignment:
          draft.seasonalAlignment?.trim() || readout.seasonalAlignment,
      };
      await updateProfile({
        ...profile,
        birthDate: nextCalibration.birthDate || profile.birthDate,
        birthTime: nextCalibration.birthTime || profile.birthTime,
        birthLocation: nextCalibration.birthLocation || profile.birthLocation,
        zodiacSign: derivedSign || profile.zodiacSign,
        tailorDraft: {
          ...profile.tailorDraft,
          celestialCalibration: nextCalibration,
          lastTailored: Date.now(),
        },
      });
      setDraft(nextCalibration);
      setSavedFlash(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save calibration.");
    } finally {
      setSaving(false);
    }
  };

  const go = (view: string) => {
    if (navigate) {
      navigate(`/${view}`);
      return;
    }
    window.location.assign(`/${view}`);
  };

  const chart = readout.chart;

  return (
    <ChamberShell
      moduleId={CELESTIAL_CHAMBER_MODULE_ID}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {CELESTIAL_HANDOFF_TARGETS.map((target) => (
            <button
              key={target.view}
              type="button"
              onClick={() => go(target.view)}
              className="px-3 py-1.5 border border-nous-border text-nous-subtle font-mono text-[8px] uppercase tracking-widest hover:text-nous-text hover:border-nous-text/40"
            >
              {target.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-nous-base" data-testid="celestial-calibration-chamber">
        <div className="max-w-3xl mx-auto px-5 md:px-10 py-8 space-y-10">
          <div className="space-y-3 max-w-2xl">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-nous-subtle">
              Personal timing · Tropical frame · Ephemeris
            </p>
            <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
              {CELESTIAL_CHAMBER_COPY.thesis}
            </p>
            <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
              {CELESTIAL_CHAMBER_COPY.observatoryDisambiguation}
            </p>
            <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
              {CELESTIAL_CHAMBER_COPY.symbolicNotice}
            </p>
          </div>

          <section className="space-y-5 border-t border-nous-border pt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-text">
                Birth data
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draft.enabled)}
                  onChange={(e) => patch({ enabled: e.target.checked })}
                  className="accent-nous-text"
                />
                <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                  Use in generation
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                  Birth date
                </span>
                <input
                  type="date"
                  value={draft.birthDate || ""}
                  onChange={(e) =>
                    patch({ birthDate: e.target.value, zodiacLocked: false })
                  }
                  className="w-full bg-transparent border border-nous-border px-3 py-2 font-mono text-xs text-nous-text focus:outline-none focus:border-nous-text/50"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                  Birth time (local civil clock)
                </span>
                <input
                  type="time"
                  value={draft.birthTime || ""}
                  onChange={(e) => patch({ birthTime: e.target.value })}
                  className="w-full bg-transparent border border-nous-border px-3 py-2 font-mono text-xs text-nous-text focus:outline-none focus:border-nous-text/50"
                />
              </label>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                  Birth location
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={draft.birthLocation || ""}
                    onChange={(e) =>
                      patch({
                        birthLocation: e.target.value,
                        geocodeStatus:
                          draft.geocodeStatus === "resolved" ? "unset" : draft.geocodeStatus,
                      })
                    }
                    placeholder="City, region — resolve for timezone + coordinates"
                    className="flex-1 bg-transparent border border-nous-border px-3 py-2 font-sans text-sm text-nous-text placeholder:text-nous-subtle/50 focus:outline-none focus:border-nous-text/50"
                  />
                  <button
                    type="button"
                    onClick={resolvePlace}
                    disabled={resolvingPlace || !draft.birthLocation?.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-nous-border font-mono text-[8px] uppercase tracking-widest text-nous-subtle hover:text-nous-text disabled:opacity-40 shrink-0"
                  >
                    <MapPin size={10} />
                    {resolvingPlace ? "Resolving…" : "Resolve place"}
                  </button>
                </div>
                <p className="font-sans text-[10px] text-nous-subtle pt-1">
                  {CELESTIAL_CHAMBER_COPY.resolvePlaceHint}
                </p>
                {draft.geocodeStatus === "resolved" && draft.birthTimezone ? (
                  <p className="font-mono text-[9px] uppercase tracking-wider text-nous-text pt-1">
                    {draft.geocodeLabel || draft.birthLocation}
                    {" · "}
                    {draft.birthTimezone}
                    {typeof draft.birthLatitude === "number" &&
                    typeof draft.birthLongitude === "number"
                      ? ` · ${draft.birthLatitude.toFixed(3)}°, ${draft.birthLongitude.toFixed(3)}°`
                      : ""}
                  </p>
                ) : null}
              </label>
            </div>
            {!draft.birthDate ? (
              <p className="font-sans text-[11px] text-nous-subtle">
                {CELESTIAL_CHAMBER_COPY.emptyBirthDate}
              </p>
            ) : null}
          </section>

          <section className="space-y-4 border-t border-nous-border pt-8">
            <div className="flex items-center gap-2">
              <Moon size={14} className="text-nous-subtle" />
              <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-text">
                Derived readout
              </h2>
            </div>

            <div className="space-y-3">
              <p className="font-serif italic text-2xl text-nous-text">
                {readout.timingPhrase}
              </p>
              {readout.sun ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-wider text-nous-subtle">
                  <div>
                    <dt className="opacity-60">Sun</dt>
                    <dd className="text-nous-text tracking-widest mt-0.5">
                      {ZODIAC_SIGN_LABELS[readout.sun.sign]}
                      {readout.sun.degreesIntoSign != null
                        ? ` · ${readout.sun.degreesIntoSign.toFixed(1)}°`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="opacity-60">Method</dt>
                    <dd className="text-nous-text tracking-widest mt-0.5">
                      {readout.sun.method.replace(/_/g, " ")}
                    </dd>
                  </div>
                  {readout.astronomicalSeason ? (
                    <div>
                      <dt className="opacity-60">Astronomical season</dt>
                      <dd className="text-nous-text tracking-widest mt-0.5">
                        {ASTRONOMICAL_SEASON_LABELS[readout.astronomicalSeason]}
                      </dd>
                    </div>
                  ) : null}
                  {readout.sun.eclipticLongitudeDeg != null ? (
                    <div>
                      <dt className="opacity-60">Ecliptic λ</dt>
                      <dd className="text-nous-text tracking-widest mt-0.5">
                        {readout.sun.eclipticLongitudeDeg.toFixed(3)}°
                      </dd>
                    </div>
                  ) : null}
                  {readout.birthTimezone ? (
                    <div>
                      <dt className="opacity-60">Timezone</dt>
                      <dd className="text-nous-text tracking-widest mt-0.5">
                        {readout.birthTimezone}
                      </dd>
                    </div>
                  ) : null}
                  {chart?.rising ? (
                    <div>
                      <dt className="opacity-60">Rising</dt>
                      <dd className="text-nous-text tracking-widest mt-0.5">
                        {ZODIAC_SIGN_LABELS[chart.rising.sign]} ·{" "}
                        {chart.rising.degreesIntoSign.toFixed(1)}°
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              {readout.sun ? (
                <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
                  {readout.sun.confidenceNote}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={applyDerivedSun}
                disabled={!readout.sun || readout.sun.method === "manual_override"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-nous-border font-mono text-[8px] uppercase tracking-widest text-nous-subtle hover:text-nous-text disabled:opacity-40"
              >
                <RefreshCw size={10} /> Accept derived Sun into draft
              </button>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-nous-border font-mono text-[8px] uppercase tracking-widest text-nous-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draft.zodiacLocked)}
                  onChange={(e) => patch({ zodiacLocked: e.target.checked })}
                  className="accent-nous-text"
                />
                Lock Sun manually
              </label>
            </div>

            {draft.zodiacLocked ? (
              <label className="block space-y-1.5 max-w-xs">
                <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                  Manual sun sign
                </span>
                <select
                  value={draft.zodiac || ""}
                  onChange={(e) =>
                    patch({ zodiac: (e.target.value || undefined) as ZodiacSign | undefined })
                  }
                  className="w-full bg-transparent border border-nous-border px-3 py-2 font-mono text-xs text-nous-text focus:outline-none"
                >
                  <option value="">Select…</option>
                  {ZODIAC_SIGN_ORDER.map((sign) => (
                    <option key={sign} value={sign}>
                      {ZODIAC_SIGN_LABELS[sign]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </section>

          {chart ? (
            <section className="space-y-4 border-t border-nous-border pt-8">
              <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-text">
                Ephemeris bodies
              </h2>
              <p className="font-sans text-[11px] text-nous-subtle">
                {chart.summary}
                {chart.houseSystemNote ? ` · ${chart.houseSystemNote}` : ""}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chart.bodies.map((body) => (
                  <li
                    key={body.body}
                    className="font-mono text-[10px] uppercase tracking-wider text-nous-subtle border border-nous-border/60 px-3 py-2"
                  >
                    <span className="text-nous-text">
                      {CELESTIAL_BODY_LABELS[body.body]}
                    </span>
                    {" · "}
                    {ZODIAC_SIGN_LABELS[body.sign]} {body.degreesIntoSign.toFixed(1)}°
                    {body.retrograde ? " · Rx" : ""}
                  </li>
                ))}
              </ul>
              {chart.aspects.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <h3 className="font-mono text-[8px] uppercase tracking-[0.28em] text-nous-subtle">
                    Major aspects
                  </h3>
                  <ul className="space-y-1">
                    {chart.aspects.slice(0, 12).map((aspect) => (
                      <li
                        key={`${aspect.a}-${aspect.kind}-${aspect.b}`}
                        className="font-mono text-[9px] uppercase tracking-wider text-nous-subtle/90"
                      >
                        — {formatAspect(aspect)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {chart.houses ? (
                <div className="space-y-2 pt-2">
                  <h3 className="font-mono text-[8px] uppercase tracking-[0.28em] text-nous-subtle">
                    Whole Sign houses
                  </h3>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-nous-subtle">
                    {chart.houses
                      .map((h) => `${h.house}:${ZODIAC_SIGN_LABELS[h.sign]}`)
                      .join(" · ")}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-4 border-t border-nous-border pt-8">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-text">
              Orientation notes
            </h2>
            <label className="block space-y-1.5">
              <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                Seasonal alignment
              </span>
              <textarea
                value={draft.seasonalAlignment || ""}
                onChange={(e) => patch({ seasonalAlignment: e.target.value })}
                rows={2}
                placeholder={readout.seasonalAlignment || "Derived from astronomical season…"}
                className="w-full bg-transparent border border-nous-border px-3 py-2 font-sans text-sm text-nous-text placeholder:text-nous-subtle/50 focus:outline-none focus:border-nous-text/50 resize-y"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                Astrological lineage (free text)
              </span>
              <textarea
                value={draft.astrologicalLineage || ""}
                onChange={(e) => patch({ astrologicalLineage: e.target.value })}
                rows={2}
                placeholder="Family myths, cultural frames, chart traditions you actually use…"
                className="w-full bg-transparent border border-nous-border px-3 py-2 font-sans text-sm text-nous-text placeholder:text-nous-subtle/50 focus:outline-none focus:border-nous-text/50 resize-y"
              />
            </label>
          </section>

          <section className="space-y-3 border-t border-nous-border pt-8">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-text">
              Scope
            </h2>
            <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
              {CELESTIAL_CHAMBER_COPY.phaseScope}
            </p>
            <ul className="space-y-1">
              {readout.unsupported.map((item) => (
                <li
                  key={item}
                  className="font-mono text-[9px] uppercase tracking-wider text-nous-subtle/80"
                >
                  — {item}
                </li>
              ))}
            </ul>
            <p className="font-sans text-[10px] text-nous-subtle pt-2">
              {readout.scopeNotice}
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-nous-border pt-8 pb-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !profile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-[0.2em] disabled:opacity-40"
            >
              {savedFlash ? <Check size={12} /> : null}
              {saving ? "Saving…" : savedFlash ? "Saved" : "Save calibration"}
            </button>
            <p className="font-sans text-[10px] text-nous-subtle max-w-sm">
              {CELESTIAL_CHAMBER_COPY.saveHint}
            </p>
            {error ? (
              <p className="w-full font-sans text-[11px] text-red-700/80">{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </ChamberShell>
  );
};

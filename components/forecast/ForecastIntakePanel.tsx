import React, { useState } from "react";
import { ArrowRight, Building2, Loader2, Sparkles, User } from "lucide-react";
import { useFeedback } from "../../hooks/useFeedback";
import type { UserProfile } from "../../types";
import {
  type ForecastBrandIntake,
  type ForecastIntakeScope,
  type ForecastIntakeSnapshot,
  type ForecastPersonalIntake,
  mergeIntakeSnapshot,
} from "../../lib/forecastIntake";
import { FORECAST_COPY } from "../../lib/forecastChamberContract";

const SEASONS: UserProfile["currentSeason"][] = [
  "rotting",
  "blooming",
  "frozen",
  "burning",
];

type Props = {
  scope: ForecastIntakeScope;
  existingIntake?: ForecastIntakeSnapshot | null;
  onComplete: (snapshot: ForecastIntakeSnapshot, profilePatch?: Partial<UserProfile>) => Promise<void>;
  onOpenFullBrandIntake?: () => void;
};

function parseKeywords(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  );
}

export const ForecastIntakePanel: React.FC<Props> = ({
  scope,
  existingIntake,
  onComplete,
  onOpenFullBrandIntake,
}) => {
  const feedback = useFeedback();
  const [saving, setSaving] = useState(false);

  const [personalSeason, setPersonalSeason] = useState<UserProfile["currentSeason"]>(
    existingIntake?.personal?.season || "blooming",
  );
  const [personalLabel, setPersonalLabel] = useState(
    existingIntake?.personal?.displayLabel || "",
  );
  const [personalVibe, setPersonalVibe] = useState(existingIntake?.personal?.vibe || "");
  const [personalKeywords, setPersonalKeywords] = useState(
    existingIntake?.personal?.keywords?.join(", ") || "",
  );

  const [brandName, setBrandName] = useState(existingIntake?.brand?.brandName || "");
  const [brandVibe, setBrandVibe] = useState(existingIntake?.brand?.vibe || "");
  const [brandKeywords, setBrandKeywords] = useState(
    existingIntake?.brand?.keywords?.join(", ") || "",
  );
  const [brandPositioning, setBrandPositioning] = useState(
    existingIntake?.brand?.positioning || "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (scope === "personal") {
        const payload: ForecastPersonalIntake = {
          displayLabel: personalLabel.trim() || undefined,
          season: personalSeason,
          keywords: parseKeywords(personalKeywords),
          vibe: personalVibe.trim() || undefined,
        };
        const snapshot = mergeIntakeSnapshot(existingIntake, "personal", payload);
        await onComplete(snapshot, { currentSeason: personalSeason });
      } else {
        if (!brandName.trim() || !brandVibe.trim()) return;
        const payload: ForecastBrandIntake = {
          brandName: brandName.trim(),
          vibe: brandVibe.trim(),
          keywords: parseKeywords(brandKeywords),
          positioning: brandPositioning.trim() || undefined,
        };
        const snapshot = mergeIntakeSnapshot(existingIntake, "brand", payload);
        await onComplete(snapshot);
      }
      feedback.trigger("proposal.approved", { confirmed: true });
    } finally {
      setSaving(false);
    }
  };

  const isBrandValid = brandName.trim().length > 0 && brandVibe.trim().length > 0;

  return (
    <div className="border border-dashed border-nous-border bg-nous-surface/40 p-5 md:p-8 space-y-6">
      <div className="space-y-2 max-w-xl">
        <div className="flex items-center gap-2 text-nous-subtle">
          {scope === "personal" ? <User size={14} /> : <Building2 size={14} />}
          <span className="font-mono text-[9px] uppercase tracking-widest">
            {scope === "personal" ? "Profile intake" : "Brand intake"}
          </span>
        </div>
        <h2 className="font-serif italic text-2xl text-nous-text">
          {scope === "personal"
            ? FORECAST_COPY.intakePersonalTitle
            : FORECAST_COPY.intakeBrandTitle}
        </h2>
        <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
          {scope === "personal"
            ? FORECAST_COPY.intakePersonalBody
            : FORECAST_COPY.intakeBrandBody}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
        {scope === "personal" ? (
          <>
            <div>
              <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Curator label (optional)
              </label>
              <input
                type="text"
                value={personalLabel}
                onChange={(e) => setPersonalLabel(e.target.value)}
                placeholder="e.g. Studio alias, pen name"
                className="w-full bg-nous-base border border-nous-border px-3 py-2 text-sm font-sans focus:outline-none focus:border-nous-text/40"
              />
            </div>
            <div>
              <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Current season
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Current season">
                {SEASONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPersonalSeason(s)}
                    className={`px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest capitalize ${
                      personalSeason === s
                        ? "bg-nous-text text-nous-base border-nous-text"
                        : "border-nous-border text-nous-subtle hover:text-nous-text"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Aesthetic keywords
              </label>
              <input
                type="text"
                value={personalKeywords}
                onChange={(e) => setPersonalKeywords(e.target.value)}
                placeholder="brutalist, slow web, archival grain"
                className="w-full bg-nous-base border border-nous-border px-3 py-2 text-sm font-sans focus:outline-none focus:border-nous-text/40"
              />
            </div>
            <div>
              <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Vibe sentence (optional)
              </label>
              <textarea
                value={personalVibe}
                onChange={(e) => setPersonalVibe(e.target.value)}
                rows={2}
                placeholder="What atmosphere are you tracking right now?"
                className="w-full bg-nous-base border border-nous-border px-3 py-2 text-sm font-sans resize-none focus:outline-none focus:border-nous-text/40"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Brand name
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Acme Studios"
                className="w-full bg-nous-base border border-nous-border px-3 py-2 text-sm font-sans focus:outline-none focus:border-nous-text/40"
              />
            </div>
            <div>
              <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Brand vibe
              </label>
              <textarea
                required
                value={brandVibe}
                onChange={(e) => setBrandVibe(e.target.value)}
                rows={3}
                placeholder="Positioning, audience, visual territory…"
                className="w-full bg-nous-base border border-nous-border px-3 py-2 text-sm font-sans resize-none focus:outline-none focus:border-nous-text/40"
              />
            </div>
            <div>
              <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Keywords (optional)
              </label>
              <input
                type="text"
                value={brandKeywords}
                onChange={(e) => setBrandKeywords(e.target.value)}
                placeholder="editorial, luxury, subcultural"
                className="w-full bg-nous-base border border-nous-border px-3 py-2 text-sm font-sans focus:outline-none focus:border-nous-text/40"
              />
            </div>
            <div>
              <label className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
                Positioning line (optional)
              </label>
              <input
                type="text"
                value={brandPositioning}
                onChange={(e) => setBrandPositioning(e.target.value)}
                placeholder="One-sentence brand thesis"
                className="w-full bg-nous-base border border-nous-border px-3 py-2 text-sm font-sans focus:outline-none focus:border-nous-text/40"
              />
            </div>
            {onOpenFullBrandIntake ? (
              <button
                type="button"
                onClick={onOpenFullBrandIntake}
                className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle underline underline-offset-4 hover:text-nous-text"
              >
                Open full Mimi Intelligence Report →
              </button>
            ) : null}
          </>
        )}

        <button
          type="submit"
          disabled={saving || (scope === "brand" && !isBrandValid)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-widest disabled:opacity-40"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Calibrate forecast
          <ArrowRight size={12} />
        </button>
      </form>
    </div>
  );
};

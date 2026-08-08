import { CELESTIAL_BODY_LABELS } from "../../../lib/celestial/bodyLabels";
import { ZODIAC_SIGN_LABELS } from "../../../lib/celestial/sunSign";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function CelestialPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const readout = page.plateData?.celestialReadout;
  const bodies = readout?.natal?.chart?.bodies?.slice(0, 8) || [];

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      dark
      label={`Celestial calibration page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b border-white/15 pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/45">
              Celestial calibration
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none text-white">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} dark />
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-hidden py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] leading-relaxed text-white/80">
            {page.bodyCopy}
          </p>

          {bodies.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-wider text-white/70">
              {bodies.map((body) => (
                <li key={body.body}>
                  {CELESTIAL_BODY_LABELS[
                    body.body as keyof typeof CELESTIAL_BODY_LABELS
                  ] || body.body}{" "}
                  {ZODIAC_SIGN_LABELS[body.sign as keyof typeof ZODIAC_SIGN_LABELS] ||
                    body.sign}
                  {body.retrograde ? " ℞" : ""}
                </li>
              ))}
            </ul>
          ) : null}

          {page.supportingText ? (
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
              {page.supportingText}
            </p>
          ) : null}

          {readout?.scopeNotice ? (
            <p className="font-sans text-[10px] leading-relaxed text-white/35">
              {readout.scopeNotice}
            </p>
          ) : null}
        </div>
      </div>
    </GrammarPageFrame>
  );
}

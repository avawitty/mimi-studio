import React from "react";
import {
  AestheticSignature,
  SignatureConfidenceBand,
  SignatureCreativeDirection,
  SignatureRecommendation,
  SignatureSemioticTouchpoint,
} from "../../types";
import { PublicCTA } from "../public-face";
import { ColumnRule } from "../public-face/ColumnRule";
import {
  ArrowUpRight,
  Ban,
  Compass,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";

const CONFIDENCE_LABEL: Record<SignatureConfidenceBand, string> = {
  well_supported: "Well supported",
  emerging: "Emerging",
  speculative: "Speculative",
};

const CONFIDENCE_STYLE: Record<SignatureConfidenceBand, string> = {
  well_supported: "text-[var(--mimi-olive,#5A5A40)]",
  emerging: "text-[var(--mimi-stone,#78716c)]",
  speculative: "text-[var(--mimi-cobalt,#9BB8CE)]",
};

const HANDOFF_LABEL: Record<string, string> = {
  studio: "Studio",
  tailor: "Tailor",
  "the-edit": "The Edit",
  darkroom: "Darkroom",
  scribe: "Scribe",
};

type SignatureReadingProps = {
  signature: AestheticSignature;
  onHandoff?: (mode: string) => void;
};

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-serif italic text-2xl text-[var(--mimi-ink)]">{title}</h3>
      </div>
      {subtitle ? (
        <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function TouchpointCard({ item }: { item: SignatureSemioticTouchpoint }) {
  return (
    <article className="border border-[var(--mimi-hairline)] bg-[var(--mimi-field)] p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-ink)]">
          {item.motif}
        </p>
        <span
          className={`font-sans text-[9px] uppercase tracking-[0.2em] shrink-0 ${CONFIDENCE_STYLE[item.confidence]}`}
        >
          {CONFIDENCE_LABEL[item.confidence]}
        </span>
      </div>
      <p className="font-serif text-sm leading-relaxed text-[var(--mimi-stone)]">{item.context}</p>
      <p className="font-sans text-xs text-[var(--mimi-ink)]">
        <span className="uppercase tracking-widest text-[9px] text-[var(--mimi-stone)]">
          Visual directive ·{" "}
        </span>
        {item.visualDirective}
      </p>
      <p className="font-serif italic text-sm text-[var(--mimi-ink)]">{item.rationale}</p>
    </article>
  );
}

function DirectionCard({
  item,
  onHandoff,
}: {
  item: SignatureCreativeDirection;
  onHandoff?: (mode: string) => void;
}) {
  return (
    <article className="border-l-2 border-[var(--mimi-olive,#5A5A40)] pl-4 space-y-2">
      <h4 className="font-serif text-lg text-[var(--mimi-ink)]">{item.title}</h4>
      <p className="font-serif text-sm leading-relaxed text-[var(--mimi-stone)]">{item.thesis}</p>
      {item.constraints?.length ? (
        <ul className="font-sans text-xs text-[var(--mimi-stone)] space-y-1 list-disc pl-4">
          {item.constraints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
      {item.handoff && onHandoff ? (
        <button
          type="button"
          onClick={() => onHandoff(item.handoff!)}
          className="inline-flex items-center gap-1 font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-ink)] hover:text-[var(--mimi-olive)]"
        >
          Open in {HANDOFF_LABEL[item.handoff] ?? item.handoff}
          <ArrowUpRight size={12} />
        </button>
      ) : null}
    </article>
  );
}

function RecommendationCard({
  item,
  onHandoff,
}: {
  item: SignatureRecommendation;
  onHandoff?: (mode: string) => void;
}) {
  return (
    <article className="border border-[var(--mimi-hairline)] p-5 space-y-2">
      <h4 className="font-serif text-lg text-[var(--mimi-ink)]">{item.title}</h4>
      <p className="font-serif italic text-sm text-[var(--mimi-stone)]">{item.hypothesis}</p>
      <p className="font-sans text-xs text-[var(--mimi-ink)]">{item.action}</p>
      {item.handoff && onHandoff ? (
        <button
          type="button"
          onClick={() => onHandoff(item.handoff!)}
          className="inline-flex items-center gap-1 font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-ink)] hover:text-[var(--mimi-olive)]"
        >
          {HANDOFF_LABEL[item.handoff] ?? item.handoff}
          <ArrowUpRight size={12} />
        </button>
      ) : null}
    </article>
  );
}

export const SignatureReading: React.FC<SignatureReadingProps> = ({
  signature,
  onHandoff,
}) => {
  const reading = signature.reading;
  const touchpoints = signature.semioticTouchpoints ?? [];
  const directions = signature.creativeDirections ?? [];
  const recommendations = signature.recommendations ?? [];
  const anti = signature.antiSignature ?? [];
  const drift = signature.driftNotes ?? [];
  const evidence = signature.evidenceRefs ?? [];

  if (!reading && touchpoints.length === 0 && directions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-12" aria-label="Signature reading">
      {reading ? (
        <div className="space-y-4 border-b border-[var(--mimi-hairline)] pb-10">
          <SectionHeading
            icon={<Sparkles size={18} className="text-[var(--mimi-olive)]" />}
            title="The reading"
            subtitle="Editorial thesis · evidence-backed"
          />
          <div className="flex items-center gap-3">
            <span
              className={`font-sans text-[9px] uppercase tracking-[0.24em] ${CONFIDENCE_STYLE[reading.confidence]}`}
            >
              {CONFIDENCE_LABEL[reading.confidence]}
            </span>
            {signature.status === "approved" && signature.approvedAt ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-stone)]">
                Approved · {new Date(signature.approvedAt).toLocaleDateString()}
              </span>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-stone)]">
                Draft · v{signature.version ?? 1}
              </span>
            )}
          </div>
          <p className="font-serif text-xl md:text-2xl leading-relaxed text-[var(--mimi-ink)] max-w-3xl">
            {reading.thesis}
          </p>
          {reading.supportingParagraphs?.map((para) => (
            <p
              key={para.slice(0, 48)}
              className="font-serif text-base leading-relaxed text-[var(--mimi-stone)] max-w-3xl"
            >
              {para}
            </p>
          ))}
          {reading.coverageNote ? (
            <p className="font-sans text-xs text-[var(--mimi-stone)]">{reading.coverageNote}</p>
          ) : null}
          {evidence.length > 0 ? (
            <div className="pt-4 space-y-2">
              <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
                Used context
              </p>
              <ul className="flex flex-wrap gap-2">
                {evidence.slice(0, 12).map((ref) => (
                  <li
                    key={ref.id}
                    className="font-mono text-[9px] uppercase tracking-[0.16em] border border-[var(--mimi-hairline)] px-2 py-1 text-[var(--mimi-stone)]"
                    title={ref.source}
                  >
                    {ref.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {touchpoints.length > 0 ? (
        <div className="space-y-5">
          <SectionHeading
            icon={<Target size={18} className="text-[var(--mimi-olive)]" />}
            title="Semiotic touchpoints"
            subtitle="Motifs with visual directives"
          />
          <div className="grid md:grid-cols-2 gap-4">
            {touchpoints.map((item) => (
              <TouchpointCard key={`${item.motif}-${item.context.slice(0, 24)}`} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      {directions.length > 0 ? (
        <div className="space-y-5">
          <SectionHeading
            icon={<Compass size={18} className="text-[var(--mimi-olive)]" />}
            title="Creative directions"
            subtitle="Operable brief vectors"
          />
          <div className="grid md:grid-cols-2 gap-6">
            {directions.map((item) => (
              <DirectionCard key={item.title} item={item} onHandoff={onHandoff} />
            ))}
          </div>
        </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="space-y-5">
          <SectionHeading
            icon={<Lightbulb size={18} className="text-[var(--mimi-olive)]" />}
            title="Recommendations"
            subtitle="Next experiments"
          />
          <div className="grid md:grid-cols-2 gap-4">
            {recommendations.map((item) => (
              <RecommendationCard key={item.title} item={item} onHandoff={onHandoff} />
            ))}
          </div>
        </div>
      ) : null}

      {anti.length > 0 ? (
        <div className="space-y-4">
          <SectionHeading
            icon={<Ban size={18} className="text-[var(--mimi-stone)]" />}
            title="Anti-signature"
            subtitle="Hard refusals"
          />
          <ul className="space-y-2">
            {anti.map((item) => (
              <li
                key={item}
                className="font-serif italic text-sm text-[var(--mimi-stone)] border-l border-[var(--mimi-hairline)] pl-4"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {drift.length > 0 ? (
        <div className="space-y-4">
          <SectionHeading
            icon={<ArrowUpRight size={18} className="text-[var(--mimi-cobalt)]" />}
            title="Intent vs output"
            subtitle="Where Tailor and artifacts diverge"
          />
          <div className="space-y-4">
            {drift.map((note) => (
              <article key={note.aspect} className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--mimi-ink)]">
                  {note.aspect}
                </p>
                <p className="font-serif text-sm text-[var(--mimi-stone)]">{note.read}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {(signature.paletteExtraction?.length ||
        signature.tactileBias ||
        signature.typographicPairing ||
        signature.influenceLineage?.length) ? (
        <div className="space-y-6 pt-4 border-t border-[var(--mimi-hairline)]">
          <ColumnRule className="w-16" />
          <div className="grid md:grid-cols-3 gap-8">
            {signature.paletteExtraction?.length ? (
              <div>
                <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone)] mb-3">
                  Palette
                </p>
                <div className="flex gap-2 flex-wrap">
                  {signature.paletteExtraction.map((hex) => (
                    <span
                      key={hex}
                      className="w-8 h-8 border border-[var(--mimi-hairline)]"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {signature.tactileBias ? (
              <div>
                <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone)] mb-3">
                  Tactile bias
                </p>
                <p className="font-serif text-sm text-[var(--mimi-ink)]">
                  {signature.tactileBias.dominant}
                </p>
                <p className="font-serif italic text-sm text-[var(--mimi-stone)]">
                  {signature.tactileBias.secondary}
                </p>
              </div>
            ) : null}
            {signature.typographicPairing ? (
              <div>
                <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone)] mb-3">
                  Typography
                </p>
                <p className="font-serif text-sm text-[var(--mimi-ink)]">
                  {signature.typographicPairing.serif}
                </p>
                <p className="font-sans text-xs text-[var(--mimi-stone)]">
                  {signature.typographicPairing.sans}
                </p>
              </div>
            ) : null}
          </div>
          {signature.influenceLineage?.length ? (
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone)] mb-3">
                Influence lineage
              </p>
              <ul className="space-y-2">
                {signature.influenceLineage.slice(0, 6).map((item) => (
                  <li
                    key={`${item.artist}-${item.movement}`}
                    className="flex justify-between gap-4 font-serif text-sm"
                  >
                    <span className="text-[var(--mimi-ink)]">
                      {item.artist} · {item.movement}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--mimi-stone)]">
                      {Math.round(item.connectionStrength * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {signature.promptMatrix?.length ? (
        <div className="space-y-3">
          <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
            Prompt matrix
          </p>
          <div className="space-y-2">
            {signature.promptMatrix.map((prompt) => (
              <p
                key={prompt.slice(0, 40)}
                className="font-mono text-[10px] leading-relaxed text-[var(--mimi-stone)] border border-[var(--mimi-hairline)] p-3"
              >
                {prompt}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export const SignatureApproveBar: React.FC<{
  status?: "draft" | "approved";
  onApprove: () => void;
  onRepair: () => void;
  busy?: boolean;
}> = ({ status, onApprove, onRepair, busy }) => (
  <div className="flex flex-wrap items-center gap-3 border border-[var(--mimi-hairline)] p-4 bg-[var(--mimi-field)]">
    <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] flex-1 min-w-[12rem]">
      {status === "approved"
        ? "Approved into Mimi memory — still private until you publish."
        : "Approve this reading to mark it as durable taste memory."}
    </p>
    <PublicCTA variant="ghost" onClick={onRepair} disabled={busy}>
      Repair in Tailor
    </PublicCTA>
    <PublicCTA onClick={onApprove} disabled={busy || status === "approved"}>
      {status === "approved" ? "Approved" : "Approve signature"}
    </PublicCTA>
  </div>
);

export const SignaturePublishBar: React.FC<{
  approved: boolean;
  published: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  busy?: boolean;
}> = ({ approved, published, onPublish, onUnpublish, busy }) => (
  <div className="flex flex-wrap items-center gap-3 border border-[var(--mimi-hairline)] p-4 bg-[var(--mimi-field)]/80">
    <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone)] flex-1 min-w-[12rem]">
      {published
        ? "Published public plate — visitors can read /u/:handle/signature."
        : approved
          ? "Publish a frozen public snapshot when you are ready to share."
          : "Approve into memory before publishing publicly."}
    </p>
    {published ? (
      <PublicCTA variant="ghost" onClick={onUnpublish} disabled={busy}>
        Unpublish
      </PublicCTA>
    ) : (
      <PublicCTA onClick={onPublish} disabled={busy || !approved}>
        Publish public plate
      </PublicCTA>
    )}
  </div>
);

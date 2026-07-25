import React from 'react';
import type { EvidenceBasedCreativeDossier } from '../../types';
import { DossierPatternGraphViz } from './DossierPatternGraphViz';

interface EvidenceDossierViewProps {
  dossier: EvidenceBasedCreativeDossier;
  onAcceptLikeness?: () => void;
  onStartOver?: () => void;
  accepting?: boolean;
  accepted?: boolean;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-0.5 bg-nous-border/30">
        <div className="h-full bg-nous-text/50" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-mono text-nous-subtle w-8 text-right">{pct}%</span>
    </div>
  );
}

function EditorialCard({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-nous-border/30 pt-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">{label}</p>
      {title && <h2 className="font-serif text-2xl text-nous-text mb-4">{title}</h2>}
      {children}
    </section>
  );
}

export const EvidenceDossierView: React.FC<EvidenceDossierViewProps> = ({
  dossier,
  onAcceptLikeness,
  onStartOver,
  accepting,
  accepted,
}) => {
  const { cos } = { cos: dossier.creativeOperatingSystem };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[10px] uppercase tracking-[0.4em] text-nous-subtle mb-2">
        {dossier.dossierTitle}
      </p>
      <h1 className="font-serif text-4xl text-nous-text mb-3">{cos.containerName}</h1>
      <p className="font-serif text-lg italic text-nous-subtle mb-8 leading-relaxed">
        {cos.oneSentencePhilosophy}
      </p>
      {dossier.userIntent && (
        <p className="text-sm text-nous-subtle mb-10 border-l-2 border-nous-border/40 pl-4">
          {dossier.userIntent}
        </p>
      )}

      <div className="space-y-2 mb-12">
        <EditorialCard label="Pattern Graph" title="Recurring signals">
          <DossierPatternGraphViz patternGraph={dossier.patternGraph} className="mb-8" />
          <div className="space-y-4">
            {dossier.patternGraph.recurringSignals.map((sig) => (
              <div key={sig.signal} className="border border-nous-border/25 p-4">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <p className="text-sm text-nous-text font-medium">{sig.signal}</p>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-nous-subtle shrink-0">
                    {sig.count}/{sig.totalReferences}
                  </span>
                </div>
                <ConfidenceBar value={sig.confidence} />
                {sig.evidenceRefIds.length > 0 && (
                  <p className="text-[10px] text-nous-subtle mt-2 font-mono">
                    {sig.evidenceRefIds.join(' · ')}
                  </p>
                )}
              </div>
            ))}
            {dossier.patternGraph.outliers.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-widest text-nous-subtle mb-3">Outliers</p>
                {dossier.patternGraph.outliers.map((o) => (
                  <p key={`${o.refId}-${o.signal}`} className="text-sm text-nous-subtle mb-2">
                    <span className="font-mono text-[10px]">{o.refId}</span> — {o.signal}. {o.note}
                  </p>
                ))}
              </div>
            )}
          </div>
        </EditorialCard>

        <EditorialCard label="Creative Laws" title="Design laws">
          <div className="space-y-5">
            {cos.designLaws.map((law) => (
              <div key={law.law} className="pl-4 border-l-2 border-nous-text/20">
                <p className="font-serif text-lg text-nous-text mb-1">{law.law}</p>
                <p className="text-sm text-nous-subtle mb-2">{law.rationale}</p>
                <ConfidenceBar value={law.confidence} />
                {law.evidenceRefIds.length > 0 && (
                  <p className="text-[10px] font-mono text-nous-subtle mt-2">
                    {law.evidenceRefIds.join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </EditorialCard>

        <EditorialCard label="Container" title={cos.containerName}>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Visual grammar</p>
              <ul className="space-y-1 text-nous-subtle">
                {cos.visualGrammar.map((v) => (
                  <li key={v}>· {v}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Material vocabulary</p>
              <ul className="space-y-1 text-nous-subtle">
                {cos.materialVocabulary.map((v) => (
                  <li key={v}>· {v}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Color logic</p>
              <p className="text-nous-subtle">{cos.colorLogic}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Composition logic</p>
              <p className="text-nous-subtle">{cos.compositionLogic}</p>
            </div>
            {cos.thingsToAvoid.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-nous-subtle mb-2">Things to avoid</p>
                <p className="text-nous-subtle text-sm">{cos.thingsToAvoid.join(' · ')}</p>
              </div>
            )}
          </div>
        </EditorialCard>

        <EditorialCard label="Applications" title="Cross-domain transfer">
          <div className="grid sm:grid-cols-2 gap-4">
            {(Object.entries(dossier.applications) as [string, string[]][]).map(([domain, items]) =>
              items.length > 0 ? (
                <div key={domain} className="border border-nous-border/20 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-nous-subtle mb-2">{domain}</p>
                  <ul className="text-sm text-nous-subtle space-y-1">
                    {items.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </EditorialCard>

        <EditorialCard label="Inversions" title="Next experiments">
          <div className="space-y-4 mb-6">
            {dossier.inversions.map((inv) => (
              <div key={inv.becauseYouTendTo} className="text-sm">
                <p className="text-nous-subtle">
                  <span className="text-nous-text">Because you tend to</span> {inv.becauseYouTendTo}
                </p>
                <p className="text-nous-text mt-1">
                  <span className="italic">Try instead:</span> {inv.tryInstead}
                </p>
              </div>
            ))}
          </div>
          {dossier.nextExperiments.length > 0 && (
            <div className="border-t border-nous-border/20 pt-4 space-y-3">
              {dossier.nextExperiments.map((exp) => (
                <div key={exp.title}>
                  <p className="font-serif text-nous-text">{exp.title}</p>
                  <p className="text-sm text-nous-subtle">{exp.hypothesis}</p>
                </div>
              ))}
            </div>
          )}
        </EditorialCard>

        <EditorialCard label="Likeness manifest">
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="w-10 h-10 border border-nous-border/40"
              style={{ backgroundColor: dossier.likenessManifest.accentHex }}
              title={dossier.likenessManifest.accentHex}
            />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-nous-subtle">
                Paper warmth · {dossier.likenessManifest.paperWarmth}
              </p>
              <p className="text-sm text-nous-subtle mt-1">
                {dossier.likenessManifest.voiceAdjectives.join(', ')}
              </p>
            </div>
          </div>
          {dossier.likenessManifest.motifCandidates.length > 0 && (
            <p className="text-sm text-nous-subtle mt-4">
              Motifs: {dossier.likenessManifest.motifCandidates.join(' · ')}
            </p>
          )}
        </EditorialCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 border-t border-nous-border/30 pt-8">
        {onAcceptLikeness && (
          <button
            type="button"
            onClick={onAcceptLikeness}
            disabled={accepting || accepted}
            className="flex-1 py-3 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {accepted ? 'Likeness saved' : accepting ? 'Saving…' : 'Accept as Likeness'}
          </button>
        )}
        {onStartOver && (
          <button
            type="button"
            onClick={onStartOver}
            className="flex-1 py-3 border border-nous-border/40 text-xs uppercase tracking-[0.2em] text-nous-subtle hover:border-nous-text/30"
          >
            New evidence
          </button>
        )}
      </div>
    </div>
  );
};

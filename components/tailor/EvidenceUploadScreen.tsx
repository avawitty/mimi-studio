import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { EvidenceNode } from '../../types';
import {
  importFromLink,
  screenshotProvenance,
  type TasteImportItem,
} from '../../services/tasteImportService';
import {
  assignScopeBatch,
  compileIntakeHandoff,
  deriveReadProgress,
  groupIntoCollections,
  normalizeTasteImportItem,
  toEvidenceUploadPayload,
  type CuriosityPromptId,
  type TailorEvidenceItem,
  type TailorEvidenceScope,
} from '../../services/tailorEvidenceIntake';
import { ReadProgressBanner } from './evidenceIntake/ReadProgressBanner';
import { SourceModules } from './evidenceIntake/SourceModules';
import { EvidenceReview } from './evidenceIntake/EvidenceReview';
import { CuriositySelector } from './evidenceIntake/CuriositySelector';

export interface EvidenceUploadItem {
  title: string;
  sourceType: EvidenceNode['sourceType'];
  dataUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  description?: string;
  extractedMetadata?: Record<string, unknown>;
}

export interface EvidenceIntakeHandoffPayload {
  intendedHelp: string[];
  customCuriosity: string;
  directContext: string;
  compilation: ReturnType<typeof compileIntakeHandoff>;
}

interface EvidenceUploadScreenProps {
  evidence: EvidenceNode[];
  onUpload: (files: EvidenceUploadItem[]) => Promise<void>;
  onContinue: () => void;
  blurb: string;
  onBlurbChange: (v: string) => void;
  uploading?: boolean;
  /** True when analysis has already produced observations/patterns */
  analysisAvailable?: boolean;
  analysisConfidence?: number;
  curiosityIds?: CuriosityPromptId[];
  onCuriosityChange?: (ids: CuriosityPromptId[]) => void;
  customCuriosity?: string;
  onCustomCuriosityChange?: (v: string) => void;
  onHandoffReady?: (payload: EvidenceIntakeHandoffPayload) => void;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

const EyeOrnament: React.FC = () => (
  <svg
    viewBox="0 0 64 64"
    className="w-14 h-14 sm:w-16 sm:h-16 text-nous-text/80"
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
  >
    <circle cx="32" cy="32" r="6" />
    <ellipse cx="32" cy="32" rx="18" ry="10" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 32 + Math.cos(rad) * 22;
      const y1 = 32 + Math.sin(rad) * 22;
      const x2 = 32 + Math.cos(rad) * 28;
      const y2 = 32 + Math.sin(rad) * 28;
      return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
  </svg>
);

export const EvidenceUploadScreen: React.FC<EvidenceUploadScreenProps> = ({
  evidence,
  onUpload,
  onContinue,
  blurb,
  onBlurbChange,
  uploading,
  analysisAvailable = false,
  analysisConfidence,
  curiosityIds: controlledCuriosity,
  onCuriosityChange,
  customCuriosity: controlledCustom,
  onCustomCuriosityChange,
  onHandoffReady,
}) => {
  const contextId = useId();
  const [letterboxdValue, setLetterboxdValue] = useState('');
  const [pinterestValue, setPinterestValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [staged, setStaged] = useState<TailorEvidenceItem[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [localCuriosity, setLocalCuriosity] = useState<CuriosityPromptId[]>([]);
  const [localCustomCuriosity, setLocalCustomCuriosity] = useState('');
  const [moodboardSeed, setMoodboardSeed] = useState<string | null>(null);

  const curiosityIds = controlledCuriosity ?? localCuriosity;
  const customCuriosity = controlledCustom ?? localCustomCuriosity;

  const setCuriosityIds = useCallback(
    (ids: CuriosityPromptId[]) => {
      if (onCuriosityChange) onCuriosityChange(ids);
      else setLocalCuriosity(ids);
    },
    [onCuriosityChange],
  );

  const setCustomCuriosity = useCallback(
    (v: string) => {
      if (onCustomCuriosityChange) onCustomCuriosityChange(v);
      else setLocalCustomCuriosity(v);
    },
    [onCustomCuriosityChange],
  );

  useEffect(() => {
    try {
      const digest = sessionStorage.getItem('mimi_moodboard_evidence_digest');
      if (digest) {
        setMoodboardSeed(digest);
        onBlurbChange(digest.slice(0, 1200));
        sessionStorage.removeItem('mimi_moodboard_evidence_digest');
      }
    } catch {
      /* ignore */
    }
    // Mount-only: consume one-shot moodboard handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { rows, childrenByCollection } = useMemo(
    () => groupIntoCollections(staged.filter((s) => !s.isCollection)),
    [staged],
  );

  const progress = useMemo(
    () =>
      deriveReadProgress({
        acceptedEvidence: evidence,
        stagedCount: staged.filter((s) => !s.isCollection).length,
        analysisAvailable,
        analysisConfidence,
      }),
    [evidence, staged, analysisAvailable, analysisConfidence],
  );

  const completedSources = useMemo(() => {
    const set = new Set<'letterboxd' | 'pinterest' | 'instagram' | 'moreover'>();
    const check = (items: Array<{ sourceType?: string; extractedMetadata?: Record<string, unknown> }>) => {
      for (const item of items) {
        const provider =
          (item as TailorEvidenceItem).sourceType ||
          (item.extractedMetadata?.provider as string) ||
          '';
        if (provider === 'letterboxd') set.add('letterboxd');
        if (provider === 'pinterest') set.add('pinterest');
        if (provider === 'instagram') set.add('instagram');
        if (provider === 'upload' || provider === 'manual' || provider === 'generic_url') set.add('moreover');
      }
    };
    check(staged);
    check(evidence.map((e) => ({ sourceType: e.extractedMetadata?.intakeSourceType as string, extractedMetadata: e.extractedMetadata })));
    return set;
  }, [staged, evidence]);

  const addStagedItems = useCallback((items: TasteImportItem[], extra?: Partial<TailorEvidenceItem>) => {
    const normalized = items.map((it) =>
      normalizeTasteImportItem(it, {
        scope: 'session',
        selected: true,
        status: 'ready',
        ...extra,
      }),
    );
    setStaged((prev) => [...prev, ...normalized]);
  }, []);

  const runImport = useCallback(
    async (raw: string) => {
      if (!raw.trim()) return;
      setImporting(true);
      setImportError(null);
      setImportWarning(null);
      try {
        const result = await importFromLink(raw);
        if (!result.items.length) {
          setImportError('No public taste signals found. Try another source or upload a screenshot.');
        } else {
          addStagedItems(result.items);
          if (result.warning) setImportWarning(result.warning);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not read that source.';
        setImportError(message);
      } finally {
        setImporting(false);
      }
    },
    [addStagedItems],
  );

  const handleInstagramFiles = useCallback(
    async (files: FileList | null, label: string) => {
      if (!files?.length) return;
      const items: TasteImportItem[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await readFileAsDataUrl(file);
        const prov = screenshotProvenance(true, label || 'Instagram Snapshot');
        items.push({
          title: `${label || 'Instagram'} screenshot`,
          sourceType: 'screenshot',
          dataUrl,
          thumbnailUrl: dataUrl,
          extractedMetadata: {
            ...prov,
            snapshotLabel: label,
            inferred: true,
            authority: 'platform_inferred',
          },
        });
      }
      if (items.length) {
        addStagedItems(items, { snapshotLabel: label, sourceType: 'instagram' });
      }
    },
    [addStagedItems],
  );

  const handleMoreoverFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const items: TasteImportItem[] = [];
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        const isText = file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name);
        if (!isImage && !isPdf && !isText) continue;

        if (isImage) {
          const dataUrl = await readFileAsDataUrl(file);
          const prov = screenshotProvenance(false, file.name);
          items.push({
            title: file.name.replace(/\.[^.]+$/, ''),
            sourceType: 'image',
            dataUrl,
            thumbnailUrl: dataUrl,
            extractedMetadata: { ...prov, mediaType: 'image' },
          });
        } else {
          const dataUrl = await readFileAsDataUrl(file);
          const prov = screenshotProvenance(false, file.name);
          items.push({
            title: file.name.replace(/\.[^.]+$/, ''),
            sourceType: isPdf ? 'book' : 'note',
            dataUrl,
            description: isText ? undefined : file.name,
            extractedMetadata: {
              ...prov,
              mediaType: isPdf ? 'pdf' : 'text',
              symbolicContext:
                /birth.?chart|natal|astrology/i.test(file.name)
                  ? 'symbolic_self_expressive'
                  : undefined,
            },
          });
        }
      }
      if (items.length) addStagedItems(items, { sourceType: 'upload' });
    },
    [addStagedItems],
  );

  const updateRow = useCallback((id: string, patch: Partial<TailorEvidenceItem>) => {
    setStaged((prev) => {
      const row = groupIntoCollections(prev.filter((s) => !s.isCollection)).rows.find((r) => r.id === id);
      if (row?.isCollection && row.sourceCollectionId && (patch.scope || patch.selected !== undefined)) {
        return prev.map((s) => {
          if (s.sourceCollectionId === row.sourceCollectionId && !s.isCollection) {
            return {
              ...s,
              ...(patch.scope ? { scope: patch.scope } : {}),
              ...(patch.selected !== undefined ? { selected: patch.selected } : {}),
            };
          }
          return s;
        });
      }
      return prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
    });
  }, []);

  const removeRow = useCallback((id: string) => {
    setStaged((prev) => {
      const { rows: currentRows } = groupIntoCollections(prev.filter((s) => !s.isCollection));
      const row = currentRows.find((r) => r.id === id);
      if (row?.isCollection && row.sourceCollectionId) {
        return prev.filter((s) => s.sourceCollectionId !== row.sourceCollectionId);
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const commitStaged = useCallback(async () => {
    const selectedRows = rows.filter((r) => r.selected !== false);
    if (!selectedRows.length) return;

    const flat: TailorEvidenceItem[] = [];
    for (const row of selectedRows) {
      if (row.isCollection && row.sourceCollectionId) {
        const kids = childrenByCollection.get(row.sourceCollectionId) || [];
        for (const kid of kids) {
          flat.push({ ...kid, scope: row.scope, selected: true, userConfirmed: true });
        }
      } else {
        flat.push({ ...row, userConfirmed: true });
      }
    }

    const payload = flat.map(toEvidenceUploadPayload);
    await onUpload(payload);

    const committedIds = new Set(flat.map((f) => f.id));
    const committedCollections = new Set(
      flat.map((f) => f.sourceCollectionId).filter(Boolean) as string[],
    );
    setStaged((prev) =>
      prev.filter((s) => {
        if (committedIds.has(s.id)) return false;
        if (s.sourceCollectionId && committedCollections.has(s.sourceCollectionId)) return false;
        return true;
      }),
    );

    const handoff = compileIntakeHandoff({
      evidenceItems: flat,
      curiosityIds,
      customCuriosity,
      directContext: blurb,
    });
    onHandoffReady?.({
      intendedHelp: handoff.intendedHelp,
      customCuriosity,
      directContext: blurb,
      compilation: handoff,
    });
  }, [
    rows,
    childrenByCollection,
    onUpload,
    curiosityIds,
    customCuriosity,
    blurb,
    onHandoffReady,
  ]);

  const toggleCuriosity = useCallback(
    (id: CuriosityPromptId) => {
      setCuriosityIds(
        curiosityIds.includes(id) ? curiosityIds.filter((x) => x !== id) : [...curiosityIds, id],
      );
    },
    [curiosityIds, setCuriosityIds],
  );

  const committedCount = evidence.length;
  const ctaLabel = analysisAvailable ? 'Update my reading' : 'Read my references';
  const canContinue = committedCount >= 3 && !uploading;

  // Committed evidence preview (compact)
  const committedPreview = evidence.slice(0, 12);

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-4xl px-4 py-6 pb-[max(6rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      {/* Header */}
      <header className="mb-8 sm:mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-3">
          Evidence Intake
        </p>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.1] text-nous-text text-balance mb-3">
              Let Mimi Read You
            </h1>
            <p className="text-sm sm:text-[15px] leading-relaxed text-nous-subtle max-w-prose">
              Every reference is another clue. Bring what you&apos;ve collected, loved, saved, or made.
              Mimi looks for patterns—not perfection.
            </p>
            <p className="mt-2 text-[12px] text-nous-subtle/90 max-w-prose">
              The more varied the evidence, the more dimensional the read.
            </p>
          </div>
          <div className="hidden sm:block shrink-0 pt-1">
            <EyeOrnament />
          </div>
        </div>
      </header>

      {moodboardSeed && (
        <div className="mb-6 border border-nous-border/40 bg-[#F7F3EE]/70 dark:bg-[#121212]/60 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle font-medium mb-1">
            Moodboard synthesis received
          </p>
          <p className="text-xs text-nous-subtle leading-relaxed">
            Selection notes were packed into your context field. Add sources, then continue.
          </p>
        </div>
      )}

      <ReadProgressBanner progress={progress} />

      <SourceModules
        letterboxdValue={letterboxdValue}
        pinterestValue={pinterestValue}
        onLetterboxdChange={setLetterboxdValue}
        onPinterestChange={setPinterestValue}
        onImportLetterboxd={() => {
          void runImport(letterboxdValue).then(() => setLetterboxdValue(''));
        }}
        onImportPinterest={() => {
          void runImport(pinterestValue).then(() => setPinterestValue(''));
        }}
        onInstagramFiles={handleInstagramFiles}
        onMoreoverFiles={handleMoreoverFiles}
        importing={importing}
        importError={importError}
        importWarning={importWarning}
        completedSources={completedSources}
      />

      <EvidenceReview
        rows={rows}
        childrenByCollection={childrenByCollection}
        uploading={uploading}
        onToggleSelect={(id) => {
          const row = rows.find((r) => r.id === id);
          updateRow(id, { selected: !(row?.selected !== false) });
        }}
        onSelectAll={(selected) => {
          setStaged((prev) => prev.map((s) => ({ ...s, selected })));
        }}
        onScopeChange={(id, scope) => updateRow(id, { scope })}
        onBatchScope={(scope) => {
          const ids = rows.filter((r) => r.selected !== false).flatMap((r) => {
            if (r.isCollection && r.childIds) return r.childIds;
            return [r.id];
          });
          setStaged((prev) => assignScopeBatch(prev, ids, scope));
        }}
        onRemove={removeRow}
        onRemoveSelected={() => {
          const ids = new Set(
            rows.filter((r) => r.selected !== false).flatMap((r) => {
              if (r.isCollection && r.sourceCollectionId) {
                return staged
                  .filter((s) => s.sourceCollectionId === r.sourceCollectionId)
                  .map((s) => s.id);
              }
              return [r.id];
            }),
          );
          setStaged((prev) => prev.filter((s) => !ids.has(s.id)));
        }}
        onTitleChange={(id, title) => updateRow(id, { title })}
        onCorrectInterpretation={(id, text) =>
          updateRow(id, {
            interpretationCorrected: text,
            rawMetadata: {
              ...(rows.find((r) => r.id === id)?.rawMetadata || {}),
              authority: 'user_correction',
              correction: text,
            },
          })
        }
        onCommit={() => void commitStaged()}
        expandedCollections={expandedCollections}
        onToggleCollection={(collectionId) => {
          setExpandedCollections((prev) => {
            const next = new Set(prev);
            if (next.has(collectionId)) next.delete(collectionId);
            else next.add(collectionId);
            return next;
          });
        }}
      />

      {committedPreview.length > 0 && (
        <section className="mb-10" aria-label="Accepted evidence">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-nous-subtle mb-3">
            In evidence · {evidence.length}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {committedPreview.map((node) => (
              <CommittedThumb key={node.id} node={node} />
            ))}
          </div>
          {evidence.length > committedPreview.length && (
            <p className="mt-2 text-[11px] text-nous-subtle">
              +{evidence.length - committedPreview.length} more
            </p>
          )}
        </section>
      )}

      {/* Direct context */}
      <section className="mb-8" aria-labelledby="context-heading">
        <h3 id="context-heading" className="font-mono text-[10px] uppercase tracking-[0.22em] text-nous-subtle mb-2">
          Anything else we should know?
        </h3>
        <label htmlFor={contextId} className="sr-only">
          Share anything that feels like you
        </label>
        <textarea
          id={contextId}
          value={blurb}
          onChange={(e) => onBlurbChange(e.target.value)}
          rows={4}
          className="w-full border border-nous-border/50 bg-transparent px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:border-nous-text/40 min-h-[120px]"
          placeholder="Share anything that feels like you—or something Mimi might otherwise misunderstand."
        />
        <p className="mt-2 text-[11px] text-nous-subtle leading-relaxed">
          Contradictions are welcome. Taste is rarely one clean category. Direct statements outrank inference.
        </p>
      </section>

      {/* Living interpretation notice */}
      <aside className="mb-10 border border-nous-border/40 bg-[#F3EDE6]/70 dark:bg-[#161616] px-4 py-4 sm:px-5 flex gap-3 items-start">
        <Sparkles size={16} className="shrink-0 mt-0.5 text-nous-text/70" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-nous-text">
            Mimi builds a living interpretation from everything you share. Add new evidence, remove old
            references, explore different versions of yourself, and watch the synthesis evolve in real time.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-nous-subtle">
            There is no final version of your taste—only better evidence and sharper interpretations.
          </p>
        </div>
        <div className="hidden sm:flex gap-1 shrink-0 pt-1" aria-hidden>
          <Sparkles size={10} className="text-nous-subtle/60" />
          <Sparkles size={8} className="text-nous-subtle/40 mt-1" />
          <Sparkles size={6} className="text-nous-subtle/30 mt-2" />
        </div>
      </aside>

      <CuriositySelector
        selected={curiosityIds}
        customText={customCuriosity}
        onToggle={toggleCuriosity}
        onCustomChange={setCustomCuriosity}
      />

      {/* Closing */}
      <footer className="text-center mb-6">
        <Sparkles size={12} className="mx-auto mb-3 text-nous-subtle" aria-hidden />
        <p className="font-serif italic text-lg sm:text-xl text-nous-text mb-6">
          Bring your evidence. Mimi writes a theory.
        </p>
      </footer>

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#FDFBF7]/95 dark:bg-[#0A0A0A]/95 border-t border-nous-border/20 backdrop-blur-sm">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => {
            const handoff = compileIntakeHandoff({
              evidenceItems: staged.filter((s) => !s.isCollection),
              curiosityIds,
              customCuriosity,
              directContext: blurb,
            });
            onHandoffReady?.({
              intendedHelp: handoff.intendedHelp,
              customCuriosity,
              directContext: blurb,
              compilation: handoff,
            });
            onContinue();
          }}
          className="w-full min-h-[52px] py-3.5 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.22em] disabled:opacity-40 inline-flex items-center justify-center gap-2"
        >
          {committedCount < 3
            ? `Add ${3 - committedCount} more reference${3 - committedCount === 1 ? '' : 's'}`
            : (
              <>
                {ctaLabel}
                <Sparkles size={12} aria-hidden />
              </>
            )}
        </button>
      </div>
    </div>
  );
};

function CommittedThumb({ node }: { node: EvidenceNode }) {
  const [broken, setBroken] = useState(false);
  const provider = node.extractedMetadata?.provider as string | undefined;

  return (
    <div className="aspect-square border border-nous-border/35 overflow-hidden relative bg-nous-paper/50">
      {node.thumbnailUrl && !broken ? (
        <img
          src={node.thumbnailUrl}
          alt={node.title}
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-mono text-[9px] uppercase tracking-wider text-nous-subtle">
          —
        </div>
      )}
      {provider && (
        <span className="absolute top-1 left-1 bg-black/55 text-white font-mono text-[8px] uppercase tracking-wider px-1 py-0.5">
          {provider}
        </span>
      )}
      <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[9px] px-1 truncate">
        {node.title}
      </span>
    </div>
  );
}

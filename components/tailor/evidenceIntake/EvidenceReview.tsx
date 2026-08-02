import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { TailorEvidenceItem, TailorEvidenceScope } from '../../../services/tailorEvidenceIntake';
import { storageScopeToUiLabel } from '../../../services/tailorEvidenceIntake';

interface EvidenceReviewProps {
  rows: TailorEvidenceItem[];
  childrenByCollection: Map<string, TailorEvidenceItem[]>;
  uploading?: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onScopeChange: (id: string, scope: TailorEvidenceScope) => void;
  onBatchScope: (scope: TailorEvidenceScope) => void;
  onRemove: (id: string) => void;
  onRemoveSelected: () => void;
  onTitleChange: (id: string, title: string) => void;
  onCorrectInterpretation: (id: string, text: string) => void;
  onCommit: () => void;
  expandedCollections: Set<string>;
  onToggleCollection: (collectionId: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  letterboxd: 'Letterboxd',
  pinterest: 'Pinterest',
  instagram: 'Instagram',
  upload: 'Upload',
  direct_statement: 'Direct statement',
};

function EvidenceThumb({ item }: { item: TailorEvidenceItem }) {
  const [broken, setBroken] = useState(false);
  const src = item.thumbnailUrl || item.dataUrl;

  if (!src || broken) {
    return (
      <div
        className="w-14 h-14 shrink-0 border border-nous-border/40 bg-nous-paper/60 dark:bg-nous-charcoal flex items-center justify-center"
        aria-hidden
      >
        <span className="font-mono text-[9px] uppercase tracking-wider text-nous-subtle">
          {item.mediaType === 'collection' ? `${item.childIds?.length || '·'}` : '—'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-14 h-14 shrink-0 border border-nous-border/40 bg-nous-paper/40 overflow-hidden relative">
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setBroken(true)}
      />
      {item.isCollection && item.childIds && item.childIds.length > 1 && (
        <span className="absolute bottom-0 right-0 bg-black/70 text-white font-mono text-[8px] px-1 py-0.5">
          ×{item.childIds.length}
        </span>
      )}
    </div>
  );
}

export const EvidenceReview: React.FC<EvidenceReviewProps> = ({
  rows,
  childrenByCollection,
  uploading,
  onToggleSelect,
  onSelectAll,
  onScopeChange,
  onBatchScope,
  onRemove,
  onRemoveSelected,
  onTitleChange,
  onCorrectInterpretation,
  onCommit,
  expandedCollections,
  onToggleCollection,
}) => {
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState('');

  if (!rows.length) return null;

  const selectedCount = rows.filter((r) => r.selected !== false).length;
  const allSelected = selectedCount === rows.length;
  const commitLabel =
    selectedCount === 0
      ? 'Add selected evidence'
      : selectedCount === 1
        ? 'Add 1 reference'
        : `Add ${selectedCount} references`;

  const flattenForCommit = (row: TailorEvidenceItem): TailorEvidenceItem[] => {
    if (row.isCollection && row.sourceCollectionId) {
      const kids = childrenByCollection.get(row.sourceCollectionId) || [];
      return kids.map((k) => ({ ...k, selected: row.selected, scope: row.scope }));
    }
    return [row];
  };
  void flattenForCommit;

  return (
    <section className="mb-10 border border-nous-border/40" aria-labelledby="review-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-nous-border/30 bg-[#F7F3EE]/80 dark:bg-[#121212]/80">
        <h3 id="review-heading" className="font-mono text-[10px] uppercase tracking-[0.22em] text-nous-subtle">
          Review evidence · {rows.length}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectAll(!allSelected)}
            className="text-[10px] uppercase tracking-[0.14em] min-h-[44px] px-2 text-nous-subtle hover:text-nous-text"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <label className="sr-only" htmlFor="batch-scope">
            Batch scope
          </label>
          <select
            id="batch-scope"
            className="text-[11px] border border-nous-border/40 bg-transparent px-2 py-2 min-h-[44px] text-nous-subtle"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value as TailorEvidenceScope | '';
              if (v === 'session' || v === 'persistent') onBatchScope(v);
              e.currentTarget.value = '';
            }}
          >
            <option value="" disabled>
              Scope selected…
            </option>
            <option value="session">This reading only</option>
            <option value="persistent">Add to my profile</option>
          </select>
          <button
            type="button"
            onClick={onRemoveSelected}
            disabled={selectedCount === 0}
            className="text-[10px] uppercase tracking-[0.14em] min-h-[44px] px-2 text-nous-subtle hover:text-red-700 disabled:opacity-40"
          >
            Remove selected
          </button>
        </div>
      </div>

      <ul className="divide-y divide-nous-border/25">
        {rows.map((item) => {
          const collectionKids =
            item.isCollection && item.sourceCollectionId
              ? childrenByCollection.get(item.sourceCollectionId) || []
              : [];
          const expanded =
            item.isCollection && item.sourceCollectionId
              ? expandedCollections.has(item.sourceCollectionId)
              : false;

          return (
            <li key={item.id} className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.selected !== false}
                  onChange={() => onToggleSelect(item.id)}
                  className="mt-4 h-4 w-4 accent-nous-text"
                  aria-label={`Select ${item.title}`}
                />
                <EvidenceThumb item={item} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    {item.isCollection && item.sourceCollectionId && (
                      <button
                        type="button"
                        onClick={() => onToggleCollection(item.sourceCollectionId!)}
                        className="mt-1 p-1 text-nous-subtle hover:text-nous-text min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Collapse collection' : 'Expand collection'}
                      >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                    <input
                      value={item.title}
                      onChange={(e) => onTitleChange(item.id, e.target.value)}
                      className="w-full bg-transparent font-serif text-base text-nous-text border-b border-transparent focus:border-nous-border/50 focus:outline-none pb-0.5"
                      aria-label="Evidence title"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-nous-border/40 text-nous-subtle">
                      {SOURCE_LABEL[item.sourceType] || item.sourceType}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-nous-border/40 text-nous-subtle">
                      {item.mediaType || 'evidence'}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-nous-border/40 text-nous-subtle">
                      {item.status}
                    </span>
                    {item.snapshotLabel && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-nous-border/40 text-nous-subtle">
                        {item.snapshotLabel}
                      </span>
                    )}
                    {typeof item.confidence === 'number' && item.confidence > 0 && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-nous-border/40 text-nous-subtle">
                        {Math.round(item.confidence * 100)}% conf.
                      </span>
                    )}
                    {item.isCollection && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-nous-subtle">
                        Collection · {collectionKids.length} images
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`scope-${item.id}`}>
                      Scope for {item.title}
                    </label>
                    <select
                      id={`scope-${item.id}`}
                      value={item.scope}
                      onChange={(e) => onScopeChange(item.id, e.target.value as TailorEvidenceScope)}
                      className="text-[11px] border border-nous-border/40 bg-transparent px-2 py-2 min-h-[40px] text-nous-text"
                    >
                      <option value="session">{storageScopeToUiLabel('session')}</option>
                      <option value="persistent">{storageScopeToUiLabel('persistent')}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectingId(correctingId === item.id ? null : item.id);
                        setCorrectionDraft(item.interpretationCorrected || item.interpretation || '');
                      }}
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] min-h-[40px] px-2 text-nous-subtle hover:text-nous-text"
                    >
                      <Pencil size={12} /> Correct
                    </button>
                  </div>

                  {correctingId === item.id && (
                    <div className="mt-2">
                      <label className="sr-only" htmlFor={`correct-${item.id}`}>
                        Correct Mimi&apos;s interpretation
                      </label>
                      <textarea
                        id={`correct-${item.id}`}
                        value={correctionDraft}
                        onChange={(e) => setCorrectionDraft(e.target.value)}
                        rows={2}
                        placeholder="Close, but wrong — tell Mimi what this actually is."
                        className="w-full border border-nous-border/40 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:border-nous-text/40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onCorrectInterpretation(item.id, correctionDraft);
                          setCorrectingId(null);
                        }}
                        className="mt-1 text-[10px] uppercase tracking-[0.14em] min-h-[40px] px-3 border border-nous-border/40 hover:border-nous-text/40"
                      >
                        Save correction
                      </button>
                    </div>
                  )}

                  {expanded && collectionKids.length > 0 && (
                    <ul className="mt-3 ml-2 border-l border-nous-border/30 pl-3 space-y-2">
                      {collectionKids.map((child) => (
                        <li key={child.id} className="flex items-center gap-2 text-xs text-nous-subtle">
                          <EvidenceThumb item={child} />
                          <span className="truncate text-nous-text">{child.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.title}`}
                  className="shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-nous-subtle hover:text-red-700"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="p-3 sm:p-4 border-t border-nous-border/30">
        <button
          type="button"
          onClick={onCommit}
          disabled={uploading || selectedCount === 0}
          className="w-full min-h-[48px] py-3 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <Check size={14} /> {commitLabel}
            </>
          )}
        </button>
      </div>
    </section>
  );
};

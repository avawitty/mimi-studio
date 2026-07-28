import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Upload,
  X,
  Loader2,
  Link2,
  Camera,
  Film,
  LayoutGrid,
  Globe,
  Check,
  Trash2,
} from 'lucide-react';
import type { EvidenceNode, EvidenceSourceType } from '../../types';
import { getReadConfidenceDisplay, getReadConfidenceLabel } from '../../constants/tailorSafetyRules';
import {
  importFromLink,
  detectProvider,
  screenshotProvenance,
  type TasteImportItem,
  type TasteProvider,
  type TasteConfidence,
} from '../../services/tasteImportService';

export interface EvidenceUploadItem {
  title: string;
  sourceType: EvidenceSourceType;
  dataUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  description?: string;
  extractedMetadata?: Record<string, unknown>;
}

interface EvidenceUploadScreenProps {
  evidence: EvidenceNode[];
  onUpload: (files: EvidenceUploadItem[]) => Promise<void>;
  onContinue: () => void;
  blurb: string;
  onBlurbChange: (v: string) => void;
  uploading?: boolean;
}

type SourceTab = 'link' | 'screenshot' | 'upload';

interface StagedItem extends TasteImportItem {
  _localId: string;
  scope: 'project' | 'profile';
}

const PROVIDER_LABEL: Record<TasteProvider, string> = {
  letterboxd: 'Letterboxd',
  pinterest: 'Pinterest',
  instagram: 'Instagram',
  generic_url: 'Website',
  manual: 'Upload',
};

const CONFIDENCE_TONE: Record<TasteConfidence, string> = {
  high: 'text-emerald-700 dark:text-emerald-400 border-emerald-600/30',
  medium: 'text-amber-700 dark:text-amber-400 border-amber-600/30',
  low: 'text-stone-500 border-stone-400/30',
};

const AUTHORITY_LABEL: Record<string, string> = {
  user_declared: 'You said',
  user_behavior: 'Your behavior',
  platform_inferred: 'Platform inferred',
  model_observed: 'Mimi observed',
};

let idc = 0;
const localId = () => `stg_${Date.now()}_${idc++}`;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

export const EvidenceUploadScreen: React.FC<EvidenceUploadScreenProps> = ({
  evidence,
  onUpload,
  onContinue,
  blurb,
  onBlurbChange,
  uploading,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const shotRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<SourceTab>('link');
  const [linkUrl, setLinkUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [staged, setStaged] = useState<StagedItem[]>([]);

  const committedCount = evidence.length;
  const stagedCount = staged.length;
  const totalCount = committedCount + stagedCount;
  const confidence = getReadConfidenceLabel(totalCount);
  const detected = linkUrl.trim() ? detectProvider(linkUrl) : null;

  const addStaged = useCallback((items: TasteImportItem[]) => {
    setStaged((prev) => [
      ...prev,
      ...items.map((it) => ({ ...it, _localId: localId(), scope: 'project' as const })),
    ]);
  }, []);

  const handleImportLink = useCallback(async () => {
    if (!linkUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await importFromLink(linkUrl);
      if (!result.items.length) {
        setImportError('No taste signals found at that link. Try another or upload a screenshot.');
      } else {
        addStaged(result.items);
        setLinkUrl('');
      }
    } catch (err: any) {
      setImportError(err?.message || 'Could not read that link.');
    } finally {
      setImporting(false);
    }
  }, [linkUrl, addStaged]);

  const handleFiles = useCallback(
    async (files: FileList | null, asInstagram: boolean) => {
      if (!files?.length) return;
      const items: TasteImportItem[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await readFileAsDataUrl(file);
        const prov = screenshotProvenance(asInstagram, asInstagram ? 'Instagram Algorithm Mirror' : file.name);
        items.push({
          title: asInstagram ? 'Instagram screenshot' : file.name.replace(/\.[^.]+$/, ''),
          sourceType: asInstagram ? 'screenshot' : 'image',
          dataUrl,
          thumbnailUrl: dataUrl,
          extractedMetadata: prov,
        });
      }
      if (items.length) addStaged(items);
    },
    [addStaged],
  );

  const commitStaged = useCallback(async () => {
    if (!staged.length) return;
    const payload: EvidenceUploadItem[] = staged.map((s) => ({
      title: s.title,
      sourceType: s.sourceType,
      dataUrl: s.dataUrl,
      thumbnailUrl: s.thumbnailUrl,
      sourceUrl: s.sourceUrl,
      description: s.description,
      extractedMetadata: { ...s.extractedMetadata, scope: s.scope },
    }));
    await onUpload(payload);
    setStaged([]);
  }, [staged, onUpload]);

  const updateStaged = (id: string, patch: Partial<StagedItem>) =>
    setStaged((prev) => prev.map((s) => (s._localId === id ? { ...s, ...patch } : s)));
  const removeStaged = (id: string) => setStaged((prev) => prev.filter((s) => s._localId !== id));

  const tabs: Array<{ id: SourceTab; label: string; icon: React.ComponentType<{ size?: number }> }> = useMemo(
    () => [
      { id: 'link', label: 'Paste a link', icon: Link2 },
      { id: 'screenshot', label: 'Instagram shot', icon: Camera },
      { id: 'upload', label: 'Upload files', icon: Upload },
    ],
    [],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Evidence intake</p>
      <h2 className="font-serif text-xl sm:text-2xl text-nous-text mb-2 text-balance">Bring in your taste</h2>
      <p className="text-sm leading-relaxed text-nous-subtle mb-6 max-w-prose">
        Pull references from the places your taste already lives, or upload your own. Minimum 3 to compare — the more
        evidence, the stronger the read.
      </p>

      {/* Confidence meter */}
      <div className="mb-6 p-4 border border-nous-border/30 bg-[#FDFBF7]/40 dark:bg-[#0A0A0A]/40">
        <div className="flex items-center justify-between text-xs mb-2 gap-2">
          <span className="tabular-nums">
            {committedCount} in evidence{stagedCount > 0 ? ` · ${stagedCount} staged` : ''}
          </span>
          <span className="uppercase tracking-wider text-right">{getReadConfidenceDisplay(confidence)}</span>
        </div>
        <div className="h-1 bg-nous-border/20 overflow-hidden">
          <div
            className="h-full bg-nous-text/60 transition-all"
            style={{ width: `${Math.min(100, (totalCount / 8) * 100)}%` }}
          />
        </div>
        {totalCount >= 21 && (
          <p className="text-[10px] text-emerald-600 mt-2 uppercase tracking-wider">Archive mode unlocked</p>
        )}
      </div>

      {/* Source selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setImportError(null); }}
              className={`flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.14em] border transition-colors min-h-[44px] ${
                active
                  ? 'border-nous-text bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text'
                  : 'border-nous-border/40 text-nous-subtle hover:border-nous-text/40'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Source panel */}
      <div className="mb-6">
        {tab === 'link' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  inputMode="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) handleImportLink();
                  }}
                  placeholder="Letterboxd profile, Pinterest board, or any link"
                  className="w-full border border-nous-border/40 bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-nous-text/40"
                />
              </div>
              <button
                type="button"
                onClick={handleImportLink}
                disabled={!linkUrl.trim() || importing}
                className="shrink-0 px-5 py-3 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em] disabled:opacity-40 min-h-[44px] flex items-center justify-center gap-2"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : 'Import'}
              </button>
            </div>
            {detected && (
              <p className="text-[11px] text-nous-subtle flex items-center gap-1.5">
                {detected === 'letterboxd' && <Film size={12} />}
                {detected === 'pinterest' && <LayoutGrid size={12} />}
                {detected === 'instagram' && <Camera size={12} />}
                {(detected === 'generic_url') && <Globe size={12} />}
                Detected: <span className="text-nous-text">{PROVIDER_LABEL[detected]}</span>
                {detected === 'instagram' && ' — use the screenshot tab instead'}
              </p>
            )}
          </div>
        )}

        {tab === 'screenshot' && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => shotRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && shotRef.current?.click()}
            className="border-2 border-dashed border-nous-border/40 hover:border-nous-text/30 p-8 text-center cursor-pointer transition-colors"
          >
            <input
              ref={shotRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { void handleFiles(e.target.files, true); e.currentTarget.value = ''; }}
            />
            <Camera className="mx-auto text-nous-subtle mb-3" size={22} />
            <p className="text-sm text-nous-text mb-1">Upload an Instagram screenshot</p>
            <p className="text-[11px] text-nous-subtle max-w-xs mx-auto leading-relaxed">
              Explore page, saved grid, or a post you love. Mimi reads only what&apos;s visible in the image — no account
              access.
            </p>
          </div>
        )}

        {tab === 'upload' && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files, false); }}
            className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-nous-text bg-nous-text/5' : 'border-nous-border/40 hover:border-nous-text/30'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { void handleFiles(e.target.files, false); e.currentTarget.value = ''; }}
            />
            <Upload className="mx-auto text-nous-subtle mb-3" size={22} />
            <p className="text-sm text-nous-text">Drop images or tap to upload</p>
          </div>
        )}

        {importError && (
          <p className="mt-3 text-[11px] text-red-600 dark:text-red-400 leading-relaxed">{importError}</p>
        )}
      </div>

      {/* Staging review */}
      {staged.length > 0 && (
        <div className="mb-8 border border-nous-border/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-nous-border/30 bg-[#FDFBF7]/40 dark:bg-[#0A0A0A]/40">
            <span className="text-[11px] uppercase tracking-[0.2em] text-nous-subtle">
              Review · {staged.length} to add
            </span>
            <button
              type="button"
              onClick={() => setStaged([])}
              className="text-[11px] uppercase tracking-wider text-nous-subtle hover:text-nous-text"
            >
              Clear
            </button>
          </div>
          <ul className="divide-y divide-nous-border/20">
            {staged.map((item) => {
              const conf = (item.extractedMetadata?.confidence as TasteConfidence) || 'medium';
              const authority = item.extractedMetadata?.authority as string | undefined;
              const provider = item.extractedMetadata?.provider as TasteProvider | undefined;
              return (
                <li key={item._localId} className="flex items-start gap-3 p-3">
                  <div className="w-14 h-14 shrink-0 border border-nous-border/30 bg-nous-base overflow-hidden flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Globe size={16} className="text-nous-subtle" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      value={item.title}
                      onChange={(e) => updateStaged(item._localId, { title: e.target.value })}
                      className="w-full bg-transparent text-sm text-nous-text border-b border-transparent focus:border-nous-border/40 focus:outline-none pb-0.5"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {provider && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-nous-border/40 text-nous-subtle">
                          {PROVIDER_LABEL[provider]}
                        </span>
                      )}
                      {authority && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-nous-border/40 text-nous-subtle">
                          {AUTHORITY_LABEL[authority] || authority}
                        </span>
                      )}
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${CONFIDENCE_TONE[conf]}`}>
                        {conf} confidence
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {(['project', 'profile'] as const).map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => updateStaged(item._localId, { scope })}
                          className={`text-[9px] uppercase tracking-wider px-2 py-1 border transition-colors ${
                            item.scope === scope
                              ? 'border-nous-text text-nous-text'
                              : 'border-nous-border/30 text-nous-subtle hover:border-nous-text/40'
                          }`}
                        >
                          {scope === 'project' ? 'This project only' : 'Whole profile'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStaged(item._localId)}
                    aria-label="Remove"
                    className="shrink-0 p-2 text-nous-subtle hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="p-3 border-t border-nous-border/30">
            <button
              type="button"
              onClick={commitStaged}
              disabled={uploading}
              className="w-full py-3 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Check size={14} /> Add {staged.length} to evidence
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Committed evidence */}
      {evidence.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-nous-subtle mb-3">In evidence · {evidence.length}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {evidence.map((node) => {
              const provider = (node.extractedMetadata?.provider as TasteProvider) || undefined;
              return (
                <div key={node.id} className="aspect-square border border-nous-border/30 overflow-hidden relative">
                  {node.thumbnailUrl ? (
                    <img
                      src={node.thumbnailUrl}
                      alt={node.title}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-nous-subtle">
                      <Globe size={16} />
                    </div>
                  )}
                  {provider && (
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[8px] uppercase tracking-wider px-1 py-0.5">
                      {PROVIDER_LABEL[provider]}
                    </span>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 truncate">
                    {node.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Intent blurb */}
      <label className="block mb-8">
        <span className="text-[11px] uppercase tracking-[0.2em] text-nous-subtle">What are you trying to understand?</span>
        <textarea
          value={blurb}
          onChange={(e) => onBlurbChange(e.target.value)}
          rows={3}
          className="mt-2 w-full border border-nous-border/40 bg-transparent px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:border-nous-text/40"
          placeholder="What are you trying to understand, make, or become more fluent in?"
        />
      </label>

      <button
        type="button"
        disabled={committedCount < 3 || uploading}
        onClick={onContinue}
        className="w-full py-3.5 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em] disabled:opacity-40"
      >
        {committedCount < 3
          ? `Add ${3 - committedCount} more reference${3 - committedCount === 1 ? '' : 's'}`
          : 'Analyze evidence'}
      </button>
    </div>
  );
};

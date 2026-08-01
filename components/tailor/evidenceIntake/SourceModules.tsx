import React, { useId, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  FolderOpen,
  Film,
  LayoutGrid,
  Loader2,
  Upload,
} from 'lucide-react';
import { INSTAGRAM_SNAPSHOT_CHIPS } from '../../../services/tailorEvidenceIntake';

type SourceKey = 'letterboxd' | 'pinterest' | 'instagram' | 'moreover';

interface SourceModulesProps {
  letterboxdValue: string;
  pinterestValue: string;
  onLetterboxdChange: (v: string) => void;
  onPinterestChange: (v: string) => void;
  onImportLetterboxd: () => void;
  onImportPinterest: () => void;
  onInstagramFiles: (files: FileList | null, label: string) => void;
  onMoreoverFiles: (files: FileList | null) => void;
  importing?: boolean;
  importError?: string | null;
  importWarning?: string | null;
  onRetryImport?: () => void;
  completedSources: Set<SourceKey>;
}

function SourceShell({
  id,
  label,
  a11yLabel,
  icon,
  supporting,
  children,
  defaultOpen = true,
  completed,
}: {
  id: string;
  label: string;
  a11yLabel?: string;
  icon: React.ReactNode;
  supporting: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  completed?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && !completed);
  const headingId = `${id}-heading`;

  return (
    <article
      className="border border-nous-border/45 bg-[#FDFBF7]/40 dark:bg-transparent"
      aria-labelledby={headingId}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 sm:hidden min-h-[48px] text-left"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="shrink-0 w-9 h-9 border border-nous-border/50 flex items-center justify-center">
          {icon}
        </span>
        <span id={headingId} className="flex-1 font-mono text-[11px] uppercase tracking-[0.22em] text-nous-text">
          {label}
        </span>
        {a11yLabel && <span className="sr-only">{a11yLabel}</span>}
        {completed && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-nous-subtle">Added</span>
        )}
        <ChevronDown
          size={16}
          className={`text-nous-subtle transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <div
        id={`${id}-body`}
        className={`${open ? 'block' : 'hidden'} sm:block`}
      >
        <div className="hidden sm:flex items-center gap-3 px-5 pt-5 pb-2">
          <span className="shrink-0 w-10 h-10 border border-nous-border/50 flex items-center justify-center">
            {icon}
          </span>
          <h3 id={`${id}-desktop-heading`} className="font-mono text-[11px] uppercase tracking-[0.22em] text-nous-text">
            {label}
          </h3>
          {completed && (
            <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-nous-subtle">Added</span>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 pb-5 sm:px-5 sm:pb-6">
          <div className="space-y-3">{children}</div>
          <div className="text-sm leading-relaxed text-nous-subtle lg:border-l lg:border-nous-border/30 lg:pl-5">
            {supporting}
          </div>
        </div>
      </div>
    </article>
  );
}

export const SourceModules: React.FC<SourceModulesProps> = ({
  letterboxdValue,
  pinterestValue,
  onLetterboxdChange,
  onPinterestChange,
  onImportLetterboxd,
  onImportPinterest,
  onInstagramFiles,
  onMoreoverFiles,
  importing,
  importError,
  importWarning,
  onRetryImport,
  completedSources,
}) => {
  const lbId = useId();
  const pinId = useId();
  const igRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLInputElement>(null);
  const [igLabel, setIgLabel] = useState<string>(INSTAGRAM_SNAPSHOT_CHIPS[0]);

  return (
    <section className="mb-10 space-y-3" aria-label="Source inputs">
      <SourceShell
        id="letterboxd"
        label="Letterboxd"
        icon={<Film size={16} className="text-nous-text" />}
        completed={completedSources.has('letterboxd')}
        supporting={
          <p>
            The films you revisit, rate, and remember reveal more than favorite genres. They expose
            recurring themes, visual language, emotional preferences, and the references you
            instinctively reach for.
          </p>
        }
      >
        <label htmlFor={lbId} className="block font-mono text-[10px] uppercase tracking-[0.18em] text-nous-subtle mb-1.5">
          Letterboxd username
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={lbId}
            type="text"
            autoComplete="username"
            value={letterboxdValue}
            onChange={(e) => onLetterboxdChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) onImportLetterboxd();
            }}
            placeholder="username"
            className="flex-1 min-h-[44px] border border-nous-border/50 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-nous-text/40"
          />
          <button
            type="button"
            onClick={onImportLetterboxd}
            disabled={!letterboxdValue.trim() || importing}
            className="shrink-0 min-h-[44px] px-4 py-2 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-[11px] uppercase tracking-[0.18em] disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : 'Import feed'}
          </button>
        </div>
        <p className="text-[11px] text-nous-subtle">
          Public RSS only. Private lists and diary entries are not accessible.
        </p>
      </SourceShell>

      <SourceShell
        id="pinterest"
        label="Pinterest"
        icon={<LayoutGrid size={16} className="text-nous-text" />}
        completed={completedSources.has('pinterest')}
        supporting={
          <p>
            Your boards reveal how you gather ideas before they become decisions—the objects, moods,
            textures, rituals, and visual instincts you return to.
          </p>
        }
      >
        <label htmlFor={pinId} className="block font-mono text-[10px] uppercase tracking-[0.18em] text-nous-subtle mb-1.5">
          Paste a board or profile
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={pinId}
            type="url"
            inputMode="url"
            value={pinterestValue}
            onChange={(e) => onPinterestChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) onImportPinterest();
            }}
            placeholder="pinterest.com/your-link"
            className="flex-1 min-h-[44px] border border-nous-border/50 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-nous-text/40"
          />
          <button
            type="button"
            onClick={onImportPinterest}
            disabled={!pinterestValue.trim() || importing}
            className="shrink-0 min-h-[44px] px-4 py-2 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-[11px] uppercase tracking-[0.18em] disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : 'Import collection'}
          </button>
        </div>
        <p className="text-[11px] text-nous-subtle">
          Public boards only. Collections appear as one card you can expand — tagging into Pocket is a later, explicit action.
        </p>
      </SourceShell>

      <SourceShell
        id="instagram"
        label="Instagram Snapshot"
        icon={<Camera size={16} className="text-nous-text" />}
        completed={completedSources.has('instagram')}
        supporting={
          <>
            <p className="mb-2">
              Mimi compares what you publish with what the internet keeps bringing back to you.
            </p>
            <p className="text-[12px]">
              What you publish suggests intention. What returns to you suggests attraction.
            </p>
          </>
        }
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-nous-subtle mb-2">
          Upload your feed, algorithm, or Explore page
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {INSTAGRAM_SNAPSHOT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setIgLabel(chip)}
              aria-pressed={igLabel === chip}
              className={`min-h-[36px] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] border transition-colors ${
                igLabel === chip
                  ? 'border-nous-text text-nous-text'
                  : 'border-nous-border/40 text-nous-subtle hover:border-nous-text/40'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
        <input
          ref={igRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void onInstagramFiles(e.target.files, igLabel);
            e.currentTarget.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => igRef.current?.click()}
          className="w-full min-h-[48px] border border-dashed border-nous-border/50 hover:border-nous-text/40 px-4 py-3 inline-flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-nous-text"
        >
          <Upload size={14} /> Upload images
        </button>
        <p className="text-[11px] text-nous-subtle">
          Screenshots only — no account access. Label each shot so Mimi does not assume it is your profile. Inferred
          platform data is marked as inferred.
        </p>
      </SourceShell>

      <SourceShell
        id="moreover"
        label="Moreover"
        a11yLabel="Add anything else"
        icon={<FolderOpen size={16} className="text-nous-text" />}
        completed={completedSources.has('moreover')}
        supporting={
          <p>
            Favorite photographs. Sketchbooks. Birth charts. Moodboards. Closet photos. Writing.
            Screenshots. Books. Objects you love. Anything you think belongs in the story.
          </p>
        }
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-nous-subtle mb-2">
          Add anything else
        </p>
        <input
          ref={moreRef}
          type="file"
          accept="image/*,application/pdf,text/plain,.txt,.md"
          multiple
          className="hidden"
          onChange={(e) => {
            void onMoreoverFiles(e.target.files);
            e.currentTarget.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => moreRef.current?.click()}
          className="w-full min-h-[48px] border border-dashed border-nous-border/50 hover:border-nous-text/40 px-4 py-3 inline-flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-nous-text"
        >
          <Upload size={14} /> Upload files
        </button>
        <p className="text-[11px] text-nous-subtle">
          Birth charts and symbolic inputs are treated as self-expressive context, not scientific evidence. Images are
          not written to permanent memory until you approve them.
        </p>
      </SourceShell>

      {importError && (
        <div
          className="border border-red-700/40 bg-red-950/10 dark:bg-red-950/20 px-4 py-3 space-y-2"
          role="alert"
        >
          <p className="text-[12px] text-red-700 dark:text-red-400 leading-relaxed">{importError}</p>
          <p className="text-[11px] text-nous-subtle leading-relaxed">
            Public Letterboxd RSS and Pinterest board previews only — private or empty boards return
            nothing. Instagram is screenshot-only (no live scrape).
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {onRetryImport && (
              <button
                type="button"
                onClick={onRetryImport}
                disabled={importing}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-red-700/50 text-red-700 dark:text-red-300 hover:bg-red-950/20 disabled:opacity-40"
              >
                Retry import
              </button>
            )}
            <button
              type="button"
              onClick={() => igRef.current?.click()}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-nous-border text-nous-text hover:border-nous-text/50"
            >
              Upload screenshot instead
            </button>
          </div>
        </div>
      )}
      {importWarning && !importError && (
        <p className="text-[12px] text-nous-subtle leading-relaxed" role="status">
          {importWarning}
        </p>
      )}
    </section>
  );
};

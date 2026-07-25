import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import type { EvidenceNode, EvidenceSourceType } from '../../types';
import { getReadConfidenceDisplay, getReadConfidenceLabel } from '../../constants/tailorSafetyRules';

interface EvidenceUploadScreenProps {
  evidence: EvidenceNode[];
  onUpload: (files: Array<{ dataUrl: string; title: string; sourceType: EvidenceSourceType }>) => Promise<void>;
  onContinue: () => void;
  blurb: string;
  onBlurbChange: (v: string) => void;
  uploading?: boolean;
}

export const EvidenceUploadScreen: React.FC<EvidenceUploadScreenProps> = ({
  evidence,
  onUpload,
  onContinue,
  blurb,
  onBlurbChange,
  uploading,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const count = evidence.length;
  const confidence = getReadConfidenceLabel(count);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const items: Array<{ dataUrl: string; title: string; sourceType: EvidenceSourceType }> = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        items.push({ dataUrl, title: file.name, sourceType: 'image' });
      }
      if (items.length) await onUpload(items);
    },
    [onUpload],
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Evidence</p>
      <h2 className="font-serif text-2xl text-nous-text mb-2">Upload references</h2>
      <p className="text-sm text-nous-subtle mb-6">
        Minimum 3 to compare. More evidence = stronger reads.
      </p>

      <div className="mb-6 p-4 border border-nous-border/30 bg-[#FDFBF7]/30 dark:bg-[#0A0A0A]/30">
        <div className="flex justify-between text-xs mb-2">
          <span>{count} uploaded</span>
          <span className="uppercase tracking-wider">{getReadConfidenceDisplay(confidence)}</span>
        </div>
        <div className="h-1 bg-nous-border/20">
          <div
            className="h-full bg-nous-text/60 transition-all"
            style={{ width: `${Math.min(100, (count / 8) * 100)}%` }}
          />
        </div>
        {count >= 21 && (
          <p className="text-[10px] text-emerald-600 mt-2 uppercase tracking-wider">Archive mode unlocked</p>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed p-12 text-center cursor-pointer transition-colors mb-6 ${
          dragOver ? 'border-nous-text bg-nous-text/5' : 'border-nous-border/40 hover:border-nous-text/30'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
        {uploading ? (
          <Loader2 className="mx-auto animate-spin text-nous-subtle" size={24} />
        ) : (
          <>
            <Upload className="mx-auto text-nous-subtle mb-3" size={24} />
            <p className="text-sm text-nous-text">Drop images or click to upload</p>
          </>
        )}
      </div>

      {evidence.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
          {evidence.map((node) => (
            <div key={node.id} className="aspect-square border border-nous-border/30 overflow-hidden relative group">
              {node.thumbnailUrl && (
                <img src={node.thumbnailUrl} alt={node.title} className="w-full h-full object-cover" />
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 truncate">
                {node.title}
              </span>
            </div>
          ))}
        </div>
      )}

      <label className="block mb-8">
        <span className="text-xs uppercase tracking-widest text-nous-subtle">What are you trying to understand?</span>
        <textarea
          value={blurb}
          onChange={(e) => onBlurbChange(e.target.value)}
          rows={3}
          className="mt-2 w-full border border-nous-border/40 bg-transparent px-4 py-3 text-sm resize-none focus:outline-none focus:border-nous-text/40"
          placeholder="What are you trying to understand, make, or become more fluent in?"
        />
      </label>

      <button
        type="button"
        disabled={count < 3 || uploading}
        onClick={onContinue}
        className="w-full py-3 bg-nous-text text-[#FDFBF7] dark:bg-[#FDFBF7] dark:text-nous-text text-xs uppercase tracking-[0.2em] disabled:opacity-40"
      >
        {count < 3 ? `Add ${3 - count} more reference${3 - count === 1 ? '' : 's'}` : 'Analyze evidence'}
      </button>
    </div>
  );
};

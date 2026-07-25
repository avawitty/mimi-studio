import React from 'react';
import type { EvidenceNode } from '../../types';

const TYPE_LABELS: Record<EvidenceNode['sourceType'], string> = {
  image: 'Images',
  book: 'Books',
  artwork: 'Artwork',
  website: 'Websites',
  screenshot: 'Screenshots',
  note: 'Notes',
  quote: 'Quotes',
  fashion: 'Fashion',
  object: 'Objects',
  music: 'Music',
  film: 'Film',
  architecture: 'Architecture',
  product: 'Products',
  moodboard: 'Moodboards',
};

interface EvidenceLibraryViewProps {
  evidence: EvidenceNode[];
  onSelect?: (node: EvidenceNode) => void;
}

export const EvidenceLibraryView: React.FC<EvidenceLibraryViewProps> = ({ evidence, onSelect }) => {
  const byType = evidence.reduce((acc, node) => {
    const key = node.sourceType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(node);
    return acc;
  }, {} as Record<string, EvidenceNode[]>);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-1">Evidence Library</p>
        <p className="text-xs text-nous-subtle">What evidence supports this?</p>
      </div>

      {Object.entries(byType).map(([type, nodes]) => (
        <section key={type}>
          <h2 className="text-[10px] uppercase tracking-widest text-nous-subtle mb-3">
            {TYPE_LABELS[type as EvidenceNode['sourceType']] ?? type} ({nodes.length})
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelect?.(node)}
                className="aspect-square border border-nous-border/30 overflow-hidden relative text-left hover:border-nous-text/40"
              >
                {node.thumbnailUrl ? (
                  <img src={node.thumbnailUrl} alt={node.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-nous-subtle p-2">
                    {node.title}
                  </div>
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 truncate">
                  {node.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {evidence.length === 0 && (
        <p className="text-sm text-nous-subtle italic">No evidence uploaded yet.</p>
      )}
    </div>
  );
};

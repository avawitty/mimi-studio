import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Loader2, Plus, Type } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { fetchPocketItems } from "../../services/firebaseUtils";
import { getLocalPocket } from "../../services/localArchive";
import type { PocketItem } from "../../types";

interface StudioPocketDrawerProps {
  onInsertText: (text: string) => void;
  onInsertImageUrl: (url: string) => void;
  onOpenFullPocket: () => void;
}

export const StudioPocketDrawer: React.FC<StudioPocketDrawerProps> = ({
  onInsertText,
  onInsertImageUrl,
  onOpenFullPocket,
}) => {
  const { user } = useUser();
  const [items, setItems] = useState<PocketItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const local = (await getLocalPocket()) || [];
      const cloud =
        user?.uid && !user.isAnonymous ? (await fetchPocketItems(user.uid)) || [] : [];
      const merged = [...cloud, ...local];
      const byId = new Map<string, PocketItem>();
      merged.forEach((item) => byId.set(item.id, item));
      setItems(
        Array.from(byId.values()).sort(
          (a, b) => (b.savedAt || b.timestamp || 0) - (a.savedAt || a.timestamp || 0),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.isAnonymous]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewForItem = (item: PocketItem) => {
    const c = item.content || {};
    if (c.imageUrl || c.thumbnailUrl) return c.thumbnailUrl || c.imageUrl;
    if (c.prompt) return null;
    return null;
  };

  const textForItem = (item: PocketItem) => {
    const c = item.content || {};
    return (
      c.title ||
      c.prompt ||
      c.text ||
      c.note ||
      item.type ||
      "Registry fragment"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
          Pocket registry — tap to insert into Studio
        </p>
        <button
          type="button"
          onClick={onOpenFullPocket}
          className="font-mono text-[8px] uppercase tracking-widest text-stone-400 hover:text-stone-200 flex items-center gap-1"
        >
          Open archive <ExternalLink size={10} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-stone-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-stone-700 p-8 text-center">
          <p className="font-serif italic text-stone-400 mb-3">No pocket fragments yet.</p>
          <button
            type="button"
            onClick={onOpenFullPocket}
            className="font-mono text-[9px] uppercase tracking-widest border border-stone-600 px-4 py-2"
          >
            Inject in Pocket
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto pr-1">
          {items.slice(0, 24).map((item) => {
            const thumb = previewForItem(item);
            const label = textForItem(item);
            return (
              <button
                key={item.id}
                type="button"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", thumb || label);
                  e.dataTransfer.setData("application/mimi-pocket-item", JSON.stringify(item));
                  if (thumb) {
                    e.dataTransfer.setData("application/mimi-pocket-image", thumb);
                  }
                  e.dataTransfer.effectAllowed = "copyMove";
                }}
                onClick={() => {
                  if (thumb) onInsertImageUrl(thumb);
                  else onInsertText(label);
                }}
                className="text-left border border-stone-800 hover:border-stone-500 p-2 transition-colors group cursor-grab active:cursor-grabbing"
              >
                <div className="aspect-[4/3] bg-stone-900 mb-2 overflow-hidden flex items-center justify-center">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Type size={16} className="text-stone-600" />
                  )}
                </div>
                <p className="font-mono text-[8px] uppercase tracking-wide text-stone-500 truncate">
                  {item.type}
                </p>
                <p className="text-[10px] text-stone-300 line-clamp-2 leading-snug mt-0.5">{label}</p>
                <span className="inline-flex items-center gap-1 mt-1 font-mono text-[7px] text-stone-600 group-hover:text-stone-400">
                  <Plus size={8} /> Insert
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => void load()}
        className="w-full py-2 border border-stone-800 font-mono text-[8px] uppercase tracking-widest text-stone-500 hover:text-stone-300"
      >
        Refresh registry
      </button>
    </div>
  );
};

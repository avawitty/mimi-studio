import React, { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { fetchPocketItems } from "../../services/firebaseUtils";
import { getLocalPocket } from "../../services/localArchive";
import { archiveManager } from "../../services/archiveManager";
import type { PocketItem } from "../../types";
import {
  loadMessyLayouts,
  saveMessyLayouts,
  scatterLayout,
  type MessyClipLayout,
} from "./messyPocketLayout";

export const POCKET_STASH_TOGGLE_EVENT = "mimi:toggle_pocket_stash";
export const POCKET_STASH_OPEN_EVENT = "mimi:open_pocket_stash";
export const POCKET_STASH_CLOSE_EVENT = "mimi:close_pocket_stash";

interface MessyPocketStashProps {
  open: boolean;
  onClose: () => void;
  onOpenRegistry?: () => void;
}

type DragState = {
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  deskW: number;
  deskH: number;
};

const labelForItem = (item: PocketItem) => {
  const c = item.content || {};
  return (
    c.title ||
    item.title ||
    c.prompt ||
    c.text ||
    c.note ||
    item.type ||
    "Clipping"
  );
};

const thumbForItem = (item: PocketItem) => {
  const c = item.content || {};
  const media = Array.isArray(c.mediaUrls) ? c.mediaUrls[0] : null;
  const candidate = (c.thumbnailUrl || c.imageUrl || c.image || media || null) as string | null;
  if (candidate) return candidate;
  // Only treat url as an image src when the item is actually an image —
  // link destinations are HTML pages and break <img> previews.
  if (item.type === "image" && typeof c.url === "string") return c.url;
  return null;
};

export const MessyPocketStash: React.FC<MessyPocketStashProps> = ({
  open,
  onClose,
  onOpenRegistry,
}) => {
  const { user } = useUser();
  const deskRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<PocketItem[]>([]);
  const [layouts, setLayouts] = useState<Record<string, MessyClipLayout>>(() => loadMessyLayouts());
  const [loading, setLoading] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [justDropped, setJustDropped] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [topZ, setTopZ] = useState(10);

  const syncLayouts = useCallback((list: PocketItem[]) => {
    setLayouts((prev) => {
      const next = { ...prev };
      list.forEach((item, index) => {
        if (!next[item.id]) next[item.id] = scatterLayout(item.id, index);
      });
      const maxZ = Object.values(next).reduce((m, layout) => Math.max(m, layout.z || 0), 0);
      setTopZ((z) => Math.max(z, maxZ + 1));
      saveMessyLayouts(next);
      return next;
    });
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const local = (await getLocalPocket()) || [];
      const cloud =
        user?.uid && !user.isAnonymous ? (await fetchPocketItems(user.uid)) || [] : [];
      const byId = new Map<string, PocketItem>();
      [...cloud, ...local].forEach((item) => {
        if (item?.id) byId.set(item.id, item);
      });
      const merged = Array.from(byId.values()).sort(
        (a, b) => (b.savedAt || b.timestamp || 0) - (a.savedAt || a.timestamp || 0),
      );
      setItems(merged.slice(0, 36));
      syncLayouts(merged.slice(0, 36));
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.isAnonymous, syncLayouts]);

  useEffect(() => {
    if (!open) return;
    void loadItems();
  }, [open, loadItems]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const dx = ((e.clientX - drag.startX) / drag.deskW) * 100;
      const dy = ((e.clientY - drag.startY) / drag.deskH) * 100;
      setLayouts((prev) => {
        const current = prev[drag.id] || scatterLayout(drag.id, 0);
        return {
          ...prev,
          [drag.id]: {
            ...current,
            x: Math.min(82, Math.max(2, drag.originX + dx)),
            y: Math.min(78, Math.max(2, drag.originY + dy)),
            z: topZ,
          },
        };
      });
    };

    const onUp = () => {
      setLayouts((prev) => {
        const current = prev[drag.id];
        if (!current) {
          saveMessyLayouts(prev);
          return prev;
        }
        // Slight settle rotation so the desk stays "messy"
        const settled = {
          ...prev,
          [drag.id]: {
            ...current,
            rotate: current.rotate + (Math.random() * 4 - 2),
          },
        };
        saveMessyLayouts(settled);
        return settled;
      });
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, topZ]);

  const beginClipDrag = (id: string, e: React.PointerEvent) => {
    if (!deskRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = deskRef.current.getBoundingClientRect();
    const layout = layouts[id] || scatterLayout(id, 0);
    const nextZ = topZ + 1;
    setTopZ(nextZ);
    setLayouts((prev) => ({
      ...prev,
      [id]: { ...layout, z: nextZ },
    }));
    setDrag({
      id,
      startX: e.clientX,
      startY: e.clientY,
      originX: layout.x,
      originY: layout.y,
      deskW: rect.width,
      deskH: rect.height,
    });
  };

  const flashDropped = () => {
    setJustDropped(true);
    window.setTimeout(() => setJustDropped(false), 900);
  };

  const ingestFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(
      (f) =>
        f.type.startsWith("image/") ||
        f.type.startsWith("text/") ||
        f.type === "application/json",
    );
    if (!list.length) return;
    const uid = user?.uid || "local-guest";
    for (const file of list) {
      if (file.type.startsWith("image/")) {
        await archiveManager.saveToPocket(
          uid,
          "image",
          {
            title: file.name.replace(/\.[^.]+$/, "") || "Dropped image",
            origin: "messy-pocket-stash",
          },
          [file],
        );
      } else {
        const text = await file.text();
        await archiveManager.saveToPocket(uid, "text", {
          title: file.name,
          text: text.slice(0, 4000),
          origin: "messy-pocket-stash",
        });
      }
    }
    flashDropped();
    await loadItems();
  };

  const onDeskDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropping(true);
  };

  const onDeskDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) setDropping(false);
  };

  const onDeskDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropping(false);
    if (e.dataTransfer.files?.length) {
      await ingestFiles(e.dataTransfer.files);
      return;
    }
    const uri =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    if (!uri?.trim()) return;
    const uid = user?.uid || "local-guest";
    if (uri.startsWith("http") || uri.startsWith("www")) {
      await archiveManager.saveToPocket(uid, "link", {
        title: "Dropped link",
        url: uri.trim(),
        text: uri.trim(),
        origin: "messy-pocket-stash",
      });
    } else {
      await archiveManager.saveToPocket(uid, "text", {
        title: "Clipping",
        text: uri.trim().slice(0, 4000),
        origin: "messy-pocket-stash",
      });
    }
    flashDropped();
    await loadItems();
  };

  if (!open) return null;

  return (
    <div className="messy-pocket-root fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Pocket stash">
      <button
        type="button"
        aria-label="Dismiss pocket stash"
        className="absolute inset-0 bg-black/45 border-0 cursor-default"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
        <div
          className="messy-pocket-drawer pointer-events-auto w-[min(1100px,calc(100%-3.5rem))] mt-14 md:mt-[56px] md:ml-16 border border-black border-t-0 rounded-b-[18px] overflow-hidden flex flex-col"
          style={{
            height: "min(62vh, 560px)",
            background: "#f3f1ea",
            color: "#0a0a0a",
            boxShadow: "0 28px 70px rgba(0,0,0,0.55)",
            animation: "messyPocketDown 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-black/10 bg-[#f3f1ea]/95">
            <div className="min-w-0">
              <p className="font-serif italic text-xl md:text-2xl leading-none">Pocket</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-stone-500 mt-1">
                Messy desk drawer · drag to look through · registry stays organized
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onOpenRegistry?.();
                  onClose();
                }}
                className="hidden sm:inline-flex items-center gap-1 font-mono text-[7px] uppercase tracking-[0.16em] text-stone-600 underline underline-offset-4"
              >
                Open registry <ExternalLink size={10} />
              </button>
              <button
                type="button"
                aria-label="Close pocket stash"
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-black flex items-center justify-center hover:bg-black hover:text-[#f3f1ea] transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div
            ref={deskRef}
            className={`relative flex-1 min-h-0 overflow-hidden transition-shadow ${
              dropping ? "ring-2 ring-inset ring-black/50" : ""
            } ${justDropped ? "ring-2 ring-inset ring-emerald-700/40" : ""}`}
            style={{
              background:
                "repeating-linear-gradient(90deg,transparent,transparent 47px,rgba(10,10,10,0.03) 47px,rgba(10,10,10,0.03) 48px),repeating-linear-gradient(0deg,transparent,transparent 47px,rgba(10,10,10,0.03) 47px,rgba(10,10,10,0.03) 48px),linear-gradient(180deg,#f7f4ec,#efebe1)",
            }}
            onDragOver={onDeskDragOver}
            onDragLeave={onDeskDragLeave}
            onDrop={(e) => void onDeskDrop(e)}
          >
            {loading && items.length === 0 ? (
              <p className="absolute inset-0 flex items-center justify-center font-serif italic text-stone-500">
                Opening the drawer…
              </p>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="font-serif italic text-lg text-stone-800">Empty desk drawer</p>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-stone-500 max-w-sm leading-relaxed">
                  Drop an image or clipping here — or drag one onto the app and this drawer slides open.
                </p>
              </div>
            ) : null}

            {items.map((item) => {
              const layout = layouts[item.id] || scatterLayout(item.id, 0);
              const thumb = thumbForItem(item);
              const label = labelForItem(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={(e) => beginClipDrag(item.id, e)}
                  className="absolute bg-white border border-black text-left p-2 cursor-grab active:cursor-grabbing touch-none select-none"
                  style={{
                    left: `${layout.x}%`,
                    top: `${layout.y}%`,
                    width: thumb ? 138 : 128,
                    transform: `rotate(${layout.rotate}deg)`,
                    zIndex: layout.z,
                    boxShadow: "3px 3px 0 rgba(10,10,10,0.14)",
                  }}
                  aria-label={`Move clipping: ${label}`}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      draggable={false}
                      className="w-full h-[72px] object-cover bg-stone-900 pointer-events-none"
                    />
                  ) : (
                    <div className="w-full min-h-[56px] bg-stone-100 border border-dashed border-stone-300 p-2">
                      <p className="font-serif italic text-[12px] leading-snug text-stone-800 line-clamp-4">
                        {label}
                      </p>
                    </div>
                  )}
                  {thumb ? (
                    <p className="font-serif italic text-[12px] mt-1.5 line-clamp-2 leading-snug">{label}</p>
                  ) : null}
                  <p className="font-mono text-[6px] uppercase tracking-[0.16em] text-stone-500 mt-1">
                    {item.type}
                  </p>
                </button>
              );
            })}

            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[7px] uppercase tracking-[0.18em] text-stone-500 bg-[#f3f1ea]/90 border border-black/10 px-2.5 py-1 pointer-events-none">
              {dropping
                ? "Drop to stash"
                : justDropped
                  ? "Stashed"
                  : "Drag clippings freely"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

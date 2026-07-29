import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  BookOpen,
  Feather,
  Scissors,
  ImageIcon,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * FloatingDialNav — a draggable "orbit" navigation dial.
 *
 * Collapsed: a single circular button (the ◎ mark) that can be dragged
 * freely around the screen (like iOS AssistiveTouch).
 * Expanded: the primary chambers fan out in an arc that always faces the
 * center of the screen, so spokes never render off the nearest edge.
 *
 * This is a self-contained prototype: it ships with sensible demo defaults
 * so it can be mounted anywhere to evaluate the feel before wiring it into
 * the real nav (which is a single `onNavigate(key)` call).
 */

export interface DialItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface FloatingDialNavProps {
  items?: DialItem[];
  currentView?: string;
  onNavigate?: (key: string) => void;
  /** Opens the full-index drawer (the 26-item menu). */
  onOpenIndex?: () => void;
  storageKey?: string;
}

const DEFAULT_ITEMS: DialItem[] = [
  { key: "studio", label: "Worktable", icon: <LayoutGrid size={18} strokeWidth={1.6} /> },
  { key: "pocket", label: "Pocket", icon: <BookOpen size={18} strokeWidth={1.6} /> },
  { key: "scribe", label: "Scribe", icon: <Feather size={18} strokeWidth={1.6} /> },
  { key: "tailor", label: "Tailor", icon: <Scissors size={18} strokeWidth={1.6} /> },
  { key: "darkroom", label: "Darkroom", icon: <ImageIcon size={18} strokeWidth={1.6} /> },
];

const DIAL_SIZE = 56;
const SPOKE_SIZE = 52;
const RADIUS = 108;

export const FloatingDialNav: React.FC<FloatingDialNavProps> = ({
  items = DEFAULT_ITEMS,
  currentView,
  onNavigate,
  onOpenIndex,
  storageKey = "mimi:dial-pos",
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    const fallback = {
      x: window.innerWidth - DIAL_SIZE - 16,
      y: Math.round(window.innerHeight * 0.62),
    };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPos({
          x: Math.min(Math.max(0, parsed.x), window.innerWidth - DIAL_SIZE),
          y: Math.min(Math.max(0, parsed.y), window.innerHeight - DIAL_SIZE),
        });
      } else {
        setPos(fallback);
      }
    } catch {
      setPos(fallback);
    }
    setReady(true);
  }, [storageKey]);

  const center = useMemo(() => {
    const cx = pos.x + DIAL_SIZE / 2;
    const cy = pos.y + DIAL_SIZE / 2;
    return {
      onLeft: cx < window.innerWidth / 2,
      onTop: cy < window.innerHeight / 2,
    };
  }, [pos]);

  const spokeOffsets = useMemo(() => {
    const n = items.length;
    let start: number;
    let end: number;
    if (center.onLeft && !center.onTop) {
      start = -80; end = 10;
    } else if (!center.onLeft && !center.onTop) {
      start = 190; end = 280;
    } else if (center.onLeft && center.onTop) {
      start = 10; end = 100;
    } else {
      start = 80; end = 170;
    }
    return items.map((item, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const angle = ((start + (end - start) * t) * Math.PI) / 180;
      return {
        item,
        dx: Math.cos(angle) * RADIUS,
        dy: Math.sin(angle) * RADIUS,
      };
    });
  }, [items, center]);

  if (!ready) return null;

  return (
    <div className="md:hidden" aria-hidden={false}>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close navigation dial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9990] bg-nous-text/20 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          left: 0,
          top: 0,
          right: window.innerWidth - DIAL_SIZE,
          bottom: window.innerHeight - DIAL_SIZE,
        }}
        onDragStart={() => {
          draggingRef.current = true;
          setOpen(false);
        }}
        onDragEnd={(_, info) => {
          setPos((prev) => {
            const next = {
              x: Math.min(Math.max(0, prev.x + info.offset.x), window.innerWidth - DIAL_SIZE),
              y: Math.min(Math.max(0, prev.y + info.offset.y), window.innerHeight - DIAL_SIZE),
            };
            try {
              localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
              /* ignore */
            }
            return next;
          });
          setTimeout(() => {
            draggingRef.current = false;
          }, 60);
        }}
        style={{ left: pos.x, top: pos.y, width: DIAL_SIZE, height: DIAL_SIZE }}
        className="fixed z-[9992] touch-none"
      >
        {/* Spokes */}
        <AnimatePresence>
          {open &&
            spokeOffsets.map(({ item, dx, dy }, i) => {
              const isActive = currentView === item.key;
              return (
                <motion.button
                  key={item.key}
                  type="button"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                  animate={{
                    opacity: 1,
                    x: dx - (SPOKE_SIZE - DIAL_SIZE) / 2,
                    y: dy - (SPOKE_SIZE - DIAL_SIZE) / 2,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28, delay: i * 0.02 }}
                  onClick={() => {
                    onNavigate?.(item.key);
                    setOpen(false);
                  }}
                  aria-label={item.label}
                  style={{ width: SPOKE_SIZE, height: SPOKE_SIZE }}
                  className={`absolute left-0 top-0 flex flex-col items-center justify-center gap-0.5 rounded-nous border shadow-lg transition-colors ${
                    isActive
                      ? "bg-nous-text text-nous-base border-nous-text"
                      : "bg-nous-base text-nous-text border-nous-border"
                  }`}
                >
                  {item.icon}
                  <span className="font-mono text-[6px] uppercase tracking-[0.12em] font-bold leading-none">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
        </AnimatePresence>

        <AnimatePresence>
          {open && onOpenIndex && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, delay: 0.12 }}
              onClick={() => {
                onOpenIndex();
                setOpen(false);
              }}
              aria-label="Open full index"
              style={{
                width: SPOKE_SIZE,
                height: SPOKE_SIZE,
                left: (DIAL_SIZE - SPOKE_SIZE) / 2 + (center.onLeft ? RADIUS * 0.72 : -RADIUS * 0.72),
                top: (DIAL_SIZE - SPOKE_SIZE) / 2 + (center.onTop ? RADIUS * 0.72 : -RADIUS * 0.72),
              }}
              className="absolute flex flex-col items-center justify-center gap-0.5 rounded-nous border border-nous-border bg-nous-paper text-nous-subtle shadow-lg"
            >
              <Menu size={18} strokeWidth={1.6} />
              <span className="font-mono text-[6px] uppercase tracking-[0.12em] font-bold leading-none">
                Index
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => {
            if (draggingRef.current) return;
            setOpen((v) => !v);
          }}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
          className="relative flex items-center justify-center rounded-full border-2 border-nous-text bg-nous-base text-nous-text shadow-xl active:scale-95 transition-transform"
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={22} strokeWidth={1.8} />
              </motion.span>
            ) : (
              <motion.span
                key="dial"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="block w-5 h-5 rounded-full border-2 border-nous-text"
              />
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </div>
  );
};

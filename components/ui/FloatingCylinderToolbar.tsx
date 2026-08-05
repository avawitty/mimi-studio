import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu } from "lucide-react";

export type FloatingCylinderToolbarItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
};

type FloatingCylinderToolbarProps = {
  items: FloatingCylinderToolbarItem[];
  ariaLabel: string;
  /** Zine shows icon + caption; studio is icon-forward inside the cylinder. */
  variant?: "zine" | "studio";
  className?: string;
  trailing?: React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export const FloatingCylinderToolbar: React.FC<FloatingCylinderToolbarProps> = ({
  items,
  ariaLabel,
  variant = "studio",
  className = "",
  trailing,
  collapsible = false,
  collapsed = false,
  onCollapsedChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isZine = variant === "zine";

  const cylinder = (
    <div
      className={`floating-cylinder-toolbar-shell pointer-events-auto max-w-[min(calc(100vw-1.25rem),22rem)] ${
        isZine ? "md:max-w-[min(calc(100vw-2rem),36rem)]" : ""
      }`}
    >
      <div
        className={`floating-cylinder-toolbar rounded-full border shadow-[0_18px_50px_-12px_rgba(0,0,0,0.22)] backdrop-blur-2xl ${
          isZine
            ? "border-white/60 bg-[#F2F1E8]/82 text-[#817D75]"
            : "studio-border studio-bg-panel studio-text-muted"
        }`}
      >
        <div
          ref={scrollRef}
          role="toolbar"
          aria-label={ariaLabel}
          className="floating-cylinder-toolbar-track flex items-center gap-0.5 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth px-2 py-2"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              aria-label={item.label}
              aria-pressed={item.active || undefined}
              title={item.title ?? item.label}
              className={`floating-cylinder-toolbar-item shrink-0 flex flex-col items-center justify-center transition-colors disabled:opacity-40 ${
                isZine
                  ? "min-w-[3.25rem] gap-1.5 px-1 py-0.5"
                  : "min-w-11 min-h-11 w-11 h-11"
              } ${item.active ? (isZine ? "text-[#1A1A1A]" : "studio-text-ink") : isZine ? "hover:text-[#1A1A1A]" : "hover:studio-text-ink"}`}
            >
              {item.icon}
              {isZine ? (
                <span className="text-[7px] uppercase tracking-[0.18em] font-black leading-none">
                  {item.label}
                </span>
              ) : null}
            </button>
          ))}
          {trailing ? (
            <div className="shrink-0 pl-1 ml-0.5 border-l border-dotted studio-border flex items-center">
              {trailing}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div
        className={`fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom))] left-1/2 z-[9999] -translate-x-1/2 print:hidden pointer-events-none ${className}`.trim()}
      >
        {cylinder}
      </div>
    );
  }

  return (
    <>
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, { offset, velocity }) => {
          if (offset.y > 50 || velocity.y > 500) {
            onCollapsedChange?.(true);
          }
        }}
        title="Swipe or drag down to minimize"
        initial={false}
        animate={{
          y: collapsed ? 100 : 0,
          opacity: collapsed ? 0 : 1,
          scale: collapsed ? 0.82 : 1,
        }}
        className={`fixed bottom-[calc(1.1rem+env(safe-area-inset-bottom))] md:bottom-8 left-1/2 z-[9999] -translate-x-1/2 print:hidden pointer-events-none cursor-grab active:cursor-grabbing ${className}`.trim()}
      >
        {cylinder}
      </motion.div>

      <AnimatePresence>
        {collapsed && (
          <motion.button
            type="button"
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, { offset, velocity }) => {
              if (offset.y < -50 || velocity.y < -500) {
                onCollapsedChange?.(false);
              }
            }}
            initial={{ y: 100, opacity: 0, scale: 0.82 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.82 }}
            onClick={() => onCollapsedChange?.(false)}
            className="fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A] text-white shadow-2xl print:hidden hover:scale-105 transition-transform"
            title="Drag up or tap to expand toolbar"
          >
            <Menu size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

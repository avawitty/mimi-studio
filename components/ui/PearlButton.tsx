import React, { useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import "./mimiMaterials.css";

export type PearlButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "style"
> & {
  children: React.ReactNode;
  loading?: boolean;
  /** Serif editorial label styling */
  editorial?: boolean;
  /** Cream-on-ink vs ink-on-cream variant */
  inverse?: boolean;
  /** Optional likeness accent override (maps to --likeness-accent) */
  likenessAccent?: string;
  style?: React.CSSProperties;
};

export function PearlButton({
  children,
  className,
  disabled,
  editorial = false,
  inverse = false,
  likenessAccent,
  loading = false,
  onMouseMove,
  onMouseLeave,
  style,
  type = "button",
  ...props
}: PearlButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDisabled = Boolean(disabled || loading);

  const setHighlight = useCallback((x: number, y: number) => {
    const el = buttonRef.current;
    if (!el) return;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setHighlight(x, y);
      onMouseMove?.(event);
    },
    [onMouseMove, setHighlight],
  );

  const handleMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setHighlight(50, 50);
      onMouseLeave?.(event);
    },
    [onMouseLeave, setHighlight],
  );

  const accentStyle = likenessAccent
    ? ({ "--likeness-accent": likenessAccent } as React.CSSProperties)
    : undefined;

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "pearl-button mimi-material-scope",
        editorial && "pearl-button--editorial",
        inverse && "pearl-button--inverse",
        className,
      )}
      style={{ ...accentStyle, ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={
        isDisabled
          ? undefined
          : { scale: 1.015, transition: { duration: 0.15 } }
      }
      whileTap={
        isDisabled
          ? undefined
          : { scale: 0.985, y: 1, transition: { duration: 0.08 } }
      }
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      {...props}
    >
      <span className="pearl-button__glass" aria-hidden="true" />
      <span className="pearl-button__sheen" aria-hidden="true" />
      <span className="pearl-button__label">
        {loading ? (
          <Loader2
            size={14}
            strokeWidth={1.5}
            className="pearl-button__spinner shrink-0"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </span>
    </motion.button>
  );
}

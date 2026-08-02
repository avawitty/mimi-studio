import React from 'react';

interface ReflectiveEyeProps {
  caption?: string;
  className?: string;
}

/**
 * Poetic motif for Tailor transitions — not a reading/surveillance mechanic.
 * Copy stays soft: "Look again." Never implies diagnosis or certainty.
 */
export const ReflectiveEye: React.FC<ReflectiveEyeProps> = ({
  caption = 'Look again.',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} aria-hidden="true">
      <div className="relative w-16 h-10">
        <div className="absolute inset-0 rounded-full border border-nous-border/50 bg-[#FDFBF7]/40 dark:bg-white/5 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-nous-text/80 dark:bg-[#FDFBF7]/80 motion-safe:animate-pulse" />
          <div className="absolute left-[55%] top-[35%] w-1.5 h-1.5 rounded-full bg-white/70" />
        </div>
        <div className="absolute inset-x-2 top-0 h-[1px] bg-nous-border/30 motion-safe:animate-[pulse_3s_ease-in-out_infinite]" />
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle">{caption}</p>
    </div>
  );
};

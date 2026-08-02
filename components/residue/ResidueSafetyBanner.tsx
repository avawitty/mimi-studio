import React from "react";
import { ShieldAlert } from "lucide-react";
import { RESIDUE_UI_SAFETY_NOTICE } from "../../lib/residueChamberContract";

interface ResidueSafetyBannerProps {
  notice?: string;
  compact?: boolean;
}

/** Mandatory emotional-mode notice — never hide while emotional results are visible. */
export const ResidueSafetyBanner: React.FC<ResidueSafetyBannerProps> = ({
  notice = RESIDUE_UI_SAFETY_NOTICE,
  compact = false,
}) => {
  return (
    <aside
      role="note"
      aria-label="Emotional residue safety notice"
      className={`border border-nous-border bg-white flex gap-3 ${
        compact ? "px-4 py-3" : "px-5 py-4"
      }`}
    >
      <ShieldAlert
        size={compact ? 14 : 16}
        className="shrink-0 mt-0.5 text-nous-subtle"
        aria-hidden
      />
      <p
        className={`font-sans leading-relaxed text-nous-text ${
          compact ? "text-[11px]" : "text-[12px] md:text-[13px]"
        }`}
      >
        {notice}
      </p>
    </aside>
  );
};

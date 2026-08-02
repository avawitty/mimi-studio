import React from "react";
import { Loader2, UserCircle2 } from "lucide-react";
import type { Doll, DollMask } from "../types";

interface StudioDollToggleProps {
  enabled: boolean;
  loading: boolean;
  dolls: Doll[];
  masks?: DollMask[];
  activeDollId: string | null;
  activeMaskId?: string | null;
  onToggle: (next?: boolean) => void;
  onSelectDoll: (dollId: string) => void;
  onSelectMask?: (maskId: string) => void;
}

export const StudioDollToggle: React.FC<StudioDollToggleProps> = ({
  enabled,
  loading,
  dolls,
  masks = [],
  activeDollId,
  activeMaskId,
  onToggle,
  onSelectDoll,
  onSelectMask,
}) => {
  const activeDoll = dolls.find((d) => d.id === activeDollId);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onToggle()}
        title="Inject Doll identity into visual prompts"
        className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
          enabled
            ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
            : "border-transparent text-stone-500 hover:border-stone-800 hover:bg-stone-900/40 hover:text-stone-200"
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <UserCircle2 size={14} />
        )}
      </button>

      {enabled && dolls.length > 0 && (
        <>
          <select
            value={activeDollId ?? ""}
            onChange={(e) => onSelectDoll(e.target.value)}
            className="w-8 max-w-[120px] md:w-auto md:max-w-none border studio-border studio-bg-surface font-mono text-[7px] uppercase tracking-wider px-1 py-0.5 truncate"
            title={activeDoll?.name ?? "Select doll"}
          >
            {dolls.map((doll) => (
              <option key={doll.id} value={doll.id}>
                {doll.name}
              </option>
            ))}
          </select>
          {masks.length > 0 && onSelectMask && (
            <select
              value={activeMaskId ?? ""}
              onChange={(e) => onSelectMask(e.target.value)}
              className="w-8 max-w-[120px] md:w-auto md:max-w-none border studio-border studio-bg-surface font-mono text-[7px] uppercase tracking-wider px-1 py-0.5 truncate"
              title="Active mask role"
            >
              {masks.map((mask) => (
                <option key={mask.id} value={mask.id}>
                  {mask.role}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      {enabled && dolls.length === 0 && !loading && (
        <span className="font-mono text-[6px] uppercase tracking-widest text-stone-500 max-w-[80px] leading-tight">
          No dolls — visit Tailor
        </span>
      )}
    </div>
  );
};

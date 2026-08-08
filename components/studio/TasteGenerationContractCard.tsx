import React, { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { TasteGenerationContract } from "../../schemas/tasteIntelligenceContracts";
import type { GenerationContractReconciliation } from "../../lib/tasteIntelligence/mergeGenerationContracts";
import { StudioCompactToggle } from "../ui/StudioCompactToggle";

type TasteGenerationContractCardProps = {
  contract: TasteGenerationContract | null;
  reconciliation: GenerationContractReconciliation | null;
  loading?: boolean;
  error?: string | null;
  entitlementBlocked?: boolean;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
};

function RuleList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-[7px] uppercase tracking-widest text-mimi-stone mb-1">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.slice(0, 6).map((item) => (
          <li key={`${title}-${item}`} className="font-sans text-[11px] text-mimi-ink leading-snug">
            {item}
          </li>
        ))}
        {items.length > 6 && (
          <li className="font-mono text-[8px] text-mimi-stone">
            +{items.length - 6} more
          </li>
        )}
      </ul>
    </div>
  );
}

export const TasteGenerationContractCard: React.FC<TasteGenerationContractCardProps> = ({
  contract,
  reconciliation,
  loading,
  error,
  entitlementBlocked,
  enabled,
  onToggleEnabled,
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="w-full max-w-2xl border border-mimi-hairline/40 bg-mimi-field/80">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-mimi-hairline/30">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-mimi-olive">
            Taste compiler
          </span>
          {contract && (
            <span className="font-sans text-[10px] text-mimi-stone">
              {contract.mode} · {Math.round(contract.confidence * 100)}% confidence
            </span>
          )}
          <ChevronDown
            size={12}
            className={`ml-auto text-mimi-stone transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        <StudioCompactToggle
          checked={enabled}
          onChange={onToggleEnabled}
          label={enabled ? "On" : "Off"}
        />
      </div>

      {expanded && (
        <div className="px-3 py-3 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-mimi-stone">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-sans text-[11px]">Compiling contract…</span>
            </div>
          )}

          {entitlementBlocked && (
            <p className="font-sans text-[11px] text-mimi-stone leading-snug">
              Taste compiler requires Studio plan or trial. Generation will proceed without a compiled contract.
            </p>
          )}

          {error && !entitlementBlocked && (
            <p className="font-sans text-[11px] text-red-700/80 leading-snug">{error}</p>
          )}

          {contract && enabled && (
            <>
              {reconciliation?.sources.includes("tailor_profile_v2") && (
                <p className="font-sans text-[10px] text-mimi-stone italic">
                  Reconciled with Tailor Profile v2 generationContract.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <RuleList title="Preserve" items={contract.preserve} />
                <RuleList title="Emphasize" items={contract.emphasize} />
                <RuleList title="Avoid" items={contract.avoid} />
                <RuleList title="Transform" items={contract.transform} />
              </div>
              {contract.evidenceIds.length > 0 && (
                <p className="font-mono text-[8px] text-mimi-stone">
                  {contract.evidenceIds.length} evidence ids linked
                </p>
              )}
            </>
          )}

          {!contract && !loading && enabled && !entitlementBlocked && !error && (
            <p className="font-sans text-[11px] text-mimi-stone">
              No taste model snapshot yet. Capture and approve evidence in Tailor first.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

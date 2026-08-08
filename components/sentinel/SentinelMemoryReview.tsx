import React from "react";
import type { SentinelMemoryPolicy } from "../../schemas/tasteIntelligenceContracts";
import { canInfluenceGeneration } from "../../lib/tasteIntelligence/sentinelPolicy";

/**
 * Review surface for Sentinel memory policies (separate from CaptiveSentinel browser guard).
 */
export const SentinelMemoryReview: React.FC<{
  policies: SentinelMemoryPolicy[];
  onApprove?: (policyId: string) => void;
  onWithdraw?: (policyId: string) => void;
}> = ({ policies, onApprove, onWithdraw }) => {
  return (
    <section
      className="rounded border border-mimi-hairline/60 bg-mimi-field p-4"
      aria-label="Sentinel memory review"
    >
      <h2 className="font-display text-lg text-mimi-ink">Memory policy review</h2>
      <p className="mt-1 text-sm text-mimi-stone">
        Proposed memory is not executable until you approve it. Withdrawn memory stops
        influencing generation.
      </p>
      <ul className="mt-4 space-y-3">
        {policies.length === 0 && (
          <li className="text-sm text-mimi-stone">No policies pending review.</li>
        )}
        {policies.map((policy) => (
          <li
            key={policy.id}
            className="border border-mimi-hairline/40 p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-mimi-stone">
                {policy.epistemicState}
              </span>
              <span className="text-xs text-mimi-stone">{policy.scope}</span>
            </div>
            <p className="mt-2 text-mimi-ink">Object: {policy.targetObjectId}</p>
            <p className="mt-1 text-xs text-mimi-stone">
              Executable: {canInfluenceGeneration(policy) ? "yes" : "no"}
            </p>
            <div className="mt-3 flex gap-2">
              {policy.epistemicState === "proposed" && onApprove && (
                <button
                  type="button"
                  className="min-h-[40px] border border-mimi-ink px-3 text-xs"
                  onClick={() => onApprove(policy.id)}
                >
                  Approve
                </button>
              )}
              {onWithdraw && (
                <button
                  type="button"
                  className="min-h-[40px] border border-mimi-hairline px-3 text-xs text-mimi-stone"
                  onClick={() => onWithdraw(policy.id)}
                >
                  Withdraw
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SentinelMemoryReview;

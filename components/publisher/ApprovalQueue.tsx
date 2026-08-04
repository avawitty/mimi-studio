import React from "react";
import { ChevronRight } from "lucide-react";
import type { ApprovalItem } from "../../lib/publisher/types";

export const ApprovalQueue: React.FC<{
  items: ApprovalItem[];
  onAction: (item: ApprovalItem) => void;
}> = ({ items, onAction }) => {
  const pending = items.filter((i) => i.status === "pending");

  if (pending.length === 0) {
    return (
      <section className="border border-stone-850 bg-[#121112] p-5">
        <h3 className="font-serif text-lg font-bold text-white">Needs approval</h3>
        <p className="font-sans text-sm text-stone-500 mt-2">
          No pending approvals. Release checks are clear or optional.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-stone-850 bg-[#121112] p-5 space-y-4" aria-labelledby="approval-queue-heading">
      <div>
        <h3 id="approval-queue-heading" className="font-serif text-lg font-bold text-white">
          Needs approval
        </h3>
        <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500 mt-1">
          {pending.length} decision{pending.length === 1 ? "" : "s"} before external handoff
        </p>
      </div>
      <ul className="space-y-2 list-none">
        {pending.map((item) => (
          <li
            key={item.id}
            className="border border-stone-800 bg-stone-950/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-sans text-sm text-stone-200">{item.label}</p>
              <p className="font-sans text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                {item.summary}
              </p>
              {item.fieldRef && (
                <p className="font-mono text-[7px] uppercase tracking-wider text-stone-600 mt-1">
                  {item.fieldRef}
                  {item.timestamp
                    ? ` · ${new Date(item.timestamp).toLocaleString()}`
                    : ""}
                </p>
              )}
              {item.persistenceNote && (
                <p className="font-sans text-[10px] text-stone-600 mt-1 italic">
                  {item.persistenceNote}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onAction(item)}
              className="shrink-0 min-h-10 px-3 py-2 border border-stone-700 font-mono text-[8px] uppercase tracking-widest text-stone-300 hover:border-stone-500 flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={`${item.actionLabel}: ${item.label}`}
            >
              {item.actionLabel}
              <ChevronRight size={10} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

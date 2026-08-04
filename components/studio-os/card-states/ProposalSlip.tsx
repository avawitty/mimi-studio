import type { ReactNode } from "react";
import type { MimiCardState } from "../../../lib/cardStateTypes";
import { MimiStateFrame } from "./MimiStateFrame";
import "./cardStates.css";

export type ProposalSlipProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  provenance?: ReactNode;
  children?: ReactNode;
  onAccept?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  onDefer?: () => void;
  acceptLabel?: string;
  state?: MimiCardState;
  className?: string;
};

/**
 * Proposal scene — accept, edit, reject, or defer an inference.
 */
export function ProposalSlip({
  eyebrow,
  title,
  description,
  provenance,
  children,
  onAccept,
  onEdit,
  onReject,
  onDefer,
  acceptLabel = "Approve",
  state = "idle",
  className = "",
}: ProposalSlipProps) {
  return (
    <MimiStateFrame
      kind="proposal"
      state={state}
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={`mimi-proposal-slip ${className}`.trim()}
      footer={
        onAccept || onEdit || onReject || onDefer ? (
          <div className="mimi-proposal-slip__actions">
            {onAccept ? (
              <button type="button" className="mimi-ritual-button" onClick={onAccept}>
                {acceptLabel}
              </button>
            ) : null}
            {onEdit ? (
              <button type="button" className="mimi-proposal-slip__secondary" onClick={onEdit}>
                Edit
              </button>
            ) : null}
            {onReject ? (
              <button type="button" className="mimi-proposal-slip__secondary" onClick={onReject}>
                Reject
              </button>
            ) : null}
            {onDefer ? (
              <button type="button" className="mimi-proposal-slip__tertiary" onClick={onDefer}>
                Defer
              </button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {children}
      {provenance ? <div className="mimi-proposal-slip__provenance">{provenance}</div> : null}
    </MimiStateFrame>
  );
}

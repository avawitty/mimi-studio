import type { ReactNode } from "react";
import type { MimiCardState } from "../../../lib/cardStateTypes";
import { MimiStateFrame } from "./MimiStateFrame";
import { RitualButton } from "./RitualButton";
import "./cardStates.css";

export type ActionPlateProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  isBusy?: boolean;
  isSuccessful?: boolean;
  disabled?: boolean;
  state?: MimiCardState;
  className?: string;
};

/**
 * Action scene — high-contrast transition plate for meaningful commits.
 */
export function ActionPlate({
  eyebrow,
  title,
  description,
  children,
  actionLabel,
  onAction,
  isBusy = false,
  isSuccessful = false,
  disabled = false,
  state = "idle",
  className = "",
}: ActionPlateProps) {
  return (
    <MimiStateFrame
      kind="action"
      state={state}
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={`mimi-action-plate ${className}`.trim()}
      footer={
        <RitualButton
          type="button"
          onClick={onAction}
          disabled={disabled}
          isBusy={isBusy}
          isSuccessful={isSuccessful}
        >
          {actionLabel}
        </RitualButton>
      }
    >
      {children}
    </MimiStateFrame>
  );
}

import type { ReactNode } from "react";
import type { PromptContract } from "../../../lib/cardStateTypes";
import { MimiStateFrame } from "./MimiStateFrame";
import { RitualButton } from "./RitualButton";
import "./cardStates.css";

export type InvocationPlateProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  prompt?: PromptContract;
  children?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  state?: "idle" | "loading" | "success" | "error" | "disabled";
  className?: string;
};

/**
 * Invocation scene — one proposition, one primary ritual action.
 * Used for orientation, provocation, and focused decisions.
 */
export function InvocationPlate({
  eyebrow,
  title,
  description,
  prompt,
  children,
  primaryAction,
  secondaryAction,
  state = "idle",
  className = "",
}: InvocationPlateProps) {
  return (
    <MimiStateFrame
      kind="invocation"
      state={state}
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={className}
      footer={
        primaryAction || secondaryAction ? (
          <div className="mimi-invocation-plate__actions">
            {primaryAction}
            {secondaryAction ? (
              <div className="mimi-invocation-plate__secondary">{secondaryAction}</div>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {children}
    </MimiStateFrame>
  );
}

export type InvocationComposerProps = {
  prompt: PromptContract;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isBusy?: boolean;
  disabled?: boolean;
  canSubmit?: boolean;
  children?: ReactNode;
  helperText?: string;
};

/** Workspace composer inside an invocation plate with aligned prompt contract. */
export function InvocationComposer({
  prompt,
  value,
  onChange,
  onSubmit,
  isBusy = false,
  disabled = false,
  canSubmit: canSubmitProp,
  children,
  helperText,
}: InvocationComposerProps) {
  const canSubmit =
    canSubmitProp ?? (!disabled && !isBusy && value.trim().length > 0);

  return (
    <div className="mimi-invocation-composer">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={prompt.fieldPlaceholder}
        rows={6}
        aria-label={prompt.displayPrompt}
        className="mimi-invocation-composer__field"
        style={{ fontSize: "max(1rem, 16px)" }}
      />
      {children}
      {helperText ? (
        <p className="mimi-invocation-composer__helper">{helperText}</p>
      ) : null}
      <RitualButton
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        isBusy={isBusy}
        busyLabel={`${prompt.submitLabel}…`}
        aria-label={prompt.submitLabel}
      >
        {prompt.submitLabel}
      </RitualButton>
    </div>
  );
}

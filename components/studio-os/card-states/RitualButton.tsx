import { forwardRef } from "react";
import "./cardStates.css";

export type RitualButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busyLabel?: string;
  successLabel?: string;
  isBusy?: boolean;
  isSuccessful?: boolean;
  trailingArrow?: boolean;
};

export const RitualButton = forwardRef<HTMLButtonElement, RitualButtonProps>(
  function RitualButton(
    {
      children,
      busyLabel = "Working",
      successLabel = "Complete",
      isBusy = false,
      isSuccessful = false,
      trailingArrow = true,
      disabled,
      className = "",
      ...props
    },
    ref,
  ) {
    const label = isSuccessful ? successLabel : isBusy ? busyLabel : children;

    return (
      <button
        ref={ref}
        className={`mimi-ritual-button ${className}`.trim()}
        data-state={isSuccessful ? "success" : isBusy ? "loading" : "idle"}
        disabled={disabled || isBusy}
        aria-busy={isBusy || undefined}
        {...props}
      >
        <span>{label}</span>
        {trailingArrow && !isBusy && !isSuccessful ? (
          <span aria-hidden="true">→</span>
        ) : null}
      </button>
    );
  },
);

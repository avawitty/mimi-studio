import React from "react";

type StudioCompactToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
};

/** Understated switch — avoids mobile 44px checkbox tap-target blow-up. */
export const StudioCompactToggle: React.FC<StudioCompactToggleProps> = ({
  checked,
  onChange,
  label,
  disabled,
  id,
}) => {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-1 py-0.5 transition-colors",
        "min-h-0 min-w-0",
        checked
          ? "border-mimi-olive/50 bg-mimi-olive/10"
          : "border-mimi-hairline/60 bg-mimi-field/80",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "relative block h-3.5 w-6 rounded-full transition-colors",
          checked ? "bg-mimi-olive/80" : "bg-mimi-stone/25",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-2.5" : "translate-x-0",
          ].join(" ")}
        />
      </span>
      {label ? (
        <span className="font-mono text-[7px] uppercase tracking-wider text-mimi-stone pr-0.5">
          {label}
        </span>
      ) : null}
    </button>
  );
};

import type { PropsWithChildren, ReactNode } from "react";
import type { MimiCardKind, MimiCardState } from "../../../lib/cardStateTypes";
import "./cardStates.css";

export type StateFrameProps = PropsWithChildren<{
  kind: MimiCardKind | string;
  state?: MimiCardState | string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  className?: string;
}>;

export function MimiStateFrame({
  kind,
  state = "idle",
  eyebrow,
  title,
  description,
  footer,
  className = "",
  children,
}: StateFrameProps) {
  return (
    <article
      className={`mimi-state-frame mimi-state-frame--${kind} ${className}`.trim()}
      data-kind={kind}
      data-state={state}
      aria-busy={state === "loading" || undefined}
    >
      {(eyebrow || title || description) && (
        <header className="mimi-state-frame__header">
          {eyebrow ? (
            <div className="mimi-state-frame__eyebrow">{eyebrow}</div>
          ) : null}
          {title ? <h2 className="mimi-state-frame__title">{title}</h2> : null}
          {description ? (
            <p className="mimi-state-frame__description">{description}</p>
          ) : null}
        </header>
      )}

      <div className="mimi-state-frame__body">{children}</div>

      {footer ? <footer className="mimi-state-frame__footer">{footer}</footer> : null}
    </article>
  );
}

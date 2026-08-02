import React from "react";

export interface AnnotationProps {
  children: React.ReactNode;
  className?: string;
}

/** Supplemental handwriting only; required interface meaning stays in system type. */
export const Annotation: React.FC<AnnotationProps> = ({
  children,
  className = "",
}) => (
  <p
    className={`font-['La_Belle_Aurore',cursive] text-[17px] leading-tight text-[var(--mimi-pencil,#8a877f)] -rotate-1 ${className}`}
  >
    {children}
  </p>
);

import React from "react";
import {
  mayContributeToMeanMedianMode,
  type MmmContributionStatus,
} from "../../services/collective/consent";

export type ProsceniumContributionFields = {
  isDemo?: boolean;
  disclosedAt?: number | null;
  disclosureVersion?: string | null;
  contributeToMeanMedianMode?: boolean | null;
  mmmContributionStatus?: MmmContributionStatus | string | null;
  stagedPublicly?: boolean | null;
};

export function describeProsceniumContribution(
  transmission: ProsceniumContributionFields,
): {
  label: string;
  tone: "cobalt" | "olive" | "stone" | "muted";
} | null {
  let label: string | null = null;
  let tone: "cobalt" | "olive" | "stone" | "muted" = "muted";

  if (transmission.mmmContributionStatus === "withdrawn") {
    label = "Withdrawn from Mean Median Mode";
    tone = "stone";
  } else if (mayContributeToMeanMedianMode(transmission)) {
    label = "Contributing to Mean Median Mode";
    tone = "cobalt";
  } else if (transmission.disclosedAt && transmission.disclosureVersion) {
    label = "Staged · not contributing";
    tone = "olive";
  }

  if (!label && transmission.isDemo) {
    return { label: "Demonstration specimen", tone: "muted" };
  }

  if (!label) return null;

  if (transmission.isDemo) {
    return { label: `${label} · demo`, tone };
  }

  return { label, tone };
}

export const ProsceniumContributionBadge: React.FC<{
  transmission: ProsceniumContributionFields;
  variant?: "card" | "inline" | "modal" | "overlay";
  className?: string;
}> = ({ transmission, variant = "inline", className = "" }) => {
  const described = describeProsceniumContribution(transmission);
  if (!described) return null;

  if (variant === "overlay") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 border border-white/20 bg-black/55 backdrop-blur-sm font-mono text-[7px] uppercase tracking-[0.16em] text-white/85 ${className}`}
      >
        {described.label}
      </span>
    );
  }

  const toneClass =
    described.tone === "cobalt"
      ? "text-[var(--mimi-cobalt,#9BB8CE)] border-[var(--mimi-cobalt,#9BB8CE)]/40"
      : described.tone === "olive"
        ? "text-[var(--mimi-olive,#5A5A40)] border-[var(--mimi-olive,#5A5A40)]/40"
        : described.tone === "stone"
          ? "text-[var(--mimi-stone,#78716c)] border-[var(--mimi-stone,#78716c)]/40"
          : "text-white/40 border-white/20";

  const cardToneClass =
    described.tone === "cobalt"
      ? "text-[var(--mimi-cobalt,#9BB8CE)]"
      : described.tone === "olive"
        ? "text-[var(--mimi-olive,#5A5A40)]"
        : described.tone === "stone"
          ? "text-[var(--mimi-stone,#78716c)]"
          : "text-white/40";

  if (variant === "card") {
    return (
      <span
        className={`font-mono text-[7px] uppercase tracking-widest ${cardToneClass} ${className}`}
      >
        {described.label}
      </span>
    );
  }

  if (variant === "modal") {
    return (
      <span
        className={`inline-flex items-center px-2 py-1 border font-mono text-[8px] uppercase tracking-[0.2em] ${toneClass} ${className}`}
      >
        {described.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border font-mono text-[8px] uppercase tracking-[0.18em] ${toneClass} ${className}`}
    >
      {described.label}
    </span>
  );
};

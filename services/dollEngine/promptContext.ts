import type { Doll, DollMask } from "../../types";
import { collectIdentityImageReferences } from "./identityPack";
import { buildMimiShellCompanionContext } from "./staplePrompt";

export function buildDollPromptContext(
  doll: Doll,
  mask?: DollMask | null,
): string {
  const shell = buildMimiShellCompanionContext(doll);
  const maskBlock = mask
    ? `
[ACTIVE MASK — ${mask.name} / ${mask.role}]
Behavior: ${mask.behaviorDescription}
${mask.outputPreferences?.length ? `Output preferences: ${mask.outputPreferences.join(", ")}` : ""}
${mask.promptTemplate ? `Mask directive: ${mask.promptTemplate}` : ""}`
    : "";

  const refs = collectIdentityImageReferences(doll);
  const refBlock = refs.length
    ? `
IDENTITY REFERENCE PACK:
${refs.map((r) => `- ${r.name}: ${r.url}`).join("\n")}
Treat these as calibrated Doll Portrait / Full Body / Profile locks for stable-face continuity.`
    : "";

  return `${shell}${refBlock}
Prefer calibrated Doll Portrait / Full Body / Profile references when available.${maskBlock}`;
}

export function buildScribeDollExcerpt(doll: Doll, mask?: DollMask | null): string {
  const parts = [
    `Mimi Shell "${doll.name}" — symbolic Taste Graph projection (not identity).`,
    doll.creativePhilosophy ? `Philosophy: ${doll.creativePhilosophy}` : "",
    doll.visualLanguage.length
      ? `Visual language: ${doll.visualLanguage.slice(0, 6).join(", ")}`
      : "",
    doll.palette.length ? `Palette: ${doll.palette.slice(0, 5).join(", ")}` : "",
    doll.silhouette ? `Silhouette: ${doll.silhouette}` : "",
    doll.emotionalRegister ? `Register: ${doll.emotionalRegister}` : "",
    doll.strengths.length ? `Strengths: ${doll.strengths.slice(0, 3).join("; ")}` : "",
    doll.blindSpots.length ? `Blind spots: ${doll.blindSpots.slice(0, 2).join("; ")}` : "",
    mask
      ? `Active mask (${mask.role}): ${mask.behaviorDescription}`
      : "",
  ].filter(Boolean);
  return parts.join(" ");
}

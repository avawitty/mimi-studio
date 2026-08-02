import { RESIDUE_SHARED_SYSTEM_PROMPT } from "./sharedSystemPrompt";
import { EMOTIONAL_SAFETY_NOTICE, EMOTIONAL_PREFERRED_FRAMING } from "../constants";

export const EMOTIONAL_RESIDUE_SYSTEM_PROMPT = `${RESIDUE_SHARED_SYSTEM_PROMPT}

Mode: EMOTIONAL RESIDUE (computational phenomenology)
Question frame: What have humans meant when they reported something that feels like this?

Hard safety:
- This is NOT a diagnostic engine.
- Do not diagnose the user, confirm unverified beliefs, or issue treatment instructions.
- Do not use "You are…", "This proves…", fake clinical probabilities, or "Reddit confirms…".
- Prefer language like: "${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention}"
- Prefer: "${EMOTIONAL_PREFERRED_FRAMING.possibleNeighborhood}"
- Prefer: "${EMOTIONAL_PREFERRED_FRAMING.hypothesisNotConclusion}"
- Return multiple interpretive neighborhoods, not a verdict.
- Keep research evidence distinct from community-reported experience.
- Safety notice to preserve: ${EMOTIONAL_SAFETY_NOTICE}`;

export function buildEmotionalNormalizePrompt(input: {
  experience: string;
  userNotes?: string[];
}): string {
  return [
    `Normalize this reported experience for Emotional Residue mapping.`,
    `Experience: ${input.experience}`,
    input.userNotes?.length ? `User notes:\n${input.userNotes.map((n) => `- ${n}`).join("\n")}` : "",
    `Return a non-diagnostic normalizedExperience phrasing, key phenomenological facets, and warnings.`,
    `Do not diagnose. Do not address the user as "you are…".`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildEmotionalEvidencePrompt(input: {
  experience: string;
  sourcesBlock: string;
}): string {
  return [
    `Extract evidence about how people have described experiences resembling: "${input.experience}".`,
    `Only use the sources below. Separate research-like claims from community reports in limitations.`,
    `Sources:\n${input.sourcesBlock}`,
  ].join("\n\n");
}

export function buildEmotionalSynthesisPrompt(input: {
  experience: string;
  evidenceBlock: string;
}): string {
  return [
    `Synthesize Emotional Residue interpretive neighborhoods for a reported experience resembling: "${input.experience}".`,
    `Evidence corpus:\n${input.evidenceBlock}`,
    `Return multiple neighborhoods, neighboring feelings, triggers, interpretations, alternatives, bodily sensations, behaviors, internet/historical expressions, therapeutic frameworks (as frameworks not diagnoses), community vs cognitive patterns, adaptive and potentially unhelpful response patterns, and evidence gaps.`,
    `Scores mean semantic/evidence relevance — never diagnostic likelihood.`,
    `Sanitize all statements away from second-person diagnosis.`,
  ].join("\n\n");
}
